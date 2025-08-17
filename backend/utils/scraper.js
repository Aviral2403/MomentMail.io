const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Create an https agent that doesn't verify SSL certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 45000
});

// Multiple User-Agent strings for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

// Enhanced headers for better success rate
const getRequestHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'DNT': '1'
});

// Test proxy connection
const testProxyConnection = async (proxyConfig) => {
  console.log('Testing proxy connection...');
  try {
    const testResponse = await axios.get('https://httpbin.org/ip', {
      proxy: {
        host: proxyConfig.host,
        port: proxyConfig.port,
        auth: proxyConfig.auth
      },
      timeout: 15000,
      httpsAgent
    });
    console.log(`Proxy working. External IP: ${testResponse.data.origin}`);
    return true;
  } catch (error) {
    console.error('Proxy test failed:', error.message);
    if (error.response?.status === 407) {
      console.error('Proxy authentication failed - check credentials');
    }
    return false;
  }
};

// Extract content with multiple strategies
const extractContent = (html, query) => {
  console.log('Starting content extraction...');
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, noscript, nav, footer, header, .ads, .advertisement').remove();
  
  // Strategy 1: Extract main search results
  const searchResults = [];
  
  // Google search result containers
  $('.g, .tF2Cxc, .MjjYud, .yuRUbf, .kCrYT').each((i, elem) => {
    const $elem = $(elem);
    const title = $elem.find('h3').text().trim();
    const snippet = $elem.find('.VwiC3b, .s3v9rd, .st').text().trim();
    const link = $elem.find('a').first().attr('href');
    
    if (title && snippet && snippet.length > 20) {
      searchResults.push({
        title,
        snippet,
        link,
        text: `${title} ${snippet}`
      });
    }
  });
  
  console.log(`Extracted ${searchResults.length} search result items`);
  
  // Strategy 2: Extract from main content areas
  const mainContent = [];
  
  // Common content selectors
  const contentSelectors = [
    '#main',
    '.main-content',
    '.content',
    '.search-results',
    '.results',
    '#results',
    '.organic-results',
    '.web-results'
  ];
  
  contentSelectors.forEach(selector => {
    const content = $(selector).text().trim();
    if (content && content.length > 100) {
      mainContent.push(content);
    }
  });
  
  // Strategy 3: Extract all text content as fallback
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  
  // Combine all extracted content
  let combinedResults = '';
  
  // Add structured search results
  if (searchResults.length > 0) {
    combinedResults += searchResults.map(result => 
      `Title: ${result.title}\nSnippet: ${result.snippet}\nLink: ${result.link}\n---\n`
    ).join('');
  }
  
  // Add main content
  if (mainContent.length > 0) {
    combinedResults += '\nMain Content:\n' + mainContent.join('\n\n');
  }
  
  // Add body text as fallback
  if (combinedResults.length < 500 && bodyText.length > 200) {
    combinedResults += '\n\nAdditional Content:\n' + bodyText.substring(0, 5000);
  }
  
  console.log(`Total extracted content length: ${combinedResults.length} characters`);
  console.log(`Search results found: ${searchResults.length}`);
  
  return combinedResults;
};

// Main scraping function with proxy
const scrapeWithProxy = async (query, proxyConfig, retries = 3) => {
  console.log(`Starting scrape with proxy for query: ${query}`);
  console.log(`Proxy: ${proxyConfig.host}:${proxyConfig.port}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Starting scrape attempt`);
      
      // Test proxy connection first
      const proxyWorking = await testProxyConnection(proxyConfig);
      if (!proxyWorking) {
        if (attempt === retries) {
          throw new Error('Proxy connection failed after all attempts');
        }
        console.log('Proxy failed, retrying with delay...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50&start=0&hl=en&gl=us&pws=0`;
      console.log(`Search URL: ${searchUrl}`);
      
      console.log('Making request to Google with proxy...');
      const response = await axios.get(searchUrl, {
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          auth: proxyConfig.auth
        },
        httpsAgent,
        timeout: 60000, // Increased timeout
        maxRedirects: 5,
        headers: getRequestHeaders()
      });

      console.log(`Request successful! Status: ${response.status}, Data length: ${response.data.length}`);

      // Check for Google blocking or errors
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check for blocking patterns
      const blockingPatterns = [
        'unusual traffic',
        'CAPTCHA',
        'blocked',
        'Our systems have detected unusual traffic',
        'solve the CAPTCHA',
        'automated queries',
        'terms of service'
      ];
      
      const responseText = response.data.toLowerCase();
      const isBlocked = blockingPatterns.some(pattern => responseText.includes(pattern.toLowerCase()));
      
      if (isBlocked) {
        console.warn('Google blocking detected, trying different approach...');
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 3000; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error('Google blocking detected after all retries');
        }
      }

      // Extract content using multiple strategies
      const extractedContent = extractContent(response.data, query);
      
      if (extractedContent.length < 200) {
        console.warn(`Low content extracted (${extractedContent.length} chars), retrying...`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        } else {
          throw new Error('Insufficient content extracted after all attempts');
        }
      }

      console.log(`Successfully extracted ${extractedContent.length} characters of content`);
      return extractedContent;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (error.code === 'ECONNABORTED') {
        console.log('Request timed out');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('Connection refused - proxy may be down');
      } else if (error.code === 'ENOTFOUND') {
        console.log('DNS resolution failed');
      } else if (error.response?.status === 407) {
        console.log('Proxy authentication failed');
      }
      
      if (attempt === retries) {
        throw new Error(`Scraping failed after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, attempt) * 2000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Fallback scraping without proxy
const scrapeWithoutProxy = async (query, retries = 2) => {
  console.log('Attempting scrape without proxy as fallback...');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Fallback Attempt ${attempt}/${retries}] Starting direct scrape`);
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;
      console.log(`Direct search URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        timeout: 30000,
        headers: getRequestHeaders(),
        httpsAgent
      });

      console.log(`Direct request successful! Status: ${response.status}`);

      // Check for blocking
      const responseText = response.data.toLowerCase();
      if (responseText.includes('unusual traffic') || responseText.includes('captcha')) {
        throw new Error('Google blocking detected in direct request');
      }

      const extractedContent = extractContent(response.data, query);
      
      if (extractedContent.length < 100) {
        throw new Error('Insufficient content from direct request');
      }

      console.log(`Direct scraping successful: ${extractedContent.length} characters`);
      return extractedContent;
    } catch (error) {
      console.error(`Direct scrape attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`Direct scraping failed: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Alternative search engines as backup
const scrapeAlternativeEngine = async (query) => {
  console.log('Trying alternative search engine...');
  
  try {
    // Use Bing as alternative
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=50`;
    console.log(`Bing search URL: ${bingUrl}`);
    
    const response = await axios.get(bingUrl, {
      timeout: 30000,
      headers: getRequestHeaders(),
      httpsAgent
    });
    
    console.log(`Bing request successful! Status: ${response.status}`);
    
    const $ = cheerio.load(response.data);
    
    // Extract Bing search results
    const results = [];
    $('.b_algo').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2 a').text().trim();
      const snippet = $elem.find('.b_caption p').text().trim();
      const link = $elem.find('h2 a').attr('href');
      
      if (title && snippet) {
        results.push(`Title: ${title}\nSnippet: ${snippet}\nLink: ${link}\n---\n`);
      }
    });
    
    const content = results.join('');
    console.log(`Bing extraction successful: ${content.length} characters`);
    return content;
    
  } catch (error) {
    console.error('Alternative search engine failed:', error.message);
    throw error;
  }
};

module.exports = {
  scrapeWithProxy,
  scrapeWithoutProxy,
  scrapeAlternativeEngine,
  testProxyConnection
};