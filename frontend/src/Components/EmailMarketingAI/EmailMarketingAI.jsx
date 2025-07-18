import { Link } from "react-router-dom";
import "./EmailMarketingAI.css";
import { useRef } from "react";


const EmailMarketingAI = () => {
  const ref = useRef(null);
 
  

  return (
    <div 
      ref={ref}
      className="email-container"
      
    >
      <div className="email-content-wrapper">
        <div 
          className="email-content-section"
         
        >
          <div className="email-text-container">
            <span 
              className="email-beta-tag"
              
            >
              Beta
            </span>
            
            <h1 
              className="email-heading"
              
            >
              Let AI Assist write the{" "}
              <span className="email-highlight">first draft</span>
            </h1>

            <p 
              className="email-description"
             
            >
              Deliver relevant content faster when you let AI generate on-brand
              emaills and copy. You only need to review, edit, and send.
            </p>

            <div 
              className="email-features"
              
            >
              <p>Our emaill marketing AI helps you:</p>
              <ul className="email-features-list">
                {[
                  "Generate compelling emaill campaigns in seconds",
                  "Answer queries about campaign performance", 
                  "Optimize subject lines for higher open rates",
                  "Create personalized content for different audience segments"
                ].map((item, index) => (
                  <li 
                    key={index}
                   
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div 
              className="ask-ai-button"
              
            >
              <Link to="/ask-ai" style={{ textDecoration: 'none' }}>
                <button 
                  className="email-generate-button"
                 
                >
                  Generate emaills <span className="email-arrow">→</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div 
          className="email-image-container"
          
        >
          <img
            src="/Marketing_AI.png"
            loading="lazy"
            alt="emaill Marketing AI Interface"
            className="email-hero-image"
           
          />
        </div>
      </div>
    </div>
  );
};

export default EmailMarketingAI;
