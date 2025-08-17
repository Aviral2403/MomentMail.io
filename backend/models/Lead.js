const mongoose = require('mongoose');
const { Schema } = mongoose;

// Individual lead schema
const individualLeadSchema = new Schema({
  name: { 
    type: String, 
    default: 'N/A',
    trim: true 
  },
  businessName: { 
    type: String, 
    default: 'N/A',
    trim: true 
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return v === 'N/A' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  phone: { 
    type: String, 
    default: 'N/A',
    trim: true 
  },
  website: { 
    type: String, 
    default: 'N/A',
    trim: true 
  },
  socialMedia: {
    facebook: { type: String, default: 'N/A', trim: true },
    linkedin: { type: String, default: 'N/A', trim: true },
    instagram: { type: String, default: 'N/A', trim: true },
    twitter: { type: String, default: 'N/A', trim: true }
  },
  location: { 
    type: String, 
    required: true,
    trim: true 
  },
  service: { 
    type: String, 
    required: true,
    trim: true 
  },
  source: { 
    type: String, 
    enum: ['google', 'facebook', 'instagram', 'linkedin', 'fiverr', 'upwork', 'google_maps', 'job_boards', 'reddit'], 
    required: true 
  },
  sourceQuery: { 
    type: String,
    trim: true 
  },
  extractionStrategy: [{ 
    type: String 
  }],
  notes: { 
    type: String, 
    default: '',
    trim: true 
  },
  originalData: Schema.Types.Mixed,
  quality: {
    hasEmail: { type: Boolean, default: false },
    hasPhone: { type: Boolean, default: false },
    hasWebsite: { type: Boolean, default: false },
    hasSocialMedia: { type: Boolean, default: false },
    score: { type: Number, default: 0, min: 0, max: 100 }
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  lastContacted: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

// Tag schema
const tagSchema = new Schema({
  leadId: { 
    type: Schema.Types.ObjectId, 
    required: true 
  },
  tag: { 
    type: String, 
    enum: ['contacted', 'converted', 'unresponsive', 'interested', 'not_interested', 'follow_up', 'qualified', 'unqualified'], 
    required: true 
  },
  notes: { 
    type: String, 
    default: '',
    trim: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  addedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { 
  timestamps: true 
});

// Main lead generation record schema
const leadSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  searchQuery: {
    keyword: { 
      type: String, 
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200
    },
    sources: [{ 
      type: String, 
      enum: ['google', 'facebook', 'instagram', 'linkedin', 'fiverr', 'upwork', 'google_maps', 'job_boards', 'reddit'], 
      required: true 
    }],
    location: { 
      type: String, 
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200
    },
    emailDomain: { 
      type: String, 
      default: '',
      trim: true 
    }
  },
  leads: [individualLeadSchema],
  tags: [tagSchema],
  metadata: {
    totalSources: { type: Number, default: 0 },
    successfulSources: { type: Number, default: 0 },
    failedSources: { type: Number, default: 0 },
    processingTime: { type: Number, default: 0 }, // in milliseconds
    strategies: [{ 
      source: String, 
      strategies: [String] 
    }],
    errors: [{
      source: String,
      error: String,
      strategies: [String]
    }],
    qualityStats: {
      totalLeads: { type: Number, default: 0 },
      leadsWithEmail: { type: Number, default: 0 },
      leadsWithPhone: { type: Number, default: 0 },
      leadsWithWebsite: { type: Number, default: 0 },
      leadsWithSocialMedia: { type: Number, default: 0 },
      averageQualityScore: { type: Number, default: 0 }
    },
    searchEngineInfo: {
      googleBlocked: { type: Boolean, default: false },
      proxyIssues: { type: Boolean, default: false },
      rateLimited: { type: Boolean, default: false }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'completed'
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  },
  notes: { 
    type: String, 
    default: '',
    trim: true 
  }
}, { 
  timestamps: true 
});

// Indexes for better performance
leadSchema.index({ userId: 1, createdAt: -1 });
leadSchema.index({ 'searchQuery.keyword': 'text', 'searchQuery.location': 'text' });
leadSchema.index({ 'leads.email': 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ isArchived: 1 });
leadSchema.index({ 'metadata.processingTime': 1 });

// Compound index for efficient queries
leadSchema.index({ 
  userId: 1, 
  'searchQuery.keyword': 1, 
  'searchQuery.location': 1,
  createdAt: -1 
});

// Virtual for lead count
leadSchema.virtual('leadCount').get(function() {
  return this.leads ? this.leads.length : 0;
});

// Virtual for processing time in human readable format
leadSchema.virtual('processingTimeFormatted').get(function() {
  if (!this.metadata?.processingTime) return 'Unknown';
  const seconds = Math.round(this.metadata.processingTime / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
});

// Pre-save middleware to calculate quality metrics
leadSchema.pre('save', function(next) {
  if (this.isModified('leads')) {
    console.log('Calculating quality metrics for lead record...');
    
    const qualityStats = {
      totalLeads: this.leads.length,
      leadsWithEmail: 0,
      leadsWithPhone: 0,
      leadsWithWebsite: 0,
      leadsWithSocialMedia: 0,
      averageQualityScore: 0
    };
    
    let totalQualityScore = 0;
    
    // Calculate individual lead quality and aggregate stats
    this.leads.forEach(lead => {
      // Update lead quality
      lead.quality = {
        hasEmail: lead.email && lead.email !== 'N/A' && lead.email.includes('@'),
        hasPhone: lead.phone && lead.phone !== 'N/A' && lead.phone.length >= 10,
        hasWebsite: lead.website && lead.website !== 'N/A' && lead.website.includes('.'),
        hasSocialMedia: Object.values(lead.socialMedia || {}).some(url => url && url !== 'N/A'),
        score: 0
      };
      
      // Calculate quality score (0-100)
      let score = 0;
      if (lead.quality.hasEmail) score += 40;
      if (lead.quality.hasPhone) score += 30;
      if (lead.quality.hasWebsite) score += 15;
      if (lead.quality.hasSocialMedia) score += 10;
      if (lead.name && lead.name !== 'N/A') score += 3;
      if (lead.businessName && lead.businessName !== 'N/A') score += 2;
      
      lead.quality.score = Math.min(score, 100);
      totalQualityScore += lead.quality.score;
      
      // Update aggregate stats
      if (lead.quality.hasEmail) qualityStats.leadsWithEmail++;
      if (lead.quality.hasPhone) qualityStats.leadsWithPhone++;
      if (lead.quality.hasWebsite) qualityStats.leadsWithWebsite++;
      if (lead.quality.hasSocialMedia) qualityStats.leadsWithSocialMedia++;
    });
    
    // Calculate average quality score
    if (this.leads.length > 0) {
      qualityStats.averageQualityScore = Math.round(totalQualityScore / this.leads.length);
    }
    
    // Update metadata
    if (!this.metadata) this.metadata = {};
    this.metadata.qualityStats = qualityStats;
    
    console.log('Quality metrics calculated:', qualityStats);
  }
  
  next();
});

// Instance methods
leadSchema.methods.getHighQualityLeads = function(minScore = 60) {
  return this.leads.filter(lead => lead.quality?.score >= minScore);
};

leadSchema.methods.getLeadsByTag = function(tagValue) {
  const taggedLeadIds = this.tags
    .filter(tag => tag.tag === tagValue)
    .map(tag => tag.leadId.toString());
  
  return this.leads.filter(lead => taggedLeadIds.includes(lead._id.toString()));
};

leadSchema.methods.addTag = function(leadId, tagValue, notes = '', userId) {
  // Check if tag already exists for this lead
  const existingTag = this.tags.find(tag => 
    tag.leadId.toString() === leadId.toString() && tag.tag === tagValue
  );
  
  if (existingTag) {
    // Update existing tag
    existingTag.notes = notes;
    existingTag.date = new Date();
    return existingTag;
  } else {
    // Add new tag
    const newTag = {
      leadId,
      tag: tagValue,
      notes,
      date: new Date(),
      addedBy: userId
    };
    this.tags.push(newTag);
    return newTag;
  }
};

leadSchema.methods.removeTag = function(tagId) {
  this.tags = this.tags.filter(tag => tag._id.toString() !== tagId.toString());
};

// Static methods
leadSchema.statics.getUserStats = async function(userId) {
  const pipeline = [
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalGenerations: { $sum: 1 },
        totalLeads: { $sum: { $size: '$leads' } },
        avgLeadsPerGeneration: { $avg: { $size: '$leads' } },
        avgProcessingTime: { $avg: '$metadata.processingTime' },
        totalSuccessfulSources: { $sum: '$metadata.successfulSources' },
        totalFailedSources: { $sum: '$metadata.failedSources' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalGenerations: 0,
    totalLeads: 0,
    avgLeadsPerGeneration: 0,
    avgProcessingTime: 0,
    totalSuccessfulSources: 0,
    totalFailedSources: 0
  };
};

leadSchema.statics.getPopularKeywords = async function(limit = 10) {
  const pipeline = [
    {
      $group: {
        _id: '$searchQuery.keyword',
        count: { $sum: 1 },
        avgLeads: { $avg: { $size: '$leads' } },
        lastUsed: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];
  
  return await this.aggregate(pipeline);
};

// Ensure virtual fields are serialized
leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;