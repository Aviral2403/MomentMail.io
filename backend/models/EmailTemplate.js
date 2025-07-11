const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const EmailTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  templateId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: Object,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
EmailTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get templates by user
EmailTemplateSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

// Static method to get template by ID and user
EmailTemplateSchema.statics.findByTemplateIdAndUser = function(templateId, userId) {
  return this.findOne({ templateId, userId });
};

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);