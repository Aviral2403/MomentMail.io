// Enhanced leadControllers.js with improved directory handling, individual verification, and progress tracking
const { randomUUID } = require('crypto');
const LeadSearch = require('../models/Lead');
const searchApiManager = require('../utils/searchApiManager');
const alternativeSearchManager = require('../utils/alternativeSearchManager');
const proxyManager = require('../utils/proxyManager');

// Import Gemini validation service
const GeminiValidationService = require('../services/geminiValidationService');

const {
  normalizeUrl,
  preferHomepage,
  extractDomain,
  scoreUrlForBusiness,
  isAggregatorUrl,
  detectAggregatorDynamically,
  isAggregatorPage,
  extractBusinessFromDirectory,
  filterAndCleanUrls,
  assessContactQuality,
  unique
} = require('../utils/searchUtils');

const {
  crawlUrls,
  verifyBusinessIndividually,
  calculateQualityScore,
  runWithConcurrency,
  getStats: getCrawlerStats
} = require('../utils/CrawlerManager');

function generateSearchId() {
  return randomUUID();
}

// Enhanced query building with better directory filtering
function buildQueries(keyword, location) {
  const base = `"${keyword}" "${location}"`;
  const keywordOnly = `${keyword} ${location}`;
  
  return unique([
    // Primary business queries (exclude directories)
    `${keywordOnly} -site:clutch.co -site:designrush.com -site:justdial.com -site:yelp.com -site:agencyspotter.com`,
    `${keywordOnly} site:*.com -directory -listing -"top 10" -"best 10"`,
    `${keywordOnly} "contact us" OR "about us" -directory`,
    
    // Contact-focused queries
    `${base} (contact OR "contact us" OR "get in touch") -listing`,
    `${base} (email OR phone OR "call us") -directory`,
    `${base} ("about us" OR "our team" OR "who we are") -listing`,
    
    // Business-specific queries
    `"${keyword} services" "${location}" -directory -listing`,
    `"${keyword} company" "${location}" -"find companies"`,
    `"${location} ${keyword}" website -directory`,
    
    // Domain-specific searches
    `site:*.in ${keywordOnly} -directory`,
    `${keywordOnly} -site:facebook.com -site:twitter.com -site:linkedin.com -site:clutch.co -site:agencyspotter.com`,
    
    // Exclude aggregators and job sites
    `${keywordOnly} -jobs -careers -hiring -news -wikipedia -directory -listing`,
    
    // Local business variations
    `"${keyword} near ${location}" -directory`,
    `"${keyword} in ${location}" contact -listing`
  ]);
}


async function getCandidateUrls(params, leadSearch) {
  const { keyword, location, maxResults = 20, proxy } = params;
  
  console.log(`Getting enhanced candidate URLs for "${keyword}" in "${location}"`);
  
  // Update progress
  await updateSearchProgress(leadSearch, 'searching', 10, 'Building search queries...');
  
  const queries = buildQueries(keyword, location);
  console.log(`Built ${queries.length} enhanced search queries`);

  let allItems = [];
  let totalApiUsage = {
    queriesUsed: 0,
    queriesAttempted: 0,
    successfulQueries: 0,
    failedQueries: 0,
    remainingQueries: 0,
    dailyQueries: 0,
    dailyLimit: 100
  };
  
  // Update progress
  await updateSearchProgress(leadSearch, 'searching', 20, 'Executing Google search...');
  
  // Try Google CSE first with proper tracking context
  try {
    console.log('Searching Google CSE with enhanced queries...');
    const searchResult = await searchApiManager.searchGoogleMulti(queries, { 
      maxResults: maxResults * 3,
      searchId: leadSearch.searchId,
      trackingContext: 'initial_search' // Specify this is initial search
    });
    
    // Handle new response format with API usage tracking
    if (searchResult.results) {
      allItems.push(...searchResult.results);
      totalApiUsage = searchResult.apiUsage;
      console.log(`Google CSE initial search returned ${searchResult.results.length} items, used ${searchResult.apiUsage.queriesUsed} API calls (${searchResult.apiUsage.successfulQueries} successful, ${searchResult.apiUsage.failedQueries} failed)`);
    } else {
      // Backward compatibility - if old format is returned
      allItems.push(...searchResult);
      console.log(`Google CSE returned ${searchResult.length} items (legacy format)`);
      // Estimate usage for backward compatibility - be more accurate
      const estimatedUsage = Math.min(queries.length, 100); // Can't use more than daily limit
      totalApiUsage.queriesUsed = estimatedUsage;
      totalApiUsage.queriesAttempted = queries.length;
      totalApiUsage.successfulQueries = estimatedUsage;
      totalApiUsage.failedQueries = Math.max(0, queries.length - estimatedUsage);
    }
    
    // Update leadSearch with API usage immediately after initial search
    leadSearch.searchApiUsage = {
      provider: 'google_custom',
      queriesUsed: totalApiUsage.queriesUsed,
      queriesAttempted: totalApiUsage.queriesAttempted,
      successfulQueries: totalApiUsage.successfulQueries,
      failedQueries: totalApiUsage.failedQueries,
      remainingQueries: totalApiUsage.remainingQueries,
      dailyQueries: totalApiUsage.dailyQueries,
      dailyLimit: totalApiUsage.dailyLimit
    };
    
  } catch (error) {
    console.error('Google CSE search failed:', error.message);
    // Add error to search record
    leadSearch.addError('search_error', 'Google CSE search failed', {
      error: error.message,
      keyword,
      location,
      timestamp: new Date().toISOString()
    });
    
    // Even if search failed, we might have used some queries
    if (error.message.includes('limit exceeded') || error.message.includes('quota')) {
      const currentStats = searchApiManager.getApiUsageStats();
      totalApiUsage.queriesUsed = currentStats.queriesUsed;
      totalApiUsage.dailyQueries = currentStats.dailyQueries;
      totalApiUsage.remainingQueries = currentStats.remainingQueries;
      
      // Update leadSearch with failed search API usage
      leadSearch.searchApiUsage = {
        provider: 'google_custom',
        queriesUsed: totalApiUsage.queriesUsed,
        queriesAttempted: queries.length,
        successfulQueries: 0,
        failedQueries: queries.length,
        remainingQueries: totalApiUsage.remainingQueries,
        dailyQueries: totalApiUsage.dailyQueries,
        dailyLimit: totalApiUsage.dailyLimit
      };
    }
  }

  // Update progress
  await updateSearchProgress(leadSearch, 'searching', 30, 'Running fallback searches...');

  // Fallback to alternative search if needed
  if (allItems.length < Math.floor(maxResults * 0.75)) {
    console.log('Google results insufficient, trying alternative search...');
    try {
      const altItems = await alternativeSearchManager.searchAltEngines(
        `${keyword} ${location}`, 
        { maxResults: maxResults * 2, proxy }
      );
      console.log(`Alternative search returned ${altItems.length} items`);
      allItems.push(...altItems);
    } catch (error) {
      console.error('Alternative search failed:', error.message);
      leadSearch.addError('fallback_error', 'Alternative search failed', {
        error: error.message,
        keyword,
        location,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update progress
  await updateSearchProgress(leadSearch, 'searching', 40, 'Processing and filtering URLs...');

  // Enhanced URL processing and scoring
  const urlMap = new Map();
  
  for (const item of allItems) {
    try {
      const normalizedUrl = normalizeUrl(item.url);
      if (!normalizedUrl || !normalizedUrl.startsWith('http')) continue;
      
      if (urlMap.has(normalizedUrl)) continue;
      
      const score = scoreUrlForBusiness(normalizedUrl, item.title || '');
      const aggregatorDetection = detectAggregatorDynamically(
        normalizedUrl, 
        item.title || '', 
        item.snippet || ''
      );
      
      const domain = extractDomain(normalizedUrl);
      
      // Enhanced filtering
      if (domain) {
        // Skip obvious non-business domains
        if (/wikipedia|reddit|facebook|twitter|instagram|linkedin|youtube|pinterest|tumblr|flickr|medium|blogspot|wordpress/i.test(domain)) {
          continue;
        }
      }
      
      urlMap.set(normalizedUrl, {
        url: normalizedUrl,
        title: item.title || '',
        isAggregator: aggregatorDetection.isAggregator,
        aggregatorConfidence: aggregatorDetection.confidence,
        score,
        domain
      });
    } catch (error) {
      console.error('Error processing URL:', item.url, error.message);
      // Continue with next item
    }
  }

  // Sort by score with aggregator penalty
  const sortedUrls = Array.from(urlMap.values())
    .map(item => ({
      ...item,
      finalScore: item.score - (item.isAggregator ? item.aggregatorConfidence * 20 : 0)
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, maxResults * 2)
    .map(item => item.url);

  const aggregatorCount = Array.from(urlMap.values())
    .filter(i => i.isAggregator).length;
  
  console.log(`Enhanced candidate URLs: ${sortedUrls.length}`);
  console.log(`Potential aggregator URLs: ${aggregatorCount}`);
  console.log(`Initial search API Usage - Queries Used: ${totalApiUsage.queriesUsed}, Attempted: ${totalApiUsage.queriesAttempted}, Successful: ${totalApiUsage.successfulQueries}, Failed: ${totalApiUsage.failedQueries}, Remaining: ${totalApiUsage.remainingQueries}, Daily Limit: ${totalApiUsage.dailyLimit}`);
  
  // Update search stats
  leadSearch.stats.totalUrlsFound = sortedUrls.length;
  
  // Save the updated API usage to the database - CRITICAL for tracking
  try {
    await leadSearch.save();
    console.log(`Initial search API usage saved: ${totalApiUsage.queriesUsed} queries used`);
  } catch (saveError) {
    console.error('Failed to save initial API usage data:', saveError.message);
  }
  
  return sortedUrls;
}

// UPDATED: Enhanced updateSearchProgress function with completion flag support
async function updateSearchProgress(leadSearch, phase, percentage, message, additionalData = {}) {
  try {
    // Ensure percentage is valid
    const validPercentage = Math.max(0, Math.min(100, percentage || 0));
    
    leadSearch.updateProgress(phase, validPercentage, message, additionalData);
    
    // Add completion flag to progress when done
    if (phase === 'completed' && validPercentage >= 100) {
      leadSearch.progress.completed = true;
    }
    
    await leadSearch.save();
    console.log(`Progress Update: ${phase} - ${validPercentage}% - ${message}`);
  } catch (error) {
    console.error('Failed to update progress:', error.message);
    // Don't throw - continue execution
  }
}

// Enhanced individual business search and verification
async function searchAndVerifyBusiness(businessInfo, keyword, location, proxy = null) {
  const { businessName, originalUrl, emails, phones } = businessInfo;
  
  console.log(`Individual search for business: ${businessName}`);
  
  try {
    // Create multiple search queries for this specific business
    const businessQueries = [
      `"${businessName}" contact email phone`,
      `"${businessName}" "${location}" website`,
      `"${businessName}" about services`,
      `${businessName} ${keyword} ${location} -directory -listing`
    ];
    
    let searchResults = [];
    let totalApiUsage = {
      queriesUsed: 0,
      queriesAttempted: 0,
      successfulQueries: 0,
      failedQueries: 0,
      remainingQueries: 0,
      dailyQueries: 0,
      dailyLimit: 100
    };
    
    // Try Google search for this specific business with proper tracking
    try {
      const googleResults = await searchApiManager.searchGoogleMulti(businessQueries, { 
        maxResults: 10,
        trackingContext: `individual_${businessName}`
      });
      
      // Handle both new and old response formats
      if (googleResults.results) {
        searchResults.push(...googleResults.results);
        totalApiUsage = googleResults.apiUsage;
        console.log(`Individual search for ${businessName}: ${googleResults.apiUsage.queriesUsed} API calls used`);
      } else {
        // Backward compatibility
        searchResults.push(...googleResults);
        // Estimate API usage
        totalApiUsage.queriesUsed = businessQueries.length;
        totalApiUsage.queriesAttempted = businessQueries.length;
        totalApiUsage.successfulQueries = businessQueries.length;
        console.log(`Individual search for ${businessName}: ~${businessQueries.length} API calls used (estimated)`);
      }
    } catch (error) {
      console.log(`Google search failed for ${businessName}: ${error.message}`);
      
      // Even if search failed, API calls might have been made
      if (error.message.includes('limit exceeded') || error.message.includes('quota')) {
        totalApiUsage.queriesUsed = businessQueries.length;
        totalApiUsage.queriesAttempted = businessQueries.length;
        totalApiUsage.failedQueries = businessQueries.length;
      }
    }
    
    // Filter out the original URL and other aggregators
    const relevantUrls = searchResults
      .filter(result => result.url !== originalUrl)
      .filter(result => !isAggregatorUrl(result.url))
      .slice(0, 3);
    
    console.log(`Found ${relevantUrls.length} additional URLs for ${businessName}`);
    
    if (relevantUrls.length === 0) {
      return {
        ...businessInfo,
        verificationStatus: 'no_additional_sources',
        isVerified: false,
        apiUsage: totalApiUsage // Include API usage in response
      };
    }
    
    // Crawl the additional URLs
    const crawlTasks = relevantUrls.map(result => 
      () => crawlBusinessPage(result.url, businessName, proxy)
    );
    
    const crawlResults = await runWithConcurrency(crawlTasks, 2);
    const validResults = crawlResults.filter(result => result && !result.blocked);
    
    if (validResults.length === 0) {
      return {
        ...businessInfo,
        verificationStatus: 'crawl_failed',
        isVerified: false,
        apiUsage: totalApiUsage
      };
    }
    
    // Merge information from multiple sources
    let mergedInfo = { ...businessInfo };
    
    for (const crawlResult of validResults) {
      if (isBusinessMatch(businessName, crawlResult.businessName)) {
        mergedInfo = mergeBusinessInfo(mergedInfo, crawlResult);
      }
    }
    
    // Find the official website if possible
    const officialWebsite = findOfficialWebsite(validResults, businessName);
    if (officialWebsite && !isAggregatorUrl(officialWebsite)) {
      mergedInfo.website = officialWebsite;
    }
    
    console.log(`Verification completed for ${businessName}: ${validResults.length} sources checked, ${totalApiUsage.queriesUsed} API calls used`);
    
    return {
      ...mergedInfo,
      verificationStatus: 'verified',
      additionalSourcesChecked: validResults.length,
      isVerified: true,
      apiUsage: totalApiUsage, // Include detailed API usage
      // Update backward compatibility fields
      email: mergedInfo.emails[0] || 'N/A',
      phone: mergedInfo.phones[0] || 'N/A'
    };
    
  } catch (error) {
    console.log(`Individual verification failed for ${businessName}: ${error.message}`);
    return {
      ...businessInfo,
      verificationStatus: 'verification_error',
      isVerified: false,
      verificationError: error.message,
      apiUsage: totalApiUsage || { queriesUsed: 0, queriesAttempted: 0 }
    };
  }
}

// Helper function to crawl a specific business page
async function crawlBusinessPage(url, expectedBusinessName, proxy = null) {
  try {
    const crawlerManager = require('../utils/CrawlerManager');
    const result = await crawlerManager.crawlSingle(url, { proxy, businessName: expectedBusinessName });
    
    return result;
  } catch (error) {
    console.log(`Failed to crawl business page ${url}: ${error.message}`);
    return { blocked: true, url };
  }
}

// Check if two business names refer to the same business
function isBusinessMatch(name1, name2, threshold = 0.7) {
  if (!name1 || !name2) return false;
  
  const normalize = (str) => str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(inc|llc|ltd|corp|company|agency|studio|group|services)\b/g, '')
    .trim();
  
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Calculate similarity score
  const similarity = calculateStringSimilarity(n1, n2);
  return similarity >= threshold;
}

// Simple string similarity calculation
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Merge business information from multiple sources
function mergeBusinessInfo(primary, secondary) {
  const merged = { ...primary };
  
  // Merge emails (prioritize business domain emails)
  const allEmails = unique([...primary.emails, ...secondary.emails]);
  const businessEmails = allEmails.filter(email => 
    !/gmail|yahoo|hotmail|outlook/i.test(email)
  );
  const personalEmails = allEmails.filter(email => 
    /gmail|yahoo|hotmail|outlook/i.test(email)
  );
  
  merged.emails = [...businessEmails, ...personalEmails].slice(0, 5);
  
  // Merge phones
  merged.phones = unique([...primary.phones, ...secondary.phones]).slice(0, 5);
  
  // Use better website (non-aggregator preferred)
  if (secondary.website && !isAggregatorUrl(secondary.website)) {
    if (!primary.website || isAggregatorUrl(primary.website)) {
      merged.website = secondary.website;
    }
  }
  
  // Merge social links
  merged.socialLinks = unique([...primary.socialLinks, ...secondary.socialLinks]);
  
  // Use longer, more detailed description
  if (secondary.description && secondary.description.length > primary.description.length) {
    merged.description = secondary.description;
  }
  
  return merged;
}

// Find the most likely official website
function findOfficialWebsite(crawlResults, businessName) {
  const candidates = crawlResults
    .map(result => result.website || preferHomepage(result.url))
    .filter(url => url && !isAggregatorUrl(url));
  
  if (candidates.length === 0) return null;
  
  // Score candidates based on business name similarity in domain
  const scored = candidates.map(url => {
    const domain = extractDomain(url);
    if (!domain) return { url, score: 0 };
    
    const domainWords = domain.replace(/\.[^.]+$/, '').split(/[-.]/).filter(w => w.length > 2);
    const nameWords = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    let score = 0;
    for (const nameWord of nameWords) {
      for (const domainWord of domainWords) {
        if (domainWord.includes(nameWord) || nameWord.includes(domainWord)) {
          score += Math.min(nameWord.length, domainWord.length);
        }
      }
    }
    
    return { url, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].url;
}

// Enhanced main generation function with progress tracking
exports.generateLeads = async (req, res) => {
  const startTime = Date.now();
  const {
    keyword,
    platforms = ['google'],
    location,
    emailDomain = '',
    maxResults = 20,
    qualityThreshold = 50,
    userId,
    enableIndividualSearch = true,
    enableVerification = true,
    deepCrawl = true,
    enableGeminiValidation = true
  } = req.body;

  // Validate required fields
  if (!keyword || !location || !userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: keyword, location, userId' 
    });
  }

  const searchId = generateSearchId();
  console.log(`Starting enhanced lead generation: ${searchId}`);
  console.log(`Parameters: keyword="${keyword}", location="${location}", geminiValidation=${enableGeminiValidation}`);

  // Test proxy before starting
  if (proxyManager.shouldUseProxy()) {
    const proxyTest = await proxyManager.testProxy();
    console.log(`Proxy status: ${proxyTest.isProxyWorking ? 'Working' : 'Failed'} (${proxyTest.successRate}%)`);
  }

  // Create lead search record
  const leadSearch = new LeadSearch({
    searchId,
    keyword,
    location,
    platforms,
    emailDomain,
    maxResults,
    qualityThreshold,
    userId,
    status: 'running',
    config: {
      userAgent: 'Enhanced-Crawler-3.0',
      proxyUsed: proxyManager.shouldUseProxy(),
      crawlerVersion: '3.0',
      extractorVersion: '3.0',
      verificationEnabled: enableVerification,
      deepCrawlEnabled: deepCrawl,
      individualSearchEnabled: enableIndividualSearch,
      geminiValidationEnabled: enableGeminiValidation && !!process.env.GEMINI_API_KEY
    },
    stats: { 
      totalSearches: 1,
      totalUrlsFound: 0,
      totalUrlsCrawled: 0,
      successfulCrawls: 0,
      individualSearchesConducted: 0,
      geminiValidations: 0
    },
    performance: {
      searchTime: 0,
      crawlTime: 0,
      verificationTime: 0,
      validationTime: 0,
      totalExecutionTime: 0
    }
  });

  try {
    await leadSearch.save();
    console.log(`Lead search record created: ${searchId}`);
  } catch (error) {
    console.error('Failed to create lead search record:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to initialize search record' 
    });
  }

  // Return immediately with searchId for frontend to start polling
  res.json({
    success: true,
    searchId,
    message: 'Lead generation started. Use the searchId to check progress.',
    status: 'running'
  });

  // Continue processing in background
  processLeadGeneration(leadSearch, {
    keyword,
    location,
    platforms,
    emailDomain,
    maxResults,
    qualityThreshold,
    enableIndividualSearch,
    enableVerification,
    deepCrawl,
    enableGeminiValidation,
    startTime
  });
};

// UPDATED: Background lead generation processing with fixed final status setting
async function processLeadGeneration(leadSearch, params) {
  const {
    keyword,
    location,
    platforms,
    emailDomain,
    maxResults,
    qualityThreshold,
    enableIndividualSearch,
    enableVerification,
    deepCrawl,
    enableGeminiValidation,
    startTime
  } = params;

  // Initialize comprehensive API usage tracking
  let cumulativeApiUsage = {
    totalQueriesUsed: 0,
    initialSearchQueries: 0,
    individualSearchQueries: 0,
    queriesAttempted: 0,
    successfulQueries: 0,
    failedQueries: 0,
    remainingQueries: 100,
    dailyQueries: 0,
    dailyLimit: 100
  };

  try {
    // Get proxy configuration
    let proxy = null;
    if (proxyManager.shouldUseProxy()) {
      const proxyConfig = proxyManager.getProxyConfig();
      if (proxyConfig) {
        proxy = { http: proxyConfig };
        console.log('Using proxy for enhanced crawling');
      }
    }

    // Phase 1: Get candidate URLs with accurate tracking
    const searchStartTime = Date.now();
    console.log('Phase 1: Getting enhanced candidate URLs...');
    
    const candidateUrls = await getCandidateUrls({ 
      keyword, 
      location, 
      maxResults: maxResults * 2,
      proxy 
    }, leadSearch);
    
    const searchEndTime = Date.now();
    leadSearch.performance.searchTime = searchEndTime - searchStartTime;
    leadSearch.stats.totalUrlsFound = candidateUrls.length;

    // Track initial search API usage from leadSearch
    if (leadSearch.searchApiUsage && leadSearch.searchApiUsage.queriesUsed) {
      cumulativeApiUsage.initialSearchQueries = leadSearch.searchApiUsage.queriesUsed;
      cumulativeApiUsage.totalQueriesUsed += leadSearch.searchApiUsage.queriesUsed;
      cumulativeApiUsage.queriesAttempted += leadSearch.searchApiUsage.queriesAttempted || 0;
      cumulativeApiUsage.successfulQueries += leadSearch.searchApiUsage.successfulQueries || 0;
      cumulativeApiUsage.failedQueries += leadSearch.searchApiUsage.failedQueries || 0;
      cumulativeApiUsage.remainingQueries = leadSearch.searchApiUsage.remainingQueries || 100;
      cumulativeApiUsage.dailyQueries = leadSearch.searchApiUsage.dailyQueries || 0;
    }

    console.log(`Phase 1 completed: Found ${candidateUrls.length} URLs, used ${cumulativeApiUsage.initialSearchQueries} API calls`);

    if (candidateUrls.length === 0) {
      leadSearch.status = 'completed';
      leadSearch.addError('search_error', 'No candidate URLs found', { keyword, location });
      leadSearch.performance.totalExecutionTime = Date.now() - startTime;
      leadSearch.searchApiUsage.totalQueriesUsed = cumulativeApiUsage.totalQueriesUsed;
      await updateSearchProgress(leadSearch, 'completed', 100, 'No URLs found for search criteria');
      return;
    }

    // Update progress before crawling
    await updateSearchProgress(leadSearch, 'crawling', 50, `Starting to crawl ${candidateUrls.length} websites...`, {
      totalUrls: candidateUrls.length,
      urlsProcessed: 0
    });

    // Phase 2: Initial crawling
    const crawlStartTime = Date.now();
    console.log(`Phase 2: Initial crawling of ${candidateUrls.length} URLs...`);
    
    const contacts = await crawlUrls(candidateUrls, { 
      concurrency: 2,
      keyword,
      proxy,
      enableVerification: false,
      deepCrawl: false,
      // Progress callback
      onProgress: async (processed, total, found) => {
        const percentage = 50 + (processed / total) * 25; // 50-75%
        await updateSearchProgress(leadSearch, 'crawling', percentage, 
          `Crawled ${processed}/${total} websites, found ${found} contacts`, {
          urlsProcessed: processed,
          totalUrls: total,
          leadsFound: found
        });
      }
    });
    
    const crawlEndTime = Date.now();
    leadSearch.performance.crawlTime = crawlEndTime - crawlStartTime;
    leadSearch.stats.totalUrlsCrawled = candidateUrls.length;
    leadSearch.stats.successfulCrawls = contacts.length;

    console.log(`Initial crawling completed: ${contacts.length} contacts extracted`);

    // Update progress after initial crawling
    await updateSearchProgress(leadSearch, 'verifying', 75, `Initial crawling complete. Found ${contacts.length} contacts.`, {
      leadsFound: contacts.length
    });

    // Phase 3: Individual business search and verification with proper API tracking
    let finalContacts = contacts;
    
    if (enableIndividualSearch && contacts.length > 0) {
      const verificationStartTime = Date.now();
      console.log(`Phase 3: Individual business search for ${contacts.length} businesses...`);
      
      // Filter businesses worth individual searching
      const businessesToSearch = contacts.filter(contact => {
        return (
          contact.businessName && 
          contact.businessName !== 'Unknown' && 
          contact.businessName.length > 3 &&
          contact.qualityScore >= 60 &&
          !contact.isAggregator
        );
      }).slice(0, Math.min(10, maxResults)); // Limit individual searches
      
      console.log(`${businessesToSearch.length} businesses selected for individual search`);
      
      if (businessesToSearch.length > 0) {
        // Update progress for verification phase
        await updateSearchProgress(leadSearch, 'verifying', 80, `Verifying ${businessesToSearch.length} businesses...`);
        
        // Conduct individual searches with proper API usage tracking
        const individualSearchTasks = businessesToSearch.map((business, index) => 
          async () => {
            const result = await searchAndVerifyBusinessWithProgress(business, keyword, location, proxy, index, businessesToSearch.length, leadSearch);
            
            // CRITICAL: Track API usage from individual searches
            if (result && result.apiUsage) {
              const individualUsage = result.apiUsage.queriesUsed || 0;
              cumulativeApiUsage.individualSearchQueries += individualUsage;
              cumulativeApiUsage.totalQueriesUsed += individualUsage;
              cumulativeApiUsage.queriesAttempted += result.apiUsage.queriesAttempted || 0;
              cumulativeApiUsage.successfulQueries += result.apiUsage.successfulQueries || 0;
              cumulativeApiUsage.failedQueries += result.apiUsage.failedQueries || 0;
              
              console.log(`Individual search for ${business.businessName}: ${individualUsage} API calls, Total so far: ${cumulativeApiUsage.totalQueriesUsed}`);
            }
            
            return result;
          }
        );
        
        const verifiedBusinesses = await runWithConcurrency(individualSearchTasks, 1);
        leadSearch.stats.individualSearchesConducted = verifiedBusinesses.length;
        
        // Calculate final API usage totals
        console.log(`Individual searches completed:`);
        console.log(`- Businesses verified: ${verifiedBusinesses.length}`);
        console.log(`- Individual search API calls: ${cumulativeApiUsage.individualSearchQueries}`);
        console.log(`- Total API calls used: ${cumulativeApiUsage.totalQueriesUsed}`);
        
        // Replace original contacts with verified ones
        const verifiedMap = new Map();
        verifiedBusinesses.forEach(verified => {
          if (verified && verified.sourceUrl) {
            verifiedMap.set(verified.sourceUrl, verified);
          }
        });
        
        finalContacts = contacts.map(contact => {
          const verified = verifiedMap.get(contact.sourceUrl);
          return verified || contact;
        });
        
        console.log(`Individual verification completed for ${verifiedBusinesses.length} businesses`);
      }
      
      const verificationEndTime = Date.now();
      leadSearch.performance.verificationTime = verificationEndTime - verificationStartTime;
    }

    // Phase 4: Enhanced filtering and quality control
    console.log('Phase 4: Enhanced filtering and quality control...');
    await updateSearchProgress(leadSearch, 'filtering', 90, 'Filtering and processing results...');
    
    const filteredContacts = [];
    const seenBusinesses = new Set();
    const seenDomains = new Set();
    
    for (const contact of finalContacts) {
      // Basic validation
      if (!contact || contact.blocked) continue;
      
      // Recalculate quality score after potential verification
      contact.qualityScore = calculateQualityScore(contact, keyword);
      
      // Quality threshold filter
      if (contact.qualityScore < qualityThreshold) {
        console.log(`Filtered: ${contact.businessName} (score: ${contact.qualityScore})`);
        continue;
      }
      
      // Email domain filter
      if (emailDomain) {
        const hasMatchingDomain = contact.emails.some(email => 
          email.toLowerCase().endsWith(`@${emailDomain.toLowerCase()}`)
        );
        if (!hasMatchingDomain) continue;
      }
      
      // Must have valid contact info
      const hasValidEmail = contact.emails.some(email => 
        email && email !== 'N/A' && email.includes('@') && email.length > 5
      );
      const hasValidPhone = contact.phones.some(phone => 
        phone && phone !== 'N/A' && phone.length >= 7
      );
      
      if (!hasValidEmail && !hasValidPhone) {
        console.log(`Filtered: ${contact.businessName} (no valid contact info)`);
        continue;
      }
      
      // Deduplication by business name
      const normalizedName = contact.businessName
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (seenBusinesses.has(normalizedName)) {
        console.log(`Duplicate business filtered: ${contact.businessName}`);
        continue;
      }
      seenBusinesses.add(normalizedName);
      
      // Domain deduplication
      const domain = extractDomain(contact.website || contact.sourceUrl);
      if (domain && seenDomains.has(domain)) {
        console.log(`Duplicate domain filtered: ${domain}`);
        continue;
      }
      if (domain) seenDomains.add(domain);
      
      // Final contact processing
      const processedContact = {
        ...contact,
        website: contact.website || preferHomepage(contact.sourceUrl),
        extractedAt: new Date(),
        relevanceScore: calculateRelevanceScore(contact, keyword),
        // Ensure backward compatibility
        email: contact.emails[0] || 'N/A',
        phone: contact.phones[0] || 'N/A'
      };
      
      filteredContacts.push(processedContact);
    }

    console.log(`After filtering: ${filteredContacts.length} contacts remain`);

    // Sort by quality score descending
    filteredContacts.sort((a, b) => b.qualityScore - a.qualityScore);
    
    // Limit to requested results
    let limitedContacts = filteredContacts.slice(0, maxResults);

    // Phase 5: Gemini Validation (if enabled)
    if (enableGeminiValidation && process.env.GEMINI_API_KEY && limitedContacts.length > 0) {
      const validationStartTime = Date.now();
      console.log('Phase 5: Gemini validation...');
      await updateSearchProgress(leadSearch, 'validating', 95, 'Validating leads with AI...');

      try {
        const geminiService = new GeminiValidationService(process.env.GEMINI_API_KEY);
        const validatedContacts = await geminiService.validateMultipleLeads(limitedContacts);
        
        // Update contacts with validated data
        limitedContacts = validatedContacts.map(contact => {
          const updatedContact = {
            ...contact.originalLead,
            // Only update if confidence is high
            businessName: contact.validation.confidence > 0.7 ? 
                         contact.validation.correctedBusinessName : 
                         contact.originalLead.businessName,
            isVerified: contact.validation.confidence > 0.7 ? true : contact.originalLead.isVerified,
            validationScore: contact.validation.confidence,
            validationIssues: contact.validation.issues
          };

          // Recalculate quality score after validation
          updatedContact.qualityScore = calculateQualityScore(updatedContact, keyword);
          return updatedContact;
        });

        leadSearch.stats.geminiValidations = limitedContacts.length;
        leadSearch.performance.validationTime = Date.now() - validationStartTime;
        
        console.log(`Gemini validation completed: ${limitedContacts.length} leads validated`);
      } catch (error) {
        console.log('Gemini validation failed, using original data:', error.message);
        leadSearch.addError('validation_error', 'Gemini validation failed', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Phase 6: Final completion with accurate API usage
    console.log('Phase 6: Finalizing results...');
    
    // Update API usage with real Google CSE API calls from current state
    const currentApiStats = searchApiManager.getApiUsageStats ? searchApiManager.getApiUsageStats() : null;
    if (currentApiStats) {
      cumulativeApiUsage.remainingQueries = currentApiStats.remainingQueries;
      cumulativeApiUsage.dailyQueries = currentApiStats.dailyQueries;
      cumulativeApiUsage.dailyLimit = currentApiStats.dailyLimit;
    }
    
    // Final progress update with completion flag
    await updateSearchProgress(leadSearch, 'completed', 100, 
      `Generation complete! Found ${limitedContacts.length} quality leads.`, {
      leadsFound: limitedContacts.length,
      urlsProcessed: leadSearch.progress?.totalUrls || 0,
      totalUrls: leadSearch.progress?.totalUrls || 0,
      geminiValidations: leadSearch.stats.geminiValidations || 0,
      completed: true
    });

    // CRITICAL: Update search record with accurate API usage
    leadSearch.contacts = limitedContacts;
    leadSearch.calculateStats();
    leadSearch.status = 'completed';
    leadSearch.progress.completed = true;
    leadSearch.performance.totalExecutionTime = Date.now() - startTime;
    
    // Save comprehensive API usage data
    leadSearch.searchApiUsage = {
      provider: 'google_custom',
      totalQueriesUsed: cumulativeApiUsage.totalQueriesUsed,
      initialSearchQueries: cumulativeApiUsage.initialSearchQueries,
      individualSearchQueries: cumulativeApiUsage.individualSearchQueries,
      queriesUsed: cumulativeApiUsage.totalQueriesUsed, // For backward compatibility
      queriesAttempted: cumulativeApiUsage.queriesAttempted,
      successfulQueries: cumulativeApiUsage.successfulQueries,
      failedQueries: cumulativeApiUsage.failedQueries,
      remainingQueries: cumulativeApiUsage.remainingQueries,
      dailyQueries: cumulativeApiUsage.dailyQueries,
      dailyLimit: cumulativeApiUsage.dailyLimit
    };
    
    // Calculate average time per lead
    if (limitedContacts.length > 0) {
      leadSearch.performance.averageTimePerLead = 
        leadSearch.performance.totalExecutionTime / limitedContacts.length;
    }
    
    await leadSearch.save();

    console.log(`Enhanced lead generation completed for ${leadSearch.searchId}:`);
    console.log(`- Status: ${leadSearch.status}`);
    console.log(`- Progress: ${leadSearch.progress.percentage}% (${leadSearch.progress.currentPhase})`);
    console.log(`- Total leads: ${limitedContacts.length}`);
    console.log(`- High quality: ${limitedContacts.filter(c => c.isHighQuality).length}`);
    console.log(`- Initial search API queries: ${cumulativeApiUsage.initialSearchQueries}`);
    console.log(`- Individual search API queries: ${cumulativeApiUsage.individualSearchQueries}`);
    console.log(`- Total API queries used: ${cumulativeApiUsage.totalQueriesUsed}`);
    console.log(`- Execution time: ${leadSearch.performance.totalExecutionTime}ms`);

  } catch (error) {
    console.error(`Enhanced lead generation failed for ${leadSearch.searchId}:`, error);
    
    leadSearch.status = 'failed';
    leadSearch.progress.currentPhase = 'failed';
    leadSearch.progress.completed = false;
    leadSearch.addError('generation_error', error.message, {
      stack: error.stack,
      keyword: params.keyword,
      location: params.location,
      timestamp: new Date().toISOString()
    });
    leadSearch.performance.totalExecutionTime = Date.now() - startTime;
    
    // Save any API usage accumulated before failure
    leadSearch.searchApiUsage.totalQueriesUsed = cumulativeApiUsage.totalQueriesUsed;
    leadSearch.searchApiUsage.initialSearchQueries = cumulativeApiUsage.initialSearchQueries;
    leadSearch.searchApiUsage.individualSearchQueries = cumulativeApiUsage.individualSearchQueries;
    
    await updateSearchProgress(leadSearch, 'failed', 0, `Generation failed: ${error.message}`);
    
    try {
      await leadSearch.save();
    } catch (saveError) {
      console.error('Failed to save error state:', saveError);
    }
  }
}

// Enhanced individual business search with progress tracking
async function searchAndVerifyBusinessWithProgress(businessInfo, keyword, location, proxy, index, total, leadSearch) {
  try {
    const result = await searchAndVerifyBusiness(businessInfo, keyword, location, proxy);
    
    // Update progress for individual verification
    const percentage = 80 + ((index + 1) / total) * 10; // 80-90%
    await updateSearchProgress(leadSearch, 'verifying', percentage, 
      `Verified ${index + 1}/${total} businesses: ${businessInfo.businessName}`);
    
    // CRITICAL: Log API usage for tracking
    if (result && result.apiUsage) {
      console.log(`API Usage for ${businessInfo.businessName}: ${result.apiUsage.queriesUsed} calls (${result.apiUsage.successfulQueries} successful, ${result.apiUsage.failedQueries} failed)`);
    } else {
      console.log(`No API usage data returned for ${businessInfo.businessName}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Verification failed for ${businessInfo.businessName}:`, error);
    
    // Return original business info with error indication
    return {
      ...businessInfo,
      verificationStatus: 'verification_error',
      isVerified: false,
      verificationError: error.message,
      apiUsage: { queriesUsed: 0, queriesAttempted: 4, successfulQueries: 0, failedQueries: 4 }
    };
  }
}

// UPDATED: Get progress endpoint for frontend polling with fixed response structure
exports.getSearchProgress = async (req, res) => {
  try {
    const { searchId } = req.params;
    
    if (!searchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search ID is required' 
      });
    }
    
    const search = await LeadSearch.findOne({ searchId }).select(
      'searchId status progress stats performance contacts createdAt updatedAt errors'
    ).lean();
    
    if (!search) {
      return res.status(404).json({ 
        success: false, 
        error: 'Search not found' 
      });
    }
    
    // Calculate real-time stats
    const currentTime = Date.now();
    const elapsedTime = Math.round((currentTime - new Date(search.createdAt).getTime()) / 1000);
    
    // Determine completion status
    const isCompleted = search.status === 'completed' || 
                       search.progress?.completed === true ||
                       (search.progress?.currentPhase === 'completed' && search.progress?.percentage >= 100);
    
    // Prepare response
    const response = {
      success: true,
      searchId: search.searchId,
      status: search.status,
      progress: {
        currentPhase: search.progress?.currentPhase || 'initializing',
        percentage: Math.min(search.progress?.percentage || 0, 100),
        message: search.progress?.message || getDefaultMessage(search.progress?.currentPhase, search.status),
        elapsedTime,
        urlsProcessed: search.progress?.urlsProcessed || 0,
        totalUrls: search.progress?.totalUrls || search.stats?.totalUrlsFound || 0,
        leadsFound: search.progress?.leadsFound || search.stats?.leadsGenerated || 0,
        lastUpdated: search.progress?.lastUpdated || search.updatedAt,
        completed: isCompleted
      },
      stats: {
        totalUrlsFound: search.stats?.totalUrlsFound || 0,
        totalUrlsCrawled: search.stats?.totalUrlsCrawled || 0,
        successfulCrawls: search.stats?.successfulCrawls || 0,
        leadsGenerated: search.stats?.leadsGenerated || 0,
        qualityLeadsGenerated: search.stats?.qualityLeadsGenerated || 0,
        averageQualityScore: search.stats?.averageQualityScore || 0,
        individualSearchesConducted: search.stats?.individualSearchesConducted || 0,
        geminiValidations: search.stats?.geminiValidations || 0
      },
      performance: {
        totalExecutionTime: search.performance?.totalExecutionTime || elapsedTime * 1000,
        searchTime: search.performance?.searchTime || 0,
        crawlTime: search.performance?.crawlTime || 0,
        verificationTime: search.performance?.verificationTime || 0,
        validationTime: search.performance?.validationTime || 0,
        averageTimePerLead: search.performance?.averageTimePerLead || 0
      },
      partialResults: isCompleted ? {
        totalLeads: search.contacts?.length || 0,
        leads: (search.contacts || []).slice(0, 3),
        hasMore: (search.contacts?.length || 0) > 3
      } : null,
      errors: search.errors?.slice(-3) || [],
      completed: isCompleted
    };
    
    console.log(`Progress: ${searchId} - ${search.status} - ${response.progress.percentage}% - Completed: ${isCompleted}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching search progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch search progress',
      details: error.message 
    });
  }
};

// Helper function for default messages
function getDefaultMessage(phase, status) {
  if (status === 'failed') return 'Search encountered an error and could not be completed.';
  if (status === 'completed') return 'Search completed successfully!';
  
  const messages = {
    initializing: 'Initializing search parameters...',
    searching: 'Searching across multiple platforms for relevant businesses...',
    crawling: 'Extracting business information and contact details...',
    verifying: 'Verifying contact information and conducting individual searches...',
    filtering: 'Processing and filtering results for quality...',
    validating: 'Validating leads with AI for accuracy...',
    completed: 'Search completed successfully!',
    failed: 'Search failed due to an error.'
  };
  
  return messages[phase] || 'Processing your request...';
}

// Calculate relevance score based on keyword matching
function calculateRelevanceScore(contact, keyword) {
  let score = 5; // Base score
  
  const searchTerms = keyword.toLowerCase().split(/\s+/);
  const businessText = `${contact.businessName} ${contact.description}`.toLowerCase();
  
  // Check how many search terms appear in business info
  const matchingTerms = searchTerms.filter(term => businessText.includes(term));
  const matchRatio = matchingTerms.length / searchTerms.length;
  
  score = Math.round(5 + (matchRatio * 5)); // Scale 5-10
  
  return Math.max(1, Math.min(10, score));
}

// Enhanced stats with crawler integration
exports.getEnhancedStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const days = parseInt(req.query.days) || 30;
    
    const stats = await LeadSearch.getSearchAnalytics(userId, days);
    const proxyStats = proxyManager.getStats ? proxyManager.getStats() : null;
    const crawlerStats = getCrawlerStats ? getCrawlerStats() : null;
    
    // Get recent error analysis
    const recentSearches = await LeadSearch.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('errors stats performance config');
    
    const errorAnalysis = analyzeRecentErrors(recentSearches);
    const recommendations = generateRecommendations(errorAnalysis, proxyStats, crawlerStats);
    
    // Add Gemini validation stats
    const geminiStats = {
      totalValidations: stats?.[0]?.totalGeminiValidations || 0,
      validationSuccessRate: stats?.[0]?.avgValidationScore ? (stats[0].avgValidationScore * 100).toFixed(1) : 0,
      enabled: !!process.env.GEMINI_API_KEY
    };
    
    res.json({ 
      success: true, 
      stats: stats?.[0] || {
        totalSearches: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        avgQualityScore: 0,
        totalUrlsCrawled: 0,
        totalSuccessfulCrawls: 0,
        totalGeminiValidations: 0,
        avgValidationScore: 0
      },
      systemHealth: {
        proxy: proxyStats,
        crawler: crawlerStats,
        gemini: geminiStats,
        errors: errorAnalysis,
        performance: calculatePerformanceMetrics(recentSearches),
        recommendations
      }
    });
  } catch (error) {
    console.error('Error fetching enhanced stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch enhanced statistics' 
    });
  }
};

// Analyze recent errors for troubleshooting
function analyzeRecentErrors(searches) {
  const errorTypes = {};
  const commonUrls = {};
  const blockedDomains = {};
  let totalErrors = 0;
  
  searches.forEach(search => {
    if (search.errors && search.errors.length > 0) {
      search.errors.forEach(error => {
        totalErrors++;
        errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
        
        if (error.details && error.details.url) {
          const domain = extractDomain(error.details.url);
          if (domain) {
            commonUrls[domain] = (commonUrls[domain] || 0) + 1;
            
            // Track specific error types per domain
            if (error.type === 'crawl_error' || error.type === '403_forbidden') {
              blockedDomains[domain] = (blockedDomains[domain] || 0) + 1;
            }
          }
        }
      });
    }
  });
  
  return {
    totalErrors,
    errorTypes,
    mostProblematicDomains: Object.entries(commonUrls)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, errorCount: count })),
    frequentlyBlockedDomains: Object.entries(blockedDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, blockCount: count }))
  };
}

// Generate recommendations based on error analysis
function generateRecommendations(errorAnalysis, proxyStats, crawlerStats) {
  const recommendations = [];
  
  // Proxy-related recommendations
  if (proxyStats && proxyStats.successRate < 80) {
    recommendations.push({
      type: 'proxy',
      severity: 'high',
      message: `Proxy success rate is low (${proxyStats.successRate}%). Consider upgrading webshare.io plan or switching proxy providers.`,
      action: 'Check proxy service status and consider rotating IP addresses more frequently'
    });
  }
  
  // Error rate recommendations
  if (errorAnalysis.errorTypes['403_forbidden'] > 10) {
    recommendations.push({
      type: 'blocking',
      severity: 'high',
      message: 'High number of 403 (Forbidden) errors detected. Sites are blocking your requests.',
      action: 'Enable browser rendering for more sites, improve user-agent rotation, and check anti-captcha service'
    });
  }
  
  if (errorAnalysis.errorTypes['429_rate_limit'] > 5) {
    recommendations.push({
      type: 'rate_limiting',
      severity: 'medium',
      message: 'Rate limiting detected. Requests are being throttled.',
      action: 'Reduce concurrency and increase delays between requests'
    });
  }
  
  // Crawler-related recommendations
  if (crawlerStats && crawlerStats.browserFallbackRate > 30) {
    recommendations.push({
      type: 'crawler',
      severity: 'medium',
      message: `High browser fallback rate (${crawlerStats.browserFallbackRate}%). Many sites require JavaScript rendering.`,
      action: 'Consider using browser rendering as primary method for better success rates'
    });
  }
  
  // Domain-specific recommendations
  if (errorAnalysis.frequentlyBlockedDomains.length > 0) {
    const blockedDomains = errorAnalysis.frequentlyBlockedDomains.map(d => d.domain).join(', ');
    recommendations.push({
      type: 'domains',
      severity: 'low',
      message: `Certain domains are frequently blocked: ${blockedDomains}`,
      action: 'Consider excluding these domains from searches or implementing domain-specific crawling strategies'
    });
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      severity: 'info',
      message: 'System is performing well. No immediate issues detected.',
      action: 'Continue monitoring and consider optimizing for better performance'
    });
  }
  
  return recommendations;
}

// Calculate performance metrics
function calculatePerformanceMetrics(searches) {
  if (searches.length === 0) return null;
  
  const metrics = {
    avgExecutionTime: 0,
    avgLeadsPerSearch: 0,
    avgQualityScore: 0,
    successRate: 0,
    avgIndividualSearches: 0
  };
  
  let totalTime = 0;
  let totalLeads = 0;
  let totalQuality = 0;
  let totalIndividualSearches = 0;
  let successfulSearches = 0;
  
  searches.forEach(search => {
    if (search.performance?.totalExecutionTime) {
      totalTime += search.performance.totalExecutionTime;
    }
    if (search.stats?.leadsGenerated) {
      totalLeads += search.stats.leadsGenerated;
    }
    if (search.stats?.averageQualityScore) {
      totalQuality += search.stats.averageQualityScore;
    }
    if (search.stats?.individualSearchesConducted) {
      totalIndividualSearches += search.stats.individualSearchesConducted;
    }
    if (search.status === 'completed') {
      successfulSearches++;
    }
  });
  
  const validSearches = searches.length;
  metrics.avgExecutionTime = totalTime / validSearches;
  metrics.avgLeadsPerSearch = totalLeads / validSearches;
  metrics.avgQualityScore = totalQuality / validSearches;
  metrics.avgIndividualSearches = totalIndividualSearches / validSearches;
  metrics.successRate = (successfulSearches / validSearches) * 100;
  
  return metrics;
}

// UPDATED: Get leads endpoint with fixed response structure
exports.getLeads = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log('Fetching leads for user:', userId, 'page:', page, 'limit:', limit);
    
    const query = userId ? { userId } : {};
    
    const [searches, totalCount] = await Promise.all([
      LeadSearch.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      LeadSearch.countDocuments(query)
    ]);
    
    console.log('Found searches:', searches.length, 'total:', totalCount);
    
    // Ensure each search has required fields
    const processedSearches = searches.map(search => ({
      ...search,
      contacts: search.contacts || [],
      stats: search.stats || {
        leadsGenerated: search.contacts?.length || 0,
        qualityLeadsGenerated: 0,
        averageQualityScore: 0
      },
      performance: search.performance || {
        totalExecutionTime: 0
      }
    }));
    
    const response = {
      success: true, 
      searches: processedSearches,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leads',
      searches: [],
      pagination: {
        page: 1,
        limit: 20,
        totalCount: 0,
        totalPages: 0
      }
    });
  }
};

// UPDATED: Get search detail endpoint with proper contact processing
exports.getSearchDetail = async (req, res) => {
  try {
    const { searchId } = req.params;
    
    if (!searchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search ID is required' 
      });
    }
    
    console.log('Fetching search detail for:', searchId);
    
    const search = await LeadSearch.findOne({ searchId }).lean();
    
    if (!search) {
      return res.status(404).json({ 
        success: false, 
        error: 'Search not found' 
      });
    }
    
    // Ensure contacts array exists and process the data
    const processedSearch = {
      ...search,
      contacts: Array.isArray(search.contacts) ? search.contacts.map(contact => ({
        ...contact,
        // Ensure arrays exist
        emails: Array.isArray(contact.emails) ? contact.emails : [],
        phones: Array.isArray(contact.phones) ? contact.phones : [],
        socialLinks: Array.isArray(contact.socialLinks) ? contact.socialLinks : [],
        tags: Array.isArray(contact.tags) ? contact.tags : [],
        // Ensure required fields
        businessName: contact.businessName || 'Unknown Business',
        qualityScore: contact.qualityScore || 0,
        description: contact.description || '',
        notes: contact.notes || '',
        // Backward compatibility
        email: contact.emails?.[0] || contact.email || '',
        phone: contact.phones?.[0] || contact.phone || ''
      })) : [],
      stats: search.stats || {
        leadsGenerated: search.contacts?.length || 0,
        qualityLeadsGenerated: 0,
        averageQualityScore: 0
      }
    };
    
    console.log('Search detail processed:', {
      searchId: processedSearch.searchId,
      contactCount: processedSearch.contacts.length,
      status: processedSearch.status
    });
    
    res.json({ 
      success: true, 
      search: processedSearch 
    });
    
  } catch (error) {
    console.error('Error fetching search detail:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch search details' 
    });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const { searchId, contactIndex } = req.params;
    const updateData = req.body || {};
    
    const search = await LeadSearch.findOne({ searchId });
    if (!search) {
      return res.status(404).json({ 
        success: false, 
        error: 'Search not found' 
      });
    }
    
    const index = parseInt(contactIndex);
    if (!search.contacts[index]) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    Object.assign(search.contacts[index], updateData);
    search.markModified('contacts');
    await search.save();
    
    res.json({ 
      success: true, 
      contact: search.contacts[index] 
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update lead' 
    });
  }
};

exports.deleteLeadSearch = async (req, res) => {
  try {
    const { searchId } = req.params;
    await LeadSearch.deleteOne({ searchId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting search:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete search' 
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const days = parseInt(req.query.days) || 30;
    
    const stats = await LeadSearch.getSearchAnalytics(userId, days);
    
    res.json({ 
      success: true, 
      stats: stats?.[0] || {
        totalSearches: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        avgQualityScore: 0,
        totalUrlsCrawled: 0,
        totalSuccessfulCrawls: 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
};