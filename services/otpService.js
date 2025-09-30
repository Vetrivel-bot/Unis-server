// services/otpService.js
const { pubClient } = require("../config/redisClient");

// A simple function to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates an OTP and stores it along with device details in Redis.
 * @param {string} identifier - The user's phone number or email.
 * @param {object} deviceDetails - An object containing device info.
 * @param {string} deviceDetails.deviceId - The unique ID of the device.
 * @param {string} deviceDetails.lastIP - The IP address of the user.
 * @param {string} [deviceDetails.deviceName] - The name of the device (optional).
 * @returns {string} The generated OTP.
 */
async function generateAndStoreOTP(identifier, deviceDetails) {
  const otp = generateOTP();
  const key = `otp:${identifier}`;
  const expiryInSeconds = 300; // 5 minutes

  if (!deviceDetails || !deviceDetails.deviceId) {
    throw new Error("Device ID is required to generate an OTP.");
  }

  // We store a JSON string containing the OTP and device info
  const value = JSON.stringify({
    otp,
    deviceId: deviceDetails.deviceId,
    lastIP: deviceDetails.lastIP,
    deviceName: deviceDetails.deviceName || "Unknown",
  }); // The 'EX' option sets an expiry time in seconds

  await pubClient.set(key, value, { EX: expiryInSeconds });

  console.log(
    `Stored OTP: ${otp} for ${identifier} on device ${deviceDetails.deviceId}. Expires in 5 minutes.`
  ); // In a real app, you would send the OTP via SMS or email here // sendSms(identifier, `Your OTP is: ${otp}`);
  return otp;
}

/**
 * Verifies an OTP and the device ID submitted by a user.
 * @param {string} identifier - The user's phone number or email.
 * @param {string} submittedOtp - The OTP the user entered.
 * @param {object} currentDeviceDetails - An object containing the current device's info.
 * @param {string} currentDeviceDetails.deviceId - The unique ID of the device making the request.
 * @returns {boolean} - True if the OTP and deviceId are valid, false otherwise.
 */
async function verifyOTP(identifier, submittedOtp, currentDeviceDetails) {
  const key = `otp:${identifier}`;
  const storedValue = await pubClient.get(key);

  if (!storedValue) {
    console.log(`No OTP found for ${identifier}. It might have expired.`);
    return false; // OTP has expired or never existed
  }

  // Parse the JSON string back into an object
  const storedData = JSON.parse(storedValue);

  // --- CRITICAL CHECK ---
  // We now verify BOTH the OTP and the Device ID
  if (
    storedData.otp === submittedOtp &&
    storedData.deviceId === currentDeviceDetails.deviceId
  ) {
    console.log(
      `OTP for ${identifier} verified successfully on device ${currentDeviceDetails.deviceId}.`
    ); // OTP is correct, delete it so it can't be used again
    await pubClient.del(key);
    return true;
  } else {
    if (storedData.otp !== submittedOtp) {
      console.log(`Invalid OTP for ${identifier}. Submitted: ${submittedOtp}`);
    }
    if (storedData.deviceId !== currentDeviceDetails.deviceId) {
      console.log(
        `Device ID mismatch for ${identifier}. Stored: ${storedData.deviceId}, Submitted: ${currentDeviceDetails.deviceId}`
      );
    }
    return false;
  }
}

module.exports = { generateAndStoreOTP, verifyOTP };
