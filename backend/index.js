const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();

const { startEmailWorker } = require('./emailWorker');
startEmailWorker();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://momentmail-io.onrender.com']
}));

// Middleware
app.use(express.json());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Routes
const authRouter = require('./routes/auth');
const driveRouter = require('./routes/drive');
const templateRouter = require('./routes/templateRoutes');
const leadRouter = require('./routes/leadRoutes');

// Proxy test function
async function testProxyConnection() {
    console.log('\n🔍 Testing proxy connection...');
    
    try {
        const sessionId = Math.random().toString(36).substring(2, 15);
        const proxy = {
            host: process.env.PROXY_HOST || 'proxy.toolip.io',
            port: parseInt(process.env.PROXY_PORT || '31113'),
            auth: {
                username: (process.env.PROXY_USERNAME || 'tl-7a48066dd39718a7b23042cecec23a6ab573ddc828c81e7cdf8d57657e1be1cc-country-XX-session-') + sessionId,
                password: process.env.PROXY_PASSWORD || '8g6nubs3l2eb'
            }
        };

        console.log(`📡 Proxy: ${proxy.host}:${proxy.port}`);
        console.log(`👤 Username: ${proxy.auth.username}`);

        const response = await axios.get("http://httpbin.org/ip", {
            proxy,
            timeout: 10000
        });

        if (response.status === 200) {
            console.log(`✅ Proxy is working! External IP: ${response.data.origin}`);
            console.log(`🌍 Location check: ${response.data.origin !== 'YOUR_SERVER_IP' ? 'Proxy active' : 'Direct connection'}`);
            return true;
        } else {
            console.log(`⚠️ Proxy returned status code ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Proxy test failed: ${error.message}`);
        console.log(`💡 This might be okay if you're in development mode`);
        return false;
    }
}

// Test Gemini API connection
async function testGeminiAPI() {
    console.log('\n🤖 Testing Gemini API connection...');
    
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent('Hello, this is a test. Please respond with "API Working"');
        const response = result.response.text();
        
        console.log(`✅ Gemini API is working! Response: ${response.substring(0, 50)}...`);
        return true;
    } catch (error) {
        console.log(`❌ Gemini API test failed: ${error.message}`);
        return false;
    }
}

// System health check endpoint
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            proxy: 'unknown',
            gemini: 'unknown'
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

    // Test proxy (quick test)
    try {
        const proxyWorking = await Promise.race([
            testProxyConnection(),
            new Promise(resolve => setTimeout(() => resolve(false), 3000))
        ]);
        health.services.proxy = proxyWorking ? 'working' : 'failed';
    } catch (error) {
        health.services.proxy = 'failed';
    }

    // Test Gemini API
    try {
        const geminiWorking = await Promise.race([
            testGeminiAPI(),
            new Promise(resolve => setTimeout(() => resolve(false), 3000))
        ]);
        health.services.gemini = geminiWorking ? 'working' : 'failed';
    } catch (error) {
        health.services.gemini = 'failed';
    }

    res.json(health);
});

// Updated root endpoint to show HTML in browser and JSON for API requests
app.get('/', (req, res) => {
    // Check if the request accepts HTML (like a browser)
    if (req.accepts('html')) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MomentMail Backend Server</title>
                <style>
                    body {
                         font-family: Arial, sans-serif;
                         text-align: center;
                         padding: 50px;
                         background-color: #f5f5f5;
                    }
                    .container {
                        background: white;
                        border-radius: 10px;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #2c3e50;
                    }
                    .status {
                        color: #27ae60;
                        font-weight: bold;
                    }
                    .endpoint {
                        background: #f8f9fa;
                        padding: 10px;
                        margin: 5px 0;
                        border-radius: 5px;
                        font-family: monospace;
                    }
                    .health-check {
                        margin-top: 30px;
                        padding: 20px;
                        background: #e3f2fd;
                        border-radius: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 MomentMail Backend Server</h1>
                    <p>Your server has been successfully deployed and is running.</p>
                    <p class="status">Status: <span>Healthy</span></p>
                    
                    <div class="health-check">
                        <h3>🔍 System Health Check</h3>
                        <p>Visit <code>/health</code> to check all services status</p>
                        <a href="/health" target="_blank">Check Health Status</a>
                    </div>
                    
                    <h3>📡 Available API Endpoints:</h3>
                    <div class="endpoint">/auth - Authentication routes</div>
                    <div class="endpoint">/drive - Drive routes</div>
                    <div class="endpoint">/api/templates - Template routes</div>
                    <div class="endpoint">/api/leads - Lead generation routes</div>
                    <div class="endpoint">/health - System health check</div>
                    
                    <div style="margin-top: 30px; font-size: 0.9em; color: #666;">
                        <p>🕒 Server started: ${new Date().toLocaleString()}</p>
                        <p>🏗️ Environment: ${process.env.NODE_ENV || 'development'}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    } else {
        // For API requests, return JSON
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
    console.log('🚀 Starting MomentMail Backend Server...\n');
    
    // Connect to database first
    await connectDB();
    
    // Test external services
    console.log('\n🔧 Testing external services...');
    
    // Test proxy connection
    const proxyWorking = await testProxyConnection();
    
    // Test Gemini API
    const geminiWorking = await testGeminiAPI();
    
    console.log('\n📊 Service Status Summary:');
    console.log(`   Database: ✅ Connected`);
    console.log(`   Proxy: ${proxyWorking ? '✅ Working' : '⚠️  Failed (lead generation may be limited)'}`);
    console.log(`   Gemini API: ${geminiWorking ? '✅ Working' : '❌ Failed (lead processing unavailable)'}`);
    
    if (!proxyWorking) {
        console.log('\n⚠️  Proxy connection failed. Lead generation will be limited.');
        console.log('   Check your PROXY_HOST, PROXY_PORT, PROXY_USERNAME, and PROXY_PASSWORD environment variables.');
    }
    
    if (!geminiWorking) {
        console.log('\n❌ Gemini API connection failed. Lead processing will not work.');
        console.log('   Check your GOOGLE_API_KEY environment variable.');
    }
    
    // Define preferred port and fallback ports
    const preferredPort = process.env.PORT || 8080;
    const fallbackPorts = [3000, 5000, 8000, 9000];
    
    // Try the preferred port first
    tryPort(preferredPort, fallbackPorts);
};

// Function to try connecting to a specific port
function tryPort(port, remainingPorts = []) {
    const server = app.listen(port, () => {
        console.log(`\n🌟 Server successfully started on port ${port}`);
        console.log(`🌐 Access your server at:`);
        console.log(`   Local: http://localhost:${port}`);
        console.log(`   Health Check: http://localhost:${port}/health`);
        console.log(`\n🎯 Ready to handle requests!`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying another port...`);
            
            if (remainingPorts.length > 0) {
                // Try the next port in the list
                const nextPort = remainingPorts.shift();
                tryPort(nextPort, remainingPorts);
            } else {
                console.error('❌ All ports are busy. Please free up a port or specify a different one.');
                process.exit(1);
            }
        } else {
            console.error('❌ Error starting server:', err);
            process.exit(1);
        }
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});