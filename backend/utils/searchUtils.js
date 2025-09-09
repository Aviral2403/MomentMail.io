// Enhanced searchUtils.js with dynamic aggregator detection for any niche
const { parse } = require('tldts');

// Known aggregator hosts (as baseline)
const KNOWN_AGGREGATOR_HOSTS = new Set([
  'clutch.co', 'designrush.com', 'justdial.com', 'g2.com', 'goodfirms.co',
  'sortlist.com', 'upcity.com', 'crunchbase.com', 'yelp.com', 'yellowpages.com',
  'ambitionbox.com', 'glassdoor.com', 'indeed.com', 'qoruz.com', 'agencyspotter.com',
  'businesslist.com', 'cylex.in', 'sulekha.com', 'mapsofindia.com', 'zaubacorp.com',
  'asklaila.com', 'getlisted.org', 'wamda.com', 'zoominfo.com', 'apollo.io',
  'leadspedia.com', 'thumbtack.com', 'homeadvisor.com', 'angie.com', 'bark.com',
  'expertise.com', 'toptal.com', 'upwork.com', 'freelancer.com', 'fiverr.com'
]);

const SOCIAL_HOSTS = new Set([
  'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'pinterest.com', 'tiktok.com', 'reddit.com', 'quora.com'
]);

// Enhanced dynamic patterns for any niche
const DYNAMIC_AGGREGATOR_PATTERNS = {
  url: [
    /directory|listing|find|search|top|best|compare|browse|review/i,
    /professionals|experts|services|providers/i,
    /near-me|local|city|area/i,
    /ratings|reviews|testimonials/i
  ],
  
  title: [
    /top\s?\d+.*(?:in|near|for)/i,
    /best\s?\d+.*(?:in|near|for)/i,
    /find\s+(?:the\s+)?best/i,
    /directory\s+of|listing\s+of/i,
    /compare\s+\d+|review\s+\d+/i,
    /professionals?.*(?:in|near)/i,
    /experts?.*(?:in|near)/i,
    /services?.*(?:in|near)/i,
    /providers?.*(?:in|near)/i
  ],
  
  content: [
    /find\s+the\s+right|compare\s+(?:top|best)|browse\s+(?:our|all)/i,
    /verified\s+(?:professionals|experts|providers)/i,
    /read\s+reviews|customer\s+reviews|client\s+testimonials/i,
    /get\s+quotes|request\s+quotes|free\s+estimates/i,
    /featured\s+(?:professionals|businesses|companies)/i,
    /sponsored\s+(?:listings|results)/i,
    /filter\s+by.*(?:location|price|rating)/i
  ],
  
  meta: [
    /directory|marketplace|platform|aggregator/i,
    /find.*professionals|connect.*experts/i,
    /compare.*services|review.*businesses/i
  ]
};

// Business listing indicators (multiple businesses on one page)
const BUSINESS_LISTING_INDICATORS = [
  /\d+\s+(?:businesses|companies|professionals|experts|services)/i,
  /showing\s+\d+.*results/i,
  /page\s+\d+\s+of\s+\d+/i,
  /sort\s+by.*(?:rating|price|distance|relevance)/i,
  /filter.*(?:location|category|price)/i
];

function extractDomain(url) {
  try {
    const u = new URL(url);
    const parsed = parse(u.hostname);
    return parsed.domain ? `${parsed.domain}.${parsed.publicSuffix}` : u.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

function isKnownAggregatorHost(hostname) {
  const parsed = parse(hostname);
  const rootDomain = parsed.domain ? `${parsed.domain}.${parsed.publicSuffix}` : hostname.replace(/^www\./, '');
  return KNOWN_AGGREGATOR_HOSTS.has(rootDomain);
}

function isSocialHost(hostname) {
  const parsed = parse(hostname);
  const rootDomain = parsed.domain ? `${parsed.domain}.${parsed.publicSuffix}` : hostname.replace(/^www\./, '');
  return SOCIAL_HOSTS.has(rootDomain);
}

// Enhanced dynamic aggregator detection for any niche
function detectAggregatorDynamically(url, title = '', content = '', metaDescription = '') {
  const indicators = [];
  let score = 0;
  
  // URL-based detection
  const urlScore = checkPatterns(url, DYNAMIC_AGGREGATOR_PATTERNS.url);
  if (urlScore > 0) {
    indicators.push(`URL patterns (${urlScore})`);
    score += urlScore * 2; // URL patterns are strong indicators
  }
  
  // Title-based detection
  const titleScore = checkPatterns(title, DYNAMIC_AGGREGATOR_PATTERNS.title);
  if (titleScore > 0) {
    indicators.push(`Title patterns (${titleScore})`);
    score += titleScore * 3; // Titles are very strong indicators
  }
  
  // Content-based detection
  const contentScore = checkPatterns(content, DYNAMIC_AGGREGATOR_PATTERNS.content);
  if (contentScore > 0) {
    indicators.push(`Content patterns (${contentScore})`);
    score += contentScore;
  }
  
  // Meta description detection
  const metaScore = checkPatterns(metaDescription, DYNAMIC_AGGREGATOR_PATTERNS.meta);
  if (metaScore > 0) {
    indicators.push(`Meta patterns (${metaScore})`);
    score += metaScore * 2;
  }
  
  // Business listing indicators (multiple businesses on page)
  const listingScore = checkPatterns(content, BUSINESS_LISTING_INDICATORS);
  if (listingScore > 0) {
    indicators.push(`Listing indicators (${listingScore})`);
    score += listingScore * 2;
  }
  
  // Check for generic aggregator/directory terms
  const genericTerms = [
    'directory', 'marketplace', 'platform', 'aggregator', 'listings', 
    'find professionals', 'compare services', 'get quotes', 'browse all',
    'featured businesses', 'verified providers', 'top rated', 'customer reviews'
  ];
  
  const genericScore = genericTerms.reduce((acc, term) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = (title + ' ' + content + ' ' + metaDescription).match(regex);
    return acc + (matches ? matches.length : 0);
  }, 0);
  
  if (genericScore > 0) {
    indicators.push(`Generic terms (${genericScore})`);
    score += genericScore;
  }
  
  // Domain name analysis
  const domain = extractDomain(url);
  if (domain) {
    const domainWords = domain.replace(/\.[^.]+$/, '').split(/[-.]/).filter(w => w.length > 2);
    const aggregatorWords = ['find', 'search', 'top', 'best', 'compare', 'list', 'directory', 'hub', 'center'];
    
    const domainScore = domainWords.reduce((acc, word) => {
      return acc + (aggregatorWords.some(aw => word.toLowerCase().includes(aw)) ? 1 : 0);
    }, 0);
    
    if (domainScore > 0) {
      indicators.push(`Domain analysis (${domainScore})`);
      score += domainScore;
    }
  }
  
  // Threshold for classification (adjustable based on testing)
  const isAggregator = score >= 3;
  
  return {
    isAggregator,
    confidence: Math.min(score / 10, 1), // Normalize to 0-1
    indicators,
    score
  };
}

function checkPatterns(text, patterns) {
  if (!text) return 0;
  
  return patterns.reduce((score, pattern) => {
    const matches = text.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);
}

// Enhanced aggregator detection (combines known and dynamic)
function isAggregatorUrl(url = '') {
  try {
    const u = new URL(url);
    
    // Check known aggregators first
    if (isKnownAggregatorHost(u.hostname)) return true;
    
    // Dynamic detection based on URL structure
    const fullUrl = url.toLowerCase();
    const pathAndQuery = `${u.pathname} ${u.search}`.toLowerCase();
    
    const urlPatterns = [
      /directory/, /top-/, /best-/, /list/, /agencies/, /companies/, /firms/,
      /browse/, /search/, /find/, /compare/, /reviews?/, /ratings?/
    ];
    
    return urlPatterns.some(pattern => pattern.test(pathAndQuery));
  } catch {
    return false;
  }
}

function isAggregatorPageByTitle(title = '') {
  if (!title) return false;
  
  const detection = detectAggregatorDynamically('', title, '', '');
  return detection.isAggregator && detection.confidence > 0.5;
}

function isAggregatorPageByContent(content = '') {
  if (!content) return false;
  
  const detection = detectAggregatorDynamically('', '', content, '');
  return detection.isAggregator && detection.confidence > 0.3; // Lower threshold for content-only
}

// Comprehensive aggregator detection
function isAggregatorPage(url, title = '', content = '', metaDescription = '') {
  // Check known aggregators first
  if (isAggregatorUrl(url)) return { isAggregator: true, method: 'known_host', confidence: 1.0 };
  
  // Dynamic detection
  const detection = detectAggregatorDynamically(url, title, content, metaDescription);
  
  return {
    isAggregator: detection.isAggregator,
    method: 'dynamic_analysis',
    confidence: detection.confidence,
    indicators: detection.indicators,
    score: detection.score
  };
}

// Enhanced business extraction for directory pages
function extractBusinessFromDirectory(content, url, businessName = '') {
  const businessInfo = {
    name: businessName,
    emails: [],
    phones: [],
    website: '',
    description: '',
    confidence: 0.5
  };
  
  // If we have a business name, try to extract its specific information
  if (businessName && businessName.length > 2) {
    const businessSection = findBusinessSection(content, businessName);
    if (businessSection) {
      businessInfo.emails = extractEmailsFromSection(businessSection, businessName);
      businessInfo.phones = extractPhonesFromSection(businessSection);
      businessInfo.website = extractWebsiteFromSection(businessSection, url);
      businessInfo.description = extractDescriptionFromSection(businessSection);
      businessInfo.confidence = 0.8; // Higher confidence when we find a specific section
    }
  }
  
  return businessInfo;
}

function findBusinessSection(content, businessName) {
  const nameWords = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Try to find a section that contains the business name and contact info
  const sections = content.split(/\n\s*\n|\r\n\s*\r\n/); // Split by double line breaks
  
  for (const section of sections) {
    const sectionLower = section.toLowerCase();
    
    // Check if section contains business name words
    const nameMatches = nameWords.filter(word => sectionLower.includes(word)).length;
    const hasContact = /email|phone|contact|website|@|tel:/i.test(section);
    
    if (nameMatches >= Math.max(1, nameWords.length - 1) && hasContact) {
      return section;
    }
  }
  
  return null;
}

function extractEmailsFromSection(section, businessName) {
  const emails = [];
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const businessKeywords = businessName.toLowerCase().split(/\s+/);
  
  let match;
  while ((match = emailRegex.exec(section)) !== null) {
    const email = match[0].toLowerCase();
    
    // Score emails by relevance
    let score = 1;
    if (businessKeywords.some(keyword => email.includes(keyword))) score += 2;
    if (/info|contact|hello|sales|business/i.test(email)) score += 1;
    
    emails.push({ email, score });
  }
  
  return emails
    .sort((a, b) => b.score - a.score)
    .map(item => item.email)
    .slice(0, 3);
}

function extractPhonesFromSection(section) {
  const phones = [];
  const phonePatterns = [
    /(\+\d{1,4}[\s-]?\d{6,14})/g,
    /(\d{3}[\s-]?\d{3}[\s-]?\d{4})/g,
    /(\d{4}[\s-]?\d{6,7})/g
  ];
  
  phonePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(section)) !== null) {
      const phone = match[1].replace(/[^\d+]/g, '');
      if (phone.length >= 7 && phone.length <= 15) {
        phones.push(phone);
      }
    }
  });
  
  return [...new Set(phones)].slice(0, 3);
}

function extractWebsiteFromSection(section, originalUrl) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const urls = section.match(urlRegex) || [];
  
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const originalDomain = extractDomain(originalUrl);
      const foundDomain = extractDomain(url);
      
      // Skip if it's the same as the original aggregator site
      if (originalDomain === foundDomain) continue;
      
      // Skip other known aggregators
      if (isKnownAggregatorHost(urlObj.hostname)) continue;
      
      return url;
    } catch {
      continue;
    }
  }
  
  return '';
}

function extractDescriptionFromSection(section) {
  // Look for descriptive text (not just contact info)
  const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    // Skip sentences that are mostly contact info
    if (!/^[+\d\s\-()@.]+$/.test(trimmed) && !/^\w+@\w+/.test(trimmed)) {
      if (trimmed.length > 50 && trimmed.length < 300) {
        return trimmed + '.';
      }
    }
  }
  
  return '';
}

// Block detection patterns
const BLOCK_PHRASES = [
  'Just a moment...', 'Sorry, you have been blocked', 'enable JavaScript',
  'captcha', 'Access denied', 'Rate limited', 'Please complete the security check',
  'Checking your browser', 'DDoS protection', 'Security check', 'Bot detection',
  'Cloudflare', 'Please wait while we are checking your browser'
];

function isBlockedHtml(html = '') {
  if (!html || html.length < 100) return true;
  
  const htmlLower = html.toLowerCase();
  return BLOCK_PHRASES.some(phrase => htmlLower.includes(phrase.toLowerCase()));
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    
    // Handle Google redirect URLs
    if (u.hostname === 'www.google.com' && u.pathname === '/url') {
      const realUrl = u.searchParams.get('q') || u.searchParams.get('url');
      if (realUrl) return normalizeUrl(realUrl);
    }
    
    return u.toString();
  } catch {
    return null;
  }
}

function preferHomepage(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    
    const meaningfulPaths = ['/about', '/contact', '/services', '/team'];
    const currentPath = u.pathname.toLowerCase();
    
    if (meaningfulPaths.some(path => currentPath.includes(path))) {
      return u.toString();
    }
    
    return `${u.origin}/`;
  } catch {
    return url;
  }
}

function isSocialOrDirectory(url) {
  try {
    const u = new URL(url);
    return isSocialHost(u.hostname) || isKnownAggregatorHost(u.hostname);
  } catch {
    return false;
  }
}

// Enhanced URL scoring with dynamic aggregator detection
function scoreUrlForBusiness(url, title = '') {
  let score = 50;
  if (!url) return 0;
  
  try {
    const u = new URL(url);
    const domain = extractDomain(url);
    
    // Dynamic aggregator detection
    const aggregatorDetection = detectAggregatorDynamically(url, title, '', '');
    if (aggregatorDetection.isAggregator) {
      score -= (30 + aggregatorDetection.confidence * 15); // Variable penalty based on confidence
    }
    
    // Known aggregators and social sites
    if (isKnownAggregatorHost(u.hostname)) score -= 45;
    if (isSocialHost(u.hostname)) score -= 35;
    
    // Path-based scoring
    const path = u.pathname.toLowerCase();
    if (/contact|about|services|team|company/i.test(path)) score += 15;
    if (/agency|studio|labs|digital|marketing|media|creative|consulting/i.test(u.hostname)) score += 12;
    
    // Title-based scoring
    if (/official|home|welcome/i.test(title.toLowerCase())) score += 8;
    
    // Security and quality
    if (url.startsWith('https:')) score += 5;
    
    // Domain quality
    if (domain) {
      const tld = domain.split('.').pop();
      if (['com', 'co', 'in', 'org'].includes(tld)) score += 5;
      if (['biz', 'pro', 'agency'].includes(tld)) score += 8;
      if (['tk', 'ml', 'ga', 'cf'].includes(tld)) score -= 15;
    }
    
  } catch (error) {
    console.log(`Error scoring URL ${url}: ${error.message}`);
  }
  
  return Math.max(0, Math.min(100, score));
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

// Enhanced contact validation
function isValidEmail(email) {
  if (!email || email === 'N/A') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  if (email.length > 60 || email.length < 5) return false;
  
  const badPatterns = [
    /noreply|no-reply|donotreply/i,
    /support@|help@.*\.(com|org|net)$/i,
    /test@|example@|sample@/i,
    /fonts|cloudflare|hotjar|analytics|facebook|instagram|twitter/i
  ];
  
  return !badPatterns.some(pattern => pattern.test(email));
}

function isValidPhone(phone) {
  if (!phone || phone === 'N/A') return false;
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.length < 7 || cleaned.length > 15) return false;
  
  const invalidPatterns = [
    /^0+$/, /^1+$/, /(\d)\1{6,}/, /^123+/, /^999+/
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(cleaned));
}

// Enhanced quality assessment with dynamic aggregator consideration
function assessContactQuality(contact, url = '', title = '', content = '') {
  let quality = {
    score: 0,
    issues: [],
    strengths: [],
    aggregatorInfo: null
  };
  
  // Check if this is from an aggregator/directory
  const aggregatorDetection = detectAggregatorDynamically(url, title, content);
  quality.aggregatorInfo = aggregatorDetection;
  
  // Business name assessment
  if (contact.businessName && contact.businessName !== 'Unknown') {
    if (contact.businessName.length >= 3) {
      quality.score += 15;
      quality.strengths.push('Valid business name');
    }
  } else {
    quality.issues.push('Missing or invalid business name');
  }
  
  // Email assessment
  const validEmails = contact.emails.filter(isValidEmail);
  if (validEmails.length > 0) {
    quality.score += 25;
    quality.strengths.push(`${validEmails.length} valid email(s)`);
    
    const businessEmails = validEmails.filter(email => 
      !/(gmail|yahoo|hotmail|outlook)\.com$/i.test(email)
    );
    if (businessEmails.length > 0) {
      quality.score += 10;
      quality.strengths.push('Business domain email');
    }
  } else {
    quality.issues.push('No valid emails found');
  }
  
  // Phone assessment
  const validPhones = contact.phones.filter(isValidPhone);
  if (validPhones.length > 0) {
    quality.score += 15;
    quality.strengths.push(`${validPhones.length} valid phone(s)`);
  } else {
    quality.issues.push('No valid phone numbers found');
  }
  
  // Website assessment
  if (contact.website && !isAggregatorUrl(contact.website)) {
    quality.score += 10;
    quality.strengths.push('Independent website');
  }
  
  // Apply aggregator penalty based on confidence
  if (aggregatorDetection.isAggregator) {
    const penalty = Math.round(20 + aggregatorDetection.confidence * 15);
    quality.score -= penalty;
    quality.issues.push(`Source is aggregator/directory (confidence: ${Math.round(aggregatorDetection.confidence * 100)}%)`);
  }
  
  quality.score = Math.max(0, Math.min(100, quality.score));
  
  return quality;
}

// Enhanced deduplication with business matching
function findDuplicateContacts(contacts) {
  const duplicates = [];
  const seen = new Map();
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const signatures = generateContactSignatures(contact);
    
    let isDuplicate = false;
    for (const signature of signatures) {
      if (seen.has(signature)) {
        duplicates.push({
          index: i,
          duplicateOf: seen.get(signature),
          matchType: getSignatureType(signature)
        });
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      signatures.forEach(sig => seen.set(sig, i));
    }
  }
  
  return duplicates;
}

function generateContactSignatures(contact) {
  const signatures = [];
  
  if (contact.businessName && contact.businessName !== 'Unknown') {
    const normalized = contact.businessName.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
    signatures.push(`name:${normalized}`);
  }
  
  contact.emails.forEach(email => {
    if (isValidEmail(email)) {
      signatures.push(`email:${email.toLowerCase()}`);
    }
  });
  
  contact.phones.forEach(phone => {
    if (isValidPhone(phone)) {
      const cleaned = phone.replace(/[^\d]/g, '');
      signatures.push(`phone:${cleaned}`);
    }
  });
  
  const domain = extractDomain(contact.website || contact.sourceUrl);
  if (domain) {
    signatures.push(`domain:${domain}`);
  }
  
  return signatures;
}

function getSignatureType(signature) {
  if (signature.startsWith('name:')) return 'business_name';
  if (signature.startsWith('email:')) return 'email';
  if (signature.startsWith('phone:')) return 'phone';
  if (signature.startsWith('domain:')) return 'domain';
  return 'unknown';
}

// Business type detection
function detectBusinessType(text = '') {
  const textLower = text.toLowerCase();
  
  const businessTypes = {
    marketing: {
      keywords: ['marketing', 'advertising', 'digital', 'seo', 'social media', 'branding', 'creative', 'agency', 'campaign', 'promotion'],
      score: 0
    },
    technology: {
      keywords: ['software', 'tech', 'development', 'it', 'app', 'web', 'mobile', 'saas', 'cloud', 'ai'],
      score: 0
    },
    consulting: {
      keywords: ['consulting', 'consultant', 'advisory', 'strategy', 'business', 'management', 'expert', 'solutions'],
      score: 0
    },
    healthcare: {
      keywords: ['medical', 'health', 'healthcare', 'clinic', 'hospital', 'doctor', 'physician', 'treatment'],
      score: 0
    },
    legal: {
      keywords: ['law', 'legal', 'attorney', 'lawyer', 'advocate', 'court', 'litigation', 'compliance'],
      score: 0
    },
    finance: {
      keywords: ['finance', 'accounting', 'tax', 'investment', 'banking', 'insurance', 'financial', 'advisory'],
      score: 0
    },
    real_estate: {
      keywords: ['real estate', 'property', 'realtor', 'housing', 'apartment', 'commercial', 'residential'],
      score: 0
    },
    education: {
      keywords: ['education', 'training', 'course', 'learning', 'school', 'university', 'institute', 'academy'],
      score: 0
    }
  };
  
  for (const [type, config] of Object.entries(businessTypes)) {
    config.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(textLower)) {
        config.score += keyword.length;
      }
    });
  }
  
  let bestType = 'general';
  let bestScore = 0;
  
  for (const [type, config] of Object.entries(businessTypes)) {
    if (config.score > bestScore) {
      bestScore = config.score;
      bestType = type;
    }
  }
  
  return bestScore > 0 ? bestType : 'general';
}

// Enhanced URL filtering
function filterAndCleanUrls(urls, keyword = '') {
  const cleaned = [];
  const seen = new Set();
  
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (!normalized || seen.has(normalized)) continue;
    
    if (isObviouslyIrrelevant(normalized, keyword)) continue;
    
    seen.add(normalized);
    cleaned.push(normalized);
  }
  
  return cleaned;
}

function isObviouslyIrrelevant(url, keyword = '') {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const hostname = u.hostname.toLowerCase();
    
    // Skip file downloads
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(path)) return true;
    
    // Skip job/career pages unless looking for HR agencies
    if (!/hr|recruitment|staffing/i.test(keyword) && /jobs|careers|hiring|apply/i.test(path)) return true;
    
    // Skip news/blog unless relevant
    if (!/news|media|content/i.test(keyword) && /news|blog|article|press/i.test(path)) return true;
    
    const wrongDomains = ['wikipedia.org', 'youtube.com', 'stackoverflow.com', 'github.com'];
    if (wrongDomains.some(domain => hostname.includes(domain))) return true;
    
    return false;
  } catch {
    return false;
  }
}

module.exports = {
  extractDomain,
  isKnownAggregatorHost,
  isSocialHost,
  detectAggregatorDynamically,
  isAggregatorUrl,
  isAggregatorPageByTitle,
  isAggregatorPageByContent,
  isAggregatorPage,
  extractBusinessFromDirectory,
  isBlockedHtml,
  normalizeUrl,
  preferHomepage,
  isSocialOrDirectory,
  scoreUrlForBusiness,
  isValidEmail,
  isValidPhone,
  assessContactQuality,
  findDuplicateContacts,
  detectBusinessType,
  filterAndCleanUrls,
  unique
};