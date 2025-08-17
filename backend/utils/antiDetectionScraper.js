const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Enhanced user agent rotation with real browser fingerprints
const REALISTIC_USER_AGENTS = [
  // Chrome on Windows 10
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
  
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

// Session management for consistent fingerprinting
class BrowserSession {
  constructor() {
    this.userAgent = this.getRandomUserAgent();
    this.acceptLanguage = this.getRandomAcceptLanguage();
    this.viewport = this.getRandomViewport();
    this.sessionId = this.generateSessionId();
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
  
  getRandomUserAgent() {
    return REALISTIC_USER_AGENTS[Math.floor(Math.random() * REALISTIC_USER_AGENTS.length)];
  }
  
  getRandomAcceptLanguage() {
    const languages = [
      'en-US,en;q=0.9',
      'en-US,en;q=0.9,es;q=0.8',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.8,fr;q=0.6',
      'en-US,en;q=0.9,de;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
  }
  
  getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }
  
  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  getHeaders() {
    const isChrome = this.userAgent.includes('Chrome');
    const isFirefox = this.userAgent.includes('Firefox');
    const isSafari = this.userAgent.includes('Safari') && !this.userAgent.includes('Chrome');
    
    let headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1'
    };
    
    // Add browser-specific headers
    if (isChrome) {
      headers = {
        ...headers,
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': this.userAgent.includes('Windows') ? '"Windows"' : '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      };
    } else if (isFirefox) {
      headers = {
        ...headers,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      };
    }
    
    return headers;
  }
  
  async waitForNextRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 2000 + (this.requestCount * 500); // Increasing delay
    const randomDelay = Math.random() * 3000; // 0-3 second random delay
    const totalDelay = Math.max(minDelay - timeSinceLastRequest, 0) + randomDelay;
    
    if (totalDelay > 0) {
      console.log(`Waiting ${Math.round(totalDelay)}ms for natural request pacing...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
    
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }
}

// Create HTTPS agent with better configuration
const createHttpsAgent = () => {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 30000,
    timeout: 30000,
    maxSockets: 1, // Limit concurrent connections
    secureProtocol: 'TLSv1_2_method'
  });
};

// Enhanced Google search URL generation
const generateGoogleSearchUrl = (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    num: options.num || 50,
    start: options.start || 0,
    hl: options.hl || 'en',
    gl: options.gl || 'us',
    pws: '0', // Disable personalization
    filter: '0', // Don't filter results
    safe: 'off', // Don't filter adult content
    lr: 'lang_en', // Language restriction
    cr: 'countryUS', // Country restriction
    ie: 'UTF-8',
    oe: 'UTF-8'
  });
  
  return `https://www.google.com/search?${params.toString()}`;
};

// Enhanced content extraction with better Google result parsing
const extractGoogleResults = (html, query) => {
  console.log('Extracting Google search results...');
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, noscript, nav, footer, header, .ads, .advertisement, #footer, #header').remove();
  
  let extractedContent = '';
  let resultCount = 0;
  let debugInfo = {
    selectors_tried: [],
    blocking_detected: false,
    page_type: 'unknown'
  };
  
  // Check for blocking/CAPTCHA first
  const pageText = $('body').text().toLowerCase();
  const blockingPatterns = [
    'unusual traffic', 'captcha', 'verify you are human', 'automated queries',
    'suspicious activity', 'blocked', 'terms of service', 'robots.txt'
  ];
  
  const isBlocked = blockingPatterns.some(pattern => pageText.includes(pattern));
  if (isBlocked) {
    console.warn('Google blocking/CAPTCHA detected');
    debugInfo.blocking_detected = true;
    debugInfo.page_type = 'blocked';
    return { content: '', resultCount: 0, blocked: true, debugInfo };
  }
  
  // Enhanced Google result selectors (updated for current Google)
  const resultSelectors = [
    // Modern Google selectors
    { selector: '.g .yuRUbf', title: 'h3', snippet: '.VwiC3b, .s3v9rd', url: 'a' },
    { selector: '.tF2Cxc', title: 'h3', snippet: '.VwiC3b, .IsZvec', url: 'a' },
    { selector: '.MjjYud', title: '.DKV0Md', snippet: '.s3v9rd', url: 'a' },
    
    // Fallback selectors
    { selector: '.rc', title: 'h3', snippet: '.st', url: 'a' },
    { selector: '.r', title: 'h3', snippet: '.s', url: 'a' },
    
    // Mobile/alternative layouts
    { selector: '.kCrYT', title: '.BNeawe.vvjwJb', snippet: '.BNeawe.s3v9rd', url: 'a' },
    { selector: '.ZINbbc', title: '.BNeawe.vvjwJb', snippet: '.BNeawe.s3v9rd', url: 'a' }
  ];
  
  // Try each selector pattern
  for (const pattern of resultSelectors) {
    debugInfo.selectors_tried.push(pattern.selector);
    
    $(pattern.selector).each((i, elem) => {
      if (resultCount >= 20) return false; // Limit results
      
      const $elem = $(elem);
      const title = $elem.find(pattern.title).first().text().trim();
      const snippet = $elem.find(pattern.snippet).first().text().trim();
      const $link = $elem.find(pattern.url).first();
      let url = $link.attr('href');
      
      // Clean up Google redirect URLs
      if (url && url.startsWith('/url?q=')) {
        const urlParams = new URLSearchParams(url.substring(6));
        url = urlParams.get('q') || url;
      }
      
      if (title && title.length > 5 && snippet && snippet.length > 20) {
        extractedContent += `Title: ${title}\n`;
        extractedContent += `Snippet: ${snippet}\n`;
        if (url && url.startsWith('http')) {
          extractedContent += `URL: ${url}\n`;
        }
        extractedContent += '---\n';
        resultCount++;
      }
    });
    
    if (resultCount > 0) {
      console.log(`✓ Found ${resultCount} results using selector: ${pattern.selector}`);
      break;
    }
  }
  
  // If no structured results, try extracting all text
  if (resultCount === 0) {
    console.log('No structured results found, extracting all relevant text...');
    debugInfo.page_type = 'unstructured';
    
    // Extract all visible text and look for patterns
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    
    if (bodyText && bodyText.length > 200) {
      // Look for query-related content
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      const sentences = bodyText.split(/[.!?]+/).filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return queryWords.some(word => lowerSentence.includes(word)) && sentence.length > 30;
      });
      
      if (sentences.length > 0) {
        extractedContent = sentences.slice(0, 10).join('. ') + '.';
        resultCount = sentences.length;
        debugInfo.page_type = 'text_extraction';
      }
    }
  }
  
  // Final check for minimal content
  if (extractedContent.length < 100) {
    debugInfo.page_type = 'insufficient_content';
  }
  
  console.log(`Content extraction complete: ${extractedContent.length} chars, ${resultCount} results, type: ${debugInfo.page_type}`);
  return { 
    content: extractedContent, 
    resultCount, 
    blocked: false, 
    debugInfo,
    hasContent: extractedContent.length > 100
  };
};

// Main enhanced scraping function
const enhancedGoogleScraping = async (query, options = {}) => {
  const session = new BrowserSession();
  const httpsAgent = createHttpsAgent();
  
  console.log(`Starting enhanced Google scraping for: ${query.substring(0, 50)}...`);
  console.log(`Using session: ${session.sessionId}`);
  
  const maxAttempts = options.maxAttempts || 3;
  const strategies = [
    { name: 'direct', delay: 0 },
    { name: 'delayed', delay: 5000 },
    { name: 'minimal', delay: 10000 }
  ];
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const strategy = strategies[attempt] || strategies[strategies.length - 1];
    
    try {
      console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Using ${strategy.name} strategy`);
      
      // Wait for natural pacing
      await session.waitForNextRequest();
      
      // Additional strategy-specific delay
      if (strategy.delay > 0) {
        console.log(`Strategy delay: ${strategy.delay}ms`);
        await new Promise(resolve => setTimeout(resolve, strategy.delay));
      }
      
      const searchUrl = generateGoogleSearchUrl(query, {
        num: strategy.name === 'minimal' ? 20 : 50
      });
      
      console.log(`Request URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: session.getHeaders(),
        timeout: 30000,
        httpsAgent,
        maxRedirects: 3,
        validateStatus: status => status === 200
      });
      
      console.log(`Response: ${response.status}, Content-Length: ${response.data.length}`);
      
      // Check response headers for any blocking indicators
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
      
      const extraction = extractGoogleResults(response.data, query);
      
      if (extraction.blocked) {
        console.warn('Blocking detected, trying different approach...');
        if (attempt < maxAttempts - 1) {
          const backoffDelay = Math.pow(2, attempt + 1) * 5000; // Exponential backoff
          console.log(`Backing off for ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        } else {
          throw new Error('Google blocking detected after all attempts');
        }
      }
      
      if (extraction.hasContent) {
        console.log(`✓ Successfully extracted content on attempt ${attempt + 1}`);
        console.log(`Debug info:`, extraction.debugInfo);
        return extraction.content;
      }
      
      console.log(`Attempt ${attempt + 1} returned insufficient content`);
      console.log(`Debug info:`, extraction.debugInfo);
      
      if (attempt < maxAttempts - 1) {
        const retryDelay = (attempt + 1) * 3000;
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
      
      if (error.code === 'ECONNABORTED') {
        console.log('Request timeout');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('Connection refused');
      } else if (error.response?.status) {
        console.log(`HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      
      if (attempt < maxAttempts - 1) {
        const backoffDelay = Math.pow(2, attempt + 1) * 3000;
        console.log(`Backing off for ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw new Error(`All ${maxAttempts} attempts failed for Google scraping`);
};

// Alternative search engines with better anti-detection
const alternativeSearchEngines = {
  bing: {
    name: 'Bing',
    generateUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=50&first=1`,
    extractResults: ($) => {
      let content = '';
      let count = 0;
      
      $('.b_algo').each((i, elem) => {
        if (count >= 15) return false;
        
        const $elem = $(elem);
        const title = $elem.find('h2 a').text().trim();
        const snippet = $elem.find('.b_caption p').text().trim();
        const url = $elem.find('h2 a').attr('href');
        
        if (title && snippet && title.length > 5 && snippet.length > 20) {
          content += `Title: ${title}\n`;
          content += `Snippet: ${snippet}\n`;
          if (url && url.startsWith('http')) {
            content += `URL: ${url}\n`;
          }
          content += '---\n';
          count++;
        }
      });
      
      return { content, count };
    }
  },
  
  duckduckgo: {
    name: 'DuckDuckGo',
    generateUrl: (query) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    extractResults: ($) => {
      let content = '';
      let count = 0;
      
      $('.result').each((i, elem) => {
        if (count >= 15) return false;
        
        const $elem = $(elem);
        const title = $elem.find('.result__title a').text().trim();
        const snippet = $elem.find('.result__snippet').text().trim();
        const url = $elem.find('.result__title a').attr('href');
        
        if (title && snippet && title.length > 5 && snippet.length > 20) {
          content += `Title: ${title}\n`;
          content += `Snippet: ${snippet}\n`;
          if (url && url.startsWith('http')) {
            content += `URL: ${url}\n`;
          }
          content += '---\n';
          count++;
        }
      });
      
      return { content, count };
    }
  }
};

// Enhanced alternative search function
const tryAlternativeSearchEngines = async (query) => {
  console.log('Trying alternative search engines with anti-detection...');
  const session = new BrowserSession();
  const httpsAgent = createHttpsAgent();
  
  for (const [engineKey, engine] of Object.entries(alternativeSearchEngines)) {
    try {
      console.log(`Trying ${engine.name}...`);
      
      await session.waitForNextRequest();
      
      const searchUrl = engine.generateUrl(query);
      console.log(`${engine.name} URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: session.getHeaders(),
        timeout: 25000,
        httpsAgent,
        maxRedirects: 5
      });
      
      console.log(`${engine.name} response: ${response.status}, length: ${response.data.length}`);
      
      const $ = cheerio.load(response.data);
      const extraction = engine.extractResults($);
      
      if (extraction.content && extraction.content.length > 200) {
        console.log(`✓ ${engine.name} returned ${extraction.count} results (${extraction.content.length} chars)`);
        return extraction.content;
      } else {
        console.log(`${engine.name} returned insufficient content: ${extraction.content.length} chars`);
      }
      
    } catch (error) {
      console.error(`${engine.name} failed: ${error.message}`);
    }
  }
  
  return null;
};

// Multi-strategy scraping orchestrator
const multiStrategyScraping = async (query, options = {}) => {
  console.log(`\nStarting multi-strategy scraping for: ${query}`);
  
  const strategies = [
    {
      name: 'Enhanced Google',
      execute: () => enhancedGoogleScraping(query, options)
    },
    {
      name: 'Alternative Engines',
      execute: () => tryAlternativeSearchEngines(query)
    }
  ];
  
  for (const strategy of strategies) {
    try {
      console.log(`\n--- Trying: ${strategy.name} ---`);
      const result = await strategy.execute();
      
      if (result && result.length > 100) {
        console.log(`✓ ${strategy.name} successful: ${result.length} characters`);
        return {
          content: result,
          strategy: strategy.name,
          success: true
        };
      } else {
        console.log(`${strategy.name} returned insufficient content`);
      }
      
    } catch (error) {
      console.error(`${strategy.name} failed: ${error.message}`);
    }
    
    // Brief pause between strategies
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('All scraping strategies failed');
};

// Test function to verify scraping works
const testScraping = async (testQuery = 'wedding photographers Delhi') => {
  console.log('\n=== TESTING SCRAPING FUNCTIONALITY ===');
  
  try {
    const result = await multiStrategyScraping(testQuery, { maxAttempts: 2 });
    console.log('\n✓ Scraping test PASSED');
    console.log(`Strategy: ${result.strategy}`);
    console.log(`Content length: ${result.content.length}`);
    console.log(`Sample content: ${result.content.substring(0, 300)}...`);
    return true;
  } catch (error) {
    console.error('\n✗ Scraping test FAILED');
    console.error(`Error: ${error.message}`);
    return false;
  }
};

module.exports = {
  multiStrategyScraping,
  enhancedGoogleScraping,
  tryAlternativeSearchEngines,
  testScraping,
  BrowserSession
};