const { getAllowedContacts } = require("../utilit/getAllowedContacts");

exports.Authenticator = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(400)
      .json({ message: "User ID or phone number is required" });
  }
  try {
    const allowedContacts = await getAllowedContacts(user._id);
    console.log("Allowed Contacts:", user);

    req.user = { ...req.user, allowedContacts };
    // if (!allowedContacts.length) {
    //   return res.status(403).json({ message: "No allowed contacts found" });
    // }
    res
      .status(200)
      .json({ message: "Authentication successful", user: req.user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
