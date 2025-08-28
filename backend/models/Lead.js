const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  emails: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  phone: {
    type: String,
    trim: true
  },
  phones: [{
    type: String,
    trim: true
  }],
  website: {
    type: String,
    trim: true
  },
  socialLinks: [{
    type: String,
    trim: true
  }],
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'rejected'],
    default: 'new'
  },
  lastContacted: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
});

const leadSearchSchema = new mongoose.Schema({
  searchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  platforms: [{
    type: String,
    required: true
  }],
  emailDomain: {
    type: String,
    default: ''
  },
  maxResults: {
    type: Number,
    default: 20
  },
  contacts: [contactInfoSchema],
  stats: {
    totalSearches: {
      type: Number,
      default: 0
    },
    totalUrlsFound: {
      type: Number,
      default: 0
    },
    totalUrlsCrawled: {
      type: Number,
      default: 0
    },
    successfulCrawls: {
      type: Number,
      default: 0
    },
    leadsGenerated: {
      type: Number,
      default: 0
    }
  },
  searchApiUsage: {
    dailyQueries: {
      type: Number,
      default: 0
    },
    maxDailyQueries: {
      type: Number,
      default: 100
    }
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

// Indexes for better query performance
leadSearchSchema.index({ keyword: 1 });
leadSearchSchema.index({ location: 1 });
leadSearchSchema.index({ createdAt: -1 });
leadSearchSchema.index({ 'contacts.status': 1 });
leadSearchSchema.index({ searchId: 1 });

// Update the updatedAt field before saving
leadSearchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LeadSearch', leadSearchSchema);