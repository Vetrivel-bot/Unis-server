// routes/index.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.json({ ok: true, service: "Unis" }));
router.use("/login", require("./authRoutes"));
router.use('/messages', require('./messages'));

module.exports = router;
