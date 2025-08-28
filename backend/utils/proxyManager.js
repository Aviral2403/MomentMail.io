const axios = require('axios');

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
    this.lastProxyTest = 0;
    this.proxyTestInterval = 5 * 60 * 1000; // Test every 5 minutes
  }

  getProxyUrl() {
    if (!this.proxyConfig.host || !this.proxyConfig.auth.username) {
      console.log('Proxy configuration missing');
      return null;
    }
    
    return `http://${this.proxyConfig.auth.username}:${this.proxyConfig.auth.password}@${this.proxyConfig.host}:${this.proxyConfig.port}`;
  }

  async getAnonymizedProxy() {
    // Since proxy-chain might be causing issues, return direct proxy URL
    const proxyUrl = this.getProxyUrl();
    if (proxyUrl) {
      console.log('Using direct proxy configuration');
      return proxyUrl;
    }
    return null;
  }

  async closeAnonymizedProxy() {
    // No-op for direct proxy usage
    console.log('Direct proxy - no cleanup needed');
  }

  getProxyConfig() {
    return this.proxyConfig;
  }

  async testProxy() {
    const now = Date.now();
    
    // Skip test if recently tested and working
    if (this.isProxyWorking === true && (now - this.lastProxyTest) < this.proxyTestInterval) {
      return true;
    }
    
    try {
      console.log('Testing proxy connection...');
      this.lastProxyTest = now;
      
      const proxyUrl = this.getProxyUrl();
      
      if (!proxyUrl) {
        console.log('No proxy URL available');
        this.isProxyWorking = false;
        return false;
      }

      const parsedProxy = new URL(proxyUrl);
      const proxyConfig = {
        protocol: parsedProxy.protocol.replace(':', ''),
        host: parsedProxy.hostname,
        port: parseInt(parsedProxy.port),
        auth: {
          username: parsedProxy.username,
          password: parsedProxy.password
        }
      };

      const testUrls = [
        'http://httpbin.org/ip',
        'http://icanhazip.com'
      ];

      for (const testUrl of testUrls) {
        try {
          console.log(`Testing proxy with ${testUrl}...`);
          
          const response = await axios.get(testUrl, {
            proxy: proxyConfig,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.status === 200) {
            const responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            console.log('Proxy test successful. Response:', responseData.substring(0, 100));
            
            this.isProxyWorking = true;
            this.consecutiveFailures = 0;
            return true;
          }
        } catch (error) {
          console.log(`Proxy test failed for ${testUrl}:`, error.message);
          continue;
        }
      }

      console.log('All proxy test URLs failed');
      this.isProxyWorking = false;
      this.consecutiveFailures++;
      return false;

    } catch (error) {
      console.error('Proxy test error:', error.message);
      this.isProxyWorking = false;
      this.consecutiveFailures++;
      return false;
    }
  }

  async rotateProxy() {
    console.log('Proxy rotation requested - resetting proxy state');
    this.isProxyWorking = null;
    this.lastProxyTest = 0;
    
    // Add a delay before using proxy again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.testProxy();
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
    
    // Mark proxy as potentially problematic after repeated failures
    if (this.consecutiveFailures > 5) {
      this.isProxyWorking = false;
    }
  }

  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
      console.log(`Success recorded, consecutive failures reduced to: ${this.consecutiveFailures}`);
    }
    this.isProxyWorking = true;
  }

  shouldUseProxy() {
    // Only use proxy if it's working and we don't have too many failures
    if (this.consecutiveFailures > 10) {
      console.log('Too many consecutive failures, temporarily disabling proxy');
      return false;
    }
    
    return this.isProxyWorking !== false;
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      consecutiveFailures: this.consecutiveFailures,
      isProxyWorking: this.isProxyWorking,
      currentRateLimit: this.rateLimitDelay,
      lastProxyTest: new Date(this.lastProxyTest).toISOString()
    };
  }

  reset() {
    this.requestCount = 0;
    this.consecutiveFailures = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 2000;
    this.isProxyWorking = null;
    this.lastProxyTest = 0;
    console.log('Proxy manager reset');
  }
}

module.exports = new ProxyManager();