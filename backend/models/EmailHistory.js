const mongoose = require('mongoose');

const EmailHistorySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    templateContent: { type: String },
    recipients: { type: [String], required: true },
    templateName: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: {
        type: String,
        required: true,
        enum: ['sent', 'failed', 'partially_failed'],
        default: 'sent'
    },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    failureReasons: { type: [String] },
    isScheduled: { type: Boolean, default: false },
    scheduledAt: { type: Date }
}, {
    timestamps: true
});

// Add a unique compound index to prevent duplicate records
EmailHistorySchema.index({ 
    userId: 1, 
    templateName: 1, 
    sentAt: 1 
}, { unique: true });

module.exports = mongoose.model('EmailHistory', EmailHistorySchema);