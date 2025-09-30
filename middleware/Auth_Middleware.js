// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const RefreshToken = require("../model/RefreshTokenModel");
const RefreshTokenModel = require("../model/RefreshTokenModel"); // preserved since you referenced both

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error("ACCESS_SECRET or REFRESH_SECRET not set!");
}

/**
 * Auth_MiddleWare(options) -> middleware function that supports:
 *  - Express HTTP: (req, res, next)
 *  - Socket.IO: (socket, next)
 *
 * It detects mode by looking for `handshake` on the first argument.
 *
 * NOTE: No rememberMe / no refresh rotation (as requested).
 */
exports.Auth_MiddleWare = (options = {}) => {
  return async function authInner(...args) {
    // Socket.IO mode: (socket, next)
    if (args && args[0] && args[0].handshake) {
      const socket = args[0];
      const next = args[1];

      try {
        // Read from handshake.auth first, then handshake.headers
        const authHeader = String(
          socket.handshake.headers?.authorization || ""
        ).trim();
        let accessToken;
        if (socket.handshake.auth?.token) {
          accessToken = String(socket.handshake.auth.token).trim();
        } else if (authHeader && authHeader.startsWith("Bearer ")) {
          accessToken = authHeader.substring(7).trim();
        } else {
          accessToken = null;
        }

        const refreshToken =
          String(
            socket.handshake.auth?.refreshToken ||
              socket.handshake.headers?.["x-refresh-token"] ||
              ""
          ).trim() || null;
        const deviceId =
          String(
            socket.handshake.auth?.deviceId ||
              socket.handshake.headers?.["x-device-id"] ||
              ""
          ).trim() || null;
        const deviceName =
          String(
            socket.handshake.auth?.deviceName ||
              socket.handshake.headers?.["x-device-name"] ||
              ""
          ).trim() || null;
        const headerIp =
          String(
            socket.handshake.auth?.deviceIp ||
              socket.handshake.headers?.["x-device-ip"] ||
              ""
          ).trim() || null;
        const ip = headerIp || socket.handshake.address || null;

        if (!deviceId || !deviceName) {
          // socket.io next with error stops connection
          return next(
            new Error("Headers required: x-device-id and x-device-name")
          );
        }

        if (!accessToken && !refreshToken) {
          // defensive: delete a refresh if present in handshake.auth
          if (refreshToken) {
            try {
              await RefreshTokenModel.findOneAndDelete({ token: refreshToken });
            } catch (e) {
              /*ignore*/
            }
          }
          return next(new Error("Missing tokens (headers required)"));
        }

        // 1) Try access token happy path
        if (accessToken) {
          try {
            const decoded = jwt.verify(accessToken, ACCESS_SECRET);
            const userId = decoded._id || decoded.id;
            if (!userId) return next(new Error("Invalid access token payload"));
            // attach user to socket
            socket.user = {
              _id: userId,
              phone: decoded.phone,
              role: decoded.role,
            };
            // pass control
            return next();
          } catch (err) {
            if (err.name !== "TokenExpiredError") {
              return next(new Error("Invalid access token"));
            }
            // expired -> continue to refresh flow
          }
        }

        // 2) Refresh flow (no rotation)
        if (!refreshToken) {
          return next(
            new Error("Refresh token required (header: x-refresh-token)")
          );
        }

        let decodedRefresh;
        try {
          decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET);
        } catch (err) {
          return next(new Error("Invalid refresh token"));
        }

        const tokenUserId = decodedRefresh._id || decodedRefresh.id;
        if (!tokenUserId)
          return next(new Error("Invalid refresh token payload"));

        const stored = await RefreshToken.findOne({ token: refreshToken });
        if (!stored) return next(new Error("Session not found"));

        // ensure token belongs to same user
        if (!stored.userId || String(stored.userId) !== String(tokenUserId)) {
          await stored.deleteOne().catch(() => {});
          return next(new Error("Session invalid (user mismatch)"));
        }

        // strict device/ip checks (delete session on mismatch)
        if (stored.device?.deviceId && stored.device.deviceId !== deviceId) {
          await stored.deleteOne().catch(() => {});
          return next(new Error("Session invalidated (device id mismatch)"));
        }
        if (
          stored.device?.deviceName &&
          stored.device.deviceName !== deviceName
        ) {
          await stored.deleteOne().catch(() => {});
          return next(new Error("Session invalidated (device name mismatch)"));
        }
        if (ip && stored.device?.lastIP && stored.device.lastIP !== ip) {
          await stored.deleteOne().catch(() => {});
          return next(new Error("Session invalidated (ip mismatch)"));
        }

        // expired?
        if (
          stored.expiresAt &&
          new Date(stored.expiresAt).getTime() < Date.now()
        ) {
          await stored.deleteOne().catch(() => {});
          return next(new Error("Refresh token expired"));
        }

        // update lastUsed & lastIP (no refresh token rotation)
        await RefreshToken.findByIdAndUpdate(stored._id, {
          "device.lastIP": ip || stored.device?.lastIP,
          lastUsed: new Date(),
        }).catch(() => {});

        // issue new access token only
        const newAccessToken = jwt.sign(
          {
            _id: tokenUserId,
            phone: decodedRefresh.phone,
            role: decodedRefresh.role,
          },
          ACCESS_SECRET,
          { expiresIn: "15m" }
        );

        // Emit tokens on socket so client can pick them up
        try {
          socket.emit("tokens", { accessToken: newAccessToken });
        } catch (e) {
          // non-fatal
        }

        // attach tokens & user to socket
        socket.tokens = { accessToken: newAccessToken };
        socket.user = {
          _id: tokenUserId,
          phone: decodedRefresh.phone,
          role: decodedRefresh.role,
        };

        return next();
      } catch (err) {
        console.error("Auth_MiddleWare (socket) unexpected error:", err);
        return next(new Error("Invalid session"));
      }
    }

    // Express HTTP mode: (req, res, next)
    const req = args[0];
    const res = args[1];
    const next = args[2];

    try {
      // headers-only
      const authHeader = String(req.headers.authorization || "").trim();
      let accessToken = undefined;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7).trim();
      }
      const refreshToken =
        String(req.headers["x-refresh-token"] || "").trim() || null;
      const deviceId = String(req.headers["x-device-id"] || "").trim() || null;
      const deviceName =
        String(req.headers["x-device-name"] || "").trim() || null;
      const headerIp = String(req.headers["x-device-ip"] || "").trim() || null;
      const xff =
        String(req.headers["x-forwarded-for"] || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)[0] || null;
      const ip = headerIp || xff || null;

      if (!deviceId || !deviceName) {
        if (refreshToken) {
          await RefreshTokenModel.findOneAndDelete({
            token: refreshToken,
          }).catch(() => {});
        }
        return res
          .status(400)
          .json({ message: "Headers required: x-device-id and x-device-name" });
      }

      if (!accessToken && !refreshToken) {
        if (refreshToken) {
          await RefreshTokenModel.findOneAndDelete({
            token: refreshToken,
          }).catch(() => {});
        }
        await RefreshToken.deleteMany({ "device.deviceId": deviceId }).catch(
          () => {}
        );
        return res
          .status(401)
          .json({ message: "Missing tokens (headers required)" });
      }

      // 1) Try access token
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, ACCESS_SECRET);
          const userId = decoded._id || decoded.id;
          if (!userId)
            return res
              .status(401)
              .json({ message: "Invalid access token payload" });
          req.user = { _id: userId, phone: decoded.phone, role: decoded.role };
          if (options?.requireAdmin && req.user.role !== "Admin")
            return res.status(403).json({ message: "Admin access required" });
          return next();
        } catch (err) {
          if (err.name !== "TokenExpiredError") {
            return res.status(401).json({ message: "Invalid access token" });
          }
          // expired -> proceed to refresh flow
        }
      }

      // 2) Refresh flow (no rotation)
      if (!refreshToken) {
        return res
          .status(401)
          .json({
            message: "Refresh token required (header: x-refresh-token)",
          });
      }

      let decodedRefresh;
      try {
        decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const tokenUserId = decodedRefresh._id || decodedRefresh.id;
      if (!tokenUserId)
        return res
          .status(401)
          .json({ message: "Invalid refresh token payload" });

      const stored = await RefreshToken.findOne({ token: refreshToken });
      if (!stored)
        return res.status(401).json({ message: "Session not found" });

      // ensure token belongs to same user
      if (!stored.userId || String(stored.userId) !== String(tokenUserId)) {
        await stored.deleteOne().catch(() => {});
        return res
          .status(401)
          .json({ message: "Session invalid (user mismatch)" });
      }

      // strict device/ip checks (delete session on mismatch)
      if (stored.device?.deviceId && stored.device.deviceId !== deviceId) {
        await stored.deleteOne().catch(() => {});
        return res
          .status(401)
          .json({ message: "Session invalidated (device id mismatch)" });
      }
      if (
        stored.device?.deviceName &&
        stored.device.deviceName !== deviceName
      ) {
        await stored.deleteOne().catch(() => {});
        return res
          .status(401)
          .json({ message: "Session invalidated (device name mismatch)" });
      }
      if (ip && stored.device?.lastIP && stored.device.lastIP !== ip) {
        await stored.deleteOne().catch(() => {});
        return res
          .status(401)
          .json({ message: "Session invalidated (ip mismatch)" });
      }

      // expired?
      if (
        stored.expiresAt &&
        new Date(stored.expiresAt).getTime() < Date.now()
      ) {
        await stored.deleteOne().catch(() => {});
        return res.status(401).json({ message: "Refresh token expired" });
      }

      // update lastUsed & lastIP (no refresh token rotation)
      await RefreshToken.findByIdAndUpdate(stored._id, {
        "device.lastIP": ip || stored.device?.lastIP,
        lastUsed: new Date(),
      }).catch(() => {});

      // issue new access token only
      const newAccessToken = jwt.sign(
        {
          _id: tokenUserId,
          phone: decodedRefresh.phone,
          role: decodedRefresh.role,
        },
        ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      // return access token in header, do NOT rotate refresh token
      res.setHeader("x-access-token", newAccessToken);
      res.locals.tokens = { accessToken: newAccessToken };
      req.user = {
        _id: tokenUserId,
        phone: decodedRefresh.phone,
        role: decodedRefresh.role,
      };

      if (options?.requireAdmin && req.user.role !== "Admin")
        return res.status(403).json({ message: "Admin access required" });

      return next();
    } catch (err) {
      console.error("Auth_MiddleWare unexpected error:", err);
      // If we have res available, use it; else if socket mode, callback handled above
      if (args[1] && typeof args[1].status === "function") {
        return args[1].status(401).json({ message: "Invalid session" });
      }
      return args[1] ? args[1](new Error("Invalid session")) : null;
    }
  };
};
