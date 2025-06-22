import { useRef } from "react";
import "./TemplatesHero.css";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';


const TemplatesHero = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div 
      ref={ref}
      className="th-container"
      style={{ 
        y,
        rotateX,
        scale,
        opacity,
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      initial={{ opacity: 0, y: 100 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="th-content-wrapper">
        <motion.div 
          className="th-image-container"
          initial={{ x: -100, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          whileHover={{ 
            scale: 1.05, 
            rotateY: 5,
            transition: { duration: 0.3 }
          }}
        >
          <motion.img
            src="/templateshero.jpg"
            alt="Email template hero"
            className="th-hero-image"
            style={{
              transformStyle: "preserve-3d"
            }}
          />
        </motion.div>
                
        <motion.div 
          className="th-text-container"
          initial={{ x: 100, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: 100, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.h1 
            className="th-heading"
            initial={{ y: 50, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Bulk Emailing that Simplifies, Automates,{" "}
            <span className="th-highlight">Connects Seamlessly</span>
          </motion.h1>
                    
          <motion.p 
            className="th-description"
            initial={{ y: 30, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Easily send personalized bulk emails by connecting your Google
            Sheets data. Automate outreach, save time, and enhance engagement
            with a streamlined email-sending solution.{" "}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TemplatesHero;