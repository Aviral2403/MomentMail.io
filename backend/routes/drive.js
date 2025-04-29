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

// Google Drive connection
router.get('/connect-drive', connectGoogleDrive);

// Spreadsheet operations
router.get('/spreadsheets', listSpreadsheets);
router.get('/spreadsheets/:spreadsheetId/columns', getSpreadsheetColumns);
router.get('/spreadsheets/:spreadsheetId/columns/:column/data', getColumnData);

// Email operations
router.post('/send-emails', sendBulkEmails);
router.get('/scheduled-emails', getScheduledEmails);
router.get('/email-history', getEmailHistory);
router.delete('/scheduled-emails/:scheduledEmailId', cancelScheduledEmail);
router.post('/email-status', checkEmailStatus);

module.exports = router;