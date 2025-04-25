/* eslint-disable react/prop-types */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./RotatingText.css";

const RotatingText = forwardRef((props, ref) => {
  const {
    texts,
    transition = { type: "spring", damping: 25, stiffness: 300 },
    initial = { y: "100%", opacity: 0 },
    animate = { y: 0, opacity: 1 },
    exit = { y: "-120%", opacity: 0 },
    animatePresenceMode = "wait",
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0,
    staggerFrom = "first",
    loop = true,
    auto = true,
    splitBy = "characters",
    onNext,
    mainClassName = "",
    splitLevelClassName = "",
    elementLevelClassName = "",
  } = props;

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const splitIntoCharacters = (text) => {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), (segment) => segment.segment);
    }
    return Array.from(text);
  };

  const elements = useMemo(() => {
    const currentText = texts[currentTextIndex];
    if (splitBy === "characters") {
      const words = currentText.split(" ");
      return words.map((word, i) => ({
        characters: splitIntoCharacters(word),
        needsSpace: i !== words.length - 1,
      }));
    }
    return [{ characters: [currentText], needsSpace: false }];
  }, [texts, currentTextIndex, splitBy]);

  const getStaggerDelay = useCallback(
    (index, totalChars) => {
      if (staggerFrom === "last") return (totalChars - 1 - index) * staggerDuration;
      return index * staggerDuration;
    },
    [staggerFrom, staggerDuration]
  );

  useEffect(() => {
    if (!auto) return;
    const intervalId = setInterval(() => {
      setCurrentTextIndex((current) =>
        current === texts.length - 1 ? (loop ? 0 : current) : current + 1
      );
    }, rotationInterval);
    return () => clearInterval(intervalId);
  }, [texts.length, rotationInterval, auto, loop]);

  useImperativeHandle(
    ref,
    () => ({
      next: () => {
        setCurrentTextIndex((current) =>
          current === texts.length - 1 ? (loop ? 0 : current) : current + 1
        );
      },
      previous: () => {
        setCurrentTextIndex((current) =>
          current === 0 ? (loop ? texts.length - 1 : current) : current - 1
        );
      },
      jumpTo: (index) => {
        setCurrentTextIndex(Math.max(0, Math.min(index, texts.length - 1)));
      },
      reset: () => setCurrentTextIndex(0),
    }),
    [texts.length, loop]
  );

  return (
    <div className={`rotating-text-container ${mainClassName}`}>
      <span className="rotating-text-sr-only">{texts[currentTextIndex]}</span>
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.div
          key={currentTextIndex}
          className="rotating-text-wrapper"
          layout
          aria-hidden="true"
        >
          {elements.map((wordObj, wordIndex, array) => {
            const previousCharsCount = array
              .slice(0, wordIndex)
              .reduce((sum, word) => sum + word.characters.length, 0);
            
            return (
              <span
                key={wordIndex}
                className={`rotating-text-word ${splitLevelClassName}`}
              >
                {wordObj.characters.map((char, charIndex) => (
                  <motion.span
                    key={charIndex}
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    transition={{
                      ...transition,
                      delay: getStaggerDelay(
                        previousCharsCount + charIndex,
                        array.reduce(
                          (sum, word) => sum + word.characters.length,
                          0
                        )
                      ),
                    }}
                    className={`rotating-text-char ${elementLevelClassName}`}
                  >
                    {char}
                  </motion.span>
                ))}
                {wordObj.needsSpace && <span className="rotating-text-space"> </span>}
              </span>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

RotatingText.displayName = "RotatingText";
export default RotatingText;