import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
// import Navbar from "./Navbar/Navbar";
import "./ScheduleDateTime.css";

const ScheduleDateTime = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { templateContent, emailSubject } = location.state || {};
  
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!date || !time) {
      setError("Please select both date and time");
      return;
    }
    
    const scheduledAt = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (scheduledAt <= now) {
      setError("Scheduled time must be in the future");
      return;
    }
    
    navigate(`/templates/${location.pathname.split('/')[2]}/recipients`, {
      state: {
        ...location.state,
        templateContent,
        emailSubject,
        isScheduled: true,
        scheduledAt: scheduledAt.toISOString()
      }
    });
  };

  return (
    <div className="schedule-page">
      {/* <Navbar /> */}
      <main className="schedule-main">
        <div className="schedule-container">
          <div className="schedule-steps">
            <div className="schedule-step schedule-step-active">
              <div className="schedule-step-circle">1</div>
              <span className="schedule-step-text">Schedule</span>
            </div>
            <div className="schedule-step-connector"></div>
            <div className="schedule-step">
              <div className="schedule-step-circle">2</div>
              <span className="schedule-step-text">Recipients</span>
            </div>
          </div>
          
          <h1 className="schedule-title">Schedule Your Email</h1>
          <p className="schedule-subtitle">Select when you want your email to be sent</p>
          
          {error && (
            <div className="schedule-error">
              <svg className="schedule-error-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}
          
          <form className="schedule-form" onSubmit={handleSubmit}>
            <div className="schedule-input-group">
              <label className="schedule-label">Date</label>
              <input
                type="date"
                className="schedule-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            
            <div className="schedule-input-group">
              <label className="schedule-label">Time</label>
              <input
                type="time"
                className="schedule-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            
            <div className="schedule-preview">
              <p className="schedule-preview-text">
                Email will be sent on:{" "}
                <strong>
                  {date && time ? 
                    format(new Date(`${date}T${time}`), 'MMMM d, yyyy h:mm a') : 
                    'Not selected'}
                </strong>
              </p>
            </div>
            
            <div className="schedule-actions">
              <button
                type="button"
                className="schedule-cancel-btn"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="schedule-submit-btn"
                disabled={!date || !time}
              >
                Next: Select Recipients
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ScheduleDateTime;