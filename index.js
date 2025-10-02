require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// CHANGED: Make sure you import pubClient and subClient here as well
const { connectRedis, pubClient, subClient } = require("./config/redisClient");

//  Database imports
const connectMongo = require("./config/ConnectMongo"); // Mongo
const { connectPostgres } = require("./config/ConnectPostgres"); // Postgres

// Socket server
const { initSocketServer } = require("./sockets/socketServer");

const { createServer } = require("http");
const app = express();
const server = createServer(app);

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

// Bootstrap app with all DBs
(async () => {
  try {
    // CHANGED: Added connectRedis() to the Promise.all array
    await Promise.all([connectMongo(), connectPostgres(), connectRedis()]);

    // CHANGED: Pass the connected pubClient and subClient to the socket server
    await initSocketServer(server, { pubClient, subClient });

    // register routes
    app.use("/api", require("./routes/index"));
    server.listen(port, "0.0.0.0", () => {
      console.log(`☑️   Unis server running on http://127.0.0.1:${port}`);
      console.log("=".repeat(process.stdout.columns || 80));
    });
  } catch (err) {
    console.error("❌ Startup failed (DB not connected):", err.message || err);
    process.exit(1); // let nodemon restart
  }
})();

// Optional: gracefully handle MongoDB disconnect
const mongoose = require("mongoose");
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected — shutting down server");
});
