import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./ScheduleDateTime.css";

const ScheduleDateTime = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { templateContent, emailSubject } = location.state || {};
  
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [error, setError] = useState("");

  // Format time for display
  const formatTime = (date) => {
    if (!date) return "";
    return format(date, "h:mm aa");
  };

  // Combine date and time for submission
  const getCombinedDateTime = () => {
    if (!date || !time) return null;
    
    const combinedDate = new Date(date);
    const timeDate = new Date(time);
    
    combinedDate.setHours(
      timeDate.getHours(),
      timeDate.getMinutes(),
      0
    );
    
    return combinedDate;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!date || !time) {
      setError("Please select both date and time");
      return;
    }
    
    const scheduledAt = getCombinedDateTime();
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

  // Custom date input component
  const CustomDateInput = ({ value, onClick }) => (
    <div className="schedule-input-wrapper">
      <input
        type="text"
        className="schedule-input"
        value={value}
        onClick={onClick}
        readOnly
        placeholder="Select date"
      />
      <div className="schedule-input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="#a0a0a0">
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
        </svg>
      </div>
    </div>
  );

  // Custom time input component
  const CustomTimeInput = ({ value, onClick }) => (
    <div className="schedule-input-wrapper">
      <input
        type="text"
        className="schedule-input"
        value={value}
        onClick={onClick}
        readOnly
        placeholder="Select time"
      />
      <div className="schedule-input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="#a0a0a0">
          <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
        </svg>
      </div>
    </div>
  );

  // Generate array of past times to exclude
  const getExcludedTimes = () => {
    // Only apply exclusions if the selected date is today
    if (!date || date.toDateString() !== new Date().toDateString()) {
      return [];
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const excludedTimes = [];
    
    // Generate all time slots for past hours (completely in the past)
    for (let hour = 0; hour < currentHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        excludedTimes.push(new Date(new Date().setHours(hour, minute, 0, 0)));
      }
    }
    
    // Handle the current hour based on minutes
    for (let minute = 0; minute < 60; minute += 5) {
      if (minute <= currentMinute) {
        excludedTimes.push(new Date(new Date().setHours(currentHour, minute, 0, 0)));
      }
    }
    
    return excludedTimes;
  };

  return (
    <div className="schedule-page">
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
              <DatePicker
                selected={date}
                onChange={date => setDate(date)}
                dateFormat="MMMM d, yyyy"
                minDate={new Date()}
                customInput={<CustomDateInput />}
                calendarClassName="schedule-datepicker-calendar"
                popperClassName="schedule-datepicker-popper"
                wrapperClassName="schedule-datepicker-wrapper"
                popperPlacement="bottom"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                excludeTimes={[new Date()]}
              />
            </div>
            
            <div className="schedule-input-group">
              <label className="schedule-label">Time</label>
              <DatePicker
                selected={time}
                onChange={time => setTime(time)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={5}
                timeCaption="Time"
                dateFormat="h:mm aa"
                customInput={<CustomTimeInput />}
                calendarClassName="schedule-datepicker-calendar schedule-timepicker-calendar"
                popperClassName="schedule-datepicker-popper"
                wrapperClassName="schedule-datepicker-wrapper"
                popperPlacement="bottom"
                excludeTimes={getExcludedTimes()}
              />
            </div>
            
            <div className="schedule-preview">
              <p className="schedule-preview-text">
                Email will be sent on:{" "}
                <strong>
                  {date && time ? 
                    format(getCombinedDateTime(), 'MMMM d, yyyy h:mm a') : 
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