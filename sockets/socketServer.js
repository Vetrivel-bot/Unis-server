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
    // The user object is attached by the Auth_MiddleWare
    const user = socket.user;
    if (!user) {
      // This shouldn't happen if the middleware is working, but it's a good safeguard.
      console.log(
        `[socket] Connection from ${socket.id} rejected: No user attached.`
      );
      socket.disconnect();
      return;
    }

    const userId = user._id;
    socket.join(`user:${userId}`);

    // --- CHANGE IS HERE ---
    // Send the full user object to the client upon connection.
    socket.emit("connected", {
      socketId: socket.id,
      user: user, // user object contains _id, phone, and role
    });
    console.log(`[socket] User connected: ${userId} (${socket.id})`);

    // Register every event handler module automatically
    for (const file of eventFiles) {
      const registerEvents = require(path.join(eventsDir, file));
      if (typeof registerEvents === "function") {
        registerEvents(io, socket, userId);
        console.log(`[socket] Loaded events from ${file}`);
      }
    }

    socket.on("disconnect", (reason) => {
      console.log(
        `[socket] User disconnected: ${userId} (${socket.id}), reason=${reason}`
      );
    });
  });

  messageService.init(io);
  return io;
}

module.exports = { initSocketServer };
