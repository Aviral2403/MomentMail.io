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
  const [calendarView, setCalendarView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [emailDetails, setEmailDetails] = useState(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentEmailId, setCurrentEmailId] = useState(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");
  const [tags, setTags] = useState({});
  const [currentWeek, setCurrentWeek] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo || !userInfo.token) {
        setIsAuthenticated(false);
        setError("Please login to access the dashboard");
      } else {
        setIsAuthenticated(true);
        const savedTags = JSON.parse(localStorage.getItem("email-tags") || "{}");
        setTags(savedTags);
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
        } else if (activeTab === "history") {
          const response = await getEmailHistory();
          setEmailHistory(response.emailHistory || []);
        } else if (activeTab === "calendar") {
          const scheduledResponse = await getScheduledEmails();
          const historyResponse = await getEmailHistory();
          setScheduledEmails(scheduledResponse.scheduledEmails || []);
          setEmailHistory(historyResponse.emailHistory || []);
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

  useEffect(() => {
    if (calendarView) {
      setCurrentWeek(getCurrentWeekOfMonth());
    }
  }, [calendarView]);

  const getCurrentWeekOfMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const dayOfMonth = today.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay();
    return Math.floor((firstDayOfWeek + dayOfMonth - 1) / 7);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fullDate: date,
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

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const getWeeksInMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(month, year);
    return Math.ceil((firstDay + daysInMonth) / 7);
  };

  const getWeekDates = (weekIndex, month, year) => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startDate = weekIndex * 7 - firstDayOfMonth + 1;
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(year, month, startDate + i);
      dates.push(date);
    }

    return dates;
  };

  const renderWeeklyCalendar = () => {
    const weeksInMonth = getWeeksInMonth(currentMonth, currentYear);
    const adjustedWeek = currentWeek >= weeksInMonth ? weeksInMonth - 1 : currentWeek;
    const weekDates = getWeekDates(adjustedWeek, currentMonth, currentYear);

    const timeSlots = [
      { label: "12AM", hour: 0 },
      { label: "3AM", hour: 3 },
      { label: "6AM", hour: 6 },
      { label: "9AM", hour: 9 },
      { label: "12PM", hour: 12 },
      { label: "3PM", hour: 15 },
      { label: "6PM", hour: 18 },
      { label: "9PM", hour: 21 }
    ];

    return (
      <div className="horizontal-calendar-container">
        <div className="horizontal-calendar">
          <div className="time-column">
            <div className="time-header">Time</div>
            {timeSlots.map((slot, index) => (
              <div key={`time-${index}`} className="time-slot">
                {slot.label}
              </div>
            ))}
          </div>

          {weekDates.map((date, dayIndex) => {
            const day = date.getDate();
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={`day-${dayIndex}`}
                className={`day-column ${isToday ? 'calendar-today' : ''} ${!isCurrentMonth ? 'calendar-other-month' : ''}`}
              >
                <div className="day-header">
                  <div className="calendar-weekday">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]}</div>
                  <div className="calendar-day-number">{day}</div>
                  {!isCurrentMonth && (
                    <div className="calendar-month-indicator">
                      {date.toLocaleDateString('default', { month: 'short' })}
                    </div>
                  )}
                </div>

                {timeSlots.map((slot, timeIndex) => {
                  const slotScheduledEmails = scheduledEmails.filter(email => {
                    const emailDate = new Date(email.scheduledAt);
                    const emailHour = emailDate.getHours();
                    return (
                      emailDate.getDate() === day &&
                      emailDate.getMonth() === date.getMonth() &&
                      emailDate.getFullYear() === date.getFullYear() &&
                      emailHour >= slot.hour &&
                      emailHour < slot.hour + 3
                    );
                  });

                  const slotHistoryEmails = emailHistory.filter(email => {
                    if (email.scheduledAt) return false; // Exclude scheduled emails from history
                    const emailDate = new Date(email.sentAt);
                    const emailHour = emailDate.getHours();
                    return (
                      emailDate.getDate() === day &&
                      emailDate.getMonth() === date.getMonth() &&
                      emailDate.getFullYear() === date.getFullYear() &&
                      emailHour >= slot.hour &&
                      emailHour < slot.hour + 3
                    );
                  });

                  return (
                    <div key={`slot-${dayIndex}-${timeIndex}`} className="time-slot-cell">
                      <div className="time-slot-content">
                        {slotScheduledEmails.map((email, emailIndex) => {
                          const emailTag = tags[email._id];
                          const formattedTime = formatDate(email.scheduledAt).time;

                          return (
                            <div
                              key={`email-scheduled-${dayIndex}-${timeIndex}-${emailIndex}`}
                              className="calendar-event scheduled-event"
                              style={{
                                backgroundColor: emailTag ? `${emailTag.color}20` : 'rgba(245, 158, 11, 0.1)',
                                borderLeft: `3px solid ${emailTag?.color || '#f59e0b'}`
                              }}
                              onClick={() => handleEmailClick(email)}
                            >
                              <div className="calendar-event-time">{formattedTime}</div>
                              <div className="calendar-event-title">
                                {email.templateName.length > 15
                                  ? `${email.templateName.substring(0, 15)}...`
                                  : email.templateName}
                              </div>
                              {emailTag && (
                                <div
                                  className="calendar-event-tag"
                                  style={{ backgroundColor: emailTag.color }}
                                >
                                  {emailTag.name}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {slotHistoryEmails.map((email, emailIndex) => {
                          const emailTag = tags[email._id];
                          const formattedTime = formatDate(email.sentAt).time;

                          return (
                            <div
                              key={`email-history-${dayIndex}-${timeIndex}-${emailIndex}`}
                              className="calendar-event"
                              style={{
                                backgroundColor: emailTag ? `${emailTag.color}20` : 'rgba(59, 130, 246, 0.1)',
                                borderLeft: `3px solid ${emailTag?.color || '#3b82f6'}`
                              }}
                              onClick={() => handleEmailClick(email)}
                            >
                              <div className="calendar-event-time">{formattedTime}</div>
                              <div className="calendar-event-title">
                                {email.templateName.length > 15
                                  ? `${email.templateName.substring(0, 15)}...`
                                  : email.templateName}
                              </div>
                              {emailTag && (
                                <div
                                  className="calendar-event-tag"
                                  style={{ backgroundColor: emailTag.color }}
                                >
                                  {emailTag.name}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleEmailClick = (email) => {
    setEmailDetails(email);
  };

  const closeEmailDetails = () => {
    setEmailDetails(null);
  };

  const handleMonthChange = (increment) => {
    let newMonth = currentMonth + increment;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setCurrentWeek(0);
  };

  const handleWeekChange = (increment) => {
    const weeksInMonth = getWeeksInMonth(currentMonth, currentYear);
    let newWeek = currentWeek + increment;

    if (newWeek < 0) {
      handleMonthChange(-1);
      setCurrentWeek(getWeeksInMonth(currentMonth - 1 < 0 ? 11 : currentMonth - 1, currentYear) - 1);
    } else if (newWeek >= weeksInMonth) {
      handleMonthChange(1);
      setCurrentWeek(0);
    } else {
      setCurrentWeek(newWeek);
    }
  };

  const handleAddTag = (emailId) => {
    setCurrentEmailId(emailId);
    setShowTagModal(true);
  };

  const saveTag = () => {
    if (!tagName.trim() || !currentEmailId) return;

    const newTags = {
      ...tags,
      [currentEmailId]: {
        name: tagName.trim(),
        color: tagColor
      }
    };

    setTags(newTags);
    localStorage.setItem("email-tags", JSON.stringify(newTags));
    setShowTagModal(false);
    setTagName("");
    setTagColor("#3b82f6");
  };

  const removeTag = (emailId) => {
    const newTags = { ...tags };
    delete newTags[emailId];
    setTags(newTags);
    localStorage.setItem("email-tags", JSON.stringify(newTags));
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
                    d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h-2v-2h2v2zm0-4h-2V7h2v6z"
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
                activeTab === "scheduled" && !calendarView ? "dashboard-tab-active" : ""
              }`}
              onClick={() => {
                setActiveTab("scheduled");
                setCalendarView(false);
              }}
            >
              Scheduled
            </button>
            <button
              className={`dashboard-tab-button ${
                activeTab === "history" && !calendarView ? "dashboard-tab-active" : ""
              }`}
              onClick={() => {
                setActiveTab("history");
                setCalendarView(false);
              }}
            >
              History
            </button>
            <button
              className={`dashboard-tab-button ${
                calendarView ? "dashboard-tab-active" : ""
              }`}
              onClick={() => {
                setActiveTab("calendar");
                setCalendarView(true);
              }}
            >
              Calendar
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
          ) : calendarView ? (
            <div className="dashboard-calendar-view">
              <div className="calendar-header">
                <div className="calendar-nav-group">
                  <button
                    className="calendar-nav-button"
                    onClick={() => handleMonthChange(-1)}
                  >
                    &lt;
                  </button>
                  <h2 className="calendar-month-title">
                    {new Date(currentYear, currentMonth).toLocaleDateString('default', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h2>
                  <button
                    className="calendar-nav-button"
                    onClick={() => handleMonthChange(1)}
                  >
                    &gt;
                  </button>
                </div>

                <div className="calendar-week-nav">
                  <button
                    className="calendar-nav-button"
                    onClick={() => handleWeekChange(-1)}
                  >
                    &lt;
                  </button>
                  <span className="calendar-week-indicator">
                    Week {currentWeek + 1} of {getWeeksInMonth(currentMonth, currentYear)}
                  </span>
                  <button
                    className="calendar-nav-button"
                    onClick={() => handleWeekChange(1)}
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {renderWeeklyCalendar()}

              {emailDetails && (
                <div className="calendar-email-details-wrapper" onClick={closeEmailDetails}>
                  <div className="calendar-email-details" onClick={(e) => e.stopPropagation()}>
                    <button className="calendar-details-close" onClick={closeEmailDetails}>×</button>
                    <h3>{emailDetails.templateName}</h3>

                    <div className="calendar-details-content">
                      <div className="calendar-details-row">
                        <span className="calendar-details-label">Status:</span>
                        <span className="calendar-details-value">{getStatusBadge(emailDetails.status)}</span>
                      </div>
                      <div className="calendar-details-row">
                        <span className="calendar-details-label">Recipients:</span>
                        <span className="calendar-details-value">{emailDetails.recipients.length}</span>
                      </div>
                      <div className="calendar-details-row">
                        <span className="calendar-details-label">Time:</span>
                        <span className="calendar-details-value">{formatDate(emailDetails.scheduledAt || emailDetails.sentAt).time}</span>
                      </div>
                      <div className="calendar-details-row">
                        <span className="calendar-details-label">Date:</span>
                        <span className="calendar-details-value">{formatDate(emailDetails.scheduledAt || emailDetails.sentAt).date}</span>
                      </div>
                      {emailDetails.isScheduled !== undefined && (
                        <div className="calendar-details-row">
                          <span className="calendar-details-label">Type:</span>
                          <span className="calendar-details-value">{emailDetails.isScheduled ? "Scheduled" : "Instant"}</span>
                        </div>
                      )}
                    </div>

                    <div className="calendar-details-actions">
                      {tags[emailDetails._id] ? (
                        <button
                          className="calendar-tag-button calendar-remove-tag"
                          onClick={() => removeTag(emailDetails._id)}
                        >
                          Remove Tag
                        </button>
                      ) : (
                        <button
                          className="calendar-tag-button calendar-add-tag"
                          onClick={() => handleAddTag(emailDetails._id)}
                        >
                          Add Tag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showTagModal && (
                <div className="calendar-tag-modal">
                  <div className="calendar-tag-modal-content">
                    <h3>Add Tag to Campaign</h3>
                    <div className="tag-input-group">
                      <label>Tag Name:</label>
                      <input
                        type="text"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        placeholder="Enter tag name"
                      />
                    </div>
                    <div className="tag-input-group">
                      <label>Tag Color:</label>
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                      />
                    </div>
                    <div className="tag-modal-actions">
                      <button
                        className="tag-modal-cancel"
                        onClick={() => setShowTagModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="tag-modal-save"
                        onClick={saveTag}
                      >
                        Save Tag
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "scheduled" ? (
            <div className="dashboard-data-section">
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
                                    ? "Cancel Successful"
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
                              ? "Cancel Successful"
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
