// routes/authRoutes.js
const express = require("express");
const { otpGeneration } = require("../controller/otpGeneration");
const { otpVerification } = require("../controller/otpVerification");
const router = express.Router();
router.post("/auth1", otpGeneration);
router.post("/auth2", otpVerification);
module.exports = router;
