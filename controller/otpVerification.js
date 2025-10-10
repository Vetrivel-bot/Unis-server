// controllers/authController.js
const { User } = require("../models/userModel");
const { verifyOTP } = require("../services/otpService");
const { createSessionTokens } = require("../services/authService");
const RefreshTokenModel = require("../models/RefreshTokenModel");

exports.otpVerification = async (req, res) => {
  try {
    const {
      phone,
      deviceName,
      deviceId,
      lastIP,
      otp,
      publicKey, // optional
      pushToken, // optional
    } = req.body;

    if (!phone || !deviceName || !deviceId || !lastIP || !otp) {
      return res.status(400).json({
        message:
          "Missing required fields. Provide phone, deviceName, deviceId, otp, and lastIP.",
      });
    }

    const deviceDetails = { deviceId };

    const isValid = await verifyOTP(phone, otp, deviceDetails);
    if (!isValid) {
      return res.status(400).json({ message: "OTP is invalid or expired." });
    }

    // OTP valid -> create session tokens & update/create user/device
    const { accessToken, refreshToken, user } = await createSessionTokens({
      phone,
      deviceName,
      deviceId,
      lastIP,
      publicKey,
      pushToken,
    });

    // Optionally set HttpOnly cookie for refresh token (recommended for web)
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "strict",
    //   maxAge: 30 * 24 * 60 * 60 * 1000,
    // });

    return res.status(200).json({
      message: "OTP verification successful.",
      accessToken,
      refreshToken,
      user: { _id: user._id, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    const status = error.status || 500;
    return res
      .status(status)
      .json({ message: error.message || "Internal server error." });
  }
};
