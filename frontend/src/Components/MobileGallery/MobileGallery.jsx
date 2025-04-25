/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./MobileGallery.css";

const MobileGallery = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [images.length]);
  
  return (
    <div className="mobile-gallery-container">
      {/* Static gradient overlays */}
      <div className="gallery-gradient gallery-gradient-left"></div>
      <div className="gallery-gradient gallery-gradient-right"></div>
      
      <div className="gallery-wrapper">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            className="mobile-gallery-item"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{
              type: "tween",
              duration: 1.2,
              ease: "easeInOut"
            }}
          >
            <img
              src={images[currentIndex]}
              alt={`gallery-${currentIndex}`}
              className="mobile-gallery-img"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      
    </div>
  );
};

export default MobileGallery;