const express = require("express");
const { googleAuth, refreshToken } = require("../controllers/authControllers");
const router = express.Router();

// FIXED: Removed duplicate drive connection route since it's now in /api/drive
router.get('/google', googleAuth);
router.post('/refresh-token', refreshToken);

module.exports = router;