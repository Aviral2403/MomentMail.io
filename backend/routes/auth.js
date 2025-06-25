const express = require("express");
const { googleAuth, refreshToken } = require("../controllers/authControllers");
const { connectGoogleDrive } = require("../controllers/driveControllers");
const router = express.Router();

router.get('/google', googleAuth);
router.get('/connect-drive', connectGoogleDrive);
router.post('/refresh-token', refreshToken);


module.exports = router;