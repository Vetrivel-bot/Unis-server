const jwt = require("jsonwebtoken");
const userModel = require("../model/userModel");
const RefreshToken = require("../model/RefreshTokenModel"); // Ensure this is imported

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

exports.jwtGeneration = async (req, res) => {
  try {
    const { phone, deviceName, deviceId, lastIP, publicKey, pushToken } =
      req.body;

    if (
      !phone ||
      !deviceName ||
      !deviceId ||
      !lastIP ||
      !publicKey ||
      !pushToken
    ) {
      return res.status(400).json({
        message:
          "Missing required fields. Please provide all required details.",
      });
    }

    let user = await userModel.findOne({ phone });

    if (user) {
      // SCENARIO 1: USER EXISTS - Update device info
      user = await userModel.findByIdAndUpdate(
        user._id,
        {
          $set: {
            publicKey,
            "device.deviceId": deviceId,
            "device.deviceName": deviceName,
            "device.lastSeen": new Date(),
            "device.lastIP": lastIP,
            "device.pushToken": pushToken,
          },
        },
        { new: true }
      );
    } else {
      // SCENARIO 2: NEW USER - Create user document
      user = await userModel.create({
        phone,
        publicKey,
        device: {
          deviceId,
          deviceName,
          lastIP,
          pushToken,
          lastSeen: new Date(),
        },
      });
    }

    // Generate JWT payload and tokens
    const jwtPayload = {
      _id: user._id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = jwt.sign(jwtPayload, ACCESS_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(jwtPayload, REFRESH_SECRET, {
      expiresIn: "30d",
    });

    // --- PROPERLY STORE THE REFRESH TOKEN ---
    // Calculate the expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Use findOneAndUpdate with upsert to create or update the token
    await RefreshToken.findOneAndUpdate(
      // Find by this unique combination
      { userId: user._id, "device.deviceId": deviceId },
      // Data to set on find or create
      {
        token: refreshToken,
        userId: user._id,
        expiresAt: expiryDate,
        "device.lastIP": lastIP,
        "device.deviceName": deviceName,
        lastUsed: new Date(),
      },
      // Options: create if it doesn't exist (upsert)
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // --- END OF REFRESH TOKEN LOGIC ---

    return res.status(200).json({
      message: "jwt successful.",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Authentication error:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A user with this phone number already exists." });
    }
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
