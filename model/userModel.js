const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4(), required: true },
  phone: {
    type: String,
    unique: true,
    required: [true, "Phone number is required."],

    // 1. Validator to ensure the format is a 10-digit Indian number
    validate: {
      validator: function (v) {
        // Regular expression to check for a 10-digit number starting with 6, 7, 8, or 9
        return /^[6-9]\d{9}$/.test(v);
      },
      message: (props) =>
        `${props.value} is not a valid 10-digit Indian mobile number!`,
    },

    // 2. Setter to automatically remove the "+91" prefix before saving
    set: function (v) {
      if (v && v.startsWith("+91")) {
        return v.substring(3); // Removes the first 3 characters ('+91')
      }
      if (v && v.length === 12 && v.startsWith("91")) {
        return v.substring(2); // Removes the first 2 characters ('91')
      }
      return v;
    },
  },
  role: {
    type: String,
    enum: ["Admin", "User"],
    default: "User",
  },
  publicKey: { type: String, required: true },
  device: {
    deviceId: { type: String, required: true },
    deviceName: String,
    lastSeen: Date,
    lastIP: String,
    pushToken: String,
    addedAt: { type: Date, default: Date.now },
  },

  // List of users or groups this user can chat with
  allowedContacts: [
    {
      contactId: { type: String, required: true }, // _id of the contact or group
      type: { type: String, enum: ["Group", "Contact"], default: "Contact" },
      addedAt: { type: Date, default: Date.now },
      alias: { type: String }, // optional nickname
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Index for fast lookup
// UserSchema.index({ phone: 1 });
// UserSchema.index({ _id: 1 });

module.exports = mongoose.model("User", UserSchema);
