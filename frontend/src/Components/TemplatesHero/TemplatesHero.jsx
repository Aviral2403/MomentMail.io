import "./TemplatesHero.css";

const TemplatesHero = () => {
  return (
    <div className="th-container">
      <div className="th-content-wrapper">
        <div className="th-image-container">
          <img
            src="/templateshero.jpg"
            alt="Email template hero"
            className="th-hero-image"
          />
        </div>
        
        <div className="th-text-container">
          <h1 className="th-heading">
            Bulk Emailing that Simplifies, Automates,{" "}
            <span className="th-highlight">Connects Seamlessly</span>
          </h1>
          
          <p className="th-description">
            Easily send personalized bulk emails by connecting your Google
            Sheets data. Automate outreach, save time, and enhance engagement
            with a streamlined email-sending solution.{" "}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesHero;