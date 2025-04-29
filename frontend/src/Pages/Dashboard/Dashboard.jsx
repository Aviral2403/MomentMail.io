import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import {
  getScheduledEmails,
  getEmailHistory,
  cancelScheduledEmail,
} from "../../api";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scheduled");
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo || !userInfo.token) {
        setIsAuthenticated(false);
        setError("Please login to access the dashboard");
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        if (activeTab === "scheduled") {
          const response = await getScheduledEmails();
          setScheduledEmails(response.scheduledEmails || []);
        } else {
          const response = await getEmailHistory();
          setEmailHistory(response.emailHistory || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isAuthenticated]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="dashboard-status-badge dashboard-status-scheduled">
            Scheduled
          </span>
        );
      case "processing":
        return (
          <span className="dashboard-status-badge dashboard-status-processing">
            Processing
          </span>
        );
      case "completed":
        return (
          <span className="dashboard-status-badge dashboard-status-completed">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="dashboard-status-badge dashboard-status-cancelled">
            Cancelled
          </span>
        );
      case "failed":
        return (
          <span className="dashboard-status-badge dashboard-status-failed">
            Failed
          </span>
        );
      case "sent":
        return (
          <span className="dashboard-status-badge dashboard-status-sent">
            Sent
          </span>
        );
      case "partially_failed":
        return (
          <span className="dashboard-status-badge dashboard-status-partial">
            Partial
          </span>
        );
      default:
        return <span className="dashboard-status-badge">{status}</span>;
    }
  };

  const handleCancelEmail = async (emailId) => {
    try {
      setCancellingId(emailId);
      setError("");

      await cancelScheduledEmail(emailId);

      const response = await getScheduledEmails();
      setScheduledEmails(response.scheduledEmails || []);
    } catch (err) {
      console.error("Error cancelling email:", err);
      setError("Failed to cancel email. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="dashboard-page-container">
        <Navbar />
        <main className="dashboard-main-content">
          <div className="dashboard-inner-container">
            <h1 className="dashboard-page-title">Email Dashboard</h1>
            <div className="dashboard-auth-required">
              <div className="dashboard-auth-message">
                <svg
                  className="dashboard-auth-icon"
                  viewBox="0 0 24 24"
                  width="48"
                  height="48"
                >
                  <path
                    fill="currentColor"
                    d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11V11.99z"
                  />
                </svg>
                <h2>Authentication Required</h2>
                <p>Please login to access your email dashboard</p>
                <Link to="/login" className="dashboard-login-button">
                  Go to Login
                </Link>
              </div>
              {error && (
                <div className="dashboard-error-message">
                  <svg
                    className="dashboard-error-icon"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                  >
                    <path
                      fill="currentColor"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                    />
                  </svg>
                  {error}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page-container">
      <Navbar />
      <main className="dashboard-main-content">
        <div className="dashboard-inner-container">
          <h1 className="dashboard-page-title">Email Dashboard</h1>

          <div className="dashboard-tabs-container">
            <button
              className={`dashboard-tab-button ${
                activeTab === "scheduled" ? "dashboard-tab-active" : ""
              }`}
              onClick={() => setActiveTab("scheduled")}
            >
              Scheduled Emails
            </button>
            <button
              className={`dashboard-tab-button ${
                activeTab === "history" ? "dashboard-tab-active" : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              Email History
            </button>
          </div>

          {error && (
            <div className="dashboard-error-message">
              <svg
                className="dashboard-error-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="dashboard-loading-state">
              <div className="dashboard-loading-spinner"></div>
              <p>Loading your emails...</p>
            </div>
          ) : activeTab === "scheduled" ? (
            <div className="dashboard-data-section">
              {/* Table view for larger screens */}
              <div className="dashboard-table-wrapper">
                {scheduledEmails.length > 0 ? (
                  <table className="dashboard-emails-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Recipients</th>
                        <th>Scheduled Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledEmails.map((email) => {
                        const formattedDate = formatDate(email.scheduledAt);
                        return (
                          <tr key={email._id}>
                            <td>{email.templateName}</td>
                            <td>{email.recipients.length}</td>
                            <td>
                              <div className="dashboard-date-time">
                                <div>{formattedDate.date}</div>
                                <div>{formattedDate.time}</div>
                              </div>
                            </td>
                            <td>{getStatusBadge(email.status)}</td>
                            <td>
                              {email.status === "scheduled" ? (
                                <button
                                  className="dashboard-action-button dashboard-cancel-button"
                                  onClick={() => handleCancelEmail(email._id)}
                                  disabled={cancellingId === email._id}
                                >
                                  {cancellingId === email._id
                                    ? "Cancelling..."
                                    : "Cancel"}
                                </button>
                              ) : (
                                <span className="dashboard-no-actions">
                                  {email.status === "cancelled"
                                    ? "Cancel Succesful"
                                    : email.status === "sent"
                                    ? "Sent"
                                    : "Delivered"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="dashboard-empty-state">
                    <svg
                      className="dashboard-empty-icon"
                      viewBox="0 0 24 24"
                      width="48"
                      height="48"
                    >
                      <path
                        fill="currentColor"
                        d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
                      />
                    </svg>
                    <p>No scheduled emails found</p>
                  </div>
                )}
              </div>

              {/* Card view for smaller screens */}
              <div className="dashboard-cards-grid dashboard-scheduled-cards">
                {scheduledEmails.map((email) => {
                  const formattedDate = formatDate(email.scheduledAt);
                  return (
                    <div key={email._id} className="dashboard-email-card">
                      <div className="dashboard-card-header">
                        <h3 className="dashboard-card-title">
                          {email.templateName}
                        </h3>
                        <div className="dashboard-card-status">
                          {getStatusBadge(email.status)}
                        </div>
                      </div>
                      <div className="dashboard-card-content">
                        <div className="dashboard-card-row">
                          <span className="dashboard-card-label">
                            Recipients:
                          </span>
                          <span className="dashboard-card-value">
                            {email.recipients.length}
                          </span>
                        </div>
                        <div className="dashboard-card-row">
                          <span className="dashboard-card-label">
                            Scheduled:
                          </span>
                          <div className="dashboard-date-time">
                            <div>{formattedDate.date}</div>
                            <div>{formattedDate.time}</div>
                          </div>
                        </div>
                      </div>
                      <div className="dashboard-card-actions">
                        {email.status === "scheduled" ? (
                          <button
                            className="dashboard-action-button dashboard-cancel-button"
                            onClick={() => handleCancelEmail(email._id)}
                            disabled={cancellingId === email._id}
                          >
                            {cancellingId === email._id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        ) : (
                          <span className="dashboard-no-actions">
                            {email.status === "cancelled"
                              ? "Cancel Succesful"
                              : email.status === "sent"
                              ? "Sent"
                              : "Delivered"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="dashboard-data-section">
              {/* Email History - Always cards */}
              {emailHistory.length > 0 ? (
                <div className="dashboard-cards-grid dashboard-history-cards">
                  {emailHistory.map((email) => {
                    const formattedDate = formatDate(email.sentAt);
                    const sendType = email.isScheduled
                      ? "Scheduled"
                      : "Instant";
                    return (
                      <div key={email._id} className="dashboard-history-card">
                        <div className="dashboard-card-header">
                          <h3 className="dashboard-card-title">
                            {email.templateName}
                          </h3>
                          <div className="dashboard-card-status">
                            {getStatusBadge(email.status)}
                          </div>
                        </div>
                        <div className="dashboard-card-content">
                          <div className="dashboard-card-row">
                            <span className="dashboard-card-label">
                              Recipients:
                            </span>
                            <span className="dashboard-card-value">
                              {email.recipients.length}
                            </span>
                          </div>
                          <div className="dashboard-card-row">
                            <span className="dashboard-card-label">Date:</span>
                            <div className="dashboard-date-time">
                              <div>{formattedDate.date}</div>
                            </div>
                          </div>
                          <div className="dashboard-card-row">
                            <span className="dashboard-card-label">Time(24h):</span>
                            <div className="dashboard-date-time">
                              <div>{formattedDate.time}</div>
                            </div>
                          </div>
                          <div className="dashboard-card-row">
                            <span className="dashboard-card-label">Type:</span>
                            <span
                              className={`dashboard-card-value dashboard-type-${sendType}`}
                            >
                              {sendType}
                            </span>
                          </div>

                          {email.templateContent && (
                            <div className="dashboard-email-preview">
                              <div className="dashboard-preview-content">
                                <div
                                  className="dashboard-email-template"
                                  dangerouslySetInnerHTML={{
                                    __html: email.templateContent,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <svg
                    className="dashboard-empty-icon"
                    viewBox="0 0 24 24"
                    width="48"
                    height="48"
                  >
                    <path
                      fill="currentColor"
                      d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
                    />
                  </svg>
                  <p>No email history found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
