// Enhanced rate limiter with multiple strategies and better monitoring
const RATE_LIMIT_CONFIGS = {
  lead_generation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2, // Reduced to 2 per minute for lead generation
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many lead generation requests. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false
  },
  general: {
    windowMs: 15 * 1000, // 15 seconds
    maxRequests: 10, // 10 requests per 15 seconds for other endpoints
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    message: 'Too many requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false
  }
};

// In-memory store for rate limiting data
class RateLimitStore {
  constructor() {
    this.data = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  startCleanup() {
    // Clean up expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, userData] of this.data.entries()) {
      // Remove entries older than 5 minutes
      if (now - userData.resetTime > 5 * 60 * 1000) {
        this.data.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Rate limiter cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  get(identifier, windowMs) {
    const userData = this.data.get(identifier);
    const now = Date.now();
    
    if (!userData || now > userData.resetTime) {
      // Create new window
      const newUserData = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.data.set(identifier, newUserData);
      return newUserData;
    }
    
    return userData;
  }

  increment(identifier, windowMs) {
    const userData = this.get(identifier, windowMs);
    userData.count++;
    this.data.set(identifier, userData);
    return userData;
  }

  reset(identifier) {
    this.data.delete(identifier);
  }

  getStats() {
    return {
      totalKeys: this.data.size,
      entries: Array.from(this.data.entries()).map(([key, data]) => ({
        identifier: key,
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString(),
        timeRemaining: Math.max(0, data.resetTime - Date.now())
      }))
    };
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

const rateLimitStore = new RateLimitStore();

// Enhanced rate limiting function
const checkRateLimit = (identifier, config) => {
  console.log(`Rate limit check for ${identifier} with config:`, {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests
  });
  
  const userData = rateLimitStore.increment(identifier, config.windowMs);
  const now = Date.now();
  const timeUntilReset = Math.max(0, userData.resetTime - now);
  
  const result = {
    allowed: userData.count <= config.maxRequests,
    count: userData.count,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - userData.count),
    resetTime: userData.resetTime,
    timeUntilReset,
    firstRequest: userData.firstRequest
  };
  
  console.log(`Rate limit result for ${identifier}:`, result);
  
  return result;
};

// Create rate limiter middleware
const createRateLimiter = (configName) => {
  const config = RATE_LIMIT_CONFIGS[configName] || RATE_LIMIT_CONFIGS.general;
  
  return (req, res, next) => {
    // Extract identifier (prefer user ID, fallback to IP)
    const identifier = 
      req.user?._id?.toString() || 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress || 
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';
    
    console.log(`Rate limiting check for endpoint: ${req.path}, identifier: ${identifier}`);
    
    const rateLimitResult = checkRateLimit(identifier, config);
    
    // Set standard rate limit headers
    if (config.standardHeaders) {
      res.set({
        'RateLimit-Limit': config.maxRequests,
        'RateLimit-Remaining': rateLimitResult.remaining,
        'RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      });
    }
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for ${identifier}:`, {
        path: req.path,
        count: rateLimitResult.count,
        limit: rateLimitResult.limit,
        timeUntilReset: Math.round(rateLimitResult.timeUntilReset / 1000)
      });
      
      // Additional headers for rate limit exceeded
      res.set({
        'Retry-After': Math.ceil(rateLimitResult.timeUntilReset / 1000),
        'X-RateLimit-Exceeded-At': new Date().toISOString()
      });
      
      return res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message: config.message,
        details: {
          limit: rateLimitResult.limit,
          current: rateLimitResult.count,
          retryAfter: Math.ceil(rateLimitResult.timeUntilReset / 1000),
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        suggestion: configName === 'lead_generation' 
          ? 'Lead generation is resource-intensive. Please wait before generating more leads.'
          : 'Please wait before making more requests.'
      });
    }
    
    // Add rate limit info to request for logging
    req.rateLimit = rateLimitResult;
    
    next();
  };
};

// Specific rate limiter instances
const leadGenerationLimiter = createRateLimiter('lead_generation');
const generalLimiter = createRateLimiter('general');

// Admin middleware to bypass rate limits (optional)
const bypassRateLimit = (req, res, next) => {
  const userInfo = req.user;
  
  // Check if user is admin or has special privileges
  if (userInfo && (userInfo.role === 'admin' || userInfo.isVip)) {
    console.log(`Rate limit bypassed for user: ${userInfo.email} (${userInfo.role || 'VIP'})`);
    return next();
  }
  
  return leadGenerationLimiter(req, res, next);
};

// Rate limit status endpoint (for debugging)
const getRateLimitStatus = (req, res) => {
  const identifier = 
    req.user?._id?.toString() || 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress || 
    'unknown';
  
  const leadGenResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.lead_generation);
  const generalResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.general);
  
  res.json({
    success: true,
    identifier: identifier.length > 10 ? identifier.substring(0, 10) + '...' : identifier,
    rateLimits: {
      leadGeneration: {
        allowed: leadGenResult.allowed,
        count: leadGenResult.count,
        limit: leadGenResult.limit,
        remaining: leadGenResult.remaining,
        resetTime: new Date(leadGenResult.resetTime).toISOString(),
        timeUntilReset: Math.round(leadGenResult.timeUntilReset / 1000)
      },
      general: {
        allowed: generalResult.allowed,
        count: generalResult.count,
        limit: generalResult.limit,
        remaining: generalResult.remaining,
        resetTime: new Date(generalResult.resetTime).toISOString(),
        timeUntilReset: Math.round(generalResult.timeUntilReset / 1000)
      }
    },
    storeStats: rateLimitStore.getStats(),
    timestamp: new Date().toISOString()
  });
};

// Reset rate limit for a specific user (admin function)
const resetRateLimit = (req, res) => {
  const { identifier } = req.body;
  
  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: 'Missing identifier'
    });
  }
  
  // Check if requester is admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  rateLimitStore.reset(identifier);
  console.log(`Rate limit reset for identifier: ${identifier} by admin: ${req.user.email}`);
  
  res.json({
    success: true,
    message: `Rate limit reset for identifier: ${identifier}`
  });
};

// Enhanced logging middleware for rate limit events
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Log rate limit information
    if (req.rateLimit) {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        identifier: req.user?._id?.toString()?.substring(0, 8) + '...' || 'anonymous',
        rateLimit: {
          count: req.rateLimit.count,
          remaining: req.rateLimit.remaining,
          resetTime: new Date(req.rateLimit.resetTime).toISOString()
        },
        status: res.statusCode,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      };
      
      if (res.statusCode === 429) {
        console.warn('RATE_LIMIT_EXCEEDED:', logData);
      } else if (req.rateLimit.remaining <= 1) {
        console.warn('RATE_LIMIT_WARNING:', logData);
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down rate limiter...');
  rateLimitStore.stop();
};

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  // Main middleware functions
  leadGenerationLimiter,
  generalLimiter,
  bypassRateLimit,
  rateLimitLogger,
  
  // Utility functions
  checkRateLimit,
  createRateLimiter,
  
  // Admin functions
  getRateLimitStatus,
  resetRateLimit,
  
  // Store access
  rateLimitStore,
  
  // Configurations
  RATE_LIMIT_CONFIGS,
  
  // Cleanup
  shutdown
};