// Updated searchApiManager.js with proper API usage tracking
const axios = require("axios");
const {
  normalizeUrl,
  scoreUrlForBusiness,
  isAggregatorUrl,
} = require("./searchUtils");

const CSE_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Track API usage globally
let apiUsageStats = {
  queriesUsed: 0,
  remainingQueries: 100,
  dailyQueries: 0,
  dailyLimit: 100,
  lastResetDate: new Date().toDateString(),
};

// Reset daily counter if needed
function checkAndResetDailyStats() {
  const currentDate = new Date().toDateString();
  if (apiUsageStats.lastResetDate !== currentDate) {
    apiUsageStats.dailyQueries = 0;
    apiUsageStats.lastResetDate = currentDate;
    apiUsageStats.remainingQueries = apiUsageStats.dailyLimit;
  }
}

async function googleCseSearch(query, { start = 1, num = 10 } = {}) {
  checkAndResetDailyStats();

  // Check if we've exceeded daily limit
  if (apiUsageStats.dailyQueries >= apiUsageStats.dailyLimit) {
    throw new Error("Daily query limit exceeded");
  }

  const url = "https://www.googleapis.com/customsearch/v1";

  try {
    const { data } = await axios.get(url, {
      params: {
        key: CSE_KEY,
        cx: CSE_ID,
        q: query,
        start,
        num,
      },
    });

    // Update API usage stats after successful call
    apiUsageStats.queriesUsed++;
    apiUsageStats.dailyQueries++;
    apiUsageStats.remainingQueries = Math.max(
      0,
      apiUsageStats.dailyLimit - apiUsageStats.dailyQueries
    );

    console.log(
      `API Query used. Total today: ${apiUsageStats.dailyQueries}, Remaining: ${apiUsageStats.remainingQueries}`
    );

    const items = (data.items || [])
      .map((it) => {
        const title = it.title || "";
        const url = normalizeUrl(it.link || it.formattedUrl);
        return { title, url };
      })
      .filter((r) => r.url && r.url.startsWith("http"));

    return items;
  } catch (error) {
    console.error(
      "Google CSE search error:",
      error.response?.data || error.message
    );

    // Still increment usage counter even on error (API still charged)
    if (error.response?.status !== 400) {
      // Don't count malformed requests
      apiUsageStats.queriesUsed++;
      apiUsageStats.dailyQueries++;
      apiUsageStats.remainingQueries = Math.max(
        0,
        apiUsageStats.dailyLimit - apiUsageStats.dailyQueries
      );
    }

    throw error;
  }
}

async function searchGoogleMulti(
  queries,
  { maxResults = 20, searchId = "", trackingContext = "general" } = {}
) {
  const seen = new Set();
  const out = [];
  let successfulQueries = 0;
  let failedQueries = 0;

  checkAndResetDailyStats();
  const startingQueries = apiUsageStats.queriesUsed;
  const startingDailyQueries = apiUsageStats.dailyQueries;

  console.log(
    `[${trackingContext}] Starting multi-search with ${queries.length} queries. Current API usage: ${apiUsageStats.dailyQueries}/${apiUsageStats.dailyLimit}`
  );

  for (const q of queries) {
    // Check daily limit before each query
    if (apiUsageStats.dailyQueries >= apiUsageStats.dailyLimit) {
      console.log(
        `[${trackingContext}] Daily limit reached. Stopping at query: "${q}"`
      );
      break;
    }

    try {
      console.log(`[${trackingContext}] Executing query: "${q}"`);
      const items = await googleCseSearch(q, { num: 10 });

      for (const it of items) {
        if (seen.has(it.url)) continue;
        seen.add(it.url);

        const isAgg = isAggregatorUrl(it.url);
        const score = scoreUrlForBusiness(it.url, it.title);

        out.push({
          title: it.title,
          url: it.url,
          isAggregator: isAgg,
          _score: score,
        });
      }
      successfulQueries++;
    } catch (error) {
      console.log(
        `[${trackingContext}] Query failed: "${q}" - ${error.message}`
      );
      failedQueries++;

      // Important: Check if this error still consumed quota
      if (
        error.response?.status === 429 || // Rate limit
        error.response?.status === 403 || // Quota exceeded
        (error.response?.status >= 500 && error.response?.status < 600)
      ) {
        // Server errors
        // These errors typically still consume quota
        console.log(
          `[${trackingContext}] Error likely consumed quota: ${error.response?.status}`
        );
      }

      // Continue with next query
    }
  }

  const totalQueriesAttempted = successfulQueries + failedQueries;
  const actualQueriesUsed = apiUsageStats.queriesUsed - startingQueries;
  const actualDailyQueriesUsed =
    apiUsageStats.dailyQueries - startingDailyQueries;

  console.log(
    `[${trackingContext}] Multi-search completed. Queries attempted: ${totalQueriesAttempted}, Successful: ${successfulQueries}, Failed: ${failedQueries}, Actual API calls: ${actualQueriesUsed}, Results found: ${out.length}`
  );

  // Return both results and accurate usage data
  return {
    results: out
      .sort((a, b) => b._score - a._score)
      .slice(0, maxResults)
      .map(({ title, url, isAggregator }) => ({ title, url, isAggregator })),
    apiUsage: {
      queriesUsed: actualQueriesUsed,
      queriesAttempted: totalQueriesAttempted,
      successfulQueries: successfulQueries,
      failedQueries: failedQueries,
      remainingQueries: apiUsageStats.remainingQueries,
      dailyQueries: apiUsageStats.dailyQueries,
      dailyLimit: apiUsageStats.dailyLimit,
    },
  };
}

async function getRealTimeApiUsage() {
  checkAndResetDailyStats();

  // If you want to get real usage from Google's quota API, you could make a test call
  // For now, return the tracked stats
  return {
    ...apiUsageStats,
    timestamp: new Date().toISOString(),
    isRealTime: true,
  };
}

async function testConnection() {
  try {
    const r = await googleCseSearch("weather", { num: 1 });
    return Array.isArray(r);
  } catch {
    return false;
  }
}

// Get current API usage stats
function getApiUsageStats() {
  checkAndResetDailyStats();
  return { ...apiUsageStats };
}

// Reset API usage stats (for testing or manual reset)
function resetApiUsageStats() {
  apiUsageStats = {
    queriesUsed: 0,
    remainingQueries: 100,
    dailyQueries: 0,
    dailyLimit: 100,
    lastResetDate: new Date().toDateString(),
  };
}

// Set daily limit (useful if you change plans)
function setDailyLimit(limit) {
  apiUsageStats.dailyLimit = limit;
  apiUsageStats.remainingQueries = Math.max(
    0,
    limit - apiUsageStats.dailyQueries
  );
  console.log(
    `Daily limit set to: ${limit}, Remaining queries: ${apiUsageStats.remainingQueries}`
  );
}

module.exports = {
  searchGoogleMulti,
  testConnection,
  getApiUsageStats,
  getRealTimeApiUsage, // Add this
  resetApiUsageStats,
  setDailyLimit,
};
