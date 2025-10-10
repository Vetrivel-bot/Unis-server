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

  io.on("connection", async (socket) => {
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
    
    messageService.init(io);

    // --- NEW: After handlers are registered, send pending messages ---
  try {
    // messageService.fetchPending should return an array of message rows
    const pending = await messageService.fetchPending(userId);

    if (pending.length > 0) {
      console.log(`[pending_messages] Sending ${pending.length} messages to ${userId}`);
    }

    for (const msg of pending) {
      socket.emit("chat_message", {
        id: msg.id,
        from: msg.from_user,
        to: msg.to_user,
        ciphertext: msg.ciphertext,
        nonce: msg.nonce,
        ts: msg.created_at,
      });
    }
    // Note: Keep status 'sent' until client explicitly emits message_delivered
  } catch (err) {
    console.error("[initSocketServer] Error sending pending messages:", err);
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
