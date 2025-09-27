// connectDatabase.js
const mongoose = require("mongoose");
require("dotenv").config();

const connectDataBase = async () => {
  try {
    const uri =
      process.env.MONGO_DB?.trim() || "mongodb://127.0.0.1:27017/mydb";

    if (!process.env.MONGO_DB) {
      console.warn(
        "⚠️  MONGO_DB not set — using fallback mongodb://127.0.0.1:27017/mydb"
      );
    }

    // Instrument query exec to log slow queries (>100ms)
    const origExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = async function (...args) {
      const start = Date.now();
      try {
        const res = await origExec.apply(this, args);
        const duration = Date.now() - start;
        if (duration > 100) {
          console.warn(
            `🐢 Slow query: ${this.model.collection.name}.${
              this.op
            } ${JSON.stringify(this.getQuery())} took ${duration}ms`
          );
        }
        return res;
      } catch (err) {
        throw err;
      }
    };

    await mongoose.connect(uri, {
      // force IPv4 (prevents ::1/IPv6 ECONNREFUSED)
      family: 4,

      // pool + timeouts
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // safe writes
      retryWrites: true,
      writeConcern: { w: "majority" },
    });

    console.log("✅ MongoDB connected & pool ready");

    mongoose.connection.on("connected", () =>
      console.log("ℹ️ MongoDB connection established")
    );
    mongoose.connection.on("reconnected", () =>
      console.log("♻️ MongoDB reconnected")
    );
    mongoose.connection.on("disconnected", () =>
      console.warn("⚠️ MongoDB disconnected")
    );
    mongoose.connection.on("close", () =>
      console.warn("⚠️ MongoDB connection closed")
    );
    mongoose.connection.on("error", (err) =>
      console.error("❌ MongoDB connection error:", err)
    );
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message || err);
    process.exit(1); // keep if you want the process to stop on DB failure
  }
};

module.exports = connectDataBase;
