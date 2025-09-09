const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyTokens');
const leadController = require('../controllers/leadControllers');

// Lead generation and management routes
router.post('/generate', verifyToken, leadController.generateLeads);
router.get('/', verifyToken, leadController.getLeads);
router.get('/search/:searchId', verifyToken, leadController.getSearchDetail);
router.put('/:searchId/contact/:contactIndex', verifyToken, leadController.updateLead);
router.delete('/:searchId', verifyToken, leadController.deleteLeadSearch);
router.get('/stats', verifyToken, leadController.getStats);
router.get('/progress/:searchId', verifyToken , leadController.getSearchProgress);


module.exports = router;