import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendEmails } from "../../api";
import Navbar from "../../Components/Navbar/Navbar";
import "./EmailPreview.css";
import { IoMdArrowRoundBack } from "react-icons/io";

const EmailPreview = () => {
  const location = useLocation();
  const { templateContent, recipients, emailSubject } = location.state;
  const navigate = useNavigate();

  const [sendingStatus, setSendingStatus] = useState(
    recipients.map((email) => ({ email, status: "pending" }))
  );
  const [stats, setStats] = useState({
    sent: 0,
    failed: 0,
    total: recipients.length,
  });
  const [allProcessed, setAllProcessed] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime] = useState(new Date());
  const [userEmail, setUserEmail] = useState("");

  // Format current time like "3:20 PM"
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  useEffect(() => {
    // Get user email from local storage
    try {
      const userInfo = localStorage.getItem("user-info");
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        setUserEmail(userData.email || "");
      }
    } catch (error) {
      console.error("Error retrieving user info from localStorage:", error);
    }

    const sendEmailsSequentially = async () => {
      for (let i = 0; i < recipients.length; i++) {
        try {
          await sendEmails(templateContent, [recipients[i]], emailSubject);
          setSendingStatus((prev) =>
            prev.map((item) =>
              item.email === recipients[i] ? { ...item, status: "sent" } : item
            )
          );
          setStats((prev) => ({ ...prev, sent: prev.sent + 1 }));

          if (i < recipients.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error("Error sending email:", error);
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
      }
      setAllProcessed(true);
    };

    sendEmailsSequentially();
  }, [templateContent, recipients, emailSubject]);

  const handleBackToTemplates = () => {
    navigate("/templates");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <span className="status-icon sent">✓</span>;
      case "failed":
        return <span className="status-icon failed">✕</span>;
      default:
        return <div className="loading-spinner"></div>;
    }
  };

  return (
    <div className="email-preview-container">
      <Navbar />

      <div className="email-preview-content">
        {allProcessed && (
          <div
            className="status-summary"
            style={{ marginTop: "20px", textAlign: "center" }}
          >
            <div className="back-button">
              <Link to="/templates">
                <button className="btn-back" onClick={handleBackToTemplates}>
                  <IoMdArrowRoundBack /> Back to Templates
                </button>
              </Link>
            </div>
          </div>
        )}
        {/* Your Mail at a Glance Section */}
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

        {/* Connect Google Sheets Section */}
        <div className="google-sheets-section">
          <div className="sheets-container">
            <div className="sheets-image">
              <img
                src="/preview.jpg"
                alt="Google Sheets"
                className="sheets-icon"
              />
            </div>

            <div className="sheets-content">
              <h2 className="sheets-title">Connect Your Google Sheets</h2>

              <div className="sheets-buttons">
                <button className="sheets-button">
                  Select your google sheets
                </button>
                <button className="sheets-button">Fetch Emails</button>
                <button className="sheets-button">Send Emails</button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Status Section */}
        <div className="status-section">
          <div className="status-container">
            <h2 className="status-title">Emails :</h2>

            <div className="email-list">
              {sendingStatus.map((item, index) => (
                <div
                  key={index}
                  className={`email-recipients-list ${item.status}`}
                >
                  <div className="email-recipient-name">{item.email}</div>
                  <div className={`status-badge ${item.status}`}>
                    {item.status === "sent" ? (
                      <>
                        Sent <span className="check-mark">✓</span>
                      </>
                    ) : item.status === "failed" ? (
                      "Failed"
                    ) : (
                      "Pending..."
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status message outside the container */}
        {!allProcessed ? (
          <p className="status-footer">Starting to send emails...</p>
        ) : (
          <p
            className={`status-footer ${
              stats.failed > 0 ? "status-error" : "status-complete"
            }`}
          >
            {stats.failed > 0
              ? `${stats.failed} emails failed to send.`
              : "Emails sent successfully!"}
          </p>
        )}

        {/* Original functionality - commented out but maintained */}
        {/* 
        <div className="hidden-status-panel">
          <div className="status-header">
            <h3>Email Sending Status</h3>
            <span className="status-counter">
              {stats.sent}/{stats.total}
            </span>
          </div>

          <div className="status-progress-bar">
            <div
              className="status-progress-fill"
              style={{ width: `${(stats.sent / stats.total) * 100}%` }}
            ></div>
          </div>

          <div className="notification-list">
            {sendingStatus.map((item, index) => (
              <div
                key={`status-${index}`}
                className={`notification-item ${item.status}`}
              >
                <span className="notification-icon">
                  {getStatusIcon(item.status)}
                </span>
                <div className="notification-content">
                  <span className="notification-email">{item.email}</span>
                  <span className="notification-status">{item.status}</span>
                </div>
              </div>
            ))}
          </div>

          {allProcessed && (
            <div className="status-summary">
              <p>
                <strong>{stats.sent}</strong> sent successfully,
                <strong> {stats.failed}</strong> failed
              </p>
              <button className="btn-back" onClick={handleBackToTemplates}>
                Back to Templates
              </button>
            </div>
          )}
        </div>
        */}
      </div>
    </div>
  );
};

export default EmailPreview;
