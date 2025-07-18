import './DualScroll.css'
import { useRef, useMemo } from "react";
import InfiniteScroll from "../InfiniteScroll/InfiniteScroll";

const imageItems = [
  { id: 1, content: <img src="/bento-1.png" loading="lazy" alt="Scroll item 1" /> },
  { id: 2, content: <img src="/bento-2.png" loading="lazy" alt="Scroll item 2" /> },
  { id: 3, content: <img src="/bento-7.webp" loading="lazy" alt="Scroll item 3" /> },
  { id: 4, content: <img src="/bento-8.jpg" loading="lazy" alt="Scroll item 4" /> },
  { id: 5, content: <img src="/bento-10.webp" loading="lazy" alt="Scroll item 5" /> },
  { id: 6, content: <img src="/bento-999.webp" loading="lazy" alt="Scroll item 6" /> },
  { id: 7, content: <img src="/template-2233.jpg" loading="lazy" alt="Scroll item 7" /> },
  { id: 8, content: <img src="/login123.webp" loading="lazy" alt="Scroll item 8" /> },
  { id: 9, content: <img src="/template-9.jpg" loading="lazy" alt="Scroll item 9" /> },
  { id: 10, content: <img src="/template-9999.png" loading="lazy" alt="Scroll item 10" /> },
];

// Create custom sequences as specified
const createCustomSequences = (items, copies = 3) => {
  const leftSequence = [];
  const rightSequence = [];
  
  // Left sequence: 2, 4, 6, 8, 10, then 1, 3, 5, 7, 9
  const leftEvenItems = [items[1], items[3], items[5], items[7], items[9]]; // IDs 2, 4, 6, 8, 10
  const leftOddItems = [items[8], items[6], items[4], items[2], items[0]];  // IDs 1, 3, 5, 7, 9
  
  const rightItems = [items[0], items[2], items[4], items[6], items[8], items[9], items[7], items[5], items[3], items[1]];
  
  for (let copy = 0; copy < copies; copy++) {
    // Left sequence: 2, 4, 6, 8, 10, then 1, 3, 5, 7, 9
    leftSequence.push(...leftEvenItems, ...leftOddItems);
    
    // Right sequence: 10, 8, 6, 4, 2, 9, 7, 5, 3, 1
    rightSequence.push(...rightItems);
  }
  
  return { leftSequence, rightSequence };
};

const DualScroll = () => {
  const containerRef = useRef(null);
  
  // Use memo to prevent re-creation on every render
  const { leftItems, rightItems } = useMemo(() => {
    const { leftSequence, rightSequence } = createCustomSequences(imageItems);
    return {
      leftItems: leftSequence,
      rightItems: rightSequence
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
            autoplaySpeed={3.5}
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
            autoplaySpeed={3.5}
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