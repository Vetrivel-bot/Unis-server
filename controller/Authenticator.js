exports.Authenticator = async (req, res) => {
  res
    .status(200)
    .json({ message: "Authentication successful", user: req.user });
};
