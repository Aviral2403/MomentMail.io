import './DualScroll.css'
import { useRef, useMemo } from "react";
import InfiniteScroll from "../InfiniteScroll/InfiniteScroll";

const imageItems = [
  { id: 1, content: <img src="/bento-1.png" alt="Scroll item 1" /> },
  { id: 2, content: <img src="/bento-2.png" alt="Scroll item 2" /> },
  { id: 3, content: <img src="/bento-7.webp" alt="Scroll item 3" /> },
  { id: 4, content: <img src="/bento-8.jpg" alt="Scroll item 4" /> },
  { id: 5, content: <img src="/bento-10.webp" alt="Scroll item 5" /> },
  { id: 6, content: <img src="/bento-999.webp" alt="Scroll item 6" /> },
  { id: 7, content: <img src="/template-2233.jpg" alt="Scroll item 7" /> },
  { id: 8, content: <img src="/login123.webp" alt="Scroll item 8" /> },
  { id: 9, content: <img src="/template-9.jpg" alt="Scroll item 9" /> },
];

// Function to create sequential order for left side (1-9 repeated)
const createLeftSequence = (items, copies = 3) => {
  let sequence = [];
  for (let i = 0; i < copies; i++) {
    sequence.push(...items);
  }
  return sequence;
};

// Function to create offset sequence for right side (5-9, 1-4 repeated)
const createRightSequence = (items, copies = 3) => {
  let sequence = [];
  // Create offset sequence: items 5-9, then 1-4
  const offsetSequence = [...items.slice(6), ...items.slice(0, 6)];
  
  for (let i = 0; i < copies; i++) {
    sequence.push(...offsetSequence);
  }
  return sequence;
};

const DualScroll = () => {
  const containerRef = useRef(null);

  // Use memo to prevent re-creation on every render
  const { leftItems, rightItems } = useMemo(() => {
    return {
      leftItems: createLeftSequence(imageItems),
      rightItems: createRightSequence(imageItems)
    };
  }, []);

  return (
    <div className="dual-scroll-showcase" ref={containerRef}>
      <div className="gradient-overlay" />
      <div className="templates-container">
        <div className="scroll-column">
          <InfiniteScroll
            items={leftItems}
            isTilted={true}
            tiltDirection="left"
            autoplay={true}
            autoplaySpeed={4.5}
            autoplayDirection="down"
            pauseOnHover={true}
            itemMinHeight={250}
            width="100%"
          />
        </div>
        <div className="scroll-column">
          <InfiniteScroll
            items={rightItems}
            isTilted={true}
            tiltDirection="left"
            autoplay={true}
            autoplaySpeed={4.5} // Slightly different speed to prevent sync
            autoplayDirection="up"
            pauseOnHover={true}
            itemMinHeight={250}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default DualScroll;