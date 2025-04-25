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