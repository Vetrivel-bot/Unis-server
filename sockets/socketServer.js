// path: wherever your socket init file is, e.g. services/socketServer.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { createAdapter } = require("@socket.io/redis-adapter");
const { pool } = require("../config/ConnectPostgres");
const messageService = require("../services/messageService");

// import the middleware (keeps same name)
const { Auth_MiddleWare } = require("../middleware/Auth_Middleware");

// CHANGED: The function now accepts the connected clients as an argument
async function initSocketServer(server, { pubClient, subClient }) {
  const io = new Server(server, { cors: { origin: "*" } });

  // Use redis adapter clients passed in
  io.adapter(createAdapter(pubClient, subClient));

  // Use your auth middleware in socket mode
  // Note: Auth_MiddleWare() returns a function that can handle (socket, next)
  io.use(Auth_MiddleWare());

  io.on("connection", (socket) => {
    // after middleware, socket.user and socket.tokens (if refreshed) are available
    const userId = socket.user?._id || socket.userId || null;
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    socket.emit("connected", { socketId: socket.id, userId });

    socket.on("send_message", async (env, cb) => {
      try {
        if (!env || !env.toUserId || !env.ciphertext) {
          return cb?.({ status: "error", message: "invalid envelope" });
        }
        const id = env.id || require("uuid").v4();
        await pool.query(
          `INSERT INTO messages(id, from_user, to_user, ciphertext, nonce, status)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [id, userId, env.toUserId, env.ciphertext, env.nonce || null, "sent"]
        );

        const out = {
          type: "chat_message",
          id,
          from: userId,
          to: env.toUserId,
          ciphertext: env.ciphertext,
          nonce: env.nonce || null,
          ts: new Date().toISOString(),
        };

        io.to(`user:${env.toUserId}`).emit("chat_message", out);
        return cb?.({ status: "ok", id });
      } catch (err) {
        console.error("socket send_message err", err);
        return cb?.({ status: "error" });
      }
    });

    socket.on("ack", async (ack, cb) => {
      try {
        if (!ack?.id) return cb?.({ status: "error" });
        await pool.query(
          `UPDATE messages SET status='delivered', delivered_at=now() WHERE id=$1`,
          [ack.id]
        );
        const r = await pool.query(
          `SELECT from_user FROM messages WHERE id=$1`,
          [ack.id]
        );
        if (r.rowCount) {
          const fromUser = r.rows[0].from_user;
          io.to(`user:${fromUser}`).emit("delivered", {
            id: ack.id,
            to: userId,
            at: new Date().toISOString(),
          });
        }
        return cb?.({ status: "ok" });
      } catch (err) {
        console.error("ack err", err);
        return cb?.({ status: "error" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`socket disconnected ${socket.id} reason=${reason}`);
    });
  });

  // expose io to other modules
  messageService.init(io);
  return io;
}

module.exports = { initSocketServer };
