import { useState, useEffect } from "react";
import "./BentoGrid.css";

const BentoGrid = () => {
  // Sample images for different categories
  const imageCategories = {
    travel: [
      "logintemplate.png",
      "login123.webp",
      "bento-6.png",
      "bento-10.webp",
      "bento-999.webp",
    ],
    walking: [
      "bento-6.png",
      "bento-5.jpg",
      "logintemplate.png",
      "bento-7.webp",
      "bento-8.jpg",
    ],
    competitions: [
      "bento-999.webp",
      "login123.webp",
      "logintemplate.png",
      "bento-4.jpg",
      "bento-7.webp",
      "bento-10.webp",
    ],
    practice: [
      "bento-4.jpg",
      "logintemplate.png",
      "login123.webp",
      "bento-8.jpg",
      "bento-7.webp",
    ],
    potential: [
      "logintemplate.png",
      "bento-4.jpg",
      "bento-6.png",
      "login123.webp",
      "bento-8.jpg",
      "bento-10.webp",
    ],
  };

  const [currentImages, setCurrentImages] = useState({
    travel: 0,
    walking: 1,
    competitions: 2,
    practice: 3,
    potential: 4,
  });

  const [isSliding, setIsSliding] = useState({
    travel: false,
    walking: false,
    competitions: false,
    practice: false,
    potential: false,
  });

  const [slideDirections, setSlideDirections] = useState({
    travel: "",
    walking: "",
    competitions: "",
    practice: "",
    potential: "",
  });

  // Function to get random direction
  const getRandomDirection = () => {
    const directions = ["left", "right", "top", "bottom"];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  // Function to get opposite direction
  const getOppositeDirection = (direction) => {
    const opposites = {
      left: "right",
      right: "left",
      top: "bottom",
      bottom: "top",
    };
    return opposites[direction];
  };

  // Function to get currently displayed images across all categories
  const getCurrentlyDisplayedImages = (currentState, excludeCategory = null) => {
    const displayedImages = new Set();
    const boxes = ["travel", "walking", "competitions", "practice", "potential"];
    
    boxes.forEach(box => {
      if (box !== excludeCategory) {
        const imageName = imageCategories[box][currentState[box]];
        displayedImages.add(imageName);
      }
    });
    
    return displayedImages;
  };

  // Function to get next available image index for a category
  const getNextAvailableImage = (category, currentState) => {
    const currentlyDisplayed = getCurrentlyDisplayedImages(currentState, category);
    const categoryImages = imageCategories[category];
    const currentIndex = currentState[category];
    
    // Create array of available indices (images not currently displayed)
    const availableIndices = [];
    categoryImages.forEach((imageName, index) => {
      if (!currentlyDisplayed.has(imageName)) {
        availableIndices.push(index);
      }
    });
    
    // If no images are available (shouldn't happen with enough images), fall back to next index
    if (availableIndices.length === 0) {
      return (currentIndex + 1) % categoryImages.length;
    }
    
    // If current image is available, exclude it to ensure we get a different image
    const filteredIndices = availableIndices.filter(index => index !== currentIndex);
    const finalAvailableIndices = filteredIndices.length > 0 ? filteredIndices : availableIndices;
    
    // Return random available index
    return finalAvailableIndices[Math.floor(Math.random() * finalAvailableIndices.length)];
  };

  useEffect(() => {
    const intervals = {};
    const boxes = [
      "travel",
      "walking",
      "competitions",
      "practice",
      "potential",
    ];

    boxes.forEach((box, index) => {
      intervals[box] = setInterval(() => {
        const exitDirection = getRandomDirection();

        // Set exit direction and start slide animation
        setSlideDirections((prev) => ({ ...prev, [box]: exitDirection }));
        setIsSliding((prev) => ({ ...prev, [box]: true }));

        setTimeout(() => {
          // Change image after exit animation completes
          setCurrentImages((prev) => {
            const nextImageIndex = getNextAvailableImage(box, prev);
            return {
              ...prev,
              [box]: nextImageIndex,
            };
          });

          // Set enter direction (opposite of exit) and continue sliding
          const enterDirection = getOppositeDirection(exitDirection);
          setSlideDirections((prev) => ({ ...prev, [box]: enterDirection }));

          setTimeout(() => {
            // End slide animation
            setIsSliding((prev) => ({ ...prev, [box]: false }));
          }, 50);
        }, 500); // Wait for exit animation to complete
      }, 3500 + index * 700); // Stagger the animations
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, []);

  return (
    <div className="bento-container">
      <div className="bento-grid">
        {/* Travel List - Top Left */}
        <div className="bento-item bento-travel">
          <div
            className={`bento-image-wrapper ${
              isSliding.travel ? `bento-sliding-${slideDirections.travel}` : ""
            }`}
          >
            <img
              src={imageCategories.travel[currentImages.travel]}
              alt="Travel"
              className="bento-image"
            />
            <div className="bento-overlay"></div>
          </div>
        </div>

        {/* Statistics - Top Center (now has 500+ content) */}
        <div className="bento-item bento-statistics">
          <div className="bento-text-content bento-dark">
            <div className="bento-stats-header">
              <h3 className="bento-title bento-large-number">50+</h3>
              <h3 className="bento-subtitle">TEMPLATES</h3>
            </div>
          </div>
        </div>

        {/* Walking - Top Right */}
        <div className="bento-item bento-walking">
          <div
            className={`bento-image-wrapper ${
              isSliding.walking
                ? `bento-sliding-${slideDirections.walking}`
                : ""
            }`}
          >
            <img
              src={imageCategories.walking[currentImages.walking]}
              alt="Walking"
              className="bento-image"
            />
            <div className="bento-overlay"></div>
          </div>
        </div>

        {/* Support - Middle Left */}
        <div className="bento-item bento-support">
          <div className="bento-text-content bento-blue">
            <p className="bento-support-text">
              REACH YOUR AUDIENCE FASTER , SMARTER & BETTER
            </p>
          </div>
        </div>

        {/* Unlock Potential - Middle Right Large */}
        <div className="bento-item bento-potential">
          <div
            className={`bento-image-wrapper ${
              isSliding.potential
                ? `bento-sliding-${slideDirections.potential}`
                : ""
            }`}
          >
            <img
              src={imageCategories.potential[currentImages.potential]}
              alt="Unlock Potential"
              className="bento-image"
            />
            <div className="bento-overlay bento-dark"></div>
          </div>
        </div>

        {/* Competitions - Bottom Left (now has statistics content) */}
        <div className="bento-item bento-competitions">
          <div
            className={`bento-image-wrapper ${
              isSliding.competitions
                ? `bento-sliding-${slideDirections.competitions}`
                : ""
            }`}
          >
            <img
              src={imageCategories.competitions[currentImages.competitions]}
              alt="Statistics"
              className="bento-image"
            />
            <div className="bento-overlay bento-yellow-bg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoGrid;