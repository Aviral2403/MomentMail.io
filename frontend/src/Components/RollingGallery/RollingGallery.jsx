/* eslint-disable react/prop-types */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useAnimation, useTransform } from "framer-motion";
import "./RollingGallery.css";
import MobileGallery from "../MobileGallery/MobileGallery";

const IMGS = [
  "template-1.webp",
  "template-7.jpg",
  "template-4.webp",
  // "template-5.jpg",
  // "template-6.jpeg",
  "template-9.jpg",
  "template-10.webp",
  // "templates-1.webp",
  // "templates-2.webp",
  "templates-3.webp",
  // "templates-4.webp",




];

const RollingGallery = ({ autoplay = false, pauseOnHover = false, images = [] }) => {
  images = IMGS;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 520);
  const [isPaused, setIsPaused] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    visibleImages: window.innerWidth > 1024 ? 3 : window.innerWidth > 768 ? 2 : 1,
    cylinderWidth: window.innerWidth > 1024 ? 2400 : window.innerWidth > 768 ? 1800 : 1200
  });

  const rotation = useMotionValue(0);
  const controls = useAnimation();
  const autoplayRef = useRef();
  const transform = useTransform(rotation, (value) => `rotate3d(0, 1, 0, ${value}deg)`);

  const calculateDimensions = () => {
    const width = window.innerWidth;
    setIsMobile(width <= 520);
    const visibleImages = width > 1024 ? 3 : width > 768 ? 2 : 1;
    const cylinderWidth = width > 1024 ? 2400 : width > 768 ? 1800 : 1200;
    
    setScreenSize({
      width,
      visibleImages,
      cylinderWidth
    });
  };

  useEffect(() => {
    calculateDimensions();
    window.addEventListener("resize", calculateDimensions);
    return () => window.removeEventListener("resize", calculateDimensions);
  }, []);

  const startAutoplay = () => {
    if (!isMobile && autoplay && !isPaused) {
      // Set up continuous rotation animation
      controls.start({
        rotateY: [rotation.get(), rotation.get() - 360],
        transition: { 
          duration: 25, // Slow continuous rotation that takes 30 seconds for full 360°
          ease: "linear", // Linear for continuous smooth rotation
          repeat: Infinity, // Loop infinitely
          repeatType: "loop"
        },
      });
    }
  };

  useEffect(() => {
    if (!isMobile && autoplay && !isPaused) {
      startAutoplay();
    }
    return () => controls.stop();
  }, [autoplay, isPaused, rotation, controls, images.length, isMobile]);

  if (isMobile) {
    return <MobileGallery images={images} />;
  }

  const faceCount = images.length;
  const faceWidth = (screenSize.cylinderWidth / faceCount) * 1.5;
  const dragFactor = 0.03; // Reduced for smoother manual rotation
  const radius = screenSize.cylinderWidth / (2 * Math.PI);

  const handleDrag = (_, info) => {
    rotation.set(rotation.get() + info.offset.x * dragFactor);
  };

  const handleDragEnd = (_, info) => {
    if (autoplay) {
      // Resume continuous rotation after drag
      startAutoplay();
    } else {
      // Just apply momentum if autoplay is off
      controls.start({
        rotateY: rotation.get() + info.velocity.x * dragFactor,
        transition: { 
          type: "spring", 
          stiffness: 30, 
          damping: 25, 
          mass: 0.5, 
          ease: "easeOut" 
        },
      });
    }
  };

  const handleMouseEnter = () => {
    if (autoplay && pauseOnHover) {
      setIsPaused(true);
      controls.stop();
    }
  };

  const handleMouseLeave = () => {
    if (autoplay && pauseOnHover) {
      setIsPaused(false);
      startAutoplay();
    }
  };

  return (
    <div className="gallery-container">
      <div className="gallery-gradient gallery-gradient-left"></div>
      <div className="gallery-gradient gallery-gradient-right"></div>
      <div className="gallery-content">
        <motion.div
          drag="x"
          dragElastic={0.1}
          dragConstraints={{ left: 0, right: 0 }}
          className="gallery-track"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: transform,
            rotateY: rotation,
            width: screenSize.cylinderWidth,
            transformStyle: "preserve-3d",
          }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={controls}
        >
          {images.map((url, i) => (
            <div
              key={i}
              className="gallery-item"
              style={{
                width: `${faceWidth}px`,
                transform: `rotateY(${i * (360 / faceCount)}deg) translateZ(${radius}px)`,
              }}
            >
              <img src={url} alt={`gallery-${i}`} className="gallery-img" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default RollingGallery;