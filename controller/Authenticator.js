const { getAllowedContacts } = require("../utilit/getAllowedContacts");


exports.Authenticator = async (req, res) => {
  const { userIdOrPhone } = req.body;

  if (!userIdOrPhone) {
    return res.status(400).json({ message: "User ID or phone number is required" });
  }
  try {
    const allowedContacts = await getAllowedContacts(userIdOrPhone);
    req.user = { id: userIdOrPhone, allowedContacts };
    if (!allowedContacts.length) {
      return res.status(403).json({ message: "No allowed contacts found" });
    }
    res
    .status(200)
    .json({ message: "Authentication successful", user: req.user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
   }
};
