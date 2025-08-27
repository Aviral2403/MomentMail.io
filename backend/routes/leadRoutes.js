const express = require('express');
const router = express.Router();
const verifyTokens = require('../middleware/verifyTokens');
const leadController = require('../controllers/leadControllers');

router.post('/generate', verifyTokens, leadController.generateLeads);
router.get('/history', verifyTokens, leadController.getLeadHistory);
router.get('/history/:id', verifyTokens, leadController.getLeadDetails);
router.put('/update/:searchId/:leadIndex', verifyTokens, leadController.updateLeadNotes);
router.delete('/delete/:id', verifyTokens, leadController.deleteSearch);

module.exports = router;