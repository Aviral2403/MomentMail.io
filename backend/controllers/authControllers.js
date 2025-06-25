const axios = require('axios');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');
const User = require('../models/User');

// Google OAuth2 authentication
exports.googleAuth = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    console.error("Authorization code is required");
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens received:", tokens);

    // Decode the token to check scopes
    const decodedToken = jwt.decode(tokens.id_token || tokens.access_token);
    console.log("Decoded Token Scopes:", decodedToken.scope);

    // Set credentials and proceed with user info retrieval
    oauth2Client.setCredentials(tokens);

    // Get user info
    const userRes = await axios.get(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const { email, name, picture } = userRes.data;
    console.log("User info retrieved:", { email, name, picture });

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        image: picture,
      });
      console.log("New user created:", user);
    }

    // Generate JWT
    const token = jwt.sign(
      { _id: user._id, email, tokens }, // Include tokens in the JWT payload
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_TIMEOUT }
    );

    console.log("JWT token generated:", token);

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user,
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({
      message: "Authentication failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};



exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    let decoded;
    try {
      // Verify token (this will throw if expired, but we'll catch it)
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Check if token needs refresh (expired or expires soon)
    const now = Math.floor(Date.now() / 1000);
    const tokenExp = decoded.exp;
    const timeUntilExpiry = tokenExp - now;
    
    // Refresh if expired or expires in less than 5 minutes
    if (timeUntilExpiry <= 300) {
      try {
        // Set credentials for OAuth2 client
        oauth2Client.setCredentials({
          access_token: decoded.tokens?.access_token,
          refresh_token: decoded.tokens?.refresh_token,
        });

        // Refresh the access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Create new JWT with refreshed Google tokens
        const newTokenPayload = {
          ...decoded,
          tokens: {
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || decoded.tokens.refresh_token,
            ...(credentials.expiry_date && { expiry_date: credentials.expiry_date })
          },
          iat: now,
          exp: now + (parseInt(process.env.JWT_TIMEOUT) || 3600)
        };

        const newToken = jwt.sign(newTokenPayload, process.env.JWT_SECRET);
        
        return res.status(200).json({ 
          token: newToken,
          refreshed: true 
        });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return res.status(401).json({ 
          message: 'Token refresh failed', 
          error: refreshError.message,
          requiresReauth: true 
        });
      }
    }

    // Token is still valid, return as is
    return res.status(200).json({ 
      token,
      refreshed: false 
    });

  } catch (err) {
    console.error('Token refresh error:', err);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: err.message 
    });
  }
};