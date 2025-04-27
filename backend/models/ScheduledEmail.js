const mongoose = require('mongoose');

const ScheduledEmailSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    templateContent: { type: String, required: true },
    recipients: { type: [String], required: true },
    templateName: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: ['scheduled', 'processing', 'completed', 'cancelled', 'failed'],
        default: 'scheduled'
    },
    createdAt: { type: Date, default: Date.now },
    startedProcessingAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },
    userToken: { type: String, required: true }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.userToken;
            return ret;
        }
    }
});

// Add a unique compound index to prevent duplicate scheduled emails
ScheduledEmailSchema.index({ 
    userId: 1, 
    templateName: 1, 
    scheduledAt: 1 
}, { unique: true });

module.exports = mongoose.model('ScheduledEmail', ScheduledEmailSchema);