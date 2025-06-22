import React, { useState, useEffect, useRef } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.4,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <div className="mm-dark-container" ref={sectionRef}>
      <main className="mm-dark-main-wrapper">
        <div className={`mm-dark-hero-block ${isVisible ? 'mm-animate-in' : 'mm-animate-out'}`}>
          <p className="mm-dark-top-subtitle">Send Bulk Emails Effortlessly with Google Sheets Data</p>
          <h1 className="mm-dark-primary-heading">
            Effortless & Seamless Way to <br />
            Send <span className="mm-dark-blue-highlight">Bulk Emails</span>
          </h1>
         
          <button className="mm-dark-try-button">Try for Free</button>
        </div>
      </main>
    </div>
  );
};

export default HeroSection;
