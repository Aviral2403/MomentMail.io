const axios = require('axios');

class SearchApiManager {
  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
    this.dailyQueries = 0;
    this.maxDailyQueries = 100;
  }

  async testConnection() {
    try {
      if (!this.apiKey || !this.searchEngineId) {
        console.error('Google Search API credentials not configured');
        return false;
      }

      // Test with a simple query
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: 'test',
          num: 1
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      console.error('Search API connection test failed:', error.message);
      return false;
    }
  }

  async search(query, options = {}) {
    if (this.dailyQueries >= this.maxDailyQueries) {
      throw new Error('Daily search quota exceeded');
    }

    try {
      const params = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: options.num || 10,
        start: options.start || 1,
        lr: options.language || 'lang_en',
        cr: options.country || '',
        gl: options.region || 'us',
        dateRestrict: options.dateRestrict || '',
        siteSearch: options.site || '',
        exactTerms: options.exactTerms || '',
        excludeTerms: options.excludeTerms || ''
      };

      // Remove empty parameters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 15000
      });

      this.dailyQueries += 1;
      
      return {
        success: true,
        data: response.data,
        searchInformation: response.data.searchInformation,
        queries: response.data.queries
      };
    } catch (error) {
      console.error('Search API error:', error.message);
      
      if (error.response && error.response.data) {
        console.error('API error details:', error.response.data.error);
        
        if (error.response.data.error.code === 429) {
          throw new Error('Search API quota exceeded');
        }
      }
      
      throw error;
    }
  }

  async searchMultipleQueries(queries, options = {}) {
    const results = [];
    
    for (const query of queries) {
      if (this.dailyQueries >= this.maxDailyQueries) {
        console.warn('Daily search quota reached, stopping further queries');
        break;
      }

      try {
        console.log(`Searching for: ${query}`);
        const result = await this.search(query, options);
        results.push({
          query,
          success: true,
          data: result.data
        });
        
        // Add delay between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error.message);
        results.push({
          query,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  getStats() {
    return {
      dailyQueries: this.dailyQueries,
      maxDailyQueries: this.maxDailyQueries,
      remainingQueries: this.maxDailyQueries - this.dailyQueries
    };
  }

  resetDailyCount() {
    this.dailyQueries = 0;
    console.log('Daily search count reset');
  }
}

module.exports = new SearchApiManager();