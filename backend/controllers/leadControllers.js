const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { processWithGemini, processWithRegexOnly } = require('../utils/geminiProcessor');
const Lead = require('../models/Lead');

// Create multiple user agents and rotate them
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

// HTTPS agent with relaxed SSL verification
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 30000
});

// Enhanced query generation with multiple strategies
const generateSearchQueries = (keyword, source, location, emailDomain = '') => {
  console.log(`Generating enhanced queries for: ${keyword} in ${location} for ${source}`);
  
  const baseQueries = {
    google: [
      `"${keyword}" "${location}" contact email`,
      `"${keyword}" "${location}" phone number`,
      `"${keyword}" "${location}" "contact us"`,
      `"${keyword}" in "${location}" email address`,
      `hire "${keyword}" "${location}" contact`
    ],
    
    facebook: [
      `site:facebook.com "${keyword}" "${location}" contact`,
      `site:facebook.com/pages "${keyword}" "${location}"`,
      `site:facebook.com "${keyword}" "${location}" phone`,
      `"${keyword}" "${location}" facebook contact`,
      `facebook.com "${keyword}" "${location}" business`
    ],
    
    instagram: [
      `site:instagram.com "${keyword}" "${location}" contact`,
      `site:instagram.com "${keyword}" "${location}" email`,
      `"${keyword}" "${location}" instagram contact`,
      `site:instagram.com "${keyword}" "${location}" dm`,
      `instagram "${keyword}" "${location}" inquiries`
    ],
    
    linkedin: [
      `site:linkedin.com/in "${keyword}" "${location}"`,
      `site:linkedin.com/company "${keyword}" "${location}"`,
      `linkedin "${keyword}" "${location}" contact`,
      `site:linkedin.com "${keyword}" "${location}" profile`,
      `"${keyword}" "${location}" linkedin professional`
    ],
    
    google_maps: [
      `"${keyword}" "${location}" phone address`,
      `"${keyword}" "${location}" business hours contact`,
      `"${keyword}" "${location}" maps listing`,
      `"${keyword}" "${location}" local business`,
      `"${keyword}" "${location}" directory listing`
    ]
  };
  
  let queries = baseQueries[source] || baseQueries.google;
  
  // Add email domain filter if specified
  if (emailDomain && emailDomain.trim()) {
    const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
    queries = queries.map(q => `${q} "${domain}"`);
  }
  
  console.log(`Generated ${queries.length} queries for ${source}`);
  return queries;
};

// Enhanced headers with more realistic browser simulation
const getRandomHeaders = () => {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
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
    'Connection': 'keep-alive',
    'DNT': '1'
  };
};

// Enhanced content extraction with multiple strategies
const extractSearchContent = (html, query) => {
  console.log('Extracting content with enhanced methods...');
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, noscript, nav, footer, header, .ads, .advertisement, #footer, #header').remove();
  
  let extractedContent = '';
  let resultCount = 0;
  
  // Strategy 1: Google search result containers (multiple selectors)
  const resultSelectors = [
    '.g', '.tF2Cxc', '.MjjYud', '.yuRUbf', '.kCrYT', // Standard Google results
    '.rc', '.r', '.s', '.st', // Classic Google selectors
    '.VwiC3b', '.s3v9rd', '.IsZvec', // Snippet containers
    '.BNeawe', '.AP7Wnd', '.lEBKkf' // Mobile/alternative layouts
  ];
  
  resultSelectors.forEach(selector => {
    $(selector).each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3, .LC20lb, .DKV0Md').text().trim();
      const snippet = $elem.find('.VwiC3b, .s3v9rd, .st, .IsZvec, .BNeawe').text().trim();
      const url = $elem.find('a').first().attr('href');
      
      if (title && snippet) {
        extractedContent += `Title: ${title}\n`;
        extractedContent += `Snippet: ${snippet}\n`;
        if (url && !url.startsWith('/')) {
          extractedContent += `URL: ${url}\n`;
        }
        extractedContent += '---\n';
        resultCount++;
      }
    });
  });
  
  // Strategy 2: Extract all visible text as fallback
  if (resultCount === 0) {
    console.log('No structured results found, extracting all text...');
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    
    if (bodyText && bodyText.length > 100) {
      // Look for patterns that might indicate search results
      const textChunks = bodyText.split('.').filter(chunk => 
        chunk.length > 50 && 
        (chunk.toLowerCase().includes('contact') || 
         chunk.toLowerCase().includes('email') || 
         chunk.toLowerCase().includes('phone') ||
         chunk.toLowerCase().includes(query.split(' ')[0].toLowerCase()))
      );
      
      if (textChunks.length > 0) {
        extractedContent = textChunks.slice(0, 10).join('. ') + '.';
        resultCount = textChunks.length;
      }
    }
  }
  
  // Strategy 3: Check for blocking indicators
  const blockingPatterns = [
    'unusual traffic', 'captcha', 'blocked', 'automated queries',
    'terms of service', 'verify you are human', 'suspicious activity'
  ];
  
  const fullText = html.toLowerCase();
  const isBlocked = blockingPatterns.some(pattern => fullText.includes(pattern));
  
  if (isBlocked) {
    console.warn('Google blocking detected in content');
    return { content: '', blocked: true, resultCount: 0 };
  }
  
  console.log(`Content extraction complete: ${extractedContent.length} chars, ${resultCount} results`);
  return { 
    content: extractedContent, 
    blocked: false, 
    resultCount,
    hasContent: extractedContent.length > 100
  };
};

// Enhanced scraping with multiple fallback strategies
const enhancedScraping = async (queries, maxResults = 3) => {
  console.log(`Starting enhanced scraping for ${queries.length} queries...`);
  
  for (let i = 0; i < Math.min(queries.length, maxResults); i++) {
    const query = queries[i];
    const delayBetweenRequests = Math.random() * 3000 + 2000; // 2-5 second delay
    
    if (i > 0) {
      console.log(`Waiting ${Math.round(delayBetweenRequests)}ms before next query...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
    
    try {
      console.log(`[${i + 1}/${queries.length}] Trying query: ${query.substring(0, 50)}...`);
      
      // Strategy 1: Direct Google search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50&hl=en&gl=us`;
      
      const response = await axios.get(searchUrl, {
        headers: getRandomHeaders(),
        timeout: 30000,
        httpsAgent,
        validateStatus: status => status === 200
      });
      
      console.log(`Request successful: Status ${response.status}, Content length: ${response.data.length}`);
      
      const extraction = extractSearchContent(response.data, query);
      
      if (extraction.blocked) {
        console.warn('Blocking detected, trying alternative approach...');
        continue;
      }
      
      if (extraction.hasContent) {
        console.log(`✓ Successfully extracted content from query ${i + 1}`);
        return extraction.content;
      }
      
      console.log(`Query ${i + 1} returned insufficient content, trying next...`);
      
    } catch (error) {
      console.error(`Query ${i + 1} failed: ${error.message}`);
      
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  
  console.log('All enhanced scraping attempts failed');
  return null;
};

// Alternative search engines as backup
const tryAlternativeEngines = async (keyword, location) => {
  console.log('Trying alternative search engines...');
  
  const engines = [
    {
      name: 'Bing',
      url: `https://www.bing.com/search?q=${encodeURIComponent(`"${keyword}" "${location}" contact email phone`)}&count=50`,
      selectors: ['.b_algo', '.b_title', '.b_caption']
    },
    {
      name: 'DuckDuckGo',
      url: `https://duckduckgo.com/html/?q=${encodeURIComponent(`"${keyword}" "${location}" contact`)}`,
      selectors: ['.result', '.result__title', '.result__snippet']
    }
  ];
  
  for (const engine of engines) {
    try {
      console.log(`Trying ${engine.name}...`);
      
      const response = await axios.get(engine.url, {
        headers: getRandomHeaders(),
        timeout: 20000,
        httpsAgent
      });
      
      const $ = cheerio.load(response.data);
      let content = '';
      
      engine.selectors.forEach(selector => {
        $(selector).each((i, elem) => {
          if (i < 20) { // Limit results
            const text = $(elem).text().trim();
            if (text && text.length > 20) {
              content += text + '\n---\n';
            }
          }
        });
      });
      
      if (content.length > 200) {
        console.log(`✓ ${engine.name} returned ${content.length} characters`);
        return content;
      }
      
    } catch (error) {
      console.error(`${engine.name} failed: ${error.message}`);
    }
  }
  
  return null;
};

// Main processing function for each source
const processSource = async (source, keyword, location, emailDomain = '') => {
  console.log(`\n[Processing ${source}] Starting...`);
  const startTime = Date.now();
  
  try {
    // Generate multiple queries for this source
    const queries = generateSearchQueries(keyword, source, location, emailDomain);
    
    // Try enhanced scraping first
    let rawData = await enhancedScraping(queries, 3);
    
    // Fallback to alternative engines if needed
    if (!rawData || rawData.length < 200) {
      console.log(`${source}: Trying alternative search engines...`);
      rawData = await tryAlternativeEngines(keyword, location);
    }
    
    // Final fallback: simplified search
    if (!rawData || rawData.length < 100) {
      console.log(`${source}: Trying simplified search...`);
      const simpleQuery = `"${keyword}" "${location}" contact`;
      rawData = await enhancedScraping([simpleQuery], 1);
    }
    
    if (!rawData || rawData.length < 50) {
      throw new Error(`No usable content found for ${source} after all attempts`);
    }
    
    console.log(`${source}: Successfully scraped ${rawData.length} characters`);
    
    // Process with AI
    let leads = [];
    try {
      leads = await processWithGemini(rawData, source, keyword, location);
      console.log(`${source}: AI processing returned ${leads.length} leads`);
    } catch (aiError) {
      console.warn(`${source}: AI processing failed, trying regex: ${aiError.message}`);
      leads = processWithRegexOnly(rawData, source, keyword, location);
      console.log(`${source}: Regex processing returned ${leads.length} leads`);
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${source}] Completed in ${duration}s with ${leads.length} leads`);
    
    return {
      source,
      leads,
      success: true,
      duration,
      strategies: ['enhanced_scraping', 'ai_processing']
    };
    
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`[${source}] Failed after ${duration}s: ${error.message}`);
    
    return {
      source,
      leads: [],
      success: false,
      duration,
      error: error.message,
      strategies: ['enhanced_scraping']
    };
  }
};

// Main lead generation controller
const generateLeads = async (req, res) => {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('ENHANCED LEAD GENERATION STARTED');
  console.log('='.repeat(60));
  
  try {
    const { keyword, sources, location, emailDomain } = req.body;
    const userId = req.user._id;
    
    // Enhanced validation
    if (!keyword || keyword.trim().length < 2) {
      return res.status(422).json({
        success: false,
        message: 'Keyword must be at least 2 characters long'
      });
    }
    
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'At least one source must be selected'
      });
    }
    
    if (!location || location.trim().length < 2) {
      return res.status(422).json({
        success: false,
        message: 'Location must be at least 2 characters long'
      });
    }
    
    console.log('Processing request:', {
      keyword: keyword.trim(),
      sources,
      location: location.trim(),
      emailDomain: emailDomain || 'none',
      userId: userId.toString()
    });
    
    const allLeads = [];
    const sourceResults = [];
    const errors = [];
    
    // Process each source with delays
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      
      if (i > 0) {
        const delay = Math.random() * 3000 + 2000; // 2-5 second delay between sources
        console.log(`Waiting ${Math.round(delay)}ms before processing ${source}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await processSource(source, keyword.trim(), location.trim(), emailDomain?.trim());
      
      sourceResults.push(result);
      
      if (result.success && result.leads.length > 0) {
        allLeads.push(...result.leads);
        console.log(`✓ ${source}: Added ${result.leads.length} leads (Total: ${allLeads.length})`);
      } else {
        errors.push({
          source,
          error: result.error || 'No leads found',
          strategies: result.strategies
        });
        console.log(`✗ ${source}: Failed - ${result.error || 'No leads found'}`);
      }
    }
    
    // Remove duplicates based on email
    const uniqueLeads = [];
    const seenEmails = new Set();
    
    for (const lead of allLeads) {
      const email = lead.email && lead.email !== 'N/A' ? lead.email.toLowerCase() : null;
      
      if (email && seenEmails.has(email)) {
        continue; // Skip duplicate
      }
      
      if (email) {
        seenEmails.add(email);
      }
      
      uniqueLeads.push(lead);
    }
    
    const totalDuration = Date.now() - startTime;
    const successfulSources = sourceResults.filter(r => r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('LEAD GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`Sources processed: ${sources.length}`);
    console.log(`Successful sources: ${successfulSources}`);
    console.log(`Total leads found: ${allLeads.length}`);
    console.log(`Unique leads: ${uniqueLeads.length}`);
    console.log(`Errors: ${errors.length}`);
    
    // Save to database
    try {
      const leadRecord = new Lead({
        userId,
        searchQuery: {
          keyword: keyword.trim(),
          sources,
          location: location.trim(),
          emailDomain: emailDomain?.trim() || ''
        },
        leads: uniqueLeads,
        metadata: {
          totalSources: sources.length,
          successfulSources,
          failedSources: sources.length - successfulSources,
          processingTime: totalDuration,
          strategies: sourceResults.map(r => ({
            source: r.source,
            strategies: r.strategies
          })),
          errors: errors.map(e => ({
            source: e.source,
            error: e.error,
            strategies: e.strategies
          }))
        },
        status: uniqueLeads.length > 0 ? 'completed' : 'failed'
      });
      
      await leadRecord.save();
      console.log('✓ Lead record saved to database');
      
    } catch (dbError) {
      console.error('Database save error:', dbError.message);
      // Continue with response even if DB save fails
    }
    
    // Determine response
    if (uniqueLeads.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No leads could be generated. This might be due to Google blocking or lack of available data for your search terms. Try different keywords or locations.',
        details: {
          totalSources: sources.length,
          successfulSources,
          processingTime: Math.round(totalDuration / 1000),
          errors: errors
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully generated ${uniqueLeads.length} leads`,
      data: {
        leads: uniqueLeads,
        stats: {
          totalLeads: uniqueLeads.length,
          totalSources: sources.length,
          successfulSources,
          failedSources: sources.length - successfulSources,
          processingTimeSeconds: Math.round(totalDuration / 1000)
        }
      },
      warnings: errors.length > 0 ? `${errors.length} sources encountered issues` : null
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('\n' + '='.repeat(60));
    console.error('LEAD GENERATION FAILED');
    console.error('='.repeat(60));
    console.error(`Duration: ${Math.round(totalDuration / 1000)}s`);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Lead generation failed due to server error',
      error: error.message,
      duration: Math.round(totalDuration / 1000)
    });
  }
};

// Other controller functions (unchanged)
const getLeadHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const leads = await Lead.find({ userId, isArchived: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-leads'); // Exclude leads array for performance
    
    const leadsWithCount = leads.map(lead => ({
      ...lead.toObject(),
      leadsCount: lead.leadCount
    }));
    
    res.json({
      success: true,
      data: leadsWithCount
    });
  } catch (error) {
    console.error('Error fetching lead history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead history'
    });
  }
};

const getLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const lead = await Lead.findOne({ _id: id, userId });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead record not found'
      });
    }
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead details'
    });
  }
};

const addTagToLead = async (req, res) => {
  try {
    const { leadId, tag, notes } = req.body;
    const userId = req.user._id;
    
    const lead = await Lead.findOne({ 'leads._id': leadId, userId });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    const newTag = lead.addTag(leadId, tag, notes, userId);
    await lead.save();
    
    res.json({
      success: true,
      data: newTag,
      message: 'Tag added successfully'
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tag'
    });
  }
};

const removeTagFromLead = async (req, res) => {
  try {
    const { tagId } = req.params;
    const userId = req.user._id;
    
    const lead = await Lead.findOne({ 'tags._id': tagId, userId });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    
    lead.removeTag(tagId);
    await lead.save();
    
    res.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove tag'
    });
  }
};

const addNoteToLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { notes } = req.body;
    const userId = req.user._id;
    
    const lead = await Lead.findOne({ _id: leadId, userId });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead record not found'
      });
    }
    
    lead.notes = notes;
    await lead.save();
    
    res.json({
      success: true,
      message: 'Note saved successfully'
    });
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save note'
    });
  }
};

module.exports = {
  generateLeads,
  getLeadHistory,
  getLeadDetails,
  addTagToLead,
  removeTagFromLead,
  addNoteToLead
};