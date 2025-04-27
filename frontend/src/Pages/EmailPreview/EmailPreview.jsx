import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendEmails } from "../../api";
// import Navbar from "./Navbar/Navbar";
import "./EmailPreview.css";
import { IoMdArrowRoundBack } from "react-icons/io";

const truncateEmail = (email) => {
  const atIndex = email.indexOf("@");
  return atIndex !== -1 ? `${email.substring(0, atIndex)}@` : email;
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

  const [sendingStatus, setSendingStatus] = useState(
    recipients
      ? recipients.map((email) => ({
          email,
          status: isScheduled ? "scheduled" : "pending",
        }))
      : []
  );

  const [stats, setStats] = useState({
    sent: 0,
    failed: 0,
    total: recipients ? recipients.length : 0,
  });

  const [allProcessed, setAllProcessed] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime] = useState(new Date());
  const [userEmail, setUserEmail] = useState("");

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

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

    if (!isScheduled && recipients && recipients.length > 0) {
      console.log("Starting immediate email sending process");
      const sendEmailsSequentially = async () => {
        for (let i = 0; i < recipients.length; i++) {
          try {
            await sendEmails(templateContent, [recipients[i]], emailSubject);

            setSendingStatus((prev) =>
              prev.map((item) =>
                item.email === recipients[i]
                  ? { ...item, status: "sent" }
                  : item
              )
            );

            setStats((prev) => ({ ...prev, sent: prev.sent + 1 }));
          } catch (err) {
            console.error(`Error sending to ${recipients[i]}:`, err);

            setSendingStatus((prev) =>
              prev.map((item) =>
                item.email === recipients[i]
                  ? { ...item, status: "failed" }
                  : item
              )
            );

            setStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
            setError("Failed to send some emails. Please try again.");
          }

          // Rate limiting
          if (i < recipients.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        setAllProcessed(true);
      };

      sendEmailsSequentially();
    } else if (isScheduled) {
      console.log("Displaying scheduled email preview");
      setAllProcessed(true);

      // Call API to schedule the emails
      const scheduleEmails = async () => {
        try {
          console.log("Scheduling emails for:", scheduledAt);
          await sendEmails(templateContent, recipients, emailSubject, {
            isScheduled: true,
            scheduledAt,
          });
        } catch (err) {
          console.error("Error scheduling emails:", err);
          setError("Failed to schedule emails. Please try again.");
        }
      };

      scheduleEmails();
    }
  }, [templateContent, recipients, emailSubject, isScheduled, scheduledAt]);

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
            <h2 className="status-title">Emails Status:</h2>

            <div className="email-list">
              {sendingStatus.map((item, index) => (
                <div
                  key={index}
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
                    ) : (
                      "Pending..."
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!allProcessed ? (
          <p className="status-footer">Starting to send emails...</p>
        ) : isScheduled ? (
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
                ? `${stats.failed} emails failed to send.`
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
