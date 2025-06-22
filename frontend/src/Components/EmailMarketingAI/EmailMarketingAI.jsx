import { Link } from "react-router-dom";
import "./EmailMarketingAI.css";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef } from "react";


const EmailMarketingAI = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-10, 0, 10]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div 
      ref={ref}
      className="email-container"
      style={{ 
        y,
        rotateY,
        scale,
        opacity,
        transformStyle: "preserve-3d",
        perspective: 1200
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="email-content-wrapper">
        <motion.div 
          className="email-content-section"
          initial={{ x: -150, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -150, opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
        >
          <div className="email-text-container">
            <motion.span 
              className="email-beta-tag"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.5, delay: 0.5, type: "spring" }}
            >
              Beta
            </motion.span>
            
            <motion.h1 
              className="email-heading"
              initial={{ y: 60, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              Let AI Assist write the{" "}
              <span className="email-highlight">first draft</span>
            </motion.h1>

            <motion.p 
              className="email-description"
              initial={{ y: 40, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Deliver relevant content faster when you let AI generate on-brand
              emaills and copy. You only need to review, edit, and send.
            </motion.p>

            <motion.div 
              className="email-features"
              initial={{ y: 30, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <p>Our emaill marketing AI helps you:</p>
              <ul className="email-features-list">
                {[
                  "Generate compelling emaill campaigns in seconds",
                  "Answer queries about campaign performance", 
                  "Optimize subject lines for higher open rates",
                  "Create personalized content for different audience segments"
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={isInView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="ask-ai-button"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              transition={{ duration: 0.5, delay: 1.6 }}
            >
              <Link to="/ask-ai" style={{ textDecoration: 'none' }}>
                <motion.button 
                  className="email-generate-button"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(37, 85, 235, 0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Generate emaills <span className="email-arrow">→</span>
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="email-image-container"
          initial={{ x: 150, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: 150, opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          whileHover={{ 
            rotateY: -5,
            scale: 1.02,
            transition: { duration: 0.3 }
          }}
        >
          <motion.img
            src="/Marketing_AI.png"
            alt="emaill Marketing AI Interface"
            className="email-hero-image"
            style={{
              transformStyle: "preserve-3d"
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EmailMarketingAI;
