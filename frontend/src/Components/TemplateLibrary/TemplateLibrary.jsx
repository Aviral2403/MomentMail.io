import "./TemplateLibrary.css";

const TemplateLibrary = () => {
  return (
    <div className="template-lib-container">
      <div className="template-lib-content-wrapper">
        <div className="template-lib-image-container">
          <img
            src="/Email_Templates.png"
            alt="Email template hero"
            className="template-lib-hero-image"
          />
        </div>

        <div className="template-lib-text-container">
          <h1 className="template-lib-heading">
            <span>One Library.{" "}</span>
            <span className="template-lib-highlight">Endless Templates.</span>{" "}
            <span>Zero Stress.</span>
          </h1>

          <p className="template-lib-description">
          Bold or classic, playful or professional—we’ve got a template for every kind of email, so your messages always hit the mark!Big sale? Office update? Birthday shoutout? We’ve got beautifully designed templates to make sure your emails shine—every single time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
