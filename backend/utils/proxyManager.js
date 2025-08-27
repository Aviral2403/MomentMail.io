const axios = require('axios');
const proxyChain = require('proxy-chain');

class ProxyManager {
  constructor() {
    this.proxyConfig = {
      host: process.env.WEBSHARE_PROXY_HOST,
      port: parseInt(process.env.WEBSHARE_PROXY_PORT),
      auth: {
        username: process.env.WEBSHARE_PROXY_USERNAME,
        password: process.env.WEBSHARE_PROXY_PASSWORD
      }
    };
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 2000;
    this.consecutiveFailures = 0;
    this.isProxyWorking = null;
    this.anonymizedProxyUrl = null;
  }

  async getAnonymizedProxy() {
    if (this.anonymizedProxyUrl) {
      return this.anonymizedProxyUrl;
    }

    try {
      const proxyUrl = `http://${this.proxyConfig.auth.username}:${this.proxyConfig.auth.password}@${this.proxyConfig.host}:${this.proxyConfig.port}`;
      this.anonymizedProxyUrl = await proxyChain.anonymizeProxy(proxyUrl);
      console.log('Anonymized proxy URL created');
      return this.anonymizedProxyUrl;
    } catch (error) {
      console.error('Error creating anonymized proxy:', error);
      return null;
    }
  }

  async closeAnonymizedProxy() {
    if (this.anonymizedProxyUrl) {
      try {
        await proxyChain.closeAnonymizedProxy(this.anonymizedProxyUrl, true);
        this.anonymizedProxyUrl = null;
        console.log('Anonymized proxy closed');
      } catch (error) {
        console.error('Error closing anonymized proxy:', error);
      }
    }
  }

  getProxyConfig() {
    return this.proxyConfig;
  }

  async testProxy() {
    try {
      console.log('Testing proxy connection...');
      const proxyUrl = await this.getAnonymizedProxy();
      
      if (!proxyUrl) {
        console.error('Failed to create anonymized proxy');
        return false;
      }

      const testUrls = [
        'http://httpbin.org/ip',
        'http://icanhazip.com',
        'http://ip-api.com/json'
      ];

      for (const testUrl of testUrls) {
        try {
          const response = await axios.get(testUrl, {
            proxy: {
              host: new URL(proxyUrl).hostname,
              port: new URL(proxyUrl).port,
              protocol: new URL(proxyUrl).protocol
            },
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.status === 200) {
            const ip = response.data.origin || response.data.ip || response.data.query || response.data;
            console.log('Proxy test successful. Current IP:', ip);
            this.isProxyWorking = true;
            this.consecutiveFailures = 0;
            return true;
          }
        } catch (error) {
          console.log(`Test URL ${testUrl} failed:`, error.message);
          continue;
        }
      }

      console.error('All proxy test URLs failed');
      this.isProxyWorking = false;
      this.consecutiveFailures++;
      return false;

    } catch (error) {
      console.error('Proxy test failed:', error.message);
      this.isProxyWorking = false;
      this.consecutiveFailures++;
      return false;
    }
  }

  getRandomDelay(min = 3000, max = 8000) {
    const failureMultiplier = Math.min(this.consecutiveFailures * 0.5, 3);
    const adjustedMin = min * (1 + failureMultiplier);
    const adjustedMax = max * (1 + failureMultiplier);
    
    return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  incrementRequestCount() {
    this.requestCount++;
    
    if (this.requestCount % 10 === 0) {
      this.rateLimitDelay = Math.min(this.rateLimitDelay + 500, 10000);
      console.log(`Request count: ${this.requestCount}, increased delay to: ${this.rateLimitDelay}ms`);
    }

    if (this.requestCount % 50 === 0) {
      console.log(`Total requests made: ${this.requestCount}`);
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
    }
  }

  recordFailure() {
    this.consecutiveFailures++;
    console.log(`Consecutive failures: ${this.consecutiveFailures}`);
    
    if (this.consecutiveFailures > 3) {
      this.rateLimitDelay = Math.min(this.rateLimitDelay * 1.5, 30000);
      console.log(`Increased rate limit delay to ${this.rateLimitDelay}ms due to failures`);
    }
  }

  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
      console.log(`Success recorded, consecutive failures reduced to: ${this.consecutiveFailures}`);
    }
  }

  shouldUseProxy() {
    if (this.consecutiveFailures > 5) {
      console.log('Too many consecutive failures, skipping proxy');
      return false;
    }
    
    return this.isProxyWorking !== false;
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      consecutiveFailures: this.consecutiveFailures,
      isProxyWorking: this.isProxyWorking,
      currentRateLimit: this.rateLimitDelay
    };
  }

  reset() {
    this.requestCount = 0;
    this.consecutiveFailures = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 2000;
    this.isProxyWorking = null;
    this.closeAnonymizedProxy();
    console.log('Proxy manager reset');
  }
}

module.exports = new ProxyManager();