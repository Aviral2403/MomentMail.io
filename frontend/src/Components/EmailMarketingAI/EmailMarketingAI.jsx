import { Link } from "react-router-dom";
import "./EmailMarketingAI.css";

const EmailMarketingAI = () => {
  return (
    <div className="emai-container">
      <div className="emai-content-wrapper">
        <div className="emai-content-section">
          <div className="emai-text-container">
            <span className="emai-beta-tag">Beta</span>
            <h1 className="emai-heading">
              Let AI Assist write the{" "}
              <span className="emai-highlight">first draft</span>
            </h1>

            <p className="emai-description">
              Deliver relevant content faster when you let AI generate on-brand
              emails and copy. You only need to review, edit, and send.
            </p>

            <div className="emai-features">
              <p>Our email marketing AI helps you:</p>
              <ul className="emai-features-list">
                <li>Generate compelling email campaigns in seconds</li>
                <li>Answer queries about campaign performance</li>
                <li>Optimize subject lines for higher open rates</li>
                <li>
                  Create personalized content for different audience segments
                </li>
              </ul>
            </div>

            <div className="ask-ai-button">
              <Link to="/ask-ai">
                <button className="emai-generate-button">
                  Generate emails <span className="emai-arrow">→</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="emai-image-container">
          <img
            src="/Marketing_AI.png"
            alt="Email Marketing AI Interface"
            className="emai-hero-image"
          />
        </div>
      </div>
    </div>
  );
};

export default EmailMarketingAI;
