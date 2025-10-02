const { pool } = require("../config/ConnectPostgres");
const { v4: uuidv4 } = require("uuid");

module.exports = (io, socket, userId) => {
  // Send a new message
  socket.on("send_message", async (env, cb) => {
    try {
      if (!env?.toUserId || !env?.ciphertext) {
        console.warn(
          `[send_message] Invalid envelope from user ${userId}`,
          env
        );
        return cb?.({ status: "error", message: "invalid envelope" });
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO messages(id, from_user, to_user, ciphertext, nonce, status)
         VALUES($1, $2, $3, $4, $5, $6)`,
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

      console.log(`[send_message] ${userId} -> ${env.toUserId} | id=${id}`);

      io.to(`user:${env.toUserId}`).emit("chat_message", out);
      return cb?.({ status: "ok", id });
    } catch (err) {
      console.error("[send_message] Error:", err);
      return cb?.({ status: "error" });
    }
  });

  // Mark message as delivered
  socket.on("message_delivered", async (data) => {
    try {
      const msgId = data.msgId; // extract the UUID string

      await pool.query(
        `UPDATE messages SET status = 'delivered' WHERE id = $1`,
        [msgId]
      );

      console.log(`[message_delivered] msgId=${msgId}`);

      const result = await pool.query(
        `SELECT from_user FROM messages WHERE id = $1`,
        [msgId]
      );
      const senderId = result.rows[0]?.from_user;
      if (senderId) {
        console.log(`[message_delivered] notifying sender=${senderId}`);
        io.to(`user:${senderId}`).emit("message_status_update", {
          id: msgId,
          status: "delivered",
        });
      }
    } catch (err) {
      console.error("[message_delivered] Error:", err);
    }
  });

  // Mark message as read
  socket.on("message_read", async (data) => {
    try {
      const msgId = data.msgId; // extract the UUID string
      await pool.query(`UPDATE messages SET status = 'read' WHERE id = $1`, [
        msgId,
      ]);

      console.log(`[message_read] msgId=${msgId}`);

      const result = await pool.query(
        `SELECT from_user FROM messages WHERE id = $1`,
        [msgId]
      );
      const senderId = result.rows[0]?.from_user;
      if (senderId) {
        console.log(`[message_read] notifying sender=${senderId}`);
        io.to(`user:${senderId}`).emit("message_status_update", {
          id: msgId,
          status: "read",
        });
      }
    } catch (err) {
      console.error("[message_read] Error:", err);
    }
  });
};
