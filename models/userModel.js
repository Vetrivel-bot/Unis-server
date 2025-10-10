const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4(), required: true },

  phone: {
    type: String,
    unique: true,
    required: [true, "Phone number is required."],
    validate: {
      validator: (v) => /^[6-9]\d{9}$/.test(v),
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

  publicKey: { type: String, required: true }, // main identity key

  device: {
    deviceId: { type: String, required: true },
    deviceName: String,
    lastSeen: Date,
    lastIP: String,
    pushToken: String,
    addedAt: { type: Date, default: Date.now },
  },

  allowedContacts: [
    {
      contactId: {
        type: String,
        ref: "User", // references the User model
        required: true,
      },
      type: { type: String, enum: ["Group", "Contact"], default: "Contact" },
      alias: String,
      lastVerifiedAt: { type: Date, default: Date.now },
      addedAt: { type: Date, default: Date.now },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

// 🧩 Virtual populate: Resolve contact’s publicKey from User model
UserSchema.virtual("allowedContactsInfo", {
  ref: "Users",
  localField: "allowedContacts.contactId",
  foreignField: "_id",
  justOne: false,
  select: "publicKey phone role", // choose fields to auto-populate
});

// Ensure virtuals appear when converting to JSON or Object
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", UserSchema);
