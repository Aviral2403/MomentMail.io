import { useEffect, useState } from "react";
import DriveConnect from "../../Components/DriveConnect/DriveConnect";
import RollingGallery from "../../Components/RollingGallery/RollingGallery";
import SingleTemplate from "../../Components/SingleTemplate/SingleTemplate";
import TemplateLibrary from "../../Components/TemplateLibrary/TemplateLibrary";
import "./Templates.css";
import LoadingSkeleton from "../../Components/LoadingSkeleton/LoadingSkeleton";

const Templates = () => {

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSkeleton type="templates" />;
  }
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
