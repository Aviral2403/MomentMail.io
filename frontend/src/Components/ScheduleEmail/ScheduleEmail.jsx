import "./ScheduleEmail.css";

const ScheduleEmail = () => {
  return (
    <div className="schedule-email-container">
      <div className="schedule-email-content-wrapper">

      <div className="schedule-email-image-container">
          <img
            src="/schedule.png"
            alt="emaill Marketing AI Interface"
            className="schedule-email-hero-image"
          />
        </div>
        <div className="schedule-email-content-section">
          <div className="schedule-email-text-container">
            <h1 className="schedule-email-heading">
            <span className="schedule-plan">Plan ahead. Save time.</span> Reach everyone—<span className="schedule-plan">right on time.</span>
            </h1>

            <p className="schedule-email-description">
            Take control of your outreach by scheduling email campaigns in advance and sending them in bulk at the perfect moment. Whether it’s a product launch, weekly newsletter, or a time-sensitive offer, our scheduling feature ensures your messages hit inboxes exactly when they need to.
            </p>

            {/* <div className="schedule-email-features">
              <p>Our emaill marketing AI helps you:</p>
              <ul className="schedule-email-features-list">
                <li>Generate compelling emaill campaigns in seconds</li>
                <li>Answer queries about campaign performance</li>
                <li>Optimize subject lines for higher open rates</li>
                <li>
                  Create personalized content for different audience segments
                </li>
              </ul>
            </div> */}

            
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default ScheduleEmail;
