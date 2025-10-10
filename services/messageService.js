// services/messageService.js
// small abstraction to emit via socket server when needed
const { pool } = require("../config/ConnectPostgres");

let socketIo = null;
function init(io) { socketIo = io; }
function emitToUser(userId, event, payload) {
  if (!socketIo) return;
  socketIo.to(`user:${userId}`).emit(event, payload);
}

async function fetchPending(userId, { limit = 1000 } = {}) {
  // Optionally limit and order by created_at to avoid huge payloads
  const q = `
    SELECT id, from_user, to_user, ciphertext, nonce, created_at
    FROM messages
    WHERE to_user = $1 AND status = 'sent'
    ORDER BY created_at ASC
    LIMIT $2
  `;
  const res = await pool.query(q, [userId, limit]);
  return res.rows;
}


module.exports = { init, emitToUser, fetchPending };
