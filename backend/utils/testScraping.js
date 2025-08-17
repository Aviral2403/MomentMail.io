const { multiStrategyScraping } = require('./antiDetectionScraper');
const { processWithGemini } = require('./aiProcessor');

// Test the complete pipeline
const testCompletePipeline = async () => {
  console.log('\n🧪 TESTING COMPLETE LEAD GENERATION PIPELINE');
  console.log('='.repeat(60));
  
  const testCases = [
    {
      keyword: 'wedding photographers',
      location: 'Delhi',
      query: 'site:facebook.com ("wedding photographers" "Delhi") contact'
    },
    {
      keyword: 'web developers',
      location: 'Mumbai',
      query: '"web developers" "Mumbai" contact email'
    },
    {
      keyword: 'digital marketers',
      location: 'Bangalore',
      query: '"digital marketing" "Bangalore" freelancer contact'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.keyword} in ${testCase.location} ---`);
    
    try {
      // Step 1: Test scraping
      console.log('1. Testing web scraping...');
      const scrapedContent = await multiStrategyScraping(testCase.query, { 
        maxAttempts: 2 
      });
      
      if (!scrapedContent.content || scrapedContent.content.length < 100) {
        console.log('❌ Scraping failed - insufficient content');
        continue;
      }
      
      console.log(`✅ Scraping successful: ${scrapedContent.content.length} chars via ${scrapedContent.strategy}`);
      
      // Step 2: Test AI processing
      console.log('2. Testing AI processing...');
      const leads = await processWithGemini(
        scrapedContent.content, 
        'facebook', 
        testCase.keyword, 
        testCase.location
      );
      
      console.log(`✅ AI processing completed: ${leads.length} leads found`);
      
      if (leads.length > 0) {
        console.log('Sample lead:', JSON.stringify(leads[0], null, 2));
      }
      
      console.log(`✅ PIPELINE TEST PASSED for ${testCase.keyword}`);
      
    } catch (error) {
      console.error(`❌ PIPELINE TEST FAILED for ${testCase.keyword}:`, error.message);
    }
  }
};

// Test Google blocking detection
const testGoogleBlocking = async () => {
  console.log('\n🔍 TESTING GOOGLE BLOCKING DETECTION');
  console.log('='.repeat(60));
  
  const testQueries = [
    'site:facebook.com "wedding photographers" "Delhi"',
    'site:instagram.com "photographers" "Mumbai"',
    '"web developer" "contact" "email"'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`\nTesting query: ${query}`);
      
      const result = await multiStrategyScraping(query, { maxAttempts: 1 });
      
      if (result.content.length > 200) {
        console.log(`✅ Query successful: ${result.content.length} chars`);
        
        // Check for actual contact information
        const emails = result.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = result.content.match(/\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
        
        console.log(`   📧 Emails found: ${emails.length}`);
        console.log(`   📞 Phones found: ${phones.length}`);
        
        if (emails.length > 0 || phones.length > 0) {
          console.log(`   ✅ Contact information detected!`);
        } else {
          console.log(`   ⚠️  No contact information in results`);
        }
      } else {
        console.log(`❌ Query failed: insufficient content (${result.content.length} chars)`);
      }
      
    } catch (error) {
      console.error(`❌ Query failed: ${error.message}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

// Run all tests
const runAllTests = async () => {
  try {
    await testGoogleBlocking();
    await testCompletePipeline();
    
    console.log('\n🎉 ALL TESTS COMPLETED');
    console.log('Check the results above to identify any remaining issues.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
};

module.exports = {
  testCompletePipeline,
  testGoogleBlocking,
  runAllTests
};

// If running directly
if (require.main === module) {
  runAllTests();
}