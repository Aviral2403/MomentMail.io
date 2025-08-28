const dotenv = require('dotenv');
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cors = require('cors');

dotenv.config();

const app = express();

// Import managers
const searchApiManager = require('./utils/searchApiManager');
const crawlerManager = require('./utils/crawlerManager');

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

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      searchApi: 'unknown',
      crawler: 'unknown'
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

  // Test search API
  try {
    const apiWorking = await searchApiManager.testConnection();
    health.services.searchApi = apiWorking ? 'working' : 'failed';
  } catch (error) {
    health.services.searchApi = 'failed';
  }

  // Test crawler
  try {
    const crawlerStats = crawlerManager.getStats();
    health.services.crawler = crawlerStats.active ? 'ready' : 'inactive';
    health.crawlerStats = crawlerStats;
  } catch (error) {
    health.services.crawler = 'error';
  }

  res.json(health);
});

app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Lead Generation Backend</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 800px; margin: 0 auto; }
              h1 { color: #2c3e50; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>🚀 Lead Generation Backend Server</h1>
              <p>Your server is running successfully with Google Search API integration</p>
              <p>Visit <a href="/health">/health</a> to check services status</p>
          </div>
      </body>
      </html>
    `);
  } else {
    res.json({
      status: "Server is running",
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: "/auth",
        drive: "/drive",
        templates: "/api/templates",
        leads: "/api/leads",
        health: "/health"
      }
    });
  }
});

app.use('/auth', authRouter);
app.use('/drive', driveRouter);
app.use('/api/templates', templateRouter);
app.use('/api/leads', leadRouter);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Database connected successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error connecting to database:", err);
    process.exit(1);
  }
};

// Enhanced startup process
const startServer = async () => {
  console.log('🚀 Starting Lead Generation Backend Server...\n');
  
  await connectDB();
  
  console.log('\n🔧 Testing external services...');
  
  // Test search API
  const apiWorking = await searchApiManager.testConnection();
  console.log(`🔍 Search API: ${apiWorking ? '✅ Working' : '❌ Failed'}`);
  
  // Test crawler
  try {
    const crawlerStats = crawlerManager.getStats();
    console.log('🕷️  Crawler: ✅ Ready');
  } catch (error) {
    console.log('🕷️  Crawler: ❌ Failed -', error.message);
  }
  
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`\n🌟 Server successfully started on port ${PORT}`);
    console.log(`🌐 Access your server at: http://localhost:${PORT}`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
    console.log(`\n🎯 Ready to handle lead generation requests!`);
  }).on('error', (err) => {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});