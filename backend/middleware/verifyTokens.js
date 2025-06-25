const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');

const verifyTokens = async (req, res, next) => {
  try {
    const tokenHeader = req.headers.authorization;
    
    if (!tokenHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authorization token required',
        requiresReauth: true 
      });
    }

    const token = tokenHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          expired: true,
          requiresRefresh: true 
        });
      }
      return res.status(401).json({ 
        message: 'Invalid token',
        requiresReauth: true 
      });
    }

    // Check if Google tokens are valid for drive operations
    if (req.path.startsWith('/drive') && decoded.tokens) {
      try {
        oauth2Client.setCredentials({
          access_token: decoded.tokens.access_token,
          refresh_token: decoded.tokens.refresh_token,
        });
        
        // Test the token by making a simple API call
        const tokenInfo = await oauth2Client.getTokenInfo(decoded.tokens.access_token);
        
        // If we get here, the token is valid
        req.user = decoded;
        req.oauth2Client = oauth2Client;
        next();
      } catch (googleError) {
        return res.status(401).json({ 
          message: 'Google token expired',
          expired: true,
          requiresRefresh: true 
        });
      }
    } else {
      req.user = decoded;
      next();
    }

  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(500).json({ 
      message: 'Token verification failed', 
      error: err.message 
    });
  }
};

module.exports = verifyTokens;