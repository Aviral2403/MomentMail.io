const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AnonymizeUAPlugin = require('puppeteer-extra-plugin-anonymize-ua');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const ProxyPlugin = require('puppeteer-extra-plugin-proxy');
const proxyManager = require('./proxyManager');
const userAgents = require('./userAgents');

// Apply plugins
puppeteer.use(StealthPlugin());
puppeteer.use(AnonymizeUAPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: 'anti-captcha',
      token: process.env.ANTI_CAPTCHA_KEY
    },
    visualFeedback: true
  })
);

class BrowserManager {
  constructor() {
    this.browser = null;
    this.activePages = new Set();
    this.browserStartTime = null;
    this.maxBrowserUptime = 30 * 60 * 1000;
  }

  async getBrowser() {
    if (this.browser && this.isBrowserHealthy()) {
      return this.browser;
    }

    await this.closeBrowser();
    return await this.launchBrowser();
  }

  async launchBrowser() {
    try {
      console.log('Launching new browser instance...');
      
      const launchOptions = {
        headless: process.env.NODE_ENV === 'production' ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--lang=en-US,en',
          `--user-agent=${userAgents[Math.floor(Math.random() * userAgents.length)]}`
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };

      if (proxyManager.shouldUseProxy()) {
        const proxyUrl = await proxyManager.getAnonymizedProxy();
        if (proxyUrl) {
          launchOptions.args.push(`--proxy-server=${proxyUrl}`);
          console.log('Using proxy for browser:', new URL(proxyUrl).hostname);
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.browserStartTime = Date.now();

      this.browser.on('disconnected', () => {
        console.log('Browser disconnected');
        this.browser = null;
      });

      console.log('Browser launched successfully');
      return this.browser;
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }

  isBrowserHealthy() {
    if (!this.browser) return false;
    
    if (Date.now() - this.browserStartTime > this.maxBrowserUptime) {
      console.log('Browser uptime exceeded limit, restarting...');
      return false;
    }

    return true;
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        const pages = await this.browser.pages();
        for (const page of pages) {
          try {
            await page.close();
          } catch (error) {
            console.error('Error closing page:', error);
          }
        }

        await this.browser.close();
        console.log('Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      } finally {
        this.browser = null;
        this.browserStartTime = null;
        this.activePages.clear();
      }
    }
  }

  async createPage() {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      });

      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      });

      this.activePages.add(page);
      
      page.on('close', () => {
        this.activePages.delete(page);
      });

      return page;
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  }

  async closePage(page) {
    try {
      if (page && !page.isClosed()) {
        await page.close();
        this.activePages.delete(page);
      }
    } catch (error) {
      console.error('Error closing page:', error);
    }
  }

  async solveCaptcha(page, siteUrl, siteKey = null) {
    try {
      console.log('Solving captcha on page...');
      
      await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 10000 })
        .catch(() => console.log('No recaptcha iframe found'));
      
      const { solved, error } = await page.solveRecaptchas();
      
      if (solved && solved.length > 0) {
        console.log('Captcha solved successfully');
        return true;
      } else {
        console.log('No captcha to solve or solving failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Captcha solving error:', error);
      return false;
    }
  }

  async humanLikeTyping(page, selector, text, delay = 100) {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    
    for (const char of text) {
      await page.type(selector, char, { delay: Math.random() * delay + 50 });
      await page.waitForTimeout(Math.random() * 100 + 50);
    }
  }

  async humanLikeClick(page, selector) {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        const x = box.x + Math.random() * box.width;
        const y = box.y + Math.random() * box.height;
        
        await page.mouse.move(x, y, { steps: 10 });
        await page.waitForTimeout(200 + Math.random() * 300);
        await page.mouse.click(x, y);
        await page.waitForTimeout(500 + Math.random() * 1000);
      }
    }
  }

  async scrollPage(page, scrollSteps = 5) {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxScroll = scrollHeight - viewportHeight;
    
    for (let i = 0; i < scrollSteps; i++) {
      const scrollTo = Math.min(maxScroll, (i + 1) * (maxScroll / scrollSteps));
      await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
      await page.waitForTimeout(500 + Math.random() * 1000);
    }
  }

  async takeScreenshot(page, filename) {
    if (process.env.NODE_ENV !== 'production') {
      await page.screenshot({ path: `debug/${filename}.png`, fullPage: true });
    }
  }

  getStats() {
    return {
      browserActive: !!this.browser,
      activePages: this.activePages.size,
      browserUptime: this.browserStartTime ? Date.now() - this.browserStartTime : 0
    };
  }
}

module.exports = new BrowserManager();