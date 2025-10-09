// routes/authRoutes.js
const express = require("express");
const { otpGeneration } = require("../controller/otpGeneration");
const { otpVerification } = require("../controller/otpVerification");
const { Authenticator } = require("../controller/Authenticator");
const router = express.Router();
router.post("/auth1", otpGeneration);
router.post("/auth2", otpVerification);
router.get("/auth3", Authenticator);
module.exports = router;
