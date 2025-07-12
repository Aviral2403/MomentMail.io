import { useState, useRef } from "react";
import "./Demo.css";

const Demo = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  const handleCloseVideo = () => {
    setIsVideoPlaying(false);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  return (
    <div className="demo-page-container">
      <section className="demo-hero-container">
        <div className="demo-floating-images">
          <div className="demo-floating-image demo-image-1">
            <img src="/template-2233.jpg" alt="Image 1" />
          </div>
          <div className="demo-floating-image demo-image-2">
            <img src="/template-1122.webp" alt="Image 2" />
          </div>
          <div className="demo-floating-image demo-image-3">
            <img src="/bento-2.png" alt="Image 3" />
          </div>
          <div className="demo-floating-image demo-image-4">
            <img src="/bento-1.png" alt="Image 4" />
          </div>
        </div>

        <div className="demo-hero-content">
          <h1 className="demo-hero-title">
            Build. Send. Automate.
            <span className="demo-gradient-text"> Repeat.</span>
          </h1>

          <p className="demo-hero-subtitle">
            Go from idea to inbox in minutes. Craft, schedule, and track bulk
            emails effortlessly with smart templates and a streamlined dashboard
            built to simplify your outreach workflow.
          </p>

          <div className="demo-hero-buttons">
            <button className="demo-btn-primary" onClick={handlePlayVideo}>
              View Demo
            </button>
          </div>
        </div>
      </section>

      

      {/* Video Section */}
      <section className="demo-video-section">
        
        <div className="demo-video-container">
            
          <div className="demo-video-preview" onClick={handlePlayVideo}>
            <div className="demo-video-thumbnail">
              {/* ADD YOUR THUMBNAIL IMAGE HERE */}
              <img 
                src="/demo-thumbnail.png" 
                alt="Video thumbnail" 
                className="demo-video-thumbnail-image" 
              />
              <div className="demo-video-play-button">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle
                    cx="40"
                    cy="40"
                    r="40"
                    fill="rgba(255, 255, 255, .75)"
                  />
                  <path d="M32 25L58 40L32 55V25Z" fill="rgba(37, 60, 235, 0.93)" />
                </svg>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoPlaying && (
        <div className="demo-video-modal">
          {/* Hero Background Overlay */}
          <div className="demo-video-modal-hero-bg">
            <div className="demo-floating-images">
              <div className="demo-floating-image demo-image-1">
                <img src="/template-2233.jpg" alt="Image 1" />
              </div>
              <div className="demo-floating-image demo-image-2">
                <img src="/template-1122.webp" alt="Image 2" />
              </div>
              <div className="demo-floating-image demo-image-3">
                <img src="/bento-2.png" alt="Image 3" />
              </div>
              <div className="demo-floating-image demo-image-4">
                <img src="/bento-1.png" alt="Image 4" />
              </div>
            </div>
          </div>

          <div className="demo-video-modal-content">
            <button className="demo-video-close" onClick={handleCloseVideo}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="demo-video-player">
              <video
                ref={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="demo-video-element"
              >
                <source
                  src="https://res.cloudinary.com/dmeszvzou/video/upload/v1752323442/Mockup_Main_xof072.mov"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
        
      )}
      </div>
  );
};

export default Demo;