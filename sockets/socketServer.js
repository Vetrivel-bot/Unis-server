const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { Auth_MiddleWare } = require("../middleware/Auth_Middleware");
const messageService = require("../services/messageService");
const fs = require("fs");
const path = require("path");

async function initSocketServer(server, { pubClient, subClient }) {
  const io = new Server(server, { cors: { origin: "*" } });
  io.adapter(createAdapter(pubClient, subClient));
  io.use(Auth_MiddleWare());

  // Load all event modules dynamically
  const eventsDir = path.join(__dirname, "../socketEvents");
  const eventFiles = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".js"));

  io.on("connection", (socket) => {
    const userId = socket.user?._id || socket.userId;
    socket.join(`user:${userId}`);
    socket.emit("connected", { socketId: socket.id, userId });

    // Register every event handler module automatically
    for (const file of eventFiles) {
      const registerEvents = require(path.join(eventsDir, file));
      if (typeof registerEvents === "function") {
        registerEvents(io, socket, userId);
        console.log(`[socket] Loaded events from ${file}`);
      }
    }

    socket.on("disconnect", (reason) => {
      console.log(`socket ${socket.id} disconnected, reason=${reason}`);
    });
  });

  messageService.init(io);
  return io;
}

module.exports = { initSocketServer };
