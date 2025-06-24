import { useEffect, useState } from "react";
import DriveConnect from "../../Components/DriveConnect/DriveConnect";
import RollingGallery from "../../Components/RollingGallery/RollingGallery";
import SingleTemplate from "../../Components/SingleTemplate/SingleTemplate";
import TemplateLibrary from "../../Components/TemplateLibrary/TemplateLibrary";
import "./Templates.css";
import LoadingSkeleton from "../../Components/LoadingSkeleton/LoadingSkeleton";

const Templates = () => {
  const [loading, setLoading] = useState(true);

  const handleOwnTemplate = () => {
    const ownTemplateSection = document.getElementById('ownTemplate');
    if (ownTemplateSection) {
      ownTemplateSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

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
      
      <div className="video-section">
        <video 
          className="templates-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="https://res.cloudinary.com/dmeszvzou/video/upload/v1750680552/marketing_fwsotb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div className="choose-create">
        <div className="choose-line">
          <div className="line-wrapper">
            <span className="choose-text">Choose From</span>
            <span className="library-text">Library</span>
          </div>
        </div>
        <div className="create-line" onClick={handleOwnTemplate}>
          <div className="line-wrapper">
            <span className="create-text">Create Your</span>
            <span className="template-text" >Template</span>
          </div>
        </div>
      </div>
      
      {/* Add id to the SingleTemplate section for smooth scrolling */}
      <div id="templates-section">
        <SingleTemplate />
      </div>
      
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