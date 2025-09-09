/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import './AnimatedStatsOverview.css';

const AnimatedStatsOverview = ({ stats, aggregatedStats, formatNumber }) => {
  // Intersection Observer state
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef();

  // Animation states for each counter
  const [totalSearchesCount, setTotalSearchesCount] = useState(0);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [successRateCount, setSuccessRateCount] = useState(0);
  const [geminiValidationsCount, setGeminiValidationsCount] = useState(0);

  // Animation frame refs
  const searchesFrameRef = useRef();
  const leadsFrameRef = useRef();
  const successRateFrameRef = useRef();
  const geminiFrameRef = useRef();

  // Intersection Observer setup
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry.isIntersecting;
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  // Reset animation when leaving viewport
  useEffect(() => {
    if (!isIntersecting && hasIntersected) {
      const timeout = setTimeout(() => {
        setHasIntersected(false);
        setTotalSearchesCount(0);
        setTotalLeadsCount(0);
        setSuccessRateCount(0);
        setGeminiValidationsCount(0);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isIntersecting, hasIntersected]);

  // Generic animation function
  const animateCounter = (
    targetValue,
    setterFunction,
    frameRef,
    duration = 2000
  ) => {
    const startValue = 0;
    const targetNum = parseInt(targetValue.toString().replace(/,/g, '')) || 0;
    
    if (targetNum === 0) {
      setterFunction(0);
      return;
    }

    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (targetNum - startValue) * easeOutCubic);

      setterFunction(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  // Trigger animations when component becomes visible
  useEffect(() => {
    const shouldAnimate = hasIntersected && isIntersecting;
    
    if (shouldAnimate) {
      // Clear any existing animations
      if (searchesFrameRef.current) cancelAnimationFrame(searchesFrameRef.current);
      if (leadsFrameRef.current) cancelAnimationFrame(leadsFrameRef.current);
      if (successRateFrameRef.current) cancelAnimationFrame(successRateFrameRef.current);
      if (geminiFrameRef.current) cancelAnimationFrame(geminiFrameRef.current);

      // Start new animations with different durations for staggered effect
      setTimeout(() => {
        animateCounter(aggregatedStats.totalSearches, setTotalSearchesCount, searchesFrameRef, 1800);
      }, 0);

      setTimeout(() => {
        animateCounter(aggregatedStats.totalLeads, setTotalLeadsCount, leadsFrameRef, 2000);
      }, 200);

      setTimeout(() => {
        animateCounter(aggregatedStats.successRate || 0, setSuccessRateCount, successRateFrameRef, 1500);
      }, 400);

      setTimeout(() => {
        animateCounter(aggregatedStats.totalGeminiValidations, setGeminiValidationsCount, geminiFrameRef, 1600);
      }, 600);
    }

    // Cleanup function
    return () => {
      if (searchesFrameRef.current) cancelAnimationFrame(searchesFrameRef.current);
      if (leadsFrameRef.current) cancelAnimationFrame(leadsFrameRef.current);
      if (successRateFrameRef.current) cancelAnimationFrame(successRateFrameRef.current);
      if (geminiFrameRef.current) cancelAnimationFrame(geminiFrameRef.current);
    };
  }, [hasIntersected, isIntersecting, aggregatedStats]);

  const formatAnimatedNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const shouldAnimate = hasIntersected && isIntersecting;

  return (
    <section className="lg-dashboard__overview animated-stats-section" ref={elementRef}>
      <div className="lg-dashboard__stat-cards">
        <div className={`lg-dashboard__stat-card ${shouldAnimate ? 'animating' : ''}`}>
          <h3>Total Searches</h3>
          <p className={`lg-dashboard__stat-number ${shouldAnimate ? 'counting' : ''}`}>
            {shouldAnimate ? formatAnimatedNumber(totalSearchesCount) : formatNumber(aggregatedStats.totalSearches)}
          </p>
          <small className="lg-dashboard__stat-detail">
            {formatNumber(aggregatedStats.totalQueriesUsed || 0)} API queries used
          </small>
        </div>
        
        <div className={`lg-dashboard__stat-card ${shouldAnimate ? 'animating' : ''}`}>
          <h3>Total Leads</h3>
          <p className={`lg-dashboard__stat-number ${shouldAnimate ? 'counting' : ''}`}>
            {shouldAnimate ? formatAnimatedNumber(totalLeadsCount) : formatNumber(aggregatedStats.totalLeads)}
          </p>
          <small className="lg-dashboard__stat-detail">
            From {formatNumber(aggregatedStats.totalUrlsCrawled || 0)} websites crawled
          </small>
        </div>
        
        <div className={`lg-dashboard__stat-card ${shouldAnimate ? 'animating' : ''}`}>
          <h3>Crawl Success Rate</h3>
          <p className={`lg-dashboard__stat-number ${shouldAnimate ? 'counting' : ''}`}>
            {shouldAnimate ? successRateCount : (aggregatedStats.successRate || 0)}%
          </p>
          <small className="lg-dashboard__stat-detail">
            {formatNumber(aggregatedStats.totalSuccessfulCrawls || 0)} of{" "}
            {formatNumber(aggregatedStats.totalUrlsCrawled || 0)} successfully crawled
          </small>
        </div>
        
        {aggregatedStats.totalGeminiValidations > 0 && (
          <div className={`lg-dashboard__stat-card ${shouldAnimate ? 'animating' : ''}`}>
            <h3>AI Validations</h3>
            <p className={`lg-dashboard__stat-number ${shouldAnimate ? 'counting' : ''}`}>
              {shouldAnimate ? formatAnimatedNumber(geminiValidationsCount) : formatNumber(aggregatedStats.totalGeminiValidations)}
            </p>
            <small className="lg-dashboard__stat-detail">
              Enhanced with AI validation
            </small>
          </div>
        )}
      </div>
    </section>
  );
};

export default AnimatedStatsOverview;