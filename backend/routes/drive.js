const express = require("express");
const {
    listSpreadsheets,
    getSpreadsheetColumns,
    getColumnData,
    sendBulkEmails
} = require("../controllers/driveControllers");

const router = express.Router();

// List all spreadsheets
router.get('/spreadsheets', listSpreadsheets);

// Get columns for a specific spreadsheet
router.get('/spreadsheets/:spreadsheetId/columns', getSpreadsheetColumns);

// Get data from a specific column
router.get('/spreadsheets/:spreadsheetId/columns/:column/data', getColumnData);

// Send bulk emails
router.post('/send-emails', sendBulkEmails);

module.exports = router;