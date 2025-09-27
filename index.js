// index.js
const port = process.env.PORT || 3000;
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const ConnectDataBase = require("./config/ConnectMongo");
const { createServer } = require("http");
const mongoose = require("mongoose");

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());

// Bootstrap app
(async () => {
  try {
    await ConnectDataBase(); // wait for MongoDB to connect

    server.listen(port, "127.0.0.1", () => {
      console.log(`Unis server running on http://127.0.0.1:${port}`);
    });
  } catch (err) {
    console.error("❌ Startup failed (DB not connected):", err.message || err);
    process.exit(1); // let nodemon restart
  }
})();

// optional: gracefully shut down if DB disconnects
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  DB disconnected — shutting down server");
});
