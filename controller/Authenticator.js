// put near top of file
const User = require("../models/userModel");
const { getAllowedContacts } = require("../utils/getAllowedContacts");

exports.Authenticator = async (req, res) => {
  console.log("Authenticator called");
  
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(400)
        .json({ message: "User ID or phone number is required" });
    }

    const incomingKey =
      req.body && req.body.publicKey && String(req.body.publicKey).trim();

    let updatedUser = user;

    if (incomingKey && incomingKey !== user.publicKey) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { publicKey: incomingKey },
        { new: true, useFindAndModify: false }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ message: "User not found while updating key" });
      }

      await User.updateMany(
        { "allowedContacts.contactId": user._id },
        { $set: { "allowedContacts.$[elem].PublicKey": incomingKey } },
        { arrayFilters: [{ "elem.contactId": user._id }] }
      );
    }

    // fetch fresh user with populated contact documents
    const populatedUserDoc = await User.findById(updatedUser._id)
      .populate({
        path: "allowedContacts.contactId",
        select: "publicKey phone ",
      })
      .lean();

    // Normalize allowedContacts and inject PublicKey (safely pull from populated contactId)
    const mergedAllowedContacts = (populatedUserDoc.allowedContacts || []).map(
      (ac) => {
        const contactDoc =
          ac.contactId && typeof ac.contactId === "object"
            ? ac.contactId
            : null;
        return {
          _id: ac._id,
          contactId: contactDoc ? contactDoc._id : ac.contactId,
          type: ac.type,
          addedAt: ac.addedAt,
          alias: ac.alias,
          lastVerifiedAt: ac.lastVerifiedAt,
          id: ac._id,
          PublicKey: contactDoc ? contactDoc.publicKey : ac.PublicKey || null,
          phone: contactDoc ? contactDoc.phone : null,
        };
      }
    );

    // getAllowedContacts if you need additional normalization / ordering (still call to keep existing behavior)
    const allowedContactsFromUtil = await getAllowedContacts(user._id);

    // prefer mergedAllowedContacts but fall back / merge with util results where applicable
    const finalAllowedContacts =
      mergedAllowedContacts.length > 0
        ? mergedAllowedContacts
        : allowedContactsFromUtil;

    const userObj =
      populatedUserDoc && populatedUserDoc.toObject
        ? populatedUserDoc.toObject()
        : populatedUserDoc;

    // --- CHANGE IS HERE ---
    // Remove the original 'allowedContacts' property before sending the response
    delete userObj.allowedContacts;

    req.user = { ...userObj, contacts: finalAllowedContacts };

    return res
      .status(200)
      .json({ message: "Authentication successful", user: req.user });
  } catch (error) {
    console.error("Authenticator error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
