const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4(), required: true },
  phone: {
    type: String,
    unique: true,
    required: [true, "Phone number is required."],
    validate: {
      validator: function (v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: (props) =>
        `${props.value} is not a valid 10-digit Indian mobile number!`,
    },
    set: function (v) {
      if (v && v.startsWith("+91")) return v.substring(3);
      if (v && v.length === 12 && v.startsWith("91")) return v.substring(2);
      return v;
    },
  },

  role: {
    type: String,
    enum: ["Admin", "User"],
    default: "User",
  },

  publicKey: { type: String, required: true }, // Long-term identity key (main public key)

  device: {
    deviceId: { type: String, required: true },
    deviceName: String,
    lastSeen: Date,
    lastIP: String,
    pushToken: String,
    addedAt: { type: Date, default: Date.now },
  },

  // ✅ List of users or groups this user can chat with
  allowedContacts: [
    {
      contactId: { type: String, required: true }, // _id of the contact or group
      type: { type: String, enum: ["Group", "Contact"], default: "Contact" },
      alias: { type: String }, // optional nickname

      // ✅ Add chat keys (for startup verification)
      ephemeralPublicKey: { type: String, required: true },

      // Optional metadata
      lastVerifiedAt: { type: Date, default: Date.now },
      addedAt: { type: Date, default: Date.now },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

// module.exports
module.exports = mongoose.model("User", UserSchema);
