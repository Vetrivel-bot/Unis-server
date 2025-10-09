// put near top of file
const User = require("../models/User"); // adjust path if needed
const { getAllowedContacts } = require("../utilit/getAllowedContacts");

exports.Authenticator = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(400)
        .json({ message: "User ID or phone number is required" });
    }

    const incomingKey = req.body && req.body.publicKey && String(req.body.publicKey).trim();

    let updatedUser = user;

    // If a new public key is provided and it's different from stored key -> update
    if (incomingKey && incomingKey !== user.publicKey) {
      // 1) update current user's publicKey
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { publicKey: incomingKey },
        { new: true, useFindAndModify: false }
      );

      // Safety: if user not found for some reason, throw
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found while updating key" });
      }

      // 2) update peers' allowedContacts entries where contactId equals this user's id
      // This will set the PublicKey field of the matching array element(s).
      await User.updateMany(
        { "allowedContacts.contactId": user._id },
        { $set: { "allowedContacts.$[elem].PublicKey": incomingKey } },
        {
          arrayFilters: [{ "elem.contactId": user._id }],
          // no upsert, updateMany will affect all documents with the contact
        }
      );
    }

    // always fetch the allowed contacts fresh (reflects any updates)
    const allowedContacts = await getAllowedContacts(user._id);

    // normalize updatedUser to plain object if it's a mongoose doc
    const userObj = (updatedUser && updatedUser.toObject) ? updatedUser.toObject() : updatedUser;

    req.user = { ...userObj, allowedContacts };

    return res
      .status(200)
      .json({ message: "Authentication successful", user: req.user });
  } catch (error) {
    console.error("Authenticator error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


/*
Note:
-the publicKey field in UserSchema is required, so we assume it's always present.
- we only
change the public key only if the request contains a different key than the one stored or if the stored key is missing.
it will do the above one obly if it has { "publicKey": "BASE64_OR_HEX_NEW_KEY_HERE" } in  the request body. 
*/ 