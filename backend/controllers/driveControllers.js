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

// Helper function to personalize email content with recipient data
const personalizeContent = (content, recipientEmail) => {
  if (!content || !recipientEmail) return content;
  
  // Extract the username part before @
  const username = recipientEmail.split('@')[0] || "User";
  
  // Replace common placeholders with consistent capitalization
  return content
    .replace(/\[Customer Name\]/gi, username)
    .replace(/\[customer\.name\]/gi, username)
    .replace(/\[customer\.email\]/gi, recipientEmail)
    .replace(/\[User\]/gi, username)
    .replace(/\[user\]/gi, username)
    .replace(/\[First Name\]/gi, username)
    .replace(/\[firstname\]/gi, username)
    .replace(/\[username\]/gi, username)
    .replace(/\[email\]/gi, recipientEmail);
};

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
  
      console.log("Token decoded successfully:", decoded);
  
      // Handle scheduled emails
      if (isScheduled) {
        if (!scheduledAt) {
          throw new Error("Scheduled time is required");
        }
    
        const scheduledTime = new Date(scheduledAt);
        if (scheduledTime <= new Date()) {
          throw new Error("Scheduled time must be in the future");
        }
    
        // Check for existing scheduled email
        const existingScheduledEmail = await ScheduledEmail.findOne({
          userId: decoded.email,
          templateName: templateName,
          scheduledAt: scheduledTime
        });
    
        if (existingScheduledEmail) {
          console.log("Email already scheduled:", existingScheduledEmail._id);
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
        console.log('Email scheduled successfully:', scheduledEmail._id);
    
        return res.status(200).json({
          message: 'Emails scheduled successfully',
          scheduledEmailId: scheduledEmail._id,
          scheduledAt: scheduledTime,
          isScheduled: true
        });
      }
    
      const requestId = req.headers['x-request-id'] || 
                       `${decoded.email}-${templateName}-${Date.now()}`;
    
      // Check if this exact request was recently processed
      const recentRequests = await EmailHistory.find({
        userId: decoded.email,
        templateName: templateName,
        sentAt: {
          $gte: new Date(Date.now() - 10000) // Last 10 seconds
        }
      }).sort({ sentAt: -1 }).limit(1);
    
      if (recentRequests.length > 0) {
        const recent = recentRequests[0];
        
        if (recent.recipients.length === recipients.length) {
          console.log("Potential duplicate request detected, returning previous response");
          return res.status(200).json({
            message: 'Emails already processed',
            results: {
              totalSent: recent.successCount,
              totalFailed: recent.failureCount,
              failedRecipients: recent.failureCount > 0 ? 
                recipients.slice(0, recent.failureCount).map(email => ({ email, error: "Failed to send" })) : []
            }
          });
        }
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
    
          // Personalize the content for each recipient
          const personalizedContent = personalizeContent(templateContent, recipient);
          console.log(`Personalized content for ${recipient}:`, personalizedContent);
    
          const emailContent = [
            `From: ${decoded.email}`,
            `To: ${recipient}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${templateName}`,
            '',
            personalizedContent
          ].join('\n');
    
          const base64Email = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
          console.log(`Sending email to ${recipient} with content:`, emailContent);
          
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: base64Email },
          });
          
          console.log(`Email sent successfully to ${recipient}`);
          results.success.push(recipient);
        } catch (err) {
          console.error(`Error sending to ${recipient}:`, err.message);
          
          const safeEmail = recipient.replace(/\./g, '_DOT_');
          results.failed.push({ email: recipient, safeKey: safeEmail, error: err.message });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Create a SINGLE history record for this batch
      const sentTime = new Date();
      const emailHistory = new EmailHistory({
        userId: decoded.email,
        templateContent, // Store original template content
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
      console.log(`Email history created: ${results.success.length} successful, ${results.failed.length} failed`);
    
      return res.status(200).json({
        message: 'Emails processed',
        results: {
          totalSent: results.success.length,
          totalFailed: results.failed.length,
          failedRecipients: results.failed.map(f => ({ email: f.email, error: f.error }))
        }
      });
    } catch (err) {
      console.error('Email processing error:', err);
      
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


// In your driveControllers.js
exports.checkEmailStatus = async (req, res) => {
    try {
      const { recipients, emailSubject } = req.body;
      const tokenHeader = req.headers.authorization;
      
      if (!tokenHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authorization token required" });
      }
      
      const token = tokenHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Query your EmailHistory collection to check status
      const emailHistory = await EmailHistory.findOne({
        userId: decoded.email,
        templateName: emailSubject,
        recipients: { $all: recipients }
      }).sort({ sentAt: -1 });
  
      if (emailHistory) {
        return res.status(200).json({
          status: emailHistory.status,
          totalSent: emailHistory.successCount,
          failedRecipients: emailHistory.failureCount > 0 ? 
            recipients.slice(0, emailHistory.failureCount).map(email => ({ email, error: "Failed to send" })) : []
        });
      }
      
      // Check if it's still scheduled
      const scheduledEmail = await ScheduledEmail.findOne({
        userId: decoded.email,
        templateName: emailSubject,
        recipients: { $all: recipients },
        status: 'scheduled'
      });
      
      if (scheduledEmail) {
        return res.status(200).json({
          status: 'scheduled',
          scheduledAt: scheduledEmail.scheduledAt
        });
      }
      
      // If we get here, emails are likely being processed
      return res.status(200).json({
        status: 'sending'
      });
    } catch (err) {
      console.error('Error checking email status:', err);
      
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      res.status(500).json({
        message: "Failed to check email status",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  };