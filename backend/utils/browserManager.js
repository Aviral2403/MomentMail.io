// Enhanced browserManager.js with advanced anti-detection
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');

// Configure stealth plugin
puppeteer.use(StealthPlugin());

// Configure reCAPTCHA plugin if API key is available
if (process.env.ANTI_CAPTCHA_KEY) {
  puppeteer.use(RecaptchaPlugin({
    provider: {
      id: 'anti-captcha',
      token: process.env.ANTI_CAPTCHA_KEY
    },
    visualFeedback: true
  }));
}

let browser;
let browserPages = new Set();

// Enhanced browser configuration
const BROWSER_CONFIG = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--window-size=1366,768',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-images', // Skip images for faster loading
    '--disable-javascript', // We'll enable selectively
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-component-extensions-with-background-pages',
    '--disable-ipc-flooding-protection',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]
};

// Enhanced user agents rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

let currentUserAgentIndex = 0;

function getNextUserAgent() {
  const userAgent = USER_AGENTS[currentUserAgentIndex];
  currentUserAgentIndex = (currentUserAgentIndex + 1) % USER_AGENTS.length;
  return userAgent;
}

async function getBrowser() {
  if (browser && browser.process() && browser.isConnected()) {
    return browser;
  }
  
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.log('Error closing old browser:', error.message);
    }
    browser = null;
  }
  
  try {
    console.log('Launching enhanced browser...');
    browser = await puppeteer.launch(BROWSER_CONFIG);
    
    browser.on('disconnected', () => {
      console.log('Browser disconnected');
      browser = null;
      browserPages.clear();
    });
    
    console.log('Enhanced browser launched successfully');
    return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    throw error;
  }
}

async function createEnhancedPage(browser) {
  const page = await browser.newPage();
  browserPages.add(page);
  
  // Set random viewport size
  const viewports = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 }
  ];
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(viewport);
  
  // Set rotating user agent
  await page.setUserAgent(getNextUserAgent());
  
  // Enhanced stealth measures
  await page.evaluateOnNewDocument(() => {
    // Override webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // Override chrome detection
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Cypress.env('NOTIFICATION_PERMISSION') || 'denied' }) :
        originalQuery(parameters)
    );
  });
  
  // Set additional headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });
  
  // Handle page errors gracefully
  page.on('error', (error) => {
    console.log(`Page error: ${error.message}`);
  });
  
  page.on('pageerror', (error) => {
    console.log(`Page script error: ${error.message}`);
  });
  
  return page;
}

async function loadPageWithRetry(url, maxRetries = 3) {
  const browser = await getBrowser();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let page = null;
    
    try {
      console.log(`Loading page attempt ${attempt}/${maxRetries}: ${url}`);
      
      page = await createEnhancedPage(browser);
      
      // Set timeout and navigation options
      const navigationPromise = page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 45000
      });
      
      // Handle potential CAPTCHA
      try {
        await navigationPromise;
        
        // Check for CAPTCHA presence
        const hasCaptcha = await page.evaluate(() => {
          return !!(
            document.querySelector('.g-recaptcha') ||
            document.querySelector('#captcha') ||
            document.querySelector('[class*="captcha"]') ||
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector('iframe[src*="hcaptcha"]')
          );
        });
        
        if (hasCaptcha) {
          console.log(`CAPTCHA detected on ${url}, attempting to solve...`);
          
          try {
            // Try to solve reCAPTCHA using the plugin
            await page.solveRecaptchas();
            console.log('CAPTCHA solved successfully');
            
            // Wait a bit after solving
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (captchaError) {
            console.log(`CAPTCHA solving failed: ${captchaError.message}`);
            throw new Error('CAPTCHA_FAILED');
          }
        }
        
        // Wait for page to stabilize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if page is accessible
        const title = await page.title();
        const isBlocked = /blocked|captcha|access denied|just a moment/i.test(title);
        
        if (isBlocked) {
          throw new Error(`Page appears to be blocked: ${title}`);
        }
        
        return page;
        
      } catch (navError) {
        if (page) {
          await page.close().catch(() => {});
          browserPages.delete(page);
        }
        
        if (attempt === maxRetries) {
          throw navError;
        }
        
        // Progressive delay between retries
        const delay = Math.pow(2, attempt) * 2000;
        console.log(`Navigation failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      if (page) {
        await page.close().catch(() => {});
        browserPages.delete(page);
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}

async function getRenderedContent(url, options = {}) {
  const { timeout = 45000, enableJavaScript = false } = options;
  
  let page = null;
  
  try {
    page = await loadPageWithRetry(url, 3);
    
    // Enable JavaScript if requested
    if (enableJavaScript) {
      await page.setJavaScriptEnabled(true);
      // Wait for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get final HTML content
    const html = await page.content();
    
    console.log(`Successfully rendered ${url} (${html.length} characters)`);
    
    return { page, html };
    
  } catch (error) {
    console.error(`Failed to render ${url}:`, error.message);
    
    if (page) {
      await page.close().catch(() => {});
      browserPages.delete(page);
    }
    
    throw error;
  }
}

// Enhanced proxy integration for browser
async function getBrowserWithProxy(proxyConfig) {
  const config = { ...BROWSER_CONFIG };
  
  if (proxyConfig) {
    config.args.push(`--proxy-server=${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
    
    if (proxyConfig.auth) {
      // Note: Proxy auth with browser requires additional handling
      console.log('Browser proxy auth not fully supported, using IP auth');
    }
  }
  
  try {
    const browser = await puppeteer.launch(config);
    console.log('Browser launched with proxy configuration');
    return browser;
  } catch (error) {
    console.error('Failed to launch browser with proxy:', error);
    // Fallback to browser without proxy
    return await puppeteer.launch(BROWSER_CONFIG);
  }
}

// Clean up function
async function cleanup() {
  console.log('Cleaning up browser resources...');
  
  // Close all pages
  for (const page of browserPages) {
    try {
      await page.close();
    } catch (error) {
      console.log('Error closing page:', error.message);
    }
  }
  browserPages.clear();
  
  // Close browser
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.log('Error closing browser:', error.message);
    }
    browser = null;
  }
  
  console.log('Browser cleanup completed');
}

// Health check function
async function healthCheck() {
  try {
    const testBrowser = await getBrowser();
    const testPage = await createEnhancedPage(testBrowser);
    
    await testPage.goto('https://httpbin.org/headers', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    const title = await testPage.title();
    await testPage.close();
    browserPages.delete(testPage);
    
    return {
      status: 'healthy',
      canLoadPages: true,
      title: title.substring(0, 50)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      canLoadPages: false
    };
  }
}

// Handle CAPTCHA specifically
async function solveCaptcha(page, url) {
  try {
    console.log(`Attempting to solve CAPTCHA on ${url}`);
    
    // Check for different types of CAPTCHA
    const captchaTypes = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
        hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
        generic: !!document.querySelector('[class*="captcha"], #captcha')
      };
    });
    
    console.log('CAPTCHA types detected:', captchaTypes);
    
    if (captchaTypes.recaptcha) {
      await page.solveRecaptchas();
      console.log('reCAPTCHA solved');
    } else if (captchaTypes.hcaptcha) {
      // Handle hCAPTCHA if needed
      console.log('hCAPTCHA detected but not solved (requires additional setup)');
    }
    
    // Wait for page to reload after CAPTCHA
    await page.waitForNavigation({ 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    }).catch(() => {
      // Timeout is acceptable here
    });
    
    return true;
  } catch (error) {
    console.log(`CAPTCHA solving failed: ${error.message}`);
    return false;
  }
}

// Enhanced page loading with multiple strategies
async function loadPageWithStrategies(url, options = {}) {
  const strategies = [
    // Strategy 1: Fast load without JavaScript
    {
      name: 'fast',
      enableJS: false,
      waitUntil: ['domcontentloaded'],
      timeout: 20000
    },
    // Strategy 2: Full load with JavaScript
    {
      name: 'full',
      enableJS: true,
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 45000
    },
    // Strategy 3: Minimal load for blocked sites
    {
      name: 'minimal',
      enableJS: false,
      waitUntil: ['domcontentloaded'],
      timeout: 15000,
      bypassCSP: true
    }
  ];
  
  let lastError = null;
  
  for (const strategy of strategies) {
    let page = null;
    
    try {
      console.log(`Trying ${strategy.name} strategy for ${url}`);
      
      const browser = await getBrowser();
      page = await createEnhancedPage(browser);
      
      // Configure page based on strategy
      await page.setJavaScriptEnabled(strategy.enableJS);
      
      if (strategy.bypassCSP) {
        await page.setBypassCSP(true);
      }
      
      // Navigate with strategy-specific options
      await page.goto(url, {
        waitUntil: strategy.waitUntil,
        timeout: strategy.timeout
      });
      
      // Check for CAPTCHA and handle if present
      const needsCaptcha = await page.evaluate(() => {
        return !!(
          document.querySelector('.g-recaptcha') ||
          document.querySelector('#captcha') ||
          document.title.toLowerCase().includes('captcha')
        );
      });
      
      if (needsCaptcha) {
        const solved = await solveCaptcha(page, url);
        if (!solved) {
          throw new Error('CAPTCHA_UNSOLVED');
        }
      }
      
      // Additional wait for content to load
      if (strategy.enableJS) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      const html = await page.content();
      
      // Validate content quality
      if (html.length < 1000) {
        throw new Error('PAGE_TOO_SMALL');
      }
      
      if (/blocked|access denied|captcha/i.test(html)) {
        throw new Error('PAGE_BLOCKED');
      }
      
      console.log(`Successfully loaded ${url} using ${strategy.name} strategy`);
      return { page, html };
      
    } catch (error) {
      console.log(`${strategy.name} strategy failed for ${url}: ${error.message}`);
      lastError = error;
      
      if (page) {
        await page.close().catch(() => {});
        browserPages.delete(page);
      }
      
      // Add delay before trying next strategy
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw lastError || new Error('All loading strategies failed');
}

// Main enhanced content retrieval function
async function getRenderedContent(url, options = {}) {
  try {
    return await loadPageWithStrategies(url, options);
  } catch (error) {
    console.error(`Enhanced content retrieval failed for ${url}:`, error.message);
    throw error;
  }
}

// Batch processing for multiple URLs
async function getMultipleRenderedContent(urls, options = {}) {
  const { concurrency = 2 } = options;
  const results = [];
  const executing = [];
  
  console.log(`Loading ${urls.length} pages with browser concurrency ${concurrency}`);
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    const promise = getRenderedContent(url, options)
      .then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return { url, success: true, ...result };
      })
      .catch(error => {
        executing.splice(executing.indexOf(promise), 1);
        return { url, success: false, error: error.message };
      });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
    
    // Add delay between launches
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  return Promise.all(results);
}

// Memory and resource management
async function cleanupOldPages() {
  const maxPages = 5;
  
  if (browserPages.size > maxPages) {
    const pagesToClose = Array.from(browserPages).slice(0, browserPages.size - maxPages);
    
    for (const page of pagesToClose) {
      try {
        await page.close();
        browserPages.delete(page);
      } catch (error) {
        console.log('Error closing old page:', error.message);
      }
    }
    
    console.log(`Cleaned up ${pagesToClose.length} old pages`);
  }
}

// Monitor browser memory usage
function getMemoryStats() {
  return {
    activePagesCount: browserPages.size,
    browserConnected: browser ? browser.isConnected() : false,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
}

// Graceful shutdown
async function close() {
  console.log('Initiating enhanced browser shutdown...');
  
  try {
    await cleanup();
    console.log('Enhanced browser manager shut down successfully');
  } catch (error) {
    console.error('Error during browser shutdown:', error.message);
  }
}

// Export enhanced functions
module.exports = {
  getBrowser,
  createEnhancedPage,
  loadPageWithRetry,
  getRenderedContent,
  getMultipleRenderedContent,
  cleanup,
  cleanupOldPages,
  healthCheck,
  getMemoryStats,
  close
};