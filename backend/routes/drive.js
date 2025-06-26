const express = require("express");
const router = express.Router();
const {
    connectGoogleDrive,
    listSpreadsheets,
    getSpreadsheetColumns,
    getColumnData,
    sendBulkEmails,
    getScheduledEmails,
    getEmailHistory,
    cancelScheduledEmail,
    checkEmailStatus
} = require("../controllers/driveControllers");
const verifyTokens = require("../middleware/verifyTokens");

// Google Drive connection
router.get('/connect-drive', connectGoogleDrive);

// Spreadsheet operations
router.get('/spreadsheets', verifyTokens , listSpreadsheets);
router.get('/spreadsheets/:spreadsheetId/columns', verifyTokens , getSpreadsheetColumns);
router.get('/spreadsheets/:spreadsheetId/columns/:column/data', verifyTokens , getColumnData);

// Email operations
router.post('/send-emails', verifyTokens , sendBulkEmails);
router.get('/scheduled-emails', verifyTokens , getScheduledEmails);
router.get('/email-history', verifyTokens , getEmailHistory);
router.delete('/scheduled-emails/:scheduledEmailId', verifyTokens , cancelScheduledEmail);
router.post('/email-status', verifyTokens , checkEmailStatus);

module.exports = router;