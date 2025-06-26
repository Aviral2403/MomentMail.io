const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');

const verifyTokens = async (req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'content-type': req.headers['content-type']
    });
  
    // Skip token verification for specific endpoints
    const skipTokenPaths = [
      '/auth/google',
      '/drive/connect-drive',
      '/auth/refresh-token'
    ];
  
    if (skipTokenPaths.some(path => req.path === path || req.path.startsWith(path + '/') || req.path.startsWith(path + '?'))) {
      console.log('Skipping token verification for whitelisted path');
      return next();
    }

  try {
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader?.startsWith('Bearer ')) {
      console.log('Authorization token required but missing');
      return res.status(401).json({
        message: 'Authorization token required',
        requiresReauth: true
      });
    }

    const token = tokenHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified successfully:', {
        email: decoded.email,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.log('Token expired at:', new Date(err.expiredAt).toISOString());
        return res.status(401).json({
          message: 'Token expired',
          expired: true,
          requiresRefresh: true
        });
      }
      console.log('Invalid token format:', err.message);
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
        
        const tokenInfo = await oauth2Client.getTokenInfo(decoded.tokens.access_token);
        console.log('Google token is valid:', {
          email: tokenInfo.email,
          expires_in: tokenInfo.expires_in
        });

        req.user = decoded;
        req.oauth2Client = oauth2Client;
        next();
      } catch (googleError) {
        console.log('Google token expired or invalid:', googleError.message);
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
    console.error('Token verification error:', {
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({
      message: 'Token verification failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

module.exports = verifyTokens;