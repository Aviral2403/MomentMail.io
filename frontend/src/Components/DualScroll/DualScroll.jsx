import './DualScroll.css'
import { useRef } from "react";
import InfiniteScroll from "../InfiniteScroll/InfiniteScroll";

const imageItems = [
  { content: <img src="/template-1.webp" alt="Scroll item 1" /> },
  { content: <img src="/template-2.jpg" alt="Scroll item 2" /> },
  { content: <img src="/template-3.jpg" alt="Scroll item 3" /> },
  { content: <img src="/template-4.webp" alt="Scroll item 4" /> },
  { content: <img src="/template-5.jpg" alt="Scroll item 5" /> },
  { content: <img src="/template-6.jpeg" alt="Scroll item 6" /> },
  { content: <img src="/template-7.jpg" alt="Scroll item 7" /> },
  { content: <img src="/template-8.png" alt="Scroll item 8" /> },
  { content: <img src="/template-9.jpg" alt="Scroll item 9" /> },
];

const items = [...imageItems, ...imageItems, ...imageItems];

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const randomizedItems = (() => {
  const shuffledOnce = shuffleArray(imageItems);
  return [...shuffledOnce, ...shuffledOnce, ...shuffledOnce];
})();

const DualScroll = () => {
  const containerRef = useRef(null);

  return (
    <div className="dual-scroll-showcase" ref={containerRef}>
      <div className="gradient-overlay" />
      <div className="templates-container">
        <div className="scroll-column">
          <InfiniteScroll
            items={items}
            isTilted={true}
            tiltDirection="left"
            autoplay={true}
            autoplaySpeed={2}
            autoplayDirection="down"
            pauseOnHover={true}
            itemMinHeight={200}
            width="100%"
          />
        </div>
        <div className="scroll-column">
          <InfiniteScroll
            items={randomizedItems}
            isTilted={true}
            tiltDirection="left"
            autoplay={true}
            autoplaySpeed={2}
            autoplayDirection="up"
            pauseOnHover={true}
            itemMinHeight={200}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default DualScroll;
