const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    email: {
      type: String,
      default: "N/A",
      trim: true,
      lowercase: true,
    },
    emails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    phone: {
      type: String,
      default: "N/A",
      trim: true,
    },
    phones: [
      {
        type: String,
        trim: true,
      },
    ],
    website: {
      type: String,
      trim: true,
    },
    socialLinks: [
      {
        type: String,
        trim: true,
      },
    ],
    address: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 1000,
    },
    businessType: {
      type: String,
      enum: [
        "restaurant",
        "dental",
        "medical",
        "legal",
        "automotive",
        "beauty",
        "fitness",
        "real_estate",
        "marketing",
        "technology",
        "general",
      ],
      default: "general",
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      enum: [
        "google",
        "facebook",
        "instagram",
        "linkedin",
        "twitter",
        "yellowpages",
        "yelp",
        "business_directories",
        "professional_networks",
        "local_business",
        "unknown",
      ],
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    extractionQuality: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isHighQuality: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "interested",
        "not_interested",
        "converted",
        "invalid",
      ],
      default: "new",
    },
    lastContacted: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      maxLength: 1000,
      default: "",
    },
    contactAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxLength: 50,
      },
    ],
    // Enhanced tracking fields
    extractedAt: {
      type: Date,
      default: Date.now,
    },
    // FIXED: Added all missing enum values including the problematic ones
    verificationStatus: {
      type: String,
      enum: [
        "unverified",
        "verified",
        "invalid",
        "bounced",
        "no_additional_sources", // This was missing
        "verification_failed",
        "verification_error",
        "crawl_failed",
      ],
      default: "unverified",
    },
    lastVerified: {
      type: Date,
      default: null,
    },
    // Lead scoring fields
    relevanceScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    // Additional verification fields
    isVerified: {
      type: Boolean,
      default: false,
    },
    additionalSourcesChecked: {
      type: Number,
      default: 0,
    },
    verificationError: {
      type: String,
      trim: true,
    },
    // Custom fields for additional data
    customFields: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: false, // We handle timestamps manually above
  }
);

const leadSearchSchema = new mongoose.Schema(
  {
    searchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    platforms: [
      {
        type: String,
        required: true,
        enum: [
          "google",
          "facebook",
          "instagram",
          "linkedin",
          "twitter",
          "yellowpages",
          "yelp",
          "business_directories",
          "professional_networks",
          "local_business",
        ],
      },
    ],
    emailDomain: {
      type: String,
      trim: true,
      default: "",
    },
    maxResults: {
      type: Number,
      min: 1,
      max: 100,
      default: 20,
    },
    qualityThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    // Enhanced search parameters
    searchRadius: {
      type: Number, // In kilometers
      min: 0,
      default: 0,
    },
    businessCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    excludeKeywords: [
      {
        type: String,
        trim: true,
      },
    ],
    // Contact storage
    contacts: [contactSchema],

    // Enhanced statistics
    stats: {
      totalSearches: {
        type: Number,
        default: 0,
      },
      totalUrlsFound: {
        type: Number,
        default: 0,
      },
      totalUrlsCrawled: {
        type: Number,
        default: 0,
      },
      successfulCrawls: {
        type: Number,
        default: 0,
      },
      leadsGenerated: {
        type: Number,
        default: 0,
      },
      qualityLeadsGenerated: {
        type: Number,
        default: 0,
      },
      averageQualityScore: {
        type: Number,
        default: 0,
      },
      averageExtractionQuality: {
        type: Number,
        default: 0,
      },
      crawlSuccessRate: {
        type: Number,
        default: 0,
      },
      extractionSuccessRate: {
        type: Number,
        default: 0,
      },
      individualSearchesConducted: {
        type: Number,
        default: 0,
      },
      // Platform-specific stats
      platformStats: {
        type: Map,
        of: {
          searched: { type: Number, default: 0 },
          urlsFound: { type: Number, default: 0 },
          leadsGenerated: { type: Number, default: 0 },
          qualityLeads: { type: Number, default: 0 },
        },
        default: new Map(),
      },
    },

    // API usage tracking
    searchApiUsage: {
      provider: {
        type: String,
        enum: ["google_custom", "alternative_scraper", "multi_engine"],
        default: "google_custom",
      },
      queriesUsed: {
        type: Number,
        default: 0,
      },
      remainingQueries: {
        type: Number,
        default: 0,
      },
      dailyQueries: {
        type: Number,
        default: 0,
      },
    },

    // Performance tracking
    performance: {
      totalExecutionTime: {
        type: Number, // in milliseconds
        default: 0,
      },
      searchTime: {
        type: Number,
        default: 0,
      },
      crawlTime: {
        type: Number,
        default: 0,
      },
      verificationTime: {
        type: Number,
        default: 0,
      },
      processingTime: {
        type: Number,
        default: 0,
      },
      averageTimePerLead: {
        type: Number,
        default: 0,
      },
    },

    // Progress tracking for frontend
    progress: {
      currentPhase: {
        type: String,
        enum: [
          "initializing",
          "searching",
          "crawling",
          "verifying",
          "validating",
          "filtering",
          "completed",
          "failed",
        ],
        default: "initializing",
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      message: {
        type: String,
        default: "Starting lead generation...",
      },
      urlsProcessed: {
        type: Number,
        default: 0,
      },
      totalUrls: {
        type: Number,
        default: 0,
      },
      leadsFound: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // FIXED: Added all missing enum values including 'generation_error'
    errors: [
      {
        type: {
          type: String,
          enum: [
            "search_error",
            "crawl_error",
            "extraction_error",
            "validation_error",
            "rate_limit",
            "proxy_error",
            "generation_error", // This was missing
            "timeout_error",
            "verification_error",
          ],
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],

    // Search configuration snapshot
    config: {
      userAgent: String,
      proxyUsed: Boolean,
      captchaSolving: Boolean,
      searchEngine: String,
      crawlerVersion: String,
      extractorVersion: String,
      verificationEnabled: Boolean,
      deepCrawlEnabled: Boolean,
      individualSearchEnabled: Boolean,
    },

    // User and project association
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },

    // Search status
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
    },

    // Export and integration tracking
    exported: {
      type: Boolean,
      default: false,
    },
    exportedAt: {
      type: Date,
      default: null,
    },
    exportFormat: {
      type: String,
      enum: ["csv", "excel", "json", "api"],
      default: null,
    },

    // Archive and cleanup
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "leadSearches",
  }
);

// Indexes for better query performance
leadSearchSchema.index({ userId: 1, createdAt: -1 });
leadSearchSchema.index({ keyword: 1, location: 1 });
leadSearchSchema.index({ status: 1, createdAt: -1 });
leadSearchSchema.index({ "contacts.qualityScore": -1 });
leadSearchSchema.index({ "contacts.platform": 1 });
leadSearchSchema.index({ "contacts.status": 1 });
leadSearchSchema.index({ "contacts.businessType": 1 });
leadSearchSchema.index({ "contacts.isHighQuality": 1 });

// Virtual fields
leadSearchSchema.virtual("successRate").get(function () {
  if (this.stats.totalUrlsCrawled === 0) return 0;
  return (
    (this.stats.successfulCrawls / this.stats.totalUrlsCrawled) *
    100
  ).toFixed(1);
});

leadSearchSchema.virtual("qualityRate").get(function () {
  if (this.stats.leadsGenerated === 0) return 0;
  return (
    (this.stats.qualityLeadsGenerated / this.stats.leadsGenerated) *
    100
  ).toFixed(1);
});

leadSearchSchema.virtual("highQualityContacts").get(function () {
  return this.contacts.filter((contact) => contact.isHighQuality);
});

// Methods
leadSearchSchema.methods.calculateStats = function () {
  const contacts = this.contacts;

  this.stats.leadsGenerated = contacts.length;
  this.stats.qualityLeadsGenerated = contacts.filter(
    (c) => c.isHighQuality
  ).length;

  if (contacts.length > 0) {
    this.stats.averageQualityScore =
      contacts.reduce((sum, c) => sum + c.qualityScore, 0) / contacts.length;
    this.stats.averageExtractionQuality =
      contacts.reduce((sum, c) => sum + c.extractionQuality, 0) /
      contacts.length;
  }

  if (this.stats.totalUrlsCrawled > 0) {
    this.stats.crawlSuccessRate =
      (this.stats.successfulCrawls / this.stats.totalUrlsCrawled) * 100;
    this.stats.extractionSuccessRate =
      (this.stats.leadsGenerated / this.stats.totalUrlsCrawled) * 100;
  }

  return this.stats;
};

leadSearchSchema.methods.updateProgress = function (
  phase,
  percentage,
  message,
  additionalData = {}
) {
  this.progress.currentPhase = phase;
  this.progress.percentage = Math.max(0, Math.min(100, percentage));
  this.progress.message = message;
  this.progress.lastUpdated = new Date();

  // Update additional progress data
  if (additionalData.urlsProcessed !== undefined) {
    this.progress.urlsProcessed = additionalData.urlsProcessed;
  }
  if (additionalData.totalUrls !== undefined) {
    this.progress.totalUrls = additionalData.totalUrls;
  }
  if (additionalData.leadsFound !== undefined) {
    this.progress.leadsFound = additionalData.leadsFound;
  }

  this.markModified("progress");
};

leadSearchSchema.methods.updatePlatformStats = function (
  platform,
  urlsFound,
  leadsGenerated,
  qualityLeads
) {
  if (!this.stats.platformStats) {
    this.stats.platformStats = new Map();
  }

  const platformStat = this.stats.platformStats.get(platform) || {
    searched: 0,
    urlsFound: 0,
    leadsGenerated: 0,
    qualityLeads: 0,
  };

  platformStat.searched += 1;
  platformStat.urlsFound += urlsFound;
  platformStat.leadsGenerated += leadsGenerated;
  platformStat.qualityLeads += qualityLeads;

  this.stats.platformStats.set(platform, platformStat);
};

leadSearchSchema.methods.addError = function (
  errorType,
  message,
  details = {}
) {
  this.errors.push({
    type: errorType,
    message: message,
    details: details,
    timestamp: new Date(),
  });
};

// Static methods
leadSearchSchema.statics.getSearchAnalytics = function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate },
        // REMOVED: status filter that was excluding results
      },
    },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        totalLeads: { $sum: { $size: { $ifNull: ["$contacts", []] } } },
        totalQualityLeads: {
          $sum: {
            $size: {
              $filter: {
                input: { $ifNull: ["$contacts", []] },
                cond: { $eq: ["$$this.isHighQuality", true] },
              },
            },
          },
        },
        avgQualityScore: {
          $avg: {
            $avg: {
              $map: {
                input: { $ifNull: ["$contacts", []] },
                as: "contact",
                in: { $ifNull: ["$$contact.qualityScore", 0] },
              },
            },
          },
        },
        totalUrlsCrawled: { $sum: { $ifNull: ["$stats.totalUrlsCrawled", 0] } },
        totalSuccessfulCrawls: {
          $sum: { $ifNull: ["$stats.successfulCrawls", 0] },
        },
        totalGeminiValidations: {
          $sum: { $ifNull: ["$stats.geminiValidations", 0] },
        },
        avgValidationScore: {
          $avg: {
            $avg: {
              $map: {
                input: { $ifNull: ["$contacts", []] },
                as: "contact",
                in: { $ifNull: ["$$contact.validationScore", 0] },
              },
            },
          },
        },
        // FIXED: Track API usage properly
        totalQueriesUsed: {
          $sum: { $ifNull: ["$searchApiUsage.queriesUsed", 0] },
        },
        avgRemainingQueries: {
          $avg: { $ifNull: ["$searchApiUsage.remainingQueries", 100] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSearches: 1,
        totalLeads: 1,
        totalQualityLeads: 1,
        avgQualityScore: { $round: [{ $ifNull: ["$avgQualityScore", 0] }, 1] },
        totalUrlsCrawled: 1,
        totalSuccessfulCrawls: 1,
        totalGeminiValidations: 1,
        avgValidationScore: {
          $round: [{ $ifNull: ["$avgValidationScore", 0] }, 2],
        },
        totalQueriesUsed: 1,
        avgRemainingQueries: {
          $round: [{ $ifNull: ["$avgRemainingQueries", 100] }, 0],
        },
        successRate: {
          $cond: {
            if: { $gt: ["$totalUrlsCrawled", 0] },
            then: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$totalSuccessfulCrawls", "$totalUrlsCrawled"],
                    },
                    100,
                  ],
                },
                1,
              ],
            },
            else: 0,
          },
        },
      },
    },
  ]);
};

// Pre-save middleware
leadSearchSchema.pre("save", function (next) {
  if (this.isModified("contacts")) {
    this.calculateStats();
  }

  // Update performance metrics
  if (
    this.performance.totalExecutionTime > 0 &&
    this.stats.leadsGenerated > 0
  ) {
    this.performance.averageTimePerLead =
      this.performance.totalExecutionTime / this.stats.leadsGenerated;
  }

  next();
});

const LeadSearch = mongoose.model("LeadSearch", leadSearchSchema);

module.exports = LeadSearch;
