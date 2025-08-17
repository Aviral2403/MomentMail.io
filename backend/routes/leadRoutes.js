const express = require('express');
const router = express.Router();
const verifyTokens = require('../middleware/verifyTokens');
const leadController = require('../controllers/leadControllers'); // Use the enhanced version
const { leadGenerationLimiter } = require('../utils/rateLimiter');

console.log('Imported enhanced leadController:', leadController);
console.log('generateLeads function:', typeof leadController.generateLeads);
console.log('Available functions:', Object.keys(leadController));

// Enhanced routes with better error handling
router.post('/generate', verifyTokens, leadGenerationLimiter, async (req, res) => {
  console.log('\n' + '='.repeat(50));
  console.log('LEAD GENERATION REQUEST RECEIVED');
  console.log('='.repeat(50));
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user?.email || 'Unknown');
  
  try {
    await leadController.generateLeads(req, res);
  } catch (error) {
    console.error('Route error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during lead generation',
        error: error.message
      });
    }
  }
});

// Test endpoint to verify scraping works
router.get('/test-scraping', verifyTokens, async (req, res) => {
  const { testScraping } = require('../utils/antiDetectionScraper');
  
  try {
    console.log('Testing scraping functionality...');
    const testResult = await testScraping('wedding photographers Delhi');
    
    res.json({
      success: testResult,
      message: testResult ? 'Scraping test passed' : 'Scraping test failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Scraping test failed',
      error: error.message
    });
  }
});

// Debug endpoint to check what Google returns
router.post('/debug-google', verifyTokens, async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter required'
    });
  }
  
  try {
    const { enhancedGoogleScraping } = require('../utils/antiDetectionScraper');
    
    console.log(`Debug: Testing Google scraping for: ${query}`);
    const result = await enhancedGoogleScraping(query, { maxAttempts: 1 });
    
    res.json({
      success: true,
      query,
      contentLength: result.length,
      content: result.substring(0, 1000) + '...',
      hasEmails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(result),
      hasPhones: /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(result)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug scraping failed',
      error: error.message,
      query
    });
  }
});

// Other routes remain the same
router.get('/history', verifyTokens, leadController.getLeadHistory);
router.get('/history/:id', verifyTokens, leadController.getLeadDetails);
router.post('/tag', verifyTokens, leadController.addTagToLead);
router.delete('/tag/:tagId', verifyTokens, leadController.removeTagFromLead);
router.put('/note/:leadId', verifyTokens, leadController.addNoteToLead);

module.exports = router;