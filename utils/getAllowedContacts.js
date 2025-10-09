const User = require("../models/userModel");

/**
 * Get all allowed contacts of a user
 * @param {String} userIdOrPhone - The user's _id or phone number
 * @returns {Promise<Array>} List of allowed contacts
 */
async function getAllowedContacts(userIdOrPhone) {
  try {
    // Find user by either ID or phone
    const user = await User.findOne({ _id: userIdOrPhone }).select("allowedContacts");

    if (!user) {
      throw new Error("User not found");
    }

    return user.allowedContacts || [];
  } catch (error) {
    console.error("Error fetching allowed contacts:", error.message);
    throw error;
  }
}

module.exports = { getAllowedContacts };
