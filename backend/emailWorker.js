const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('./utils/googleClient');
const ScheduledEmail = require('./models/ScheduledEmail');
const EmailHistory = require('./models/EmailHistory');
const cron = require('node-cron');

async function processScheduledEmails() {
    try {
        const now = new Date();
        console.log('[EMAIL WORKER] Checking for scheduled emails at', now.toISOString());
        
        const emailsToProcess = await ScheduledEmail.find({
            status: 'scheduled',
            scheduledAt: { $lte: now }
        }).limit(10); // Process 10 at a time

        if (emailsToProcess.length === 0) {
            console.log('[EMAIL WORKER] No emails to process');
            return;
        }

        console.log(`[EMAIL WORKER] Found ${emailsToProcess.length} emails to process`);

        for (const email of emailsToProcess) {
            try {
                console.log(`[EMAIL WORKER] Processing email ${email._id}`);
                
                // Mark as processing
                await ScheduledEmail.findByIdAndUpdate(email._id, {
                    status: 'processing',
                    startedProcessingAt: new Date()
                });

                if (!email.userToken) {
                    throw new Error("No user token available");
                }

                // Decode the JWT token
                const decoded = jwt.verify(email.userToken, process.env.JWT_SECRET);
                
                if (!decoded.tokens) {
                    throw new Error('No authentication tokens found');
                }

                // Set up OAuth client
                oauth2Client.setCredentials(decoded.tokens);
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                const results = { success: [], failed: [] };

                // Send emails
                for (const recipient of email.recipients) {
                    try {
                        if (!recipient || !recipient.includes('@')) {
                            throw new Error('Invalid email format');
                        }

                        const emailContent = [
                            `From: ${decoded.email}`,
                            `To: ${recipient}`,
                            'Content-Type: text/html; charset=utf-8',
                            'MIME-Version: 1.0',
                            `Subject: ${email.templateName}`,
                            '',
                            email.templateContent
                        ].join('\n');

                        const base64Email = Buffer.from(emailContent)
                            .toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');
                        
                        await gmail.users.messages.send({
                            userId: 'me',
                            requestBody: { raw: base64Email },
                        });
                        
                        results.success.push(recipient);
                    } catch (err) {
                        console.error(`Error sending to ${recipient}:`, err.message);
                        results.failed.push({
                            email: recipient,
                            error: err.message
                        });
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Create history record
                const emailHistory = new EmailHistory({
                    userId: email.userId,
                    templateContent: email.templateContent,
                    recipients: email.recipients,
                    templateName: email.templateName,
                    sentAt: new Date(),
                    status: results.failed.length > 0 ? 
                        (results.success.length > 0 ? 'partially_failed' : 'failed') : 'sent',
                    successCount: results.success.length,
                    failureCount: results.failed.length,
                    failureReasons: results.failed.map(f => f.error),
                    isScheduled: true,
                    scheduledAt: email.scheduledAt
                });

                await emailHistory.save();

                // Update scheduled email status
                const update = {
                    status: results.failed.length > 0 ? 
                        (results.success.length > 0 ? 'partially_failed' : 'failed') : 'completed',
                    completedAt: new Date()
                };

                if (results.failed.length > 0) {
                    update.failureReason = `${results.failed.length} emails failed to send`;
                }

                await ScheduledEmail.findByIdAndUpdate(email._id, update);
                console.log(`[EMAIL WORKER] Completed processing email ${email._id}`);
            } catch (processErr) {
                console.error(`[EMAIL WORKER] Error processing email ${email._id}:`, processErr);
                await ScheduledEmail.findByIdAndUpdate(email._id, {
                    status: 'failed',
                    failedAt: new Date(),
                    failureReason: processErr.message
                });
            }
        }
    } catch (err) {
        console.error('[EMAIL WORKER] Error in scheduled task:', err);
    }
}

function startEmailWorker() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log('[EMAIL WORKER] Running scheduled task at', new Date().toISOString());
        try {
            await processScheduledEmails();
        } catch (err) {
            console.error('[EMAIL WORKER] Error in scheduled task:', err);
        }
    });
    console.log('Email worker started');
}

module.exports = { startEmailWorker };