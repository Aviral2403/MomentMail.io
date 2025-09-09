// /utils/alternativeSearchManager.js
// Enhanced alternative search with better anti-bot handling
const axios = require('axios');
const cheerio = require('cheerio');
const {
  normalizeUrl,
  scoreUrlForBusiness,
  isAggregatorUrl,
  unique
} = require('./searchUtils');

// Rotate user agents to avoid detection
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

let userAgentIndex = 0;

function getRandomUserAgent() {
  userAgentIndex = (userAgentIndex + 1) % userAgents.length;
  return userAgents[userAgentIndex];
}

function getRandomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Native concurrency control function (same as in CrawlerManager)
async function runWithConcurrency(tasks, concurrency = 1) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const promise = task().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

async function fetchHtml(url, proxy = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add random delay between requests
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, getRandomDelay(3000, 8000)));
      }

      const cfg = {
        method: 'GET',
        url,
        timeout: 15000,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      };

      if (proxy && proxy.http) {
        cfg.proxy = proxy.http;
      }

      const { data } = await axios(cfg);
      return data;
    } catch (error) {
      console.log(`Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Alternative search engines with better parsing
function parseBing(html) {
  const $ = cheerio.load(html);
  const results = [];
  
  // Multiple selectors for Bing results
  const selectors = [
    'li.b_algo h2 a',
    '.b_algo h2 a',
    'h2 a[href^="http"]',
    '.b_title h2 a'
  ];
  
  selectors.forEach(selector => {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      const url = normalizeUrl(href);
      if (url && !results.some(r => r.url === url)) {
        results.push({ title, url, engine: 'bing' });
      }
    });
  });
  
  return results;
}

function parseDuckDuckGo(html) {
  const $ = cheerio.load(html);
  const results = [];
  
  // Multiple selectors for DuckDuckGo results  
  const selectors = [
    '.result__title a.result__a',
    'a.result__a',
    '.web-result__title a',
    'h2.result__title a'
  ];
  
  selectors.forEach(selector => {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      const url = normalizeUrl(href);
      if (url && !results.some(r => r.url === url)) {
        results.push({ title, url, engine: 'ddg' });
      }
    });
  });
  
  return results;
}

// Fallback to SerpAPI or similar service
async function searchWithSerpAPI(query, options = {}) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    console.log('SerpAPI key not available');
    return [];
  }
  
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: apiKey,
        engine: 'google',
        num: options.maxResults || 10
      },
      timeout: 10000
    });
    
    const results = response.data.organic_results || [];
    return results.map(result => ({
      title: result.title,
      url: result.link,
      engine: 'serp_google'
    }));
  } catch (error) {
    console.log('SerpAPI search failed:', error.message);
    return [];
  }
}

async function searchAltEngines(query, { proxy, maxResults = 20 } = {}) {
  console.log(`Alternative search for: "${query}"`);
  
  const endpoints = [
    { 
      name: 'bing', 
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
      parser: parseBing 
    },
    { 
      name: 'ddg', 
      url: `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      parser: parseDuckDuckGo 
    }
  ];

  const results = [];
  
  // Try each search engine sequentially to avoid rate limiting
  for (const ep of endpoints) {
    try {
      console.log(`Searching ${ep.name}...`);
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(1000, 3000)));
      
      const html = await fetchHtml(ep.url, proxy);
      const parsed = ep.parser(html);
      
      console.log(`${ep.name} returned ${parsed.length} results`);
      results.push(...parsed);
      
      // Break if we have enough results
      if (results.length >= maxResults) break;
      
    } catch (error) {
      console.log(`${ep.name} search failed:`, error.message);
      continue;
    }
  }
  
  // Fallback to SerpAPI if we don't have enough results
  if (results.length < 5) {
    console.log('Trying SerpAPI fallback...');
    const serpResults = await searchWithSerpAPI(query, { maxResults: maxResults - results.length });
    results.push(...serpResults);
  }
  
  // Deduplicate and score
  const seen = new Set();
  const deduped = results.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return r.url.startsWith('http');
  });

  const scored = deduped.map(r => ({
    ...r,
    _score: scoreUrlForBusiness(r.url, r.title),
    _isAgg: isAggregatorUrl(r.url)
  })).sort((a, b) => b._score - a._score);

  const final = scored.slice(0, maxResults).map(({ title, url, _isAgg }) => ({
    title,
    url,
    isAggregator: _isAgg
  }));
  
  console.log(`Alternative search completed: ${final.length} results`);
  return final;
}

async function testConnection() {
  try {
    console.log('Testing alternative search connection...');
    
    // Test with a simple query
    const results = await searchAltEngines('test weather today', { maxResults: 3 });
    const isWorking = results.length > 0;
    
    console.log(`Alternative search test: ${isWorking ? 'PASSED' : 'FAILED'} (${results.length} results)`);
    return isWorking;
  } catch (error) {
    console.log('Alternative search test failed:', error.message);
    return false;
  }
}

module.exports = {
  searchAltEngines,
  testConnection
};