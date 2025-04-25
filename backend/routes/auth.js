const express = require("express");
const { googleAuth } = require("../controllers/authControllers");
const { connectGoogleDrive } = require("../controllers/driveControllers");
const router = express.Router();

router.get('/google', googleAuth);
router.get('/connect-drive', connectGoogleDrive);

module.exports = router;