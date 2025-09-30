// routes/messages.js
const express = require("express");
const router = express.Router();
// const {Auth_MiddleWare}=
// const { sendText } = require("../controllers/messageController");
// const { upload, uploadFileHandler } = require("../controllers/fileController");
const { Auth_MiddleWare } = require("../middleware/Auth_Middleware");
// text message
router.get("/", Auth_MiddleWare(), (req, res) => {
  res.status(200).json({ message: "Authenticated" });
});

// file upload endpoint
// router.post("/upload", expressAuth, upload.single("file"), uploadFileHandler);

module.exports = router;
