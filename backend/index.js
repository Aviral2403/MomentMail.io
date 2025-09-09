const dotenv = require('dotenv');
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cors = require('cors');

dotenv.config();

const app = express();

// Import enhanced managers - Updated imports
const searchApiManager = require('./utils/searchApiManager');
const alternativeSearchManager = require('./utils/alternativeSearchManager');
const crawlerManager = require('./utils/CrawlerManager');
const proxyManager = require('./utils/proxyManager');

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://momentmail-io.onrender.com/']
}));

app.use(express.json());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Routes
const authRouter = require('./routes/auth');
const driveRouter = require('./routes/drive');
const templateRouter = require('./routes/templateRoutes');
const leadRouter = require('./routes/leadRoutes');

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0-enhanced',
    services: {
      database: 'unknown',
      primarySearchApi: 'unknown',
      alternativeSearch: 'unknown',
      crawler: 'unknown',
      proxy: 'unknown'
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  };

  // Test database
  try {
    await mongoose.connection.db.admin().ping();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Test primary search API
  try {
    const apiWorking = await searchApiManager.testConnection();
    health.services.primarySearchApi = apiWorking ? 'working' : 'failed';
  } catch (error) {
    health.services.primarySearchApi = 'failed';
  }

  // Test alternative search
  try {
    const altSearchWorking = await alternativeSearchManager.testConnection();
    health.services.alternativeSearch = altSearchWorking ? 'working' : 'failed';
  } catch (error) {
    health.services.alternativeSearch = 'failed';
  }

  // Test crawler
  try {
    const crawlerStats = crawlerManager.getStats();
    health.services.crawler = crawlerStats.active ? 'ready' : 'inactive';
    health.crawlerStats = crawlerStats;
  } catch (error) {
    health.services.crawler = 'error';
  }

  // Test proxy
  try {
    const proxyStats = proxyManager.getStats();
    health.services.proxy = proxyStats.isProxyWorking ? 'working' : 'failed';
    health.proxyStats = proxyStats;
  } catch (error) {
    health.services.proxy = 'error';
  }

  res.json(health);
});

// Enhanced root endpoint
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Enhanced Lead Generation Backend v2.0</title>
          <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
              }
              .container { 
                max-width: 900px; 
                margin: 0 auto; 
                background: rgba(255,255,255,0.1);
                padding: 40px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
              }
              h1 { color: white; font-size: 2.5em; margin-bottom: 10px; }
              .version { font-size: 0.9em; opacity: 0.8; margin-bottom: 30px; }
              .features { text-align: left; margin: 30px 0; }
              .feature { margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; }
              .endpoints { text-align: left; margin-top: 40px; }
              .endpoint { margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 5px; font-family: monospace; }
              a { color: #fff; text-decoration: none; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 5px; margin: 10px; display: inline-block; }
              a:hover { background: rgba(255,255,255,0.3); }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>🚀 Enhanced Lead Generation Backend</h1>
              <div class="version">v2.0.0 - Professional Edition</div>
              
              <p>Advanced lead generation system with multi-engine search, AI-powered extraction, and quality scoring</p>
              
              <div class="features">
                  <h3>🌟 Enhanced Features:</h3>
                  <div class="feature">✅ Multi-engine search (Google + alternative engines)</div>
                  <div class="feature">✅ AI-powered contact extraction with validation</div>
                  <div class="feature">✅ Quality scoring and filtering (0-100 scale)</div>
                  <div class="feature">✅ Social media platform integration</div>
                  <div class="feature">✅ Business intelligence and classification</div>
                  <div class="feature">✅ Professional proxy rotation and CAPTCHA handling</div>
              </div>
              
              <div>
                  <a href="/health">🔧 Health Check</a>
                  <a href="/api/leads/stats">📊 Statistics</a>
                  <a href="/api-docs">📚 API Documentation</a>
              </div>
              
              <div class="endpoints">
                  <h3>🔗 Key Endpoints:</h3>
                  <div class="endpoint">POST /api/leads/generate - Generate leads with enhanced parameters</div>
                  <div class="endpoint">GET /api/leads - View all generated leads</div>
                  <div class="endpoint">GET /api/leads/stats - Get comprehensive statistics</div>
                  <div class="endpoint">PUT /api/leads/:searchId/:contactIndex - Update lead status</div>
              </div>
          </div>
      </body>
      </html>
    `);
  } else {
    res.json({
      message: "Enhanced Lead Generation Backend Server v2.0",
      version: "2.0.0",
      status: "running",
      endpoints: {
        health: "/health",
        generateLeads: "/api/leads/generate",
        getLeads: "/api/leads",
        stats: "/api/leads/stats",
        docs: "/api-docs"
      }
    });
  }
});

// FIXED: API routes with consistent /api prefix
app.use('/auth', authRouter);
app.use('/api/drive', driveRouter); // FIXED: Added /api prefix for drive routes
app.use('/api/templates', templateRouter);
app.use('/api/leads', leadRouter);

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    requestId: req.id || 'unknown'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Database connection with enhanced options
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Database connected successfully!');
})
.catch((err) => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});

// Initialize services
async function initializeServices() {
  console.log('\n🔧 Testing external services...');
  
  // Test primary search API
  try {
    const searchApiWorking = await searchApiManager.testConnection();
    console.log('🔍 Google Custom Search API:', searchApiWorking ? '✅ Working' : '❌ Failed');
  } catch (error) {
    console.log('🔍 Google Custom Search API: ❌ Failed -', error.message);
  }

  // Test alternative search
  try {
    const alternativeSearchWorking = await alternativeSearchManager.testConnection();
    console.log('🌐 Alternative Search Engine:', alternativeSearchWorking ? '✅ Working' : '❌ Failed');
  } catch (error) {
    console.log('🌐 Alternative Search Engine: ❌ Failed -', error.message);
  }

  // Test proxy
  try {
    const proxyStats = await proxyManager.testProxy();
    console.log('🔄 Proxy Manager:', proxyStats.isProxyWorking ? '✅ Working' : '❌ Failed');
    if (proxyStats.isProxyWorking) {
      console.log(`   - Success Rate: ${proxyStats.successRate}%`);
      console.log(`   - IP Address: ${proxyStats.currentIp}`);
    }
  } catch (error) {
    console.log('🔄 Proxy Manager: ❌ Failed -', error.message);
  }

  // Initialize crawler
  try {
    const crawlerStats = crawlerManager.getStats();
    console.log('🕷️ Crawler: ✅ Ready');
    console.log(`   - Success Rate: ${crawlerStats.successRate}%`);
    console.log(`   - Total Requests: ${crawlerStats.totalRequests}`);
  } catch (error) {
    console.log('🕷️ Crawler: ❌ Failed -', error.message);
  }
}

const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  console.log('\n🚀 Starting Enhanced Lead Generation Backend Server v2.0...\n');
  
  await initializeServices();
  
  console.log('\n🌟 Enhanced Lead Generation Server successfully started!');
  console.log(`🌐 Access your server at: http://localhost:${PORT}`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Statistics: http://localhost:${PORT}/api/leads/stats`);
  console.log('\n🎯 Ready to handle professional lead generation requests!');
  
  console.log('\n📈 Enhanced Features Available:');
  console.log('   - Multi-engine search (Google + alternatives)');
  console.log('   - Advanced contact extraction with AI validation');
  console.log('   - Quality scoring and filtering (0-100 scale)');
  console.log('   - Social media platform integration');
  console.log('   - Business intelligence and classification');
  console.log('   - Professional proxy rotation and CAPTCHA handling');
});