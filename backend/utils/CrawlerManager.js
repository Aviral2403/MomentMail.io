const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const proxyManager = require('./proxyManager');
const captchaSolver = require('./captchaSolver');
const userAgents = require('./userAgents');
const SearchUtils = require('./searchUtils');

class CrawlerManager {
  constructor() {
    this.activeRequests = 0;
    this.maxConcurrentRequests = 3;
    this.requestQueue = [];
    this.requestDelay = 2000;
    this.lastRequestTime = 0;
    this.consecutiveFailures = 0;
    this.requestCount = 0;
    this.captchaSolutions = new Map();
  }

  async crawlUrl(url, options = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    const config = {
      method: 'get',
      url: url,
      timeout: options.timeout || 45000, // Increased timeout
      maxRedirects: 5,
      headers: {
        'User-Agent': options.userAgent || userAgents[Math.floor(Math.random() * userAgents.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept more status codes
      },
      // Handle response compression
      decompress: true,
      // Follow redirects
      maxRedirects: 10
    };

    // Add proxy configuration if enabled
    if (options.useProxy !== false && proxyManager.shouldUseProxy()) {
      try {
        const proxyUrl = await proxyManager.getAnonymizedProxy();
        if (proxyUrl) {
          const parsedUrl = new URL(proxyUrl);
          config.proxy = {
            protocol: parsedUrl.protocol.replace(':', ''),
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port),
            auth: parsedUrl.username && parsedUrl.password ? {
              username: parsedUrl.username,
              password: parsedUrl.password
            } : undefined
          };
          console.log(`Using proxy: ${parsedUrl.hostname}:${parsedUrl.port}`);
        }
      } catch (proxyError) {
        console.warn('Proxy setup failed, continuing without proxy:', proxyError.message);
      }
    }

    try {
      console.log(`Crawling: ${url}`);
      const response = await axios(config);
      
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid response data received');
      }
      
      // Check if we got a captcha page
      if (this.isCaptchaPage(response.data)) {
        console.log('Captcha detected, attempting to solve...');
        
        if (options.solveCaptcha !== false) {
          const solved = await this.solveAndBypassCaptcha(url, response.data, config);
          if (solved && solved.success) {
            return solved;
          }
        }
        
        // If captcha solving fails, try without proxy
        if (config.proxy) {
          console.log('Retrying without proxy due to captcha...');
          delete config.proxy;
          const retryResponse = await axios(config);
          if (!this.isCaptchaPage(retryResponse.data)) {
            response.data = retryResponse.data;
            response.status = retryResponse.status;
          }
        }
      }
      
      this.consecutiveFailures = 0;
      console.log(`✓ Successfully crawled ${url} - Status: ${response.status}, Size: ${response.data.length} chars`);
      
      return {
        success: true,
        url: url,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      this.consecutiveFailures++;
      console.error(`✗ Crawling error for ${url}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        timeout: error.code === 'ECONNABORTED',
        proxy: !!config.proxy
      });
      
      // Try without proxy if proxy was used
      if (config.proxy && error.code !== 'ECONNABORTED') {
        try {
          console.log('Retrying without proxy...');
          delete config.proxy;
          const retryResponse = await axios(config);
          
          this.consecutiveFailures = 0;
          console.log(`✓ Retry successful for ${url} - Status: ${retryResponse.status}`);
          
          return {
            success: true,
            url: url,
            status: retryResponse.status,
            data: retryResponse.data,
            headers: retryResponse.headers
          };
        } catch (retryError) {
          console.error(`✗ Retry also failed for ${url}:`, retryError.message);
        }
      }
      
      if (this.consecutiveFailures > 3) {
        this.requestDelay = Math.min(this.requestDelay * 1.5, 10000);
        console.log(`Increased request delay to ${this.requestDelay}ms due to failures`);
      }
      
      return {
        success: false,
        url: url,
        error: error.message,
        status: error.response?.status || 0,
        timeout: error.code === 'ECONNABORTED'
      };
    }
  }

  isCaptchaPage(html) {
    if (!html || typeof html !== 'string') return false;
    
    const captchaIndicators = [
      'captcha',
      'CAPTCHA', 
      'recaptcha',
      'hcaptcha',
      'cloudflare',
      'cf-browser-verification',
      'distil',
      'incapsula',
      'access denied',
      'security check',
      'challenge',
      'verify you are human',
      'please complete the security check',
      'checking your browser',
      'ddos protection'
    ];
    
    const lowerHtml = html.toLowerCase();
    const isBlocked = captchaIndicators.some(indicator => lowerHtml.includes(indicator));
    
    if (isBlocked) {
      console.log('Detected captcha/blocking page');
    }
    
    return isBlocked;
  }

  async extractContactInfo(html, url) {
    if (!html || typeof html !== 'string') {
      console.log(`No valid HTML content for ${url}`);
      return this.getEmptyContactInfo(url);
    }

    try {
      const $ = cheerio.load(html);
      const text = $('body').text() + ' ' + $('head').text();
      
      console.log(`Extracting contact info from ${url} - Content length: ${text.length}`);
      
      // Extract emails with better patterns
      const emails = this.extractEmails(text, html);
      
      // Extract phone numbers with better validation  
      const phones = this.extractPhoneNumbers(text);
      
      // Extract social links
      const socialLinks = this.extractSocialLinks(html, url);
      
      // Extract website
      const website = this.extractWebsite(url);
      
      // Extract business name with improved methods
      const businessName = this.extractBusinessName($, url, text);
      
      const contactInfo = {
        businessName: businessName || this.extractBusinessNameFromUrl(url),
        emails: emails.length > 0 ? emails : ['N/A'],
        phones: phones.length > 0 ? phones : ['N/A'],
        website: website,
        socialLinks: socialLinks,
        source: url
      };
      
      console.log(`Contact info extracted for ${url}:`, {
        businessName: contactInfo.businessName,
        emailCount: contactInfo.emails.length,
        phoneCount: contactInfo.phones.length,
        socialCount: contactInfo.socialLinks.length
      });
      
      return contactInfo;
    } catch (error) {
      console.error(`Error extracting contact info from ${url}:`, error.message);
      return this.getEmptyContactInfo(url);
    }
  }

  extractEmails(text, html) {
    const emailPatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
    ];
    
    const emails = new Set();
    const combinedText = text + ' ' + html;
    
    emailPatterns.forEach(pattern => {
      const matches = combinedText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const email = match.replace('mailto:', '').toLowerCase();
          if (this.isValidEmail(email)) {
            emails.add(email);
          }
        });
      }
    });
    
    return Array.from(emails).slice(0, 5); // Limit to 5 emails
  }

  isValidEmail(email) {
    const excludedDomains = [
      'example.com', 'test.com', 'domain.com', 'email.com', 
      'noreply.com', 'no-reply.com', 'donotreply.com'
    ];
    const excludedPrefixes = ['noreply', 'no-reply', 'donotreply', 'admin', 'webmaster'];
    
    if (!email || !email.includes('@')) return false;
    
    const [prefix, domain] = email.split('@');
    
    if (excludedDomains.includes(domain.toLowerCase())) return false;
    if (excludedPrefixes.includes(prefix.toLowerCase())) return false;
    if (email.length < 5 || email.length > 100) return false;
    
    return true;
  }

  extractPhoneNumbers(text) {
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /(\+\d{1,3}[-.\s]?)?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g
    ];
    
    const phones = new Set();
    
    phonePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\d+]/g, '');
          if (cleaned.length >= 10 && cleaned.length <= 15) {
            phones.add(match.trim());
          }
        });
      }
    });
    
    return Array.from(phones).slice(0, 3); // Limit to 3 phone numbers
  }

  extractSocialLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const socialLinks = new Set();
    
    const socialDomains = [
      'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
      'linkedin.com', 'youtube.com', 'pinterest.com', 'tiktok.com'
    ];
    
    $('a[href]').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        try {
          const fullUrl = new URL(href, baseUrl).href;
          if (socialDomains.some(domain => fullUrl.includes(domain))) {
            socialLinks.add(fullUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });
    
    return Array.from(socialLinks).slice(0, 5); // Limit to 5 social links
  }

  extractWebsite(url) {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    } catch (error) {
      return url;
    }
  }

  extractBusinessName($, url, text) {
    // Try multiple strategies in order of reliability
    
    // 1. Meta tags
    const metaSelectors = [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]', 
      'meta[property="og:title"]',
      'meta[name="title"]'
    ];
    
    for (const selector of metaSelectors) {
      const content = $(selector).attr('content');
      if (content && content.length > 2 && content.length < 100) {
        return this.cleanBusinessName(content);
      }
    }
    
    // 2. Title tag
    const title = $('title').text().trim();
    if (title && title.length > 2 && title.length < 100) {
      return this.cleanBusinessName(title);
    }
    
    // 3. Main headings
    const headings = ['h1', 'h2'];
    for (const heading of headings) {
      const headingText = $(heading).first().text().trim();
      if (headingText && headingText.length > 2 && headingText.length < 100) {
        return this.cleanBusinessName(headingText);
      }
    }
    
    // 4. Business-specific selectors
    const businessSelectors = [
      '.business-name', '.company-name', '.brand-name',
      '[class*="business"]', '[class*="company"]', '[class*="brand"]'
    ];
    
    for (const selector of businessSelectors) {
      const businessText = $(selector).first().text().trim();
      if (businessText && businessText.length > 2 && businessText.length < 100) {
        return this.cleanBusinessName(businessText);
      }
    }
    
    return null;
  }

  cleanBusinessName(name) {
    return name
      .replace(/\s*[-|–—]\s*.*/g, '') // Remove everything after dash/pipe
      .replace(/\s*[©®™]\s*.*$/g, '') // Remove copyright symbols and following text
      .replace(/\s*(home|welcome|contact|about).*$/gi, '') // Remove common page words
      .replace(/\s*20\d{2}.*$/g, '') // Remove years
      .trim();
  }

  extractBusinessNameFromUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.replace('www.', '');
      const domainParts = hostname.split('.');
      
      if (domainParts.length > 1) {
        const name = domainParts[0]
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return name;
      }
      
      return hostname;
    } catch (error) {
      return 'Unknown Business';
    }
  }

  getEmptyContactInfo(url) {
    return {
      businessName: this.extractBusinessNameFromUrl(url),
      emails: ['N/A'],
      phones: ['N/A'], 
      website: this.extractWebsite(url),
      socialLinks: [],
      source: url
    };
  }

  async crawlMultipleUrls(urls, options = {}) {
    const results = [];
    const maxUrls = Math.min(options.maxUrls || 20, urls.length);
    
    // Clean and deduplicate URLs
    const uniqueUrls = [...new Set(urls.map(url => {
      try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      } catch {
        return url;
      }
    }))].slice(0, maxUrls);
    
    console.log(`Starting to crawl ${uniqueUrls.length} unique URLs...`);
    
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      
      try {
        console.log(`\n--- Crawling ${i + 1}/${uniqueUrls.length}: ${url} ---`);
        
        const crawlResult = await this.crawlUrl(url, options);
        
        if (crawlResult.success) {
          const contactInfo = await this.extractContactInfo(crawlResult.data, url);
          
          const result = {
            url: url,
            success: true,
            contactInfo: contactInfo,
            status: crawlResult.status
          };
          
          results.push(result);
          
          console.log(`✓ Successfully processed ${url}:`, {
            businessName: contactInfo.businessName,
            emails: contactInfo.emails,
            phones: contactInfo.phones
          });
        } else {
          results.push({
            url: url,
            success: false,
            error: crawlResult.error,
            status: crawlResult.status || 0
          });
          
          console.log(`✗ Failed to crawl ${url}: ${crawlResult.error}`);
        }
        
        // Intelligent delay between requests
        if (i < uniqueUrls.length - 1) {
          const delay = this.getRequestDelay();
          console.log(`Waiting ${delay}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Unexpected error crawling ${url}:`, error.message);
        results.push({
          url: url,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n=== Crawling Summary ===`);
    console.log(`Total URLs: ${uniqueUrls.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${uniqueUrls.length - successCount}`);
    
    return results;
  }

  getRequestDelay() {
    const baseDelay = 3000;
    const randomDelay = Math.floor(Math.random() * 2000);
    const failureMultiplier = Math.min(this.consecutiveFailures * 0.3, 2);
    
    return Math.min(baseDelay + randomDelay * (1 + failureMultiplier), 15000);
  }

  async solveAndBypassCaptcha(url, html, originalConfig) {
    // Simplified captcha bypass - focus on proxy rotation instead
    console.log('Attempting captcha bypass via proxy rotation...');
    await proxyManager.rotateProxy();
    return false;
  }

  getStats() {
    return {
      active: true,
      requestCount: this.requestCount,
      consecutiveFailures: this.consecutiveFailures,
      currentDelay: this.requestDelay,
      cachedCaptchaSolutions: this.captchaSolutions.size
    };
  }

  cleanupCaptchaSolutions() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [domain, solution] of this.captchaSolutions.entries()) {
      if (now - solution.timestamp > oneHour) {
        this.captchaSolutions.delete(domain);
      }
    }
  }
}

module.exports = new CrawlerManager();