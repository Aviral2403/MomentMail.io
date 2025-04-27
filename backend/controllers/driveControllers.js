const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');
const cloudinary = require('cloudinary').v2;
const ScheduledEmail = require('../models/ScheduledEmail');
const EmailHistory = require('../models/EmailHistory');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



// Connect Google Drive
exports.connectGoogleDrive = async (req, res) => {
    const code = req.query.code;
  
    if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
    }
  
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
    
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
    
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        await drive.files.list({ pageSize: 1, fields: 'files(id, name)' });
    
        const driveToken = jwt.sign(
            { tokens, email: userInfo.data.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    
        res.status(200).json({
            message: 'Google Drive connected successfully',
            token: driveToken,
        });
    } catch (err) {
        console.error('Google Drive Connection Error:', err);
        res.status(500).json({
            message: "Failed to connect to Google Drive",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// List spreadsheets
exports.listSpreadsheets = async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        oauth2Client.setCredentials(decoded.tokens);
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: 'files(id, name, modifiedTime)',
            orderBy: 'modifiedTime desc',
        });

        res.status(200).json({
            message: 'Spreadsheets retrieved successfully',
            files: response.data.files,
        });
    } catch (err) {
        console.error('Error listing spreadsheets:', err);
        
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        res.status(500).json({
            message: "Failed to list spreadsheets",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Get spreadsheet columns
exports.getSpreadsheetColumns = async (req, res) => {
    try {
        const { spreadsheetId } = req.params;
        const tokenHeader = req.headers.authorization;
        
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        oauth2Client.setCredentials(decoded.tokens);
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1',
        });

        const columns = response.data.values?.[0] || [];
        res.status(200).json({
            message: 'Spreadsheet columns retrieved successfully',
            columns,
        });
    } catch (err) {
        console.error('Error getting spreadsheet columns:', err);

        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        res.status(500).json({
            message: "Failed to get spreadsheet columns",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Get column data
exports.getColumnData = async (req, res) => {
    try {
        const { spreadsheetId, column } = req.params;
        const tokenHeader = req.headers.authorization;
        
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        oauth2Client.setCredentials(decoded.tokens);
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1',
        });
        
        const headers = headerResponse.data.values?.[0] || [];
        const columnIndex = headers.indexOf(column);

        if (columnIndex === -1) {
            return res.status(404).json({ message: "Column not found" });
        }

        const columnLetter = String.fromCharCode(65 + columnIndex);
        const dataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${columnLetter}2:${columnLetter}1000`,
        });

        const values = dataResponse.data.values?.map(row => row[0]).filter(Boolean) || [];
        res.status(200).json({
            message: 'Column data retrieved successfully',
            values,
        });
    } catch (err) {
        console.error('Error getting column data:', err);

        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        res.status(500).json({
            message: "Failed to get column data",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Unified email sending endpoint
exports.sendBulkEmails = async (req, res) => {
    const { templateContent, recipients, templateName, isScheduled, scheduledAt } = req.body;
    
    console.log("Email request received:", { 
        action: isScheduled ? "Scheduling" : "Sending",
        templateName, 
        recipientCount: recipients.length,
        scheduledAt: isScheduled ? scheduledAt : 'immediate'
    });

    try {
        // Validation
        if (!templateContent || !recipients || !templateName) {
            throw new Error("Missing required fields: templateContent, recipients, or templateName");
        }

        if (!Array.isArray(recipients)) {
            throw new Error("Recipients must be an array");
        }

        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error("Authorization token required");
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Handle scheduled emails
        if (isScheduled) {
            if (!scheduledAt) {
                throw new Error("Scheduled time is required");
            }

            const scheduledTime = new Date(scheduledAt);
            if (scheduledTime <= new Date()) {
                throw new Error("Scheduled time must be in the future");
            }

            // Check for existing scheduled email with same parameters to prevent duplicates
            const existingScheduledEmail = await ScheduledEmail.findOne({
                userId: decoded.email,
                templateName: templateName,
                scheduledAt: scheduledTime
            });

            if (existingScheduledEmail) {
                return res.status(200).json({
                    message: 'Email already scheduled',
                    scheduledEmailId: existingScheduledEmail._id,
                    scheduledAt: scheduledTime,
                    isScheduled: true
                });
            }

            const scheduledEmail = new ScheduledEmail({
                userId: decoded.email,
                templateContent,
                recipients,
                templateName,
                scheduledAt: scheduledTime,
                status: 'scheduled',
                createdAt: new Date(),
                userToken: token
            });

            await scheduledEmail.save();
            console.log('Email scheduled:', scheduledEmail._id);

            return res.status(200).json({
                message: 'Emails scheduled successfully',
                scheduledEmailId: scheduledEmail._id,
                scheduledAt: scheduledTime,
                isScheduled: true
            });
        }

        // Handle immediate sending
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: decoded.tokens.access_token,
            refresh_token: decoded.tokens.refresh_token
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const results = { success: [], failed: [] };
        
        for (const recipient of recipients) {
            try {
                if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
                    throw new Error('Invalid email format');
                }

                const emailContent = [
                    `From: ${decoded.email}`,
                    `To: ${recipient}`,
                    'Content-Type: text/html; charset=utf-8',
                    'MIME-Version: 1.0',
                    `Subject: ${templateName}`,
                    '',
                    templateContent
                ].join('\n');

                const base64Email = Buffer.from(emailContent)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                
                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: base64Email },
                });
                
                results.success.push(recipient);
            } catch (err) {
                console.error(`Error sending to ${recipient}:`, err.message);
                results.failed.push({ email: recipient, error: err.message });
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check for existing email history with same parameters to prevent duplicates
        const sentTime = new Date();
        const existingEmailHistory = await EmailHistory.findOne({
            userId: decoded.email,
            templateName: templateName,
            sentAt: {
                $gte: new Date(sentTime.getTime() - 5000), // Within 5 seconds
                $lte: new Date(sentTime.getTime() + 5000)
            }
        });

        if (existingEmailHistory) {
            return res.status(200).json({
                message: 'Emails already sent',
                results: {
                    totalSent: existingEmailHistory.successCount,
                    totalFailed: existingEmailHistory.failureCount,
                }
            });
        }
        
        // Save history
        const emailHistory = new EmailHistory({
            userId: decoded.email,
            templateContent,
            recipients,
            templateName,
            sentAt: sentTime,
            status: results.failed.length > 0 ? 
                (results.success.length > 0 ? 'partially_failed' : 'failed') : 'sent',
            successCount: results.success.length,
            failureCount: results.failed.length,
            failureReasons: results.failed.map(f => f.error),
            isScheduled: false
        });

        await emailHistory.save();

        return res.status(200).json({
            message: 'Emails sent successfully',
            results: {
                totalSent: results.success.length,
                totalFailed: results.failed.length,
                failedRecipients: results.failed
            }
        });
    } catch (err) {
        console.error('Email processing error:', err);
        
        // Handle MongoDB duplicate key error
        if (err.code === 11000) {
            return res.status(409).json({
                message: "This email operation was already processed",
                error: "Duplicate record detected"
            });
        }
        
        const statusCode = err.name === 'JsonWebTokenError' ? 401 : 
                         err.code === 403 ? 403 : 400;
        
        return res.status(statusCode).json({
            message: err.message || "Email processing failed",
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
    }
};



// Get scheduled emails
exports.getScheduledEmails = async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }
        
        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const scheduledEmails = await ScheduledEmail.find({
            userId: decoded.email
        }).sort({ scheduledAt: -1 });

        res.status(200).json({
            message: 'Scheduled emails retrieved successfully',
            scheduledEmails
        });
    } catch (err) {
        console.error('Error getting scheduled emails:', err);
        
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        
        res.status(500).json({
            message: "Failed to get scheduled emails",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Get email history
exports.getEmailHistory = async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }
        
        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const emailHistory = await EmailHistory.find({
            userId: decoded.email
        }).sort({ sentAt: -1 });

        res.status(200).json({
            message: 'Email history retrieved successfully',
            emailHistory
        });
    } catch (err) {
        console.error('Error getting email history:', err);
        
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        
        res.status(500).json({
            message: "Failed to get email history",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Cancel scheduled email
exports.cancelScheduledEmail = async (req, res) => {
    try {
        const { scheduledEmailId } = req.params;
        const tokenHeader = req.headers.authorization;
        
        if (!tokenHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }
        
        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const scheduledEmail = await ScheduledEmail.findOneAndUpdate(
            {
                _id: scheduledEmailId,
                userId: decoded.email,
                status: 'scheduled'
            },
            {
                status: 'cancelled',
                cancelledAt: new Date()
            },
            { new: true }
        );

        if (!scheduledEmail) {
            return res.status(404).json({ message: "Scheduled email not found or already processed" });
        }

        res.status(200).json({
            message: 'Scheduled email cancelled successfully',
            scheduledEmail
        });
    } catch (err) {
        console.error('Error cancelling scheduled email:', err);
        
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        
        res.status(500).json({
            message: "Failed to cancel scheduled email",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};
