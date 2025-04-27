const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

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


// Updated root endpoint to show HTML in browser and JSON for API requests
app.get('/', (req, res) => {
    // Check if the request accepts HTML (like a browser)
    if (req.accepts('html')) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Backend Server</title>
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
                        max-width: 600px;
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
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 Backend Server is Running</h1>
                    <p>Your server has been successfully deployed.</p>
                    <p class="status">Status: <span>Healthy</span></p>
                    <p>API endpoints are available at:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li><code>/auth</code> - Authentication routes</li>
                        <li><code>/drive</code> - Drive routes</li>
                    </ul>
                </div>
            </body>
            </html>
        `);
    } else {
        // For API requests, return JSON
        res.json({
             status: "Server is running",
            endpoints: {
                auth: "/auth",
                drive: "/drive"
            }
        });
    }
});

app.use('/auth', authRouter);
app.use('/drive', driveRouter);


// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Database connected successfully!");
    } catch (err) {
        console.error("Error connecting to database:", err);
        process.exit(1);
    }
};

// Function to start server with port fallback
const startServer = async () => {
    await connectDB();
    
    // Define preferred port and fallback ports
    const preferredPort = process.env.PORT || 8080;
    const fallbackPorts = [3000, 5000, 8000, 9000];
    
    // Try the preferred port first
    tryPort(preferredPort, fallbackPorts);
};

// Function to try connecting to a specific port
function tryPort(port, remainingPorts = []) {
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying another port...`);
            
            if (remainingPorts.length > 0) {
                // Try the next port in the list
                const nextPort = remainingPorts.shift();
                tryPort(nextPort, remainingPorts);
            } else {
                console.error('All ports are busy. Please free up a port or specify a different one.');
                process.exit(1);
            }
        } else {
            console.error('Error starting server:', err);
            process.exit(1);
        }
    });
}

// Start the server
startServer();