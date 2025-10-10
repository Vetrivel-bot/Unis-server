const userModel = require("../models/userModel");
const { generateAndStoreOTP } = require("../services/otpService");
exports.otpGeneration = async (req, res) => {
  try {
    // 1. Get the required fields from the request body
    const { phone, deviceName, deviceId, lastIP } = req.body;
    // Define the regular expression for an Indian mobile number
    const indianMobileRegex = /^(\+91|91|0)?[ -]?[6-9]\d{9}$/;
    // 2. Check if any of the required fields are missing
    if (!phone || !deviceName || !deviceId || !lastIP) {
      // If a field is missing, send a 400 Bad Request response
      return res.status(400).json({
        message:
          "Missing required fields. Please provide phone, deviceName, deviceId, and lastIP.",
      });
    }
    // The inline 'if' condition
    if (!indianMobileRegex.test(phone)) {
      return res.status(400).json({
        message: "A valid 10-digit Indian mobile number is required.",
      });
    }
    const exist = await userModel.findOne({ phone: phone });
    if (!exist) {
      return res.status(400).json({
        message: "Register for the credentials to login",
      });
    }
    const deviceDetails = {
      deviceName,
      deviceId,
      lastIP,
    };
    const otp = await generateAndStoreOTP(phone, deviceDetails);
    if (!otp) {
      res.status(500).json({ message: "Problem in generating otp for you" });
    }
    res.status(200).json({ message: "OTP sent to your Number." });
  } catch (error) {
    // 3. Catch any unexpected errors during the process
    console.error("Login error:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
};
