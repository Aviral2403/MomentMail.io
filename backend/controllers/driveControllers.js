const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');
const cloudinary = require('cloudinary').v2;


// Connect Google Drive
exports.connectGoogleDrive = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info to store the email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Initialize Drive API and test connection
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });

    // Store the complete tokens object AND the user's email
    const driveToken = jwt.sign(
      {
        tokens,
        email: userInfo.data.email, // Store the user's email
      },
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


// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// List spreadsheets
exports.listSpreadsheets = async (req, res) => {
    try {
        // Get access token from authorization header
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Set up drive client with the tokens object (which includes refresh_token)
        oauth2Client.setCredentials(decoded.tokens);

        // Refresh the token if needed
        try {
            const tokens = await oauth2Client.getAccessToken();
            oauth2Client.setCredentials(tokens.res.data);
        } catch (refreshErr) {
            console.log("Token refresh not needed or failed:", refreshErr);
            // Continue anyway as the token might still be valid
        }

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Query for spreadsheets
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

// Get column names from a specific spreadsheet
exports.getSpreadsheetColumns = async (req, res) => {
    try {
        const { spreadsheetId } = req.params;

        // Get access token from authorization header
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Set up sheets client with the tokens
        oauth2Client.setCredentials(decoded.tokens);

        // Try to refresh the token
        try {
            const tokens = await oauth2Client.getAccessToken();
            oauth2Client.setCredentials(tokens.res.data);
        } catch (refreshErr) {
            console.log("Token refresh not needed or failed:", refreshErr);
        }

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        // Get the first row which typically contains column headers
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1', // First row, columns A through Z
        });
        const columns = response.data.values && response.data.values[0] ? response.data.values[0] : [];
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

// Get data from a specific column in a spreadsheet
exports.getColumnData = async (req, res) => {
    try {
        const { spreadsheetId, column } = req.params;

        // Get access token from authorization header
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token required" });
        }

        const token = tokenHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Set up sheets client with the tokens
        oauth2Client.setCredentials(decoded.tokens);

        // Try to refresh the token
        try {
            const tokens = await oauth2Client.getAccessToken();
            oauth2Client.setCredentials(tokens.res.data);
        } catch (refreshErr) {
            console.log("Token refresh not needed or failed:", refreshErr);
        }

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        // First, get the first row to find the column index
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1',
        });
        const headers = headerResponse.data.values && headerResponse.data.values[0] ? headerResponse.data.values[0] : [];

        const columnIndex = headers.findIndex(header => header === column);

        if (columnIndex === -1) {
            return res.status(404).json({ message: "Column not found" });
        }

        // Get column letter based on index (A=0, B=1, etc.)
        const columnLetter = String.fromCharCode(65 + columnIndex);

        // Get all data from that column (excluding the header)
        const dataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${columnLetter}2:${columnLetter}1000`, // From row 2 to 1000
        });

        // Flatten the values array since each cell comes as an array with a single value
        const values = dataResponse.data.values ? dataResponse.data.values.map(row => row[0]).filter(Boolean) : [];

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

// Send bulk emails
exports.sendBulkEmails = async (req, res) => {
    const { templateContent, recipients, templateName, isLocalFile } = req.body;
    
    console.log("Received request to send emails:", { 
      templateName, 
      recipientCount: recipients.length, 
      isLocalFile 
    });
    
    try {
      // Validate required fields
      if (!templateContent || !recipients || !templateName) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      if (!Array.isArray(recipients)) {
        return res.status(400).json({ message: "Recipients must be an array" });
      }
  
      // Get token from authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authorization token required" });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Configure OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      if (isLocalFile) {
        // For local files, just use the provided token directly
        oauth2Client.setCredentials({ access_token: token });
      } else {
        // For Drive files, we need to verify the drive token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        oauth2Client.setCredentials(decoded.tokens);
      }
      
      // Get sender email
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const senderEmail = userInfo.data.email;
      
      console.log("Sender email retrieved:", senderEmail);
      
      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Track successful and failed emails
      const results = {
        success: [],
        failed: []
      };
      
      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          // Validate recipient email
          if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
            console.error(`Invalid recipient email: ${recipient}`);
            results.failed.push(recipient);
            continue;
          }
  
          const emailLines = [];
          emailLines.push(`From: ${senderEmail}`);
          emailLines.push(`To: ${recipient}`);
          emailLines.push('Content-Type: text/html; charset=utf-8');
          emailLines.push('MIME-Version: 1.0');
          emailLines.push(`Subject: ${templateName}`);
          emailLines.push('');
          emailLines.push(templateContent);
          
          const email = emailLines.join('\n');
          const base64Email = Buffer.from(email).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          
          console.log(`Sending email to ${recipient}...`);
          
          const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: base64Email,
            },
          });
          
          console.log(`Email sent to ${recipient}:`, response.data);
          results.success.push(recipient);
        } catch (emailErr) {
          console.error(`Error sending email to ${recipient}:`, emailErr);
          results.failed.push({
            email: recipient,
            error: emailErr.message
          });
        }
        
        // Add a delay to avoid hitting rate limits (500ms between emails)
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Prepare response
      const response = {
        message: 'Email sending complete',
        results: {
          totalSent: results.success.length,
          totalFailed: results.failed.length,
          successRate: `${Math.round((results.success.length / recipients.length) * 100)}%`,
          failedRecipients: results.failed
        }
      };
  
      // Log final results
      console.log('Email sending completed:', response);
      
      res.status(200).json(response);
    } catch (err) {
      console.error('Error sending emails:', err);
      
      // Handle specific error cases
      let statusCode = 500;
      let errorMessage = "Failed to send emails";
      
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorMessage = "Invalid or expired token";
      } else if (err.code === 403) {
        statusCode = 403;
        errorMessage = "Insufficient permissions to send emails";
      }
      
      res.status(statusCode).json({
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  };
