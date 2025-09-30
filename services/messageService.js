// services/messageService.js
// small abstraction to emit via socket server when needed
let socketIo = null;
function init(io) { socketIo = io; }
function emitToUser(userId, event, payload) {
  if (!socketIo) return;
  socketIo.to(`user:${userId}`).emit(event, payload);
}
module.exports = { init, emitToUser };
