const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  searchQuery: {
    keyword: { type: String, required: true },
    platforms: [{ type: String }],
    location: { type: String },
    emailDomain: { type: String },
    date: { type: Date, default: Date.now }
  },
  leads: [{
    name: { type: String },
    businessName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    website: { type: String },
    socialLinks: [{ type: String }],
    source: { type: String, required: true },
    notes: { type: String },
    tags: [{ type: String }],
    dateAdded: { type: Date, default: Date.now }
  }],
  proxyUsed: {
    host: { type: String },
    port: { type: Number },
    username: { type: String }
  },
  stats: {
    totalFound: { type: Number, default: 0 },
    uniqueFound: { type: Number, default: 0 },
    processingTime: { type: Number, default: 0 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

leadSchema.virtual('leadCount').get(function() {
  return this.leads.length;
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;