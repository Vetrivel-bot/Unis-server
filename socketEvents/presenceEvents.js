module.exports = (io, socket, userId) => {
  socket.on("typing", ({ toUserId }) => {
    if (toUserId) {
      io.to(`user:${toUserId}`).emit("typing", { from: userId });
    }
  });

  socket.on("stop_typing", ({ toUserId }) => {
    if (toUserId) {
      io.to(`user:${toUserId}`).emit("stop_typing", { from: userId });
    }
  });
};
