import { useRef } from "react";
import "./ScheduleEmail.css";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link } from "react-router-dom";

const ScheduleEmail = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [200, -200]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [20, 0, -20]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      className="schedule-email-container"
      style={{
        y,
        rotateX,
        scale,
        opacity,
        transformStyle: "preserve-3d",
        perspective: 1500,
      }}
      initial={{ opacity: 0, y: 150 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 150 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <div className="schedule-email-content-wrapper">
        <motion.div
          className="schedule-email-image-container"
          initial={{ x: -200, opacity: 0, rotateY: -15 }}
          animate={
            isInView
              ? { x: 0, opacity: 1, rotateY: 0 }
              : { x: -200, opacity: 0, rotateY: -15 }
          }
          transition={{ duration: 1, delay: 0.2 }}
          whileHover={{
            rotateY: 10,
            scale: 1.05,
            transition: { duration: 0.4 },
          }}
        >
          <motion.img
            src="/schedule.png"
            alt="emaill Marketing AI Interface"
            className="schedule-email-hero-image"
            style={{
              transformStyle: "preserve-3d",
            }}
          />
        </motion.div>

        <motion.div
          className="schedule-email-content-section"
          initial={{ x: 200, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: 200, opacity: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="schedule-email-text-container">
            <motion.h1
              className="schedule-email-heading"
              initial={{ y: 80, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 80, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <span className="schedule-plan">Plan ahead. Save time.</span>{" "}
              Reach everyone—
              <span className="schedule-plan">right on time.</span>
            </motion.h1>

            <motion.p
              className="schedule-email-description"
              initial={{ y: 50, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
            >
              Take control of your outreach by scheduling email campaigns in
              advance and sending them in bulk at the perfect moment. Whether
              it's a product launch, weekly newsletter, or a time-sensitive
              offer, our scheduling feature ensures your messages hit inboxes
              exactly when they need to.
            </motion.p>
          </div>
          <Link to="/templates">
      <button className="mm-dark-try-button schedule">Start Now</button>
          </Link>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default ScheduleEmail;
