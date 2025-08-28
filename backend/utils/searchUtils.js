const userAgents = require('./userAgents');

class SearchUtils {
  static generateGoogleSearchQuery(keyword, source, location, emailDomain = '') {
    // More targeted queries for better results
    const baseQueries = {
      google: `"${keyword}" "${location}" (contact OR email OR phone OR "contact us")`,
      facebook: `site:facebook.com "${keyword}" "${location}" pages`,
      instagram: `site:instagram.com "${keyword}" "${location}" business`,
      linkedin: `site:linkedin.com "${keyword}" "${location}" company`,
      yellowpages: `site:yellowpages.com "${keyword}" "${location}"`,
      yelp: `site:yelp.com "${keyword}" "${location}"`,
      sulekha: `site:sulekha.com "${keyword}" "${location}" business`,
      fiverr: `site:fiverr.com "${keyword}" "${location}" profile`,
      upwork: `site:upwork.com "${keyword}" "${location}" freelancer`,
      google_maps: `"${keyword}" "${location}" "google maps" contact`,
      job_boards: `(site:indeed.com OR site:monster.com) "${keyword}" "${location}" contact`,
      reddit: `site:reddit.com "${keyword}" "${location}" business`,
      angieslist: `site:angieslist.com "${keyword}" "${location}"`,
      thumbtack: `site:thumbtack.com "${keyword}" "${location}"`,
      houzz: `site:houzz.com "${keyword}" "${location}" professional`,
      bing: `"${keyword}" "${location}" contact information`,
      twitter: `site:twitter.com "${keyword}" "${location}" business`,
      pinterest: `site:pinterest.com "${keyword}" "${location}" business`
    };

    let query = baseQueries[source] || `"${keyword}" "${location}" contact email phone`;
    
    if (emailDomain && emailDomain.trim()) {
      const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
      query += ` ${domain}`;
    }

    return query;
  }

  static generateMultipleQueries(keyword, source, location, emailDomain = '') {
    const queries = [];
    
    // Main query
    queries.push(this.generateGoogleSearchQuery(keyword, source, location, emailDomain));
    
    // Alternative targeted queries
    const variations = [
      `"${keyword}" "${location}" "contact us" (phone OR email)`,
      `"${keyword}" "${location}" directory business listing`,
      `"${keyword}" "${location}" professional services contact`,
      `"${keyword}" services "${location}" "get in touch"`
    ];

    if (source !== 'google') {
      const siteMap = {
        facebook: 'facebook.com/pages',
        instagram: 'instagram.com',
        linkedin: 'linkedin.com/company',
        twitter: 'twitter.com',
        yelp: 'yelp.com/biz',
        yellowpages: 'yellowpages.com',
        reddit: 'reddit.com/r',
        sulekha: 'sulekha.com'
      };

      if (siteMap[source]) {
        const siteQuery = `site:${siteMap[source]} "${keyword}" "${location}" contact`;
        queries.push(siteQuery);
      }
    } else {
      queries.push(...variations.slice(0, 2)); // Add 2 variations for google
    }

    return queries.slice(0, 3);
  }

  static extractSocialLinks(text) {
    const socialPatterns = {
      facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/[a-zA-Z0-9.\-_]+/gi,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+/gi,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9.\-_]+/gi,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|user\/|@|c\/)[a-zA-Z0-9.\-_]+/gi,
      pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/[a-zA-Z0-9._]+/gi
    };

    const links = [];
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanLink = match.startsWith('http') ? match : `https://${match}`;
          // Filter out generic/promotional links
          if (!cleanLink.includes('/share') && !cleanLink.includes('/like') && 
              !cleanLink.includes('/follow') && !cleanLink.includes('?')) {
            links.push(cleanLink);
          }
        });
      }
    }

    return [...new Set(links)];
  }

  static extractEmails(text) {
    // Multiple email regex patterns for better matching
    const patterns = [
      /\b[A-Za-z0-9]([A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g,
      /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi
    ];
    
    const emails = new Set();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const email = match.replace('mailto:', '').toLowerCase().trim();
          if (this.isValidEmail(email)) {
            emails.add(email);
          }
        });
      }
    });
    
    return Array.from(emails);
  }

  static isValidEmail(email) {
    if (!email || !email.includes('@') || email.length < 5) return false;
    
    const [local, domain] = email.split('@');
    
    // Filter out common false positives
    const excludedDomains = [
      'example.com', 'test.com', 'domain.com', 'email.com', 
      'noreply.com', 'no-reply.com', 'donotreply.com'
    ];
    
    const excludedPrefixes = [
      'noreply', 'no-reply', 'donotreply', 'admin', 'webmaster', 
      'postmaster', 'info', 'support'
    ];
    
    if (excludedDomains.includes(domain.toLowerCase())) return false;
    if (excludedPrefixes.includes(local.toLowerCase())) return false;
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static extractPhoneNumbers(text) {
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /(\+\d{1,3}[-.\s]?)?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g
    ];
    
    const phones = new Set();
    
    phonePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\d+]/g, '');
          // Validate phone number length and format
          if (cleaned.length >= 10 && cleaned.length <= 15) {
            phones.add(match.trim());
          }
        });
      }
    });
    
    return Array.from(phones);
  }

  static extractBusinessNameFromUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Remove www. and extract domain name
      const domain = hostname.replace('www.', '');
      const domainParts = domain.split('.');
      
      if (domainParts.length > 1) {
        // Convert to readable format
        const name = domainParts[0]
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return name;
      }
      
      return domain;
    } catch (error) {
      console.error('Error extracting business name from URL:', error);
      return 'Unknown Business';
    }
  }

  static getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch (error) {
      return false;
    }
  }

  static normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Remove query parameters and fragments for deduplication
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
    } catch (error) {
      return url;
    }
  }

  static cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  static isBusinessWebsite(url) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Filter out non-business domains
      const nonBusinessDomains = [
        'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
        'linkedin.com', 'youtube.com', 'pinterest.com', 'tiktok.com',
        'wikipedia.org', 'amazon.com', 'ebay.com'
      ];
      
      return !nonBusinessDomains.some(domain => hostname.includes(domain));
    } catch (error) {
      return true; // Assume it's business if we can't parse
    }
  }
}

module.exports = SearchUtils;