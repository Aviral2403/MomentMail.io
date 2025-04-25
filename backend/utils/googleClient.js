const { google } = require('googleapis');

// Google OAuth2 client configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Create OAuth2 client
exports.oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'postmessage' // Redirect URI for OAuth2
);

// Define required scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly', // Access Google Drive
  'https://www.googleapis.com/auth/spreadsheets.readonly', // Access Google Sheets
  'https://www.googleapis.com/auth/gmail.send', // Send emails via Gmail
  'https://www.googleapis.com/auth/userinfo.email', // Access user email
  'https://www.googleapis.com/auth/calendar.events', // Add calendar scope for scheduling

];

// Generate OAuth2 URL
exports.getAuthUrl = () => {
  const authUrl = exports.oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: SCOPES, // Include all required scopes
    prompt: 'consent', // Force user to consent to scopes
  });

  console.log("Generated OAuth URL:", authUrl); // Debug log
  return authUrl;
};
