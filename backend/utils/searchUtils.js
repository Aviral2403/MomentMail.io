const userAgents = require('./userAgents');

class SearchUtils {
  static generateGoogleDorkQuery(keyword, source, location, emailDomain = '') {
    const baseQueries = {
      google: `("${keyword}" AND "${location}") (email OR contact OR "@gmail.com" OR "@yahoo.com" OR "phone" OR "call")`,
      facebook: `site:facebook.com ("${keyword}" "${location}") (contact OR email OR phone OR business)`,
      instagram: `site:instagram.com ("${keyword}" "${location}") (contact OR email OR "dm me" OR "inquiries")`,
      linkedin: `(site:linkedin.com/in OR site:linkedin.com/company) ("${keyword}" "${location}") (contact OR email OR phone)`,
      fiverr: `site:fiverr.com ("${keyword}") (contact OR email OR "${location}")`,
      upwork: `site:upwork.com/freelancers ("${keyword}") (contact OR email OR "${location}")`,
      google_maps: `site:google.com/maps ("${keyword}" "${location}") (phone OR contact OR website)`,
      job_boards: `(site:indeed.com OR site:monster.com OR site:careerbuilder.com OR site:glassdoor.com) ("${keyword}" "${location}") (contact OR email OR apply)`,
      reddit: `site:reddit.com ("${keyword}" "${location}") (contact OR email OR hire OR freelance)`,
      directory: `("${keyword}" "${location}") ("contact us" OR "get in touch" OR "email us" OR "call us") filetype:html`,
      yellowpages: `site:yellowpages.com ("${keyword}" "${location}") OR site:yellowpages.ca ("${keyword}" "${location}")`,
      yelp: `site:yelp.com ("${keyword}" "${location}") (phone OR contact OR website)`,
      sulekha: `site:sulekha.com ("${keyword}" "${location}") (contact OR phone)`,
      craigslist: `site:craigslist.org ("${keyword}" "${location}") (contact OR email OR phone)`,
      angieslist: `site:angieslist.com ("${keyword}" "${location}")`,
      thumbtack: `site:thumbtack.com ("${keyword}" "${location}")`,
      houzz: `site:houzz.com ("${keyword}" "${location}")`,
      bing: `site:bing.com ("${keyword}" "${location}") (contact OR email OR phone)`,
      twitter: `site:twitter.com ("${keyword}" "${location}") (contact OR email)`,
      pinterest: `site:pinterest.com ("${keyword}" "${location}") (business OR contact)`
    };

    let query = baseQueries[source] || `("${keyword}" "${location}") (email OR contact OR phone)`;
    
    if (emailDomain && emailDomain.trim()) {
      const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
      query += ` AND "${domain}"`;
    }

    return query;
  }

  static generateMultipleQueries(keyword, source, location, emailDomain = '') {
    const queries = [];
    
    queries.push(this.generateGoogleDorkQuery(keyword, source, location, emailDomain));
    
    const variations = [
      `"${keyword}" "${location}" contact email phone`,
      `"${keyword}" "${location}" "contact us" phone`,
      `"${keyword}" "${location}" business directory`,
      `"${keyword}" "${location}" company email address`
    ];

    if (source !== 'google') {
      const siteMap = {
        facebook: 'facebook.com',
        instagram: 'instagram.com', 
        linkedin: 'linkedin.com',
        twitter: 'twitter.com',
        yelp: 'yelp.com',
        yellowpages: 'yellowpages.com',
        reddit: 'reddit.com'
      };

      if (siteMap[source]) {
        variations.forEach(variation => {
          queries.push(`site:${siteMap[source]} ${variation}`);
        });
      }
    } else {
      queries.push(...variations);
    }

    return queries.slice(0, 3);
  }

  static generateSearchUrls(query, pages = 1) {
    const encodedQuery = encodeURIComponent(query);
    const urls = [];
    
    for (let i = 0; i < pages; i++) {
      const start = i * 10;
      urls.push(`https://www.google.com/search?q=${encodedQuery}&num=10&start=${start}&hl=en&gl=us&pws=0&filter=0&safe=off`);
    }
    
    return urls;
  }

  static generateAlternativeUrls(keyword, location, source) {
    const encodedKeyword = encodeURIComponent(keyword);
    const encodedLocation = encodeURIComponent(location);
    const encodedSource = encodeURIComponent(source);
    
    return [
      `https://www.bing.com/search?q=${encodedKeyword}+${encodedLocation}+${encodedSource}+contact+email+phone&count=50`,
      `https://duckduckgo.com/?q=${encodedKeyword}+${encodedLocation}+${encodedSource}+email+contact&ia=web`,
      `https://search.yahoo.com/search?p=${encodedKeyword}+${encodedLocation}+${encodedSource}+contact+phone&n=50`
    ];
  }

  static getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  static extractSocialLinks(text) {
    const socialPatterns = {
      facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/[a-zA-Z0-9.\-]+/gi,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+/gi,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9.\-]+/gi,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|user\/|@)[a-zA-Z0-9.\-]+/gi
    };

    const links = [];
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        links.push(...matches.map(link => link.startsWith('http') ? link : `https://${link}`));
      }
    }

    return [...new Set(links)];
  }

  static extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    
    const filtered = emails.filter(email => {
      const domain = email.split('@')[1];
      const excludedDomains = ['example.com', 'test.com', 'domain.com', 'email.com'];
      return !excludedDomains.includes(domain.toLowerCase());
    });
    
    return [...new Set(filtered)];
  }

  static extractPhoneNumbers(text) {
    const phonePatterns = [
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      /\d{10}/g
    ];
    
    const phones = [];
    phonePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      phones.push(...matches);
    });
    
    const cleaned = phones
      .map(phone => phone.replace(/[^\d+]/g, ''))
      .filter(phone => phone.length >= 10)
      .map(phone => {
        if (phone.length === 10 && !phone.startsWith('+')) {
          return `(${phone.substr(0,3)}) ${phone.substr(3,3)}-${phone.substr(6,4)}`;
        }
        return phone;
      });
    
    return [...new Set(cleaned)];
  }

  static extractWebsites(text) {
    const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g;
    const domainRegex = /(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.(com|org|net|gov|edu|mil|int|co|io|ai|tech|app)/g;
    
    const urls = text.match(urlRegex) || [];
    const domains = text.match(domainRegex) || [];
    
    const allUrls = [
      ...urls,
      ...domains.map(domain => domain.startsWith('www.') || domain.startsWith('http') ? domain : `https://${domain}`)
    ];
    
    const filtered = allUrls.filter(url => {
      const excludedDomains = ['example.com', 'test.com', 'domain.com', 'google.com', 'facebook.com', 'twitter.com'];
      return !excludedDomains.some(excluded => url.includes(excluded));
    });
    
    return [...new Set(filtered)];
  }

  static cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  }

  static extractBusinessNames(text, keyword) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const businessNames = new Set();
    
    lines.forEach(line => {
      if (line.toLowerCase().includes(keyword.toLowerCase()) && 
          line.length > 5 && 
          line.length < 100 &&
          !/^(http|www|@)/.test(line) &&
          !/^\d+$/.test(line)) {
        
        let cleaned = line
          .replace(/[^\w\s&.-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleaned.length > 3) {
          businessNames.add(cleaned);
        }
      }
    });
    
    return Array.from(businessNames);
  }

  static getSearchDelay(requestCount = 0) {
    const baseDelay = 2000;
    const randomDelay = Math.floor(Math.random() * 3000);
    const escalationDelay = Math.floor(requestCount / 5) * 1000;
    
    return Math.min(baseDelay + randomDelay + escalationDelay, 15000);
  }

  static validateLead(lead) {
    if (!lead || typeof lead !== 'object') return false;
    if (!lead.businessName || typeof lead.businessName !== 'string') return false;
    if (lead.businessName.trim().length < 2) return false;
    
    const hasEmail = lead.email && lead.email !== 'N/A' && this.isValidEmail(lead.email);
    const hasPhone = lead.phone && lead.phone !== 'N/A' && lead.phone.replace(/\D/g, '').length >= 10;
    const hasWebsite = lead.website && lead.website !== 'N/A' && this.isValidUrl(lead.website);
    
    return hasEmail || hasPhone || hasWebsite;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url) {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  static createFallbackLeads(keyword, location) {
    return [];
  }

  static shouldApplyRateLimit(platform, requestCount) {
    const rateLimits = {
      google: { maxRequests: 10, timeWindow: 60000 },
      bing: { maxRequests: 15, timeWindow: 60000 },
      duckduckgo: { maxRequests: 20, timeWindow: 60000 },
      facebook: { maxRequests: 5, timeWindow: 60000 },
      linkedin: { maxRequests: 5, timeWindow: 60000 },
      default: { maxRequests: 8, timeWindow: 60000 }
    };
    
    const limit = rateLimits[platform] || rateLimits.default;
    return requestCount >= limit.maxRequests;
  }

  static generateSearchStrategy(keyword, platforms, location) {
    const strategies = [];
    
    if (location) {
      strategies.push({
        type: 'directory',
        priority: 1,
        platforms: ['yellowpages', 'yelp'],
        approach: 'direct_scrape'
      });
    }
    
    strategies.push({
      type: 'google_site_search',
      priority: 2,
      platforms: platforms.filter(p => ['facebook', 'linkedin', 'twitter'].includes(p)),
      approach: 'google_dork'
    });
    
    strategies.push({
      type: 'alternative_engines',
      priority: 3,
      platforms: ['bing', 'duckduckgo'],
      approach: 'multi_engine'
    });
    
    strategies.push({
      type: 'general_search',
      priority: 4,
      platforms: ['google'],
      approach: 'broad_search'
    });
    
    return strategies.sort((a, b) => a.priority - b.priority);
  }
}

module.exports = SearchUtils;