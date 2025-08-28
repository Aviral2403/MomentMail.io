// utils/debugUtils.js - Add this new file to help debug issues

class DebugUtils {
  static logCrawlAttempt(url, config) {
    console.log('\n=== CRAWL ATTEMPT DEBUG ===');
    console.log('URL:', url);
    console.log('Config:', {
      timeout: config.timeout,
      hasProxy: !!config.proxy,
      proxyHost: config.proxy?.host,
      userAgent: config.headers['User-Agent']?.substring(0, 50) + '...',
      headers: Object.keys(config.headers)
    });
  }

  static logCrawlResponse(url, response, error = null) {
    if (error) {
      console.log('\n=== CRAWL ERROR DEBUG ===');
      console.log('URL:', url);
      console.log('Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED',
        network: error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED'
      });
    } else {
      console.log('\n=== CRAWL SUCCESS DEBUG ===');
      console.log('URL:', url);
      console.log('Response:', {
        status: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.data?.length || 0,
        hasHtmlContent: typeof response.data === 'string' && response.data.includes('<html')
      });
    }
  }

  static logContactExtraction(url, contactInfo) {
    console.log('\n=== CONTACT EXTRACTION DEBUG ===');
    console.log('URL:', url);
    console.log('Extracted:', {
      businessName: contactInfo.businessName,
      emailCount: contactInfo.emails?.filter(e => e !== 'N/A').length || 0,
      phoneCount: contactInfo.phones?.filter(p => p !== 'N/A').length || 0,
      socialCount: contactInfo.socialLinks?.length || 0,
      hasValidEmail: contactInfo.emails?.some(e => e !== 'N/A' && e.includes('@')) || false,
      hasValidPhone: contactInfo.phones?.some(p => p !== 'N/A' && p.length >= 10) || false
    });
  }

  static logSearchResults(query, results) {
    console.log('\n=== SEARCH RESULTS DEBUG ===');
    console.log('Query:', query);
    console.log('Results:', {
      totalResults: results.data?.searchInformation?.totalResults || 0,
      itemCount: results.data?.items?.length || 0,
      urls: results.data?.items?.map(item => item.link).slice(0, 3) || []
    });
  }

  static async testSingleUrl(url) {
    console.log('\n=== SINGLE URL TEST ===');
    console.log('Testing URL:', url);
    
    const axios = require('axios');
    const cheerio = require('cheerio');
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const text = $('body').text();
      const title = $('title').text();
      
      console.log('Test Results:', {
        status: response.status,
        contentLength: response.data.length,
        title: title.substring(0, 100),
        bodyTextLength: text.length,
        hasContactInfo: text.toLowerCase().includes('contact') || text.includes('@'),
        emailMatches: (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length,
        phoneMatches: (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g) || []).length
      });
      
      return true;
    } catch (error) {
      console.log('Test Failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status
      });
      return false;
    }
  }
}

module.exports = DebugUtils;