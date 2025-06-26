const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('./utils/googleClient');
const ScheduledEmail = require('./models/ScheduledEmail');
const EmailHistory = require('./models/EmailHistory');
const cron = require('node-cron');


const personalizeContent = (content, email) => {
  if (!content || !email) return content;
  
  // Extract the username part before @
  const username = email.split('@')[0] || "User";
  
  // Replace common placeholders - ensuring consistent replacement
  return content
    .replace(/\[Customer Name\]/gi, username)
    .replace(/\[customer\.name\]/gi, username)
    .replace(/\[customer\.email\]/gi, email)
    .replace(/\[User\]/gi, username)
    .replace(/\[user\]/gi, username)
    .replace(/\[First Name\]/gi, username)
    .replace(/\[firstname\]/gi, username)
    .replace(/\[username\]/gi, username)
    .replace(/\[email\]/gi, email);
};

async function processScheduledEmails() {
  try {
    const now = new Date();
    console.log('\n=== Checking for Scheduled Emails ===');
    console.log('Current time:', now.toISOString());

    const emailsToProcess = await ScheduledEmail.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    }).limit(10);

    if (emailsToProcess.length === 0) {
      console.log('No emails to process at this time');
      return;
    }

    console.log(`Found ${emailsToProcess.length} emails to process`);

    for (const email of emailsToProcess) {
      try {
        console.log(`\nProcessing email ${email._id}`);
        console.log('Template:', email.templateName);
        console.log('Recipients:', email.recipients.length);

        // Mark as processing
        await ScheduledEmail.findByIdAndUpdate(email._id, {
          status: 'processing',
          startedProcessingAt: new Date()
        });

        if (!email.googleTokens) {
          throw new Error("No Google tokens available in scheduled email record");
        }

        console.log('Setting up OAuth2 client with tokens');
        oauth2Client.setCredentials({
          access_token: email.googleTokens.access_token,
          refresh_token: email.googleTokens.refresh_token,
          expiry_date: email.googleTokens.expiry_date
        });

        // Refresh token if needed
        try {
          console.log('Checking token expiration...');
          const { credentials } = await oauth2Client.refreshAccessToken();
          console.log('Token refreshed successfully');

          // Update the scheduled email with new tokens
          await ScheduledEmail.findByIdAndUpdate(email._id, {
            'googleTokens.access_token': credentials.access_token,
            'googleTokens.expiry_date': credentials.expiry_date
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.message);
          // Continue with original tokens if refresh fails
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const results = { success: [], failed: [] };

        console.log('Starting to send emails...');
        for (const recipient of email.recipients) {
          try {
            if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
              throw new Error('Invalid email format');
            }

            const personalizedContent = personalizeContent(email.templateContent, recipient);
            const emailContent = [
              `From: ${email.userId}`,
              `To: ${recipient}`,
              'Content-Type: text/html; charset=utf-8',
              'MIME-Version: 1.0',
              `Subject: ${email.templateName}`,
              '',
              personalizedContent
            ].join('\n');

            const base64Email = Buffer.from(emailContent)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            console.log(`Sending to ${recipient}`);
            await gmail.users.messages.send({
              userId: 'me',
              requestBody: { raw: base64Email },
            });

            results.success.push(recipient);
          } catch (err) {
            console.error(`Failed to send to ${recipient}:`, err.message);
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
        console.log('Email history saved:', emailHistory._id);

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
        console.log(`Completed processing email ${email._id}`);

      } catch (processErr) {
        console.error(`Error processing email ${email._id}:`, {
          error: processErr.message,
          stack: processErr.stack
        });

        await ScheduledEmail.findByIdAndUpdate(email._id, {
          status: 'failed',
          failedAt: new Date(),
          failureReason: processErr.message
        });
      }
    }
  } catch (err) {
    console.error('Error in scheduled task:', {
      error: err.message,
      stack: err.stack
    });
  }
}

function startEmailWorker() {
  console.log('Starting email worker...');
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('\n=== Running Scheduled Task ===');
    console.log('Time:', new Date().toISOString());
    try {
      await processScheduledEmails();
    } catch (err) {
      console.error('Error in scheduled task:', err);
    }
  });
}

module.exports = { startEmailWorker };