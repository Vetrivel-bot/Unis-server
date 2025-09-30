const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  token: { type: String, required: true },
  // This field will now be enforced as unique by the index below
  userId: { type: String, ref: "User", required: true },
  device: {
    deviceId: { type: String, required: true },
    deviceName: String,
    lastSeen: Date,
    lastIP: String,
  },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Auto-delete documents after expiration
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// FIX: Enforce that each user can only have one token
schema.index({ userId: 1 }, { unique: true });

// The token itself should also be unique
schema.index({ token: 1 }, { unique: true });

module.exports = mongoose.model("RefreshToken", schema);
