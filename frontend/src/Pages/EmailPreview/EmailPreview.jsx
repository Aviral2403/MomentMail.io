import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendEmails, getEmailStatus } from "../../api"; // Make sure this points to your updated API
import "./EmailPreview.css";
import { IoMdArrowRoundBack } from "react-icons/io";

// Helper function to extract username from email for preview purposes only
const extractUsername = (email) => {
  if (!email || typeof email !== 'string') return "User";
  const atIndex = email.indexOf("@");
  return atIndex !== -1 ? email.substring(0, atIndex) : email;
};

const createPreviewTemplate = (templateContent, recipientSample) => {
  if (!templateContent) return "";
  if (!recipientSample) return templateContent;
  
  const username = extractUsername(recipientSample);
  
  // Replace common placeholders - for PREVIEW only
  return templateContent
    .replace(/\[Customer Name\]/gi, username)
    .replace(/\[customer\.name\]/gi, username)
    .replace(/\[customer\.email\]/gi, recipientSample)
    .replace(/\[User\]/gi, username)
    .replace(/\[user\]/gi, username)
    .replace(/\[First Name\]/gi, username)
    .replace(/\[firstname\]/gi, username)
    .replace(/\[username\]/gi, username)
    .replace(/\[email\]/gi, recipientSample);
};

const EmailPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    templateContent,
    recipients,
    emailSubject,
    isScheduled,
    scheduledAt,
  } = location.state || {};

  // Track visible emails (those still in the process queue)
  const [visibleEmails, setVisibleEmails] = useState(
    recipients ? recipients.slice(0, 10).map(email => ({
      email,
      status: isScheduled ? "scheduled" : "pending"
    })) : []
  );
  
  // Track all email statuses for stats
  const [allEmailStatuses, setAllEmailStatuses] = useState(
    recipients ? recipients.map(email => ({
      email,
      status: isScheduled ? "scheduled" : "pending"
    })) : []
  );

  // For tracking which emails to process next
  const emailQueueRef = useRef(recipients ? [...recipients] : []);
  const processedCount = useRef(0);
  const batchSize = 10;
  
  // Create a preview version of the template for display in the UI
  const [previewTemplateContent, setPreviewTemplateContent] = useState("");

  const [stats, setStats] = useState({
    sent: 0,
    failed: 0,
    total: recipients ? recipients.length : 0,
    processing: 0
  });

  const [allProcessed, setAllProcessed] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userEmail, setUserEmail] = useState("");
  const [apiCallMade, setApiCallMade] = useState(false);
  const [failedEmails, setFailedEmails] = useState([]);
  
  // New state variables for scheduled emails
  const [scheduledEmailsStarted, setScheduledEmailsStarted] = useState(false);
  const [scheduledEmailsChecking, setScheduledEmailsChecking] = useState(false);
  const [scheduledStatusTimer, setScheduledStatusTimer] = useState(null);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Create preview template with sample data from first recipient
  useEffect(() => {
    if (templateContent && recipients && recipients.length > 0) {
      // Use first recipient as an example for the preview
      const previewContent = createPreviewTemplate(templateContent, recipients[0]);
      setPreviewTemplateContent(previewContent);
    } else {
      setPreviewTemplateContent(templateContent || "");
    }
  }, [templateContent, recipients]);

  // Initial setup for the component
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem("user-info");
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        setUserEmail(userData.email || "");
      }
    } catch (error) {
      console.error("Error retrieving user info:", error);
    }

    // Update the current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    if (isScheduled) {
      console.log("Displaying scheduled email preview");
      
      if (!apiCallMade) {
        // Call API to schedule the emails (only once)
        const scheduleEmails = async () => {
          try {
            console.log("Scheduling emails for:", scheduledAt);
            await sendEmails(templateContent, recipients, emailSubject, {
              isScheduled: true,
              scheduledAt,
            });
            setApiCallMade(true);
            
            // Set up timer to check scheduled email status
            setupScheduledStatusCheck(scheduledAt);
          } catch (err) {
            console.error("Error scheduling emails:", err);
            setError("Failed to schedule emails. Please try again.");
          }
        };
        scheduleEmails();
      } else if (!scheduledStatusTimer && !scheduledEmailsStarted) {
        // If API call was already made but timer not set up yet
        setupScheduledStatusCheck(scheduledAt);
      }
    }

    return () => {
      clearInterval(timeInterval);
      if (scheduledStatusTimer) {
        clearTimeout(scheduledStatusTimer);
      }
    };
  }, [templateContent, recipients, emailSubject, isScheduled, scheduledAt, apiCallMade]);

  // Setup timer to check scheduled email status
  const setupScheduledStatusCheck = (scheduledTimeStr) => {
    if (!scheduledTimeStr) return;
    
    const scheduledTime = new Date(scheduledTimeStr);
    const currentTime = new Date();
    
    // Calculate time until scheduled time is reached
    let timeUntilScheduled = scheduledTime - currentTime;
    
    // If scheduled time is in the past, check status immediately
    if (timeUntilScheduled <= 0) {
      checkScheduledEmailStatus();
      return;
    }
    
    console.log(`Setting up timer to check email status in ${Math.floor(timeUntilScheduled / 1000)} seconds`);
    
    // Set timer to start checking status when scheduled time is reached
    const timer = setTimeout(() => {
      checkScheduledEmailStatus();
    }, timeUntilScheduled);
    
    setScheduledStatusTimer(timer);
  };

  // Function to check status of scheduled emails
  const checkScheduledEmailStatus = async () => {
    if (scheduledEmailsChecking || scheduledEmailsStarted) return;
    
    setScheduledEmailsChecking(true);
    
    try {
      console.log("Checking scheduled email status for:", emailSubject);
      // Make API call to get status of scheduled emails
      const response = await getEmailStatus(recipients, emailSubject);
      
      if (!response) {
        console.warn("No response from email status check");
        setTimeout(checkScheduledEmailStatus, 10000);
        return;
      }
      
      if (response && response.status === "sending") {
        // Emails are now being sent, transition to sending view
        setScheduledEmailsStarted(true);
        
        // Start visual processing simulation
        simulateScheduledEmailProcessing(response.failedRecipients || []);
      } else if (response && response.status === "completed") {
        // Emails have already been sent - TERMINAL STATE
        setScheduledEmailsStarted(true);
        setAllProcessed(true);
        
        // Clear any existing timers to stop polling
        if (scheduledStatusTimer) {
          clearTimeout(scheduledStatusTimer);
          setScheduledStatusTimer(null);
        }
        
        setStats({
          total: recipients.length,
          sent: response.totalSent || recipients.length - (response.failedRecipients?.length || 0),
          failed: response.failedRecipients?.length || 0,
          processing: 0
        });
        
        // Update status displays
        updateEmailStatusesAfterCompletion(response.failedRecipients || []);
      } else if (response && (response.status === "failed" || response.status === "partially_failed")) {
        // Failed emails - TERMINAL STATE
        setScheduledEmailsStarted(true);
        setAllProcessed(true);
        
        // Clear any existing timers to stop polling
        if (scheduledStatusTimer) {
          clearTimeout(scheduledStatusTimer);
          setScheduledStatusTimer(null);
        }
        
        setStats({
          total: recipients.length,
          sent: response.totalSent || 0,
          failed: response.failedRecipients?.length || recipients.length,
          processing: 0
        });
        
        // Update status displays
        updateEmailStatusesAfterCompletion(response.failedRecipients || []);
        
        // Show error message
        setError(`${response.failedRecipients?.length || recipients.length} of ${recipients.length} emails failed to send.`);
      } else if (response && response.error) {
        console.error("Error in email status response:", response.error);
        setTimeout(checkScheduledEmailStatus, 10000);
      } else {
        // Still scheduled, check again in 10 seconds
        setTimeout(checkScheduledEmailStatus, 10000);
      }
    } catch (err) {
      console.error("Error checking scheduled email status:", err);
      // Retry after 10 seconds
      setTimeout(checkScheduledEmailStatus, 10000);
    } finally {
      setScheduledEmailsChecking(false);
    }
  };

  // Update all email statuses after completion
  const updateEmailStatusesAfterCompletion = (failedRecipients) => {
    const failedEmailAddresses = new Set(failedRecipients.map(item => item.email));
    
    // Update allEmailStatuses
    setAllEmailStatuses(prev => 
      prev.map(item => ({
        ...item,
        status: failedEmailAddresses.has(item.email) ? "failed" : "sent"
      }))
    );
    
    // Update visible emails to show only failed ones
    setVisibleEmails(prev => 
      prev.map(item => ({
        ...item,
        status: failedEmailAddresses.has(item.email) ? "failed" : "sent"
      })).filter(item => item.status === "failed")
    );
    
    // Store failed emails for reference
    setFailedEmails(failedRecipients);
  };

  // Function to simulate the visual processing of scheduled emails
  const simulateScheduledEmailProcessing = (failedRecipients) => {
    const failedEmailAddresses = new Set(failedRecipients.map(item => item.email));
    
    // Mark all scheduled emails as processing now
    setVisibleEmails(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = { ...updated[0], status: "processing" };
      }
      return updated;
    });
    
    // Now simulate sequential processing
    let currentIndex = 0;
    const totalEmails = recipients.length;
    
    const processNextEmail = () => {
      if (currentIndex >= totalEmails) {
        // All emails processed
        setTimeout(() => {
          setVisibleEmails(prev => prev.filter(item => item.status === "failed"));
          setAllProcessed(true);
          
          const failedCount = failedEmailAddresses.size;
          setStats(prev => ({
            ...prev,
            sent: totalEmails - failedCount,
            failed: failedCount
          }));
          
          if (failedCount > 0) {
            setError(`${failedCount} of ${recipients.length} emails failed to send.`);
          }
        }, 1000);
        return;
      }

      const currentEmail = emailQueueRef.current[currentIndex];
      const isFailed = failedEmailAddresses.has(currentEmail);
      const newStatus = isFailed ? "failed" : "sent";
      
      // Update the status in allEmailStatuses
      setAllEmailStatuses(prev => {
        const updated = [...prev];
        const index = updated.findIndex(item => item.email === currentEmail);
        if (index !== -1) {
          updated[index] = { ...updated[index], status: newStatus };
        }
        return updated;
      });

      // Update the visibleEmails list to show the processed email status
      setVisibleEmails(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = { ...updated[0], status: newStatus };
        }
        return updated;
      });

      // Wait a bit longer to show the status before removing/updating
      setTimeout(() => {
        setVisibleEmails(prev => {
          let updated = [...prev];
          
          // Remove the first email if it was sent successfully
          if (newStatus === "sent") {
            updated.shift();
          } else {
            // If failed, keep it but update status 
            updated[0] = { ...updated[0], status: "failed" };
          }
          
          // Add next email from queue if available
          const nextEmailIndex = currentIndex + batchSize;
          if (nextEmailIndex < totalEmails) {
            const nextEmail = emailQueueRef.current[nextEmailIndex];
            if (nextEmail && updated.length < batchSize) {
              updated.push({ email: nextEmail, status: "pending" });
            }
          }
          
          return updated;
        });

        // Update processed count for display
        processedCount.current = currentIndex + 1;
        
        // Process next email
        currentIndex++;
        
        // Schedule the next email processing with a delay
        setTimeout(processNextEmail, 800); // Process every 800ms
      }, 1200); // Show status for 1.2 seconds before removing/updating
    };

    // Start the sequential processing
    processNextEmail();
  };

  // Function to simulate sequential processing for immediate sending
  const processEmailsSequentially = async () => {
    if (isScheduled || apiCallMade) return;
    
    // Make the API call right away but only once
    if (!apiCallMade && recipients && recipients.length > 0) {
      try {
        console.log("Making API call to send all emails at once");
        const response = await sendEmails(templateContent, recipients, emailSubject);
        setApiCallMade(true);
        
        // Store the API response for later reference
        const failedRecipients = response?.results?.failedRecipients || [];
        const failedEmailAddresses = new Set(failedRecipients.map(item => item.email));
        
        // Update stats with the real results
        setStats(prev => ({
          ...prev,
          sent: response?.results?.totalSent || 0,
          failed: response?.results?.totalFailed || 0
        }));
        
        // Store failed emails for later display
        setFailedEmails(failedRecipients);
        
        // Now we'll simulate sequential processing for visual feedback
        simulateSequentialProcessing(failedEmailAddresses);
      } catch (err) {
        console.error("Error sending emails:", err);
        setError("Failed to send emails. Please try again.");
        setAllProcessed(true);
        
        // Mark all as failed in the UI
        setVisibleEmails(prev => 
          prev.map(item => ({
            ...item,
            status: "failed"
          }))
        );
        
        setAllEmailStatuses(prev => 
          prev.map(item => ({
            ...item,
            status: "failed"
          }))
        );
        
        setStats(prev => ({
          ...prev,
          sent: 0,
          failed: prev.total
        }));
      }
    }
  };
  
  // Function to simulate the visual sequential processing with improved animations
  const simulateSequentialProcessing = (failedEmailAddresses) => {
    // Set an interval to process emails visually in sequence
    let currentIndex = 0;
    const totalEmails = recipients.length;
    
    // Process first email with status "processing"
    if (visibleEmails.length > 0) {
      setVisibleEmails(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = { ...updated[0], status: "processing" };
        }
        return updated;
      });
    }

    const processNextEmail = () => {
      if (currentIndex >= totalEmails) {
        // All emails processed
        setTimeout(() => {
          setVisibleEmails(prev => prev.filter(item => item.status === "failed"));
          setAllProcessed(true);
          
          if (stats.failed > 0) {
            setError(`${stats.failed} of ${recipients.length} emails failed to send.`);
          }
        }, 1000);
        return;
      }

      const currentEmail = emailQueueRef.current[currentIndex];
      const isFailed = failedEmailAddresses.has(currentEmail);
      const newStatus = isFailed ? "failed" : "sent";
      
      // Update the status in allEmailStatuses
      setAllEmailStatuses(prev => {
        const updated = [...prev];
        const index = updated.findIndex(item => item.email === currentEmail);
        if (index !== -1) {
          updated[index] = { ...updated[index], status: newStatus };
        }
        return updated;
      });

      // Update the visibleEmails list to show the processed email status
      setVisibleEmails(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = { ...updated[0], status: newStatus };
        }
        return updated;
      });

      // Wait a bit longer to show the status before removing/updating
      setTimeout(() => {
        setVisibleEmails(prev => {
          let updated = [...prev];
          
          // Remove the first email if it was sent successfully
          if (newStatus === "sent") {
            updated.shift();
          } else {
            // If failed, keep it but update status 
            updated[0] = { ...updated[0], status: "failed" };
          }
          
          // Add next email from queue if available
          const nextEmailIndex = currentIndex + batchSize;
          if (nextEmailIndex < totalEmails) {
            const nextEmail = emailQueueRef.current[nextEmailIndex];
            if (nextEmail && updated.length < batchSize) {
              updated.push({ email: nextEmail, status: "pending" });
            }
          }
          
          return updated;
        });

        // Update processed count for display
        processedCount.current = currentIndex + 1;
        
        // Process next email
        currentIndex++;
        
        // Schedule the next email processing with a delay
        setTimeout(processNextEmail, 800); // Process every 800ms
      }, 1200); // Show status for 1.2 seconds before removing/updating
    };

    // Start the sequential processing
    processNextEmail();
  };

  // Trigger the processing when component mounts
  useEffect(() => {
    if (!isScheduled && recipients && recipients.length > 0 && !apiCallMade) {
      processEmailsSequentially();
    }
  }, [recipients, isScheduled, apiCallMade]);

  const handleBackToTemplates = () => {
    navigate("/templates");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <span className="status-icon sent">✓</span>;
      case "failed":
        return <span className="status-icon failed">✕</span>;
      case "scheduled":
        return <span className="status-icon scheduled">⏱</span>;
      default:
        return <div className="loading-spinner"></div>;
    }
  };

  return (
    <div className="email-preview-container">
      {/* <Navbar /> */}

      <div className="email-preview-content">
        {allProcessed && (
          <div className="status-summary">
            <div className="back-button">
              <Link to="/templates">
                <button className="btn-back" onClick={handleBackToTemplates}>
                  <IoMdArrowRoundBack /> Back to Templates
                </button>
              </Link>
            </div>
          </div>
        )}

        <div className="mail-glance-section">
          <h1 className="section-title">Your Mail at a Glance</h1>
          <div className="glance">
            <div className="mail-card">
              <div className="mail-header">
                <div className="mail-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="mail-title">Your Message</div>
              </div>

              <div className="mail-content">
                <div className="mail-row">
                  <div className="mail-label">From</div>
                  <div className="mail-value">{userEmail}</div>
                </div>

                <div className="mail-row">
                  <div className="mail-label">Subject</div>
                  <div className="mail-value">{emailSubject}</div>
                </div>

                <div className="mail-row">
                  <div className="mail-label">Recipients</div>
                  <div className="mail-value">{recipients ? recipients.length : 0} recipients</div>
                </div>

                {isScheduled && scheduledAt && (
                  <div className="mail-row">
                    <div className="mail-label">Time</div>
                    <div className="mail-value">
                      {new Date(scheduledAt).toLocaleString()}
                    </div>
                  </div>
                )}

                <div className="mail-row message-row">
                  <div className="mail-label">Message</div>
                  <div className="mail-value message-content">
                    {/* Show the original template content with placeholders in preview */}
                    <div
                      dangerouslySetInnerHTML={{ __html: templateContent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="status-section">
          <div className="status-container">
            <h2 className="status-title">
              Emails Status: 
              {isScheduled && !scheduledEmailsStarted && !allProcessed && (
                <span className="scheduled-status">
                  {new Date(scheduledAt) > new Date() 
                    ? ` Scheduled for ${new Date(scheduledAt).toLocaleString()}`
                    : " Processing scheduled emails"
                  }
                </span>
              )}
            </h2>

            <div className="email-list">
              {visibleEmails.map((item, index) => (
                <div
                  key={`${item.email}-${index}`}
                  className={`email-recipients-list ${item.status}`}
                >
                  <div
                    className="email-recipient-name"
                    data-domain={item.email.substring(item.email.indexOf("@"))}
                  >
                    {item.email}
                  </div>
                  <div className={`status-badge ${item.status}`}>
                    {item.status === "sent" ? (
                      <>
                        Sent <span className="check-mark">✓</span>
                      </>
                    ) : item.status === "failed" ? (
                      "Failed"
                    ) : item.status === "scheduled" ? (
                      "Scheduled"
                    ) : item.status === "processing" ? (
                      <>
                        Processing <div className="loading-spinner-inline"></div>
                      </>
                    ) : (
                      "Pending"
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!allProcessed ? (
          <p className="status-footer">
            {isScheduled && !scheduledEmailsStarted ? 
              new Date(scheduledAt) > new Date() 
                ? `Emails will be sent at ${new Date(scheduledAt).toLocaleString()}` 
                : "Processing scheduled emails..." 
              : "Processing emails..."}
          </p>
        ) : isScheduled && !scheduledEmailsStarted ? (
          <div className="status-footer-container">
            <p className="status-footer scheduled">
              Emails scheduled for {new Date(scheduledAt).toLocaleString()}
            </p>
            <button
              className="btn-dashboard"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="status-footer-container">
            <p
              className={`status-footer ${
                stats.failed > 0 ? "status-error" : "status-complete"
              }`}
            >
              {stats.failed > 0
                ? `${stats.failed} of ${stats.total} emails failed to send.`
                : "All emails sent successfully!"}
            </p>
            <button
              className="btn-dashboard"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailPreview;