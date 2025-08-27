const Lead = require('../models/Lead');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const proxyManager = require('../utils/proxyManager');
const browserManager = require('../utils/browserManager');
const SearchUtils = require('../utils/searchUtils');

const cleanJsonString = (str) => {
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  str = str.replace(/,\s*([\]}])/g, "$1");
  str = str.replace(/:\s*'([^']*)'/g, ': "$1"');
  str = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
  return str;
};

const searchWithPuppeteer = async (searchUrl, platform, retryCount = 0, maxRetries = 3) => {
  let page = null;
  
  try {
    console.log(`Searching with Puppeteer: ${searchUrl.substring(0, 80)}...`);
    
    const delay = SearchUtils.getSearchDelay(retryCount);
    console.log(`Waiting ${delay}ms before search...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    page = await browserManager.createPage();
    
    let referer = 'https://www.google.com/';
    if (platform.includes('facebook')) referer = 'https://www.facebook.com/';
    else if (platform.includes('linkedin')) referer = 'https://www.linkedin.com/';
    
    await page.setExtraHTTPHeaders({
      'Referer': referer
    });
    
    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    const hasCaptcha = await page.evaluate(() => {
      return document.body.textContent.includes('captcha') || 
             document.body.textContent.includes('CAPTCHA') ||
             document.querySelector('iframe[src*="recaptcha"]') !== null;
    });
    
    if (hasCaptcha) {
      console.log('Captcha detected, attempting to solve...');
      const captchaSolved = await browserManager.solveCaptcha(
        page, 
        searchUrl, 
        process.env.GOOGLE_SITE_KEY
      );
      
      if (!captchaSolved && retryCount < maxRetries) {
        console.log('Captcha solving failed, retrying...');
        await browserManager.closePage(page);
        return await searchWithPuppeteer(searchUrl, platform, retryCount + 1, maxRetries);
      }
    }
    
    const isSearchResults = await page.evaluate(() => {
      return document.querySelector('#search, .g, .result, .results') !== null ||
             document.body.textContent.includes('results') ||
             document.title.includes('Search');
    });
    
    if (!isSearchResults) {
      console.log('Not on search results page, might be blocked');
      await browserManager.takeScreenshot(page, `blocked-${platform}-${Date.now()}`);
      
      if (retryCount < maxRetries) {
        console.log('Retrying with different approach...');
        await browserManager.closePage(page);
        return await searchWithPuppeteer(searchUrl, platform, retryCount + 1, maxRetries);
      }
      
      throw new Error('Failed to access search results');
    }
    
    await browserManager.scrollPage(page, 3);
    await page.waitForTimeout(2000 + Math.random() * 3000);
    
    const resultLinks = await page.$$('a[href*="http"]');
    if (resultLinks.length > 3) {
      for (let i = 0; i < Math.min(2, resultLinks.length); i++) {
        const randomIndex = Math.floor(Math.random() * resultLinks.length);
        try {
          await resultLinks[randomIndex].click();
          await page.waitForTimeout(1500 + Math.random() * 2000);
          await page.goBack();
          await page.waitForTimeout(1000 + Math.random() * 1500);
        } catch (error) {
          console.log('Error clicking link:', error.message);
        }
      }
    }
    
    const content = await page.content();
    await browserManager.closePage(page);
    
    return content;
    
  } catch (error) {
    if (page) {
      await browserManager.closePage(page);
    }
    
    console.error(`Puppeteer search error (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await searchWithPuppeteer(searchUrl, platform, retryCount + 1, maxRetries);
    }
    
    throw error;
  }
};

const scrapeDirectoryWithPuppeteer = async (directory, keyword, location) => {
  let page = null;
  
  try {
    console.log(`Scraping directory: ${directory.name} - ${directory.url}`);
    
    page = await browserManager.createPage();
    
    await page.goto(directory.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    const isBlocked = await page.evaluate(() => {
      return document.body.textContent.includes('captcha') || 
             document.body.textContent.includes('blocked') ||
             document.body.textContent.includes('access denied');
    });
    
    if (isBlocked) {
      console.log('Directory blocked, attempting to solve captcha...');
      const captchaSolved = await browserManager.solveCaptcha(page, directory.url);
      
      if (!captchaSolved) {
        throw new Error('Failed to bypass directory blocking');
      }
    }
    
    await browserManager.scrollPage(page, 2);
    await page.waitForTimeout(3000 + Math.random() * 2000);
    
    const listings = await page.evaluate((dirName) => {
      const results = [];
      
      if (dirName === 'yellowpages') {
        document.querySelectorAll('.result, .business-listing, .listing').forEach((listing) => {
          const nameElem = listing.querySelector('.business-name, .name, h2, h3');
          const phoneElem = listing.querySelector('.phone, .phones, [href^="tel:"]');
          const websiteElem = listing.querySelector('.website-link, [href*="http"]');
          
          if (nameElem) {
            results.push({
              businessName: nameElem.textContent.trim(),
              phone: phoneElem ? phoneElem.textContent.trim() : 'N/A',
              website: websiteElem ? websiteElem.href : 'N/A',
              email: 'N/A',
              socialLinks: [],
              source: 'yellowpages'
            });
          }
        });
      } else if (dirName === 'yelp') {
        document.querySelectorAll('[data-testid="serp-ia-card"], .businessListing').forEach((listing) => {
          const nameElem = listing.querySelector('h3, h4, .business-name');
          const phoneElem = listing.querySelector('[href^="tel:"], .phone');
          const websiteElem = listing.querySelector('[href*="biz_redir"]');
          
          if (nameElem) {
            results.push({
              businessName: nameElem.textContent.trim(),
              phone: phoneElem ? phoneElem.textContent.trim() : 'N/A',
              website: websiteElem ? websiteElem.href : 'N/A',
              email: 'N/A',
              socialLinks: [],
              source: 'yelp'
            });
          }
        });
      }
      
      return results;
    }, directory.name);
    
    await browserManager.closePage(page);
    return listings;
    
  } catch (error) {
    if (page) {
      await browserManager.closePage(page);
    }
    
    console.error(`Directory scraping failed for ${directory.name}:`, error.message);
    return [];
  }
};

const processSearchResults = async (html, platform, keyword, location) => {
  try {
    if (!html || html.length < 100) {
      console.log(`No substantial results found for ${platform}`);
      return [];
    }

    const $ = require('cheerio').load(html);
    
    let searchResults = '';
    
    const selectors = ['#main', '#results', '.results', '#web', 'body'];
    
    for (const selector of selectors) {
      const content = $(selector).text();
      if (content && content.length > 200) {
        searchResults = content;
        break;
      }
    }
    
    if (!searchResults) {
      console.log(`Could not extract content for ${platform}`);
      return [];
    }

    searchResults = searchResults.substring(0, 10000);

    const prompt = `Extract business leads from ${platform} search results for "${keyword}" in "${location}".
    
    IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, or markdown formatting.
    
    Each object must have these exact fields:
    - businessName (string, required - the company/business name)
    - email (string - valid email address or "N/A" if not found)
    - phone (string - phone number or "N/A" if not found)
    - website (string - website URL or "N/A" if not found)  
    - socialLinks (array of strings - social media URLs, empty array if none)
    - source (string - exactly "${platform}")
    
    Rules:
    1. Only include businesses that are relevant to "${keyword}"
    2. Only include entries that have at least one contact method (email, phone, or website)
    3. Clean phone numbers (remove extra characters, keep numbers and basic formatting)
    4. Ensure email addresses are valid format
    5. Make sure website URLs are complete
    6. Maximum 20 results
    
    Search results text: ${searchResults}`;

    console.log(`Processing ${platform} results with AI...`);
    const result = await model.generateContent(prompt);
    const generatedText = result.response.text();
    
    let jsonString = generatedText
      .replace(/```json\n?/g, "")
      .replace(/\n?```/g, "")
      .replace(/^[^[{]*/, "")
      .replace(/[^}\]]*$/, "")
      .trim();
    
    jsonString = cleanJsonString(jsonString);
    
    let leads;
    try {
      leads = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`JSON parsing failed for ${platform}:`, parseError.message);
      console.log('Raw AI response:', generatedText);
      return [];
    }
    
    if (!Array.isArray(leads)) {
      console.error(`AI response is not an array for ${platform}`);
      return [];
    }

    const validLeads = leads
      .filter(lead => 
        lead && 
        typeof lead === 'object' &&
        lead.businessName && 
        lead.businessName.trim() &&
        (lead.email !== 'N/A' || lead.phone !== 'N/A' || lead.website !== 'N/A')
      )
      .map(lead => ({
        businessName: lead.businessName.trim(),
        email: lead.email === 'N/A' ? 'N/A' : lead.email,
        phone: lead.phone === 'N/A' ? 'N/A' : lead.phone,
        website: lead.website === 'N/A' ? 'N/A' : lead.website,
        socialLinks: Array.isArray(lead.socialLinks) ? lead.socialLinks : [],
        source: platform
      }));

    console.log(`Processed ${validLeads.length} valid leads from ${platform}`);
    return validLeads;
    
  } catch (error) {
    console.error(`Error processing ${platform} results:`, error.message);
    return [];
  }
};

exports.generateLeads = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { keyword, platforms, location, emailDomain } = req.body;
    const userId = req.user._id;
    
    if (!keyword || !platforms || platforms.length === 0) {
      return res.status(400).json({ message: 'Keyword and at least one platform are required' });
    }

    console.log('Starting enhanced lead generation with Puppeteer:', { 
      keyword, 
      platforms, 
      location, 
      emailDomain 
    });

    const proxyTest = await proxyManager.testProxy();
    if (!proxyTest) {
      console.warn('Proxy test failed, continuing without proxy...');
    }

    let allLeads = [];
    const processedPlatforms = [];

    if (location) {
      console.log('\n=== Trying Direct Directory Scraping ===');
      const directories = [
        {
          name: 'yellowpages',
          url: `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(keyword)}&geo_location_terms=${encodeURIComponent(location)}`
        },
        {
          name: 'yelp',
          url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(keyword)}&find_loc=${encodeURIComponent(location)}`
        }
      ];

      for (const directory of directories) {
        try {
          const directoryLeads = await scrapeDirectoryWithPuppeteer(directory, keyword, location);
          if (directoryLeads.length > 0) {
            allLeads.push(...directoryLeads);
            processedPlatforms.push(directory.name);
            console.log(`Found ${directoryLeads.length} leads from ${directory.name}`);
          }
        } catch (error) {
          console.error('Directory scraping failed:', error.message);
        }
      }
    }

    for (const platform of platforms) {
      try {
        console.log(`\n=== Processing ${platform} ===`);
        
        const queries = SearchUtils.generateMultipleQueries(keyword, platform, location, emailDomain);
        let platformLeads = [];
        
        for (let queryIndex = 0; queryIndex < Math.min(queries.length, 2); queryIndex++) {
          const query = queries[queryIndex];
          const searchUrls = SearchUtils.generateSearchUrls(query, 1);
          
          for (const url of searchUrls) {
            try {
              console.log(`Searching with Google dork: ${query.substring(0, 60)}...`);
              let html = null;
              
              try {
                html = await searchWithPuppeteer(url, platform);
              } catch (mainError) {
                console.log(`Main scraping failed: ${mainError.message}`);
                continue;
              }
              
              if (html) {
                const leads = await processSearchResults(html, platform, keyword, location);
                platformLeads.push(...leads);
                
                if (leads.length > 0) {
                  console.log(`✓ Found ${leads.length} leads from ${platform}`);
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, SearchUtils.getSearchDelay()));
              
            } catch (error) {
              console.error(`✗ Failed to process search: ${error.message}`);
              continue;
            }
          }
          
          if (platformLeads.length >= 15) break;
        }
        
        if (platformLeads.length > 0) {
          allLeads.push(...platformLeads);
          processedPlatforms.push(platform);
          console.log(`Total from ${platform}: ${platformLeads.length} leads`);
        }
        
      } catch (platformError) {
        console.error(`Error processing ${platform}:`, platformError.message);
        continue;
      }
    }

    const uniqueLeads = [];
    const seenBusinesses = new Set();
    
    for (const lead of allLeads) {
      if (SearchUtils.validateLead(lead)) {
        const normalizedName = lead.businessName.toLowerCase().trim();
        if (!seenBusinesses.has(normalizedName)) {
          seenBusinesses.add(normalizedName);
          uniqueLeads.push(lead);
        }
      }
    }

    console.log(`\nFinal results: ${uniqueLeads.length} unique leads from ${allLeads.length} total`);

    const proxy = proxyManager.getProxyConfig();
    const leadDoc = new Lead({
      userId,
      searchQuery: {
        keyword,
        platforms: processedPlatforms,
        location: location || '',
        emailDomain: emailDomain || ''
      },
      leads: uniqueLeads,
      proxyUsed: {
        host: proxy.host,
        port: proxy.port,
        username: proxy.auth.username
      },
      stats: {
        totalFound: allLeads.length,
        uniqueFound: uniqueLeads.length,
        processingTime: Date.now() - startTime
      }
    });

    await leadDoc.save();

    await browserManager.closeBrowser();
    await proxyManager.closeAnonymizedProxy();

    console.log(`✅ Lead generation completed successfully`);

    res.status(200).json({
      success: true,
      searchId: leadDoc._id,
      query: { 
        keyword, 
        platforms: processedPlatforms, 
        location: location || '', 
        emailDomain: emailDomain || '' 
      },
      leads: uniqueLeads,
      stats: {
        total: allLeads.length,
        unique: uniqueLeads.length,
        processingTime: Date.now() - startTime
      }
    });
    
  } catch (error) {
    await browserManager.closeBrowser();
    await proxyManager.closeAnonymizedProxy();
    
    console.error('❌ Lead generation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate leads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

exports.getLeadHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const history = await Lead.find({ userId })
      .select('searchQuery createdAt leads.length stats')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Lead.countDocuments({ userId });

    res.status(200).json({
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching lead history:', error);
    res.status(500).json({ message: 'Failed to fetch lead history' });
  }
};

exports.getLeadDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const searchId = req.params.id;

    const leadDoc = await Lead.findOne({ _id: searchId, userId });
    
    if (!leadDoc) {
      return res.status(404).json({ message: 'Lead search not found' });
    }

    res.status(200).json(leadDoc);
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({ message: 'Failed to fetch lead details' });
  }
};

exports.updateLeadNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { searchId, leadIndex } = req.params;
    const { notes, tags } = req.body;

    const leadDoc = await Lead.findOne({ _id: searchId, userId });
    
    if (!leadDoc) {
      return res.status(404).json({ message: 'Lead search not found' });
    }

    if (leadIndex >= leadDoc.leads.length) {
      return res.status(400).json({ message: 'Invalid lead index' });
    }

    if (notes !== undefined) {
      leadDoc.leads[leadIndex].notes = notes;
    }

    if (tags !== undefined) {
      leadDoc.leads[leadIndex].tags = Array.isArray(tags) ? tags : [tags];
    }

    await leadDoc.save();

    res.status(200).json({ 
      success: true,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update lead'
    });
  }
};

exports.deleteSearch = async (req, res) => {
  try {
    const userId = req.user._id;
    const searchId = req.params.id;

    const result = await Lead.deleteOne({ _id: searchId, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Lead search not found' });
    }

    res.status(200).json({ 
      success: true,
      message: 'Search deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting search:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete search'
    });
  }
};