// Enhanced CrawlerManager.js with improved extraction and verification
const axios = require('axios');
const cheerio = require('cheerio');
const he = require('he');
const validator = require('validator');
const {
  normalizeUrl,
  preferHomepage,
  isBlockedHtml,
  isAggregatorUrl,
  isAggregatorPageByTitle,
  extractDomain,
  isSocialOrDirectory,
  unique
} = require('./searchUtils');

const browserManager = require('./browserManager');
const proxyManager = require('./proxyManager');

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Statistics tracking
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  blockedRequests: 0,
  captchaEncountered: 0,
  browserFallbacks: 0,
  averageResponseTime: 0,
  errorsByType: {},
  domainErrors: {}
};

// Enhanced dynamic aggregator detection
function detectAggregatorDynamically(url, title = '', content = '') {
  const indicators = [
    // URL patterns
    /directory|listing|find|search|top|best|compare|browse/i.test(url),
    
    // Title patterns
    /top \d+|best \d+|find |search |directory|listing|compare|browse/i.test(title),
    
    // Content patterns for any niche
    /find the right|compare|browse|search for|top rated|best|directory|listing/i.test(content),
    
    // Generic aggregator phrases
    /profiles?|reviews?|ratings?|verified|featured|sponsored/i.test(content),
    
    // Multiple business mentions (indicates directory)
    (content.match(/\b(agency|company|business|firm|service)\b/gi) || []).length > 5
  ];
  
  return indicators.filter(Boolean).length >= 2;
}

// Enhanced business extraction for directory pages
function extractFeaturedBusinessInfo($, url, pageContent) {
  const businessInfo = {
    name: null,
    emails: [],
    phones: [],
    website: '',
    description: '',
    isFromDirectory: true
  };

  // Try multiple strategies to find the featured business
  const strategies = [
    // Strategy 1: Look for profile/company headers
    () => {
      const selectors = [
        'h1[class*="company"]:first',
        'h1[class*="business"]:first',
        'h1[class*="profile"]:first',
        '.company-name h1:first',
        '.business-title:first',
        '.profile-header h1:first'
      ];
      
      for (const selector of selectors) {
        const text = $(selector).text().trim();
        if (text && text.length > 2 && !isDirectorySiteName(text, url)) {
          businessInfo.name = text;
          return true;
        }
      }
      return false;
    },

    // Strategy 2: Extract from URL path
    () => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p && p.length > 2);
        const lastPart = pathParts[pathParts.length - 1];
        
        if (lastPart && !['profile', 'company', 'business'].includes(lastPart.toLowerCase())) {
          // Convert URL slug to business name
          const name = lastPart
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
          
          if (name.length > 2) {
            businessInfo.name = name;
            return true;
          }
        }
      } catch (e) {
        // Invalid URL
      }
      return false;
    },

    // Strategy 3: Look for meta tags
    () => {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const metaTitle = $('meta[name="title"]').attr('content');
      
      const titles = [ogTitle, metaTitle].filter(Boolean);
      
      for (const title of titles) {
        if (title && !isDirectorySiteName(title, url)) {
          businessInfo.name = title.replace(/\s*[-|–]\s*.*$/, '').trim();
          return true;
        }
      }
      return false;
    }
  ];

  // Try each strategy until one succeeds
  strategies.some(strategy => strategy());

  // Extract contact information specific to the business
  if (businessInfo.name) {
    businessInfo.emails = extractBusinessSpecificEmails($, businessInfo.name);
    businessInfo.phones = extractBusinessSpecificPhones($, businessInfo.name);
    businessInfo.website = extractBusinessWebsite($, businessInfo.name);
    businessInfo.description = extractBusinessDescription($, businessInfo.name);
  }

  return businessInfo;
}

function isDirectorySiteName(text, url) {
  const directoryNames = [
    'agency spotter', 'clutch', 'designrush', 'justdial', 'yelp', 
    'yellowpages', 'directory', 'listing', 'find', 'search'
  ];
  
  const textLower = text.toLowerCase();
  const domain = extractDomain(url);
  
  return directoryNames.some(name => 
    textLower.includes(name) || (domain && textLower.includes(domain.split('.')[0]))
  );
}

function extractBusinessSpecificEmails($, businessName) {
  const emails = new Set();
  const businessKeywords = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Look in contact sections near the business name
  const contextualSelectors = [
    '.contact-info, .business-contact, .company-details',
    'section:contains("' + businessName + '") .contact',
    '[class*="contact"]:contains("' + businessName + '")'
  ];
  
  contextualSelectors.forEach(selector => {
    try {
      const sections = $(selector);
      sections.each((_, section) => {
        const sectionText = $(section).text();
        const emailMatches = sectionText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
        
        if (emailMatches) {
          emailMatches.forEach(email => {
            const emailLower = email.toLowerCase();
            if (validator.isEmail(emailLower)) {
              // Prioritize emails that contain business keywords
              const relevanceScore = businessKeywords.some(keyword => 
                emailLower.includes(keyword)
              ) ? 2 : 1;
              
              emails.add({ email: emailLower, score: relevanceScore });
            }
          });
        }
      });
    } catch (e) {
      // Invalid selector, skip
    }
  });
  
  // Convert to array and sort by relevance
  return Array.from(emails)
    .sort((a, b) => b.score - a.score)
    .map(item => item.email)
    .slice(0, 3);
}

function extractBusinessSpecificPhones($, businessName) {
  const phones = new Set();
  
  // Look for phone numbers near the business name or in contact sections
  const contextualSelectors = [
    '.contact-info, .business-contact',
    '[class*="phone"], [class*="tel"]',
    'a[href^="tel:"]'
  ];
  
  contextualSelectors.forEach(selector => {
    try {
      const sections = $(selector);
      sections.each((_, section) => {
        const sectionText = $(section).text();
        const phoneMatches = sectionText.match(/(\+?\d[\d\s\-()]{6,}\d)/g);
        
        if (phoneMatches) {
          phoneMatches.forEach(phone => {
            const cleaned = phone.replace(/[^\d+]/g, '');
            if (cleaned.length >= 7 && cleaned.length <= 15) {
              phones.add(cleaned);
            }
          });
        }
      });
      
      // Also check href attributes for tel: links
      $(selector + ' a[href^="tel:"]').each((_, link) => {
        const tel = $(link).attr('href').replace('tel:', '').replace(/[^\d+]/g, '');
        if (tel.length >= 7 && tel.length <= 15) {
          phones.add(tel);
        }
      });
    } catch (e) {
      // Invalid selector, skip
    }
  });
  
  return Array.from(phones).slice(0, 3);
}

function extractBusinessWebsite($, businessName) {
  // Look for official website links
  const websiteSelectors = [
    'a[href*="' + businessName.toLowerCase().replace(/\s+/g, '') + '"]',
    'a:contains("website")',
    'a:contains("visit")',
    '[class*="website"] a',
    '.external-link'
  ];
  
  for (const selector of websiteSelectors) {
    try {
      const link = $(selector).first().attr('href');
      if (link && link.startsWith('http') && !isAggregatorUrl(link)) {
        return link;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  return '';
}

function extractBusinessDescription($, businessName) {
  // Look for description near the business name
  const descriptionSelectors = [
    '.description, .about, .summary, .bio',
    '[class*="description"]',
    'p:contains("' + businessName + '")',
    '.company-description, .business-description'
  ];
  
  for (const selector of descriptionSelectors) {
    try {
      const text = $(selector).first().text().trim();
      if (text && text.length > 20 && text.length < 500) {
        return text;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Fallback to meta description
  const metaDesc = $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content');
  
  return metaDesc ? metaDesc.trim().slice(0, 300) : '';
}

// Enhanced website extraction function
function extractCorrectWebsite($, url, businessName) {
  // First priority: canonical URL
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical && !isAggregatorUrl(canonical)) {
    return canonical;
  }

  // Second priority: og:url
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl && !isAggregatorUrl(ogUrl)) {
    return ogUrl;
  }

  // Third priority: homepage of current domain
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/`;
  } catch (e) {
    return url;
  }
}

// Enhanced business name extraction
function extractBusinessName($, url, isDirectoryPage = false) {
  // First, try to extract from JSON-LD structured data
  const jsonLd = parseJsonLd($);
  if (jsonLd.name && jsonLd.name.trim().length > 2 && !isGenericName(jsonLd.name)) {
    return cleanBusinessName(jsonLd.name);
  }

  // Try meta tags
  const metaName = $('meta[property="og:site_name"]').attr('content') || 
                   $('meta[name="application-name"]').attr('content');
  if (metaName && !isGenericName(metaName)) {
    return cleanBusinessName(metaName);
  }

  // Extract from URL for better accuracy
  const domainName = extractBusinessNameFromUrl(url);
  if (domainName && !isGenericName(domainName)) {
    return domainName;
  }

  // Fallback to title but clean it aggressively
  const pageTitle = $('title').first().text().trim();
  if (pageTitle) {
    return cleanPageTitle(pageTitle);
  }

  return 'Unknown Business';
}

function cleanPageTitle(title) {
  return title
    .replace(/\s*[-|–]\s*(Home|Official Site|Website|Welcome|About Us|Contact).*$/i, '')
    .replace(/^\s*(Welcome to|Home of|Official Website of)\s*/i, '')
    .replace(/\.(html|htm|php|aspx)$/i, '')
    .replace(/\s*\|.*$/, '')
    .trim();
}

function extractBusinessNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const domainParts = hostname.split('.');
    
    if (domainParts.length >= 2) {
      const businessPart = domainParts[0];
      // Convert URL-friendly names to proper names
      return businessPart
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}

function isGenericName(name) {
  const genericTerms = [
    'home', 'about', 'contact', 'services', 'products', 'blog', 
    'welcome', 'official', 'website', 'page', 'index'
  ];
  const nameLower = name.toLowerCase();
  return genericTerms.some(term => nameLower.includes(term));
}

function cleanBusinessName(name) {
  return name
    .replace(/\s+-\s+.*$/, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
}

// Enhanced headers with more realistic browser behavior
const getRandomHeaders = () => {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
  ];
  
  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  };
};

// Enhanced delay function with jitter
const getRandomDelay = (min = 1000, max = 3000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Track statistics
function updateStats(success, responseTime, errorType = null, domain = null) {
  stats.totalRequests++;
  
  if (success) {
    stats.successfulRequests++;
    stats.averageResponseTime = 
      (stats.averageResponseTime * (stats.successfulRequests - 1) + responseTime) / stats.successfulRequests;
  } else {
    stats.failedRequests++;
    
    if (errorType) {
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
    }
    
    if (domain) {
      stats.domainErrors[domain] = (stats.domainErrors[domain] || 0) + 1;
    }
  }
}

// Improved HTML fetching with better anti-detection
async function fetchHtml(url, proxy = null, retries = MAX_RETRIES) {
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add progressive delay between retries
      if (attempt > 1) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 2);
        console.log(`Retry ${attempt}/${retries} for ${url} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const config = {
        method: 'GET',
        url,
        timeout: DEFAULT_TIMEOUT,
        headers: getRandomHeaders(),
        validateStatus: status => status >= 200 && status < 400,
        maxRedirects: 5,
        decompress: true
      };

      if (proxy?.http) {
        config.proxy = proxy.http;
      }

      // Random delay before request to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(500, 2000)));

      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      updateStats(true, responseTime);
      
      console.log(`✅ Successfully fetched ${url} (${response.status})`);
      return typeof response.data === 'string' ? response.data : '';

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const domain = extractDomain(url);
      
      console.log(`❌ Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      
      // Track specific error types
      if (error.response?.status === 403) {
        stats.blockedRequests++;
        updateStats(false, responseTime, '403_forbidden', domain);
      } else if (error.response?.status === 429) {
        updateStats(false, responseTime, '429_rate_limit', domain);
      } else if (error.code === 'ECONNABORTED') {
        updateStats(false, responseTime, 'timeout', domain);
      } else {
        updateStats(false, responseTime, 'network_error', domain);
      }
      
      if (attempt === retries) {
        // Log final failure details
        console.log(`Final failure for ${url}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
          timeout: error.code === 'ECONNABORTED'
        });
        throw error;
      }
    }
  }
}

// Enhanced email extraction with context awareness
function extractEmails($, businessName = '') {
  const emails = new Set();
  const businessKeywords = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // 1. mailto links
  $('a[href^="mailto:"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (email && validator.isEmail(email)) {
      emails.add(email.toLowerCase());
    }
  });

  // 2. Text extraction with context
  const contactSections = $('[class*="contact"], [id*="contact"], .about, .footer, header').text();
  const mainText = $('body').text();
  const combinedText = `${contactSections} ${mainText}`;

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  let match;
  
  while ((match = emailRegex.exec(combinedText)) !== null) {
    const email = match[0].toLowerCase();
    if (validator.isEmail(email) && email.length <= 60) {
      // Skip obviously bad emails
      if (!/fonts|cloudflare|hotjar|cookie|static|push|cdn|analytics|noreply|donotreply/i.test(email)) {
        emails.add(email);
      }
    }
  }

  // 3. Priority scoring for emails
  const emailArray = Array.from(emails);
  const scoredEmails = emailArray.map(email => {
    let score = 50;
    const domain = email.split('@')[1];
    
    // Boost business-related emails
    if (businessKeywords.some(keyword => email.includes(keyword))) score += 30;
    if (/info|contact|hello|sales|business|admin/i.test(email)) score += 20;
    if (domain && businessKeywords.some(keyword => domain.includes(keyword))) score += 25;
    
    // Penalize generic emails
    if (/gmail|yahoo|hotmail|outlook/i.test(domain)) score -= 10;
    if (/noreply|donotreply|support/i.test(email)) score -= 30;
    
    return { email, score };
  });

  return scoredEmails
    .sort((a, b) => b.score - a.score)
    .map(item => item.email)
    .slice(0, 5); // Limit to top 5 emails
}

// Enhanced phone extraction with international format support
function extractPhones($) {
  const phones = new Set();
  const text = $('body').text();
  
  // Multiple phone patterns for global support
  const patterns = [
    /(\+91[\s-]?\d{5}[\s-]?\d{5})/g, // Indian format +91 XXXXX XXXXX
    /(\+91[\s-]?\d{10})/g, // Indian format +91 XXXXXXXXXX
    /(\d{3}[\s-]?\d{3}[\s-]?\d{4})/g, // US format XXX-XXX-XXXX
    /(\+\d{1,4}[\s-]?\d{6,14})/g, // International +X XXXXXX...
    /(\d{4}[\s-]?\d{6,7})/g, // Local format XXXX-XXXXXXX
    /(\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4})/g // Generic grouped format
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let phone = match[1].replace(/[^\d+]/g, '');
      
      // Validate phone length and format
      if (phone.length >= 7 && phone.length <= 15) {
        // Normalize Indian numbers
        if (phone.startsWith('91') && phone.length === 12) {
          phone = '+' + phone;
        } else if (phone.length === 10 && !phone.startsWith('+')) {
          // Assume Indian number if 10 digits
          phone = '+91' + phone;
        }
        
        phones.add(phone);
      }
    }
  });
  
  return Array.from(phones).slice(0, 5); // Limit to top 5 phones
}

// Enhanced social links extraction
function extractSocialLinks($) {
  const socialLinks = new Set();
  const socialDomains = [
    'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 
    'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'
  ];
  
  $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"], a[href*="youtube"]').each((_, link) => {
    const href = $(link).attr('href');
    if (href && socialDomains.some(domain => href.includes(domain))) {
      socialLinks.add(href);
    }
  });
  
  return Array.from(socialLinks);
}

// Enhanced crawlSingle with directory detection
async function crawlSingle(url, { proxy, businessName = null } = {}) {
  const result = {
    url,
    businessName: null,
    emails: [],
    phones: [],
    socialLinks: [],
    description: '',
    blocked: false,
    isAggregator: false,
    isDirectoryListing: false
  };

  let html = '';
  let usedBrowser = false;

  // Try regular HTTP request first
  try {
    html = await fetchHtml(url, proxy);
  } catch (error) {
    console.log(`HTTP fetch failed for ${url}, trying browser render...`);
    stats.browserFallbacks++;
    
    // Fallback to browser rendering
    try {
      const { page, html: renderedHtml } = await browserManager.getRenderedContent(url, { 
        timeout: 45000 
      });
      html = renderedHtml || '';
      usedBrowser = true;
      await page.close().catch(() => {});
      
      if (!html || isBlockedHtml(html)) {
        result.blocked = true;
        stats.blockedRequests++;
        return result;
      }
    } catch (browserError) {
      console.log(`Browser render also failed for ${url}: ${browserError.message}`);
      result.blocked = true;
      stats.blockedRequests++;
      return result;
    }
  }

  if (!html) {
    return result;
  }

  html = he.decode(html);
  const $ = cheerio.load(html);

  // Enhanced aggregator detection
  const pageTitle = $('title').first().text().trim();
  const pageContent = $('body').text().slice(0, 2000);
  
  result.isAggregator = isAggregatorUrl(url);
  result.isDirectoryListing = isAggregatorPageByTitle(pageTitle) || 
                              detectAggregatorDynamically(url, pageTitle, pageContent);

  // Extract business information with context awareness
  if (result.isAggregator || result.isDirectoryListing) {
    // For directory pages, extract the featured business info
    const businessInfo = extractFeaturedBusinessInfo($, url, pageContent);
    result.businessName = businessInfo.name || extractBusinessName($, url, true);
    result.emails = businessInfo.emails.length > 0 ? businessInfo.emails : extractEmails($, result.businessName);
    result.phones = businessInfo.phones.length > 0 ? businessInfo.phones : extractPhones($);
    result.description = businessInfo.description || extractBusinessDescription($, result.businessName);
    result.website = extractCorrectWebsite($, url, result.businessName);
  } else {
    // For regular business pages
    result.businessName = extractBusinessName($, url);
    result.emails = extractEmails($, result.businessName);
    result.phones = extractPhones($);
    result.website = extractCorrectWebsite($, url, result.businessName);
    
    // Enhanced description extraction
    const metaDesc = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') || '';
    result.description = metaDesc.trim().slice(0, 300);
  }

  result.socialLinks = extractSocialLinks($);

  console.log(`📊 Crawled ${url}: ${result.emails.length} emails, ${result.phones.length} phones (${usedBrowser ? 'browser' : 'http'})`);
  
  return result;
}

// Enhanced concurrency control with error handling
async function runWithConcurrency(tasks, concurrency = 3) {
  const results = [];
  const executing = [];
  let completed = 0;
  
  console.log(`🚀 Starting ${tasks.length} tasks with concurrency ${concurrency}`);
  
  for (let i = 0; i < tasks.length; i++) {
    const taskIndex = i;
    const promise = tasks[i]()
      .then(result => {
        completed++;
        console.log(`✅ Task ${completed}/${tasks.length} completed`);
        executing.splice(executing.indexOf(promise), 1);
        return result;
      })
      .catch(error => {
        completed++;
        console.log(`❌ Task ${completed}/${tasks.length} failed: ${error.message}`);
        executing.splice(executing.indexOf(promise), 1);
        return null; // Return null for failed tasks
      });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
    
    // Add small delay between task starts
    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(200, 800)));
    }
  }
  
  const finalResults = await Promise.all(results);
  console.log(`🏁 All tasks completed: ${finalResults.filter(r => r !== null).length}/${tasks.length} successful`);
  
  return finalResults.filter(result => result !== null);
}

// Main crawling function with enhanced processing
async function crawlUrls(urls, { proxy, concurrency = 3, keyword = '' } = {}) {
  console.log(`🎯 Starting enhanced crawl of ${urls.length} URLs`);
  
  // Phase 1: Initial crawl with basic extraction
  const initialTasks = urls.map(url => () => crawlSingle(url, { proxy }));
  const initialResults = await runWithConcurrency(initialTasks, concurrency);
  
  console.log(`📈 Initial crawl completed: ${initialResults.length} results`);
  
  // Phase 2: Process and filter results
  const processedResults = [];
  
  for (const result of initialResults) {
    if (!result || result.blocked) continue;
    
    const qualityScore = calculateQualityScore(result, keyword);
    const enhancedResult = {
      ...result,
      qualityScore,
      extractionQuality: qualityScore,
      isHighQuality: qualityScore >= 65,
      businessType: inferBusinessType(result.businessName, result.description, keyword),
      sourceUrl: result.url,
      platform: 'google',
      verificationStatus: 'unverified',
      tags: [],
      email: result.emails[0] || 'N/A',
      phone: result.phones[0] || 'N/A',
      website: result.isAggregator ? '' : preferHomepage(result.url)
    };
    
    processedResults.push(enhancedResult);
  }
  
  console.log(`🎯 Final results: ${processedResults.length} leads extracted`);
  return processedResults;
}

// Enhanced quality scoring
function calculateQualityScore(result, keyword = '') {
  let score = 50;
  
  // Basic completeness scoring
  if (result.businessName && result.businessName.length >= 3 && result.businessName !== 'Unknown') score += 15;
  if (result.emails.length > 0) score += 25;
  if (result.phones.length > 0) score += 15;
  if (result.socialLinks.length > 0) score += 5;
  if (result.description && result.description.length > 50) score += 10;
  
  // Quality bonuses
  if (result.emails.length > 1) score += 5;
  if (result.phones.length > 1) score += 3;
  if (result.website && !isAggregatorUrl(result.website)) score += 10;
  
  // Penalties for aggregator/directory pages
  if (result.isAggregator) score -= 25; // Reduced penalty
  if (result.isDirectoryListing) score -= 15; // Reduced penalty
  if (isSocialOrDirectory(result.url)) score -= 20;
  if (result.blocked) score -= 30;
  
  // Keyword relevance
  if (keyword) {
    const keywordRegex = new RegExp(keyword.replace(/[^\w\s]/g, ''), 'i');
    if (keywordRegex.test(result.businessName || '')) score += 15;
    if (keywordRegex.test(result.description || '')) score += 8;
  }
  
  // Email quality bonus
  const businessEmails = result.emails.filter(email => 
    !/gmail|yahoo|hotmail|outlook/i.test(email)
  );
  if (businessEmails.length > 0) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

// Enhanced business type inference
function inferBusinessType(businessName = '', description = '', keyword = '') {
  const text = `${businessName} ${description} ${keyword}`.toLowerCase();
  
  const typeMap = {
    restaurant: /restaurant|food|dining|cafe|kitchen|catering|pizza|burger|bakery/,
    dental: /dental|dentist|orthodont|oral|teeth|smile|clinic/,
    medical: /medical|doctor|clinic|health|hospital|physician|therapy|healthcare/,
    legal: /law|legal|attorney|lawyer|advocate|court|solicitor/,
    automotive: /auto|car|vehicle|mechanic|garage|repair|dealership/,
    beauty: /beauty|salon|spa|makeup|hair|nail|cosmetic|wellness/,
    fitness: /gym|fitness|trainer|yoga|pilates|workout|health club/,
    real_estate: /real estate|property|realtor|housing|apartment|broker/,
    marketing: /marketing|advertising|digital|seo|social media|branding|agency|creative/,
    technology: /tech|software|development|IT|computer|digital|app|saas/,
    consulting: /consulting|consultant|advisory|strategy|business/,
    finance: /finance|accounting|tax|investment|banking|insurance/
  };

  for (const [type, regex] of Object.entries(typeMap)) {
    if (regex.test(text)) return type;
  }
  
  return 'general';
}

// Enhanced individual business verification
async function verifyBusinessIndividually(businessInfo, proxy = null) {
  const { businessName, originalUrl } = businessInfo;
  
  console.log(`Individually verifying business: ${businessName}`);
  
  try {
    // Create targeted search query for this specific business
    const searchQuery = `"${businessName}" contact`;
    
    // Search for the business specifically (placeholder for actual search implementation)
    const searchResults = await searchForBusiness(searchQuery, businessName);
    
    let verifiedInfo = { ...businessInfo };
    let additionalPages = [];
    
    // Process search results to find official business pages
    for (const result of searchResults.slice(0, 3)) {
      if (result.url === originalUrl) continue; // Skip original URL
      
      try {
        console.log(`Verifying business page: ${result.url}`);
        const pageInfo = await crawlSingle(result.url, { proxy });
        
        // Check if this page is about the same business
        if (isBusinessMatch(businessName, pageInfo.businessName, pageInfo.description)) {
          // Merge and prioritize information
          verifiedInfo = mergeBusinessInfo(verifiedInfo, pageInfo);
          additionalPages.push(result.url);
        }
      } catch (error) {
        console.log(`Failed to verify page ${result.url}: ${error.message}`);
      }
    }
    
    console.log(`Business verification completed for: ${businessName}`);
    return {
      ...verifiedInfo,
      verificationStatus: 'verified',
      additionalPagesCrawled: additionalPages.length,
      isVerified: true
    };
    
  } catch (error) {
    console.log(`Business verification failed for ${businessName}: ${error.message}`);
    return {
      ...businessInfo,
      verificationStatus: 'verification_failed',
      isVerified: false
    };
  }
}

// Helper function to search for a specific business
async function searchForBusiness(query, businessName) {
  try {
    // Use Google Custom Search if available
    const searchApiManager = require('./searchApiManager');
    const results = await searchApiManager.searchGoogleMulti([query], { maxResults: 5 });
    return results;
  } catch (error) {
    console.log(`Business search failed: ${error.message}`);
    return [];
  }
}

// Check if two business references are the same
function isBusinessMatch(name1, name2, description = '') {
  if (!name1 || !name2) return false;
  
  const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Direct match
  if (n1 === n2) return true;
  
  // Partial match (one contains the other)
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if both names appear in description
  if (description) {
    const desc = normalize(description);
    return desc.includes(n1) && desc.includes(n2);
  }
  
  return false;
}

// Merge business information with priority rules
function mergeBusinessInfo(primary, secondary) {
  const merged = { ...primary };
  
  // Prioritize more complete contact information
  if (secondary.emails && secondary.emails.length > merged.emails.length) {
    merged.emails = unique([...merged.emails, ...secondary.emails]);
  }
  
  if (secondary.phones && secondary.phones.length > merged.phones.length) {
    merged.phones = unique([...merged.phones, ...secondary.phones]);
  }
  
  // Use official website if found
  if (secondary.website && !isAggregatorUrl(secondary.website) && isAggregatorUrl(merged.website)) {
    merged.website = secondary.website;
  }
  
  // Merge social links
  if (secondary.socialLinks) {
    merged.socialLinks = unique([...merged.socialLinks, ...secondary.socialLinks]);
  }
  
  // Use better description if available
  if (secondary.description && secondary.description.length > merged.description.length) {
    merged.description = secondary.description;
  }
  
  // Update backward compatibility fields
  merged.email = merged.emails[0] || 'N/A';
  merged.phone = merged.phones[0] || 'N/A';
  
  return merged;
}

// Additional utility functions for JSON-LD parsing
function parseJsonLd($) {
  const organization = { name: null, email: null, telephone: null, sameAs: [] };
  
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const jsonText = $(element).contents().text();
      const jsonData = JSON.parse(jsonText);
      const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      for (const data of dataArray) {
        const type = Array.isArray(data['@type']) ? data['@type'].join(',') : data['@type'];
        
        if (/Organization|LocalBusiness|Corporation|Company/i.test(type || '')) {
          organization.name = organization.name || data.name || data.legalName;
          organization.email = organization.email || data.email;
          organization.telephone = organization.telephone || data.telephone;
          
          if (data.contactPoint) {
            organization.email = organization.email || data.contactPoint.email;
            organization.telephone = organization.telephone || data.contactPoint.telephone;
          }
          
          if (Array.isArray(data.sameAs)) {
            organization.sameAs.push(...data.sameAs);
          }
        }
      }
    } catch (error) {
      // Ignore malformed JSON-LD
    }
  });
  
  organization.sameAs = unique(organization.sameAs);
  return organization;
}

// Get statistics
function getStats() {
  const successRate = stats.totalRequests > 0 ? 
    ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : 0;
  
  const browserFallbackRate = stats.totalRequests > 0 ? 
    ((stats.browserFallbacks / stats.totalRequests) * 100).toFixed(2) : 0;
  
  const blockRate = stats.totalRequests > 0 ? 
    ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2) : 0;

  return {
    totalRequests: stats.totalRequests,
    successfulRequests: stats.successfulRequests,
    failedRequests: stats.failedRequests,
    blockedRequests: stats.blockedRequests,
    captchaEncountered: stats.captchaEncountered,
    browserFallbacks: stats.browserFallbacks,
    successRate: parseFloat(successRate),
    browserFallbackRate: parseFloat(browserFallbackRate),
    blockRate: parseFloat(blockRate),
    averageResponseTime: Math.round(stats.averageResponseTime),
    errorsByType: { ...stats.errorsByType },
    topFailingDomains: Object.entries(stats.domainErrors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, failures: count }))
  };
}

// Reset statistics
function resetStats() {
  stats.totalRequests = 0;
  stats.successfulRequests = 0;
  stats.failedRequests = 0;
  stats.blockedRequests = 0;
  stats.captchaEncountered = 0;
  stats.browserFallbacks = 0;
  stats.averageResponseTime = 0;
  stats.errorsByType = {};
  stats.domainErrors = {};
}

module.exports = {
  crawlSingle,
  crawlUrls,
  verifyBusinessIndividually,
  calculateQualityScore,
  extractBusinessName,
  extractEmails,
  extractPhones,
  runWithConcurrency,
  getStats,
  resetStats
};