// services/authService.js
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const RefreshToken = require("../models/RefreshTokenModel");

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

/**
 * Create or update user & device, generate access + refresh tokens,
 * store refresh token per-device and return tokens + user.
 *
 * @param {Object} opts
 * @param {string} opts.phone
 * @param {string} opts.deviceName
 * @param {string} opts.deviceId
 * @param {string} opts.lastIP
 * @param {string} [opts.publicKey]
 * @param {string} [opts.pushToken]
 */
async function createSessionTokens({
  phone,
  deviceName,
  deviceId,
  lastIP,
  publicKey,
  pushToken,
}) {
  if (!phone || !deviceName || !deviceId || !lastIP) {
    const err = new Error("Missing required fields for session creation");
    err.status = 400;
    throw err;
  }

  // find or create/update user and device info
  let user = await userModel.findOne({ phone });

  if (user) {
    user = await userModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          ...(publicKey ? { publicKey } : {}),
          "device.deviceId": deviceId,
          "device.deviceName": deviceName,
          "device.lastSeen": new Date(),
          "device.lastIP": lastIP,
          ...(pushToken ? { "device.pushToken": pushToken } : {}),
        },
      },
      { new: true }
    );
  } else {
    user = await userModel.create({
      phone,
      ...(publicKey ? { publicKey } : {}),
      device: {
        deviceId,
        deviceName,
        lastIP,
        ...(pushToken ? { pushToken } : {}),
        lastSeen: new Date(),
      },
    });
  }

  const jwtPayload = {
    _id: user._id,
    phone: user.phone,
    role: user.role,
  };

  const accessToken = jwt.sign(jwtPayload, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(jwtPayload, REFRESH_SECRET, {
    expiresIn: "30d",
  });

  // Persist refresh token per-device
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  // delete any existing refresh docs for this user (enforces single-device)
  await RefreshToken.deleteMany({ userId: user._id });

  await RefreshToken.findOneAndUpdate(
    { userId: user._id, "device.deviceId": deviceId },
    {
      token: refreshToken,
      userId: user._id,
      expiresAt: expiryDate,
      "device.lastIP": lastIP,
      "device.deviceName": deviceName,
      lastUsed: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { accessToken, refreshToken, user };
}

module.exports = { createSessionTokens };
