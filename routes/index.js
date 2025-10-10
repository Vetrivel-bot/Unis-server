// routes/index.js
const { Authenticator } = require("../controller/Authenticator");
const { Auth_MiddleWare } = require("../middleware/Auth_Middleware");

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.json({ ok: true, service: "Unis" }));

router.use("/login", require("./authRoutes"));
router.use("/messages", require("./messages"));
router.post("/auth", Auth_MiddleWare(), Authenticator);

module.exports = router;
