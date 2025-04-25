import { useRef } from "react";
import { Link } from "react-router-dom";
import RotatingText from "../../Components/RotatingText/RotatingText";
import DualScroll from "../../Components/DualScroll/DualScroll";
import Workflow from "../../Components/Workflow/Workflow";
import "./HomePage.css";
import HeroSection from "../../Components/HeroSection/HeroSection";
import TemplatesHero from "../../Components/TemplatesHero/TemplatesHero";
import EmailMarketingAI from "../../Components/EmailMarketingAI/EmailMarketingAI";

const HomePage = () => {
  const rotatingTextRef = useRef();

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <div className="hero-text-wrapper">
            <h1 className="hero-title-container">
              <span className="static-text">Sending Emails Made</span>
              <div className="rotating-text-container">
                <span className="gradient-text">
                  <RotatingText
                    ref={rotatingTextRef}
                    texts={[
                      "Effortless!",
                      "Effective!",
                      "Efficient!",
                      "Simple!",
                    ]}
                    mainClassName="rotating-text-highlight"
                    staggerFrom="last"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    staggerDuration={0.025}
                    transition={{
                      type: "spring",
                      damping: 30,
                      stiffness: 400,
                    }}
                    rotationInterval={2000}
                  />
                </span>
              </div>
            </h1>
          </div>
          <h3 className="hero-subtitle">
            Stop Copy-Pasting, Start Automating –{" "}
            <span>Email Everyone in One Click!</span>
          </h3>
        </div>

        <DualScroll />
        
        <HeroSection />

        <Workflow />

        <TemplatesHero/>

        <EmailMarketingAI/>

        <div className="features-grid">
          {[
            {
              title: "Easy to Use",
              description:
                "With just three simple steps, you can set up and send bulk emails effortlessly. No technical expertise required – just choose your template, upload your contacts, and hit send!",
              number: "01",
            },
            {
              title: "Customizable",
              description:
                "Personalize templates to match your brand. Customize fonts, colors, and layouts to create professional emails that resonate with your audience.",
              number: "02",
            },
            {
              title: "Time Saving",
              description:
                "Automate your email workflow in minutes without manual effort. Streamline your communication process and focus on what truly matters—growing your business!",
              number: "03",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className={`feature-item ${index % 2 !== 0 ? "reverse" : ""}`}
            >
              <div className="feature-title">{feature.title}</div>
              <div className="feature-description">{feature.description}</div>
            </div>
          ))}
        </div>

        <div className="tagline">
          <p className="text-xl">
            Send Mails In A{" "}
            <span className="moment-wrapper">
              <span className="letter">Moment</span>
            </span>{" "}
            Using{" "}
            <span className="brand-name">
              <span className="momentmail">MomentMail</span>
            </span>
          </p>
        </div>

        <div className="cta-section">
          <button className="cta-button">
            <Link to="/templates">Get Started</Link>
          </button>
          <p className="cta-subtitle">No credit card required *</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
