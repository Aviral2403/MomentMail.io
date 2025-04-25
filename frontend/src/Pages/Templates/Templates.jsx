import DriveConnect from "../../Components/DriveConnect/DriveConnect";
import RollingGallery from "../../Components/RollingGallery/RollingGallery";
import SingleTemplate from "../../Components/SingleTemplate/SingleTemplate";
import TemplateLibrary from "../../Components/TemplateLibrary/TemplateLibrary";
import "./Templates.css";

const Templates = () => {
  return (
    <div className="templates-page">
      <div className="email-templates-container">
        <DriveConnect />
        <RollingGallery autoplay={true} pauseOnHover={true} />
      </div>
      <div>
        <TemplateLibrary />
      </div>

      <div className="choose-create">
        <div className="choose-line">
          <div className="line-wrapper">
            <span className="choose-text">Choose From</span>
            <span className="library-text">Library</span>
          </div>
        </div>
        <div className="create-line">
          <div className="line-wrapper">
            <span className="create-text">Create Your</span>
            <span className="template-text">Template</span>
          </div>
        </div>
      </div>

      <SingleTemplate />

      {/* <div className="template-ai-container">
        <div className="template-ai-content-wrapper">
          <div className="template-ai-text-container">
            <h1 className="template-ai-heading">
              <span>Hit a Writer's Block? </span>
              <span>Difficulty thinking content for Email?</span>
              <span>Stuck Staring at a Blank Email?</span>
              <span className="template-ai-highlight">
                We Got You Covered!
              </span>{" "}
            </h1>

            <p className="template-ai-description">
              Stuck in a content rut? No worries—our Ask AI feature will whip up
              the perfect email for you in seconds!Don’t let writer’s block slow
              you down. Just type in your idea, and our AI will do the rest!Say
              goodbye to blank pages and hello to instant email content—just Ask
              AI!
            </p>
          </div>

          <div className="template-ai-image-container">
            <img
              src="/ask-ai-1.jpg"
              alt="Ask AI"
              className="template-ai-hero-image"
            />
          </div>
        </div>
      </div> */}

      <div className="template-message">
        <div>
          <span>Emails That-</span> Land ,
        </div>
        <div>
          <span>Messages That-</span> Matter
        </div>
      </div>
    </div>
  );
};

export default Templates;
