// routes/authRoutes.js
const express = require("express");
const { otpGeneration } = require("../controller/otpGeneration");
const { otpVerification } = require("../controller/otpVerification");
const { Authenticator } = require("../controller/Authenticator");
const { Auth_MiddleWare } = require("../middleware/Auth_Middleware");
const router = express.Router();
router.get("/auth", Auth_MiddleWare(), Authenticator);
router.post("/auth1", otpGeneration);
router.post("/auth2", otpVerification);
module.exports = router;
