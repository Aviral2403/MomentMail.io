import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { leadAPI } from "../../api";
import "./LeadGenProgress.css";

const LeadGenProgress = () => {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { keyword, location: loc } = location.state || {};

  const [progressData, setProgressData] = useState({
    percentage: 0,
    message: "Initializing search...",
    phase: "initializing",
    elapsedTime: 0,
    leadsFound: 0,
    urlsProcessed: 0,
    totalUrls: 0,
  });

  const [status, setStatus] = useState("running");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  // Concise phase messages (used in footer / existing short status)
  const getStatusMessage = (phase, defaultMessage) => {
    const phaseMessages = {
      initializing: (
        <>
          <strong style={{ color: "#FBBF24" }}>Setting up</strong> search
          parameters...
        </>
      ),
      searching: (
        <>
          <strong style={{ color: "#10B981" }}>Searching across</strong>{" "}
          multiple platforms...
        </>
      ),
      crawling: (
        <>
          <strong style={{ color: "#8B5CF6" }}>Extracting</strong> business
          information...
        </>
      ),
      verifying: (
        <>
          <strong style={{ color: "#3B82F6" }}>Verifying</strong> contact
          details...
        </>
      ),
      filtering: (
        <>
          <strong style={{ color: "#F97316" }}>Processing</strong> and filtering
          results...
        </>
      ),
      validating: (
        <>
          <strong style={{ color: "#7C3AED" }}>AI validation</strong> in
          progress...
        </>
      ),
      completed: (
        <>
          <span
            style={{
              color: "#22C55E",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 400 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="200" cy="200" r="120" fill="#A8E6A3" opacity="0.8" />

              <path
                d="M140 200 L170 235 L280 120 L310 150 L170 285 L110 225 Z"
                fill="#228B22"
                stroke="none"
              />
            </svg>{" "}
            Search completed successfully!
          </span>
          <span>Redirecting to results table....</span>
        </>
      ),
      failed: (
        <span style={{ color: "#EF4444", fontWeight: "600" }}>
          ❌ Search encountered an error
        </span>
      ),
    };

    return phaseMessages[phase] || defaultMessage || "Processing...";
  };

  // Informative phase messages (used at top, more descriptive)
  const getInformativeMessage = (phase, defaultMessage) => {
    const informative = {
      initializing:
        "Preparing the search environment. This usually takes a few seconds.",
      searching:
        "Searching for leads across Google, Facebook, Instagram and other platforms. This may take a moment while we gather candidate pages.",
      crawling:
        "Collecting business pages and scanning for contact info, addresses and service descriptions to identify relevant leads.",
      verifying:
        "Cross-referencing contact details across sources to reduce false positives and improve accuracy.",
      filtering:
        "Applying quality filters and removing duplicates to keep only the most relevant leads.",
      validating:
        "Running AI validation and ranking to surface the highest-quality leads first.",
      completed:
        "Your lead search is complete. You can now review the full results.",
      failed:
        "The search couldn't finish successfully. Check parameters or try again.",
    };

    return (
      informative[phase] || defaultMessage || "Processing your lead search..."
    );
  };

  const pollProgress = async () => {
    try {
      console.log(
        `Polling progress for search: ${searchId} (attempt ${pollCount + 1})`
      );

      const response = await leadAPI.getSearchProgress(searchId);
      console.log("Progress response:", response);

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch progress");
      }

      const { status: searchStatus, progress, stats } = response;

      // Update progress data with values from API (keep messages from API if present)
      setProgressData({
        percentage: Math.min(progress?.percentage || 0, 100),
        message: progress?.message || getStatusMessage(progress?.currentPhase),
        phase: progress?.currentPhase || "running",
        elapsedTime: progress?.elapsedTime || 0,
        leadsFound: progress?.leadsFound || stats?.leadsGenerated || 0,
        urlsProcessed: progress?.urlsProcessed || 0,
        totalUrls: progress?.totalUrls || stats?.totalUrlsFound || 0,
      });

      setStatus(searchStatus);
      setPollCount((prev) => prev + 1);

      // Check if search is completed
      if (searchStatus === "completed") {
        console.log("Search completed");

        // Redirect disabled for CSS/debug work
        setTimeout(() => {
          navigate(`/lead-generation/results/${searchId}`, {
            state: { keyword, location: loc },
            replace: true,
          });
        }, 2000);

        return; // Stop polling
      }

      // Check if search failed
      if (searchStatus === "failed") {
        setError("");
        return; // Stop polling
      }

      // Continue polling if still running
      if (searchStatus === "running") {
        // Increase poll interval gradually to reduce server load
        const interval = Math.min(2000 + pollCount * 500, 10000);
        setTimeout(pollProgress, interval);
      }
    } catch (err) {
      console.error("Error polling progress:", err);
      setError(err.message || "Error fetching progress");

      // Don't stop polling immediately - try a few more times
      if (pollCount < 5) {
        setTimeout(pollProgress, 5000);
      }
    }
  };

  useEffect(() => {
    if (!searchId) {
      setError("No search ID provided");
      return;
    }

    // Start polling immediately
    pollProgress();

    // Cleanup function
    return () => {
      console.log("Progress component unmounting");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);

  // Format elapsed time
  const formatElapsedTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate estimated completion time
  const getEstimatedCompletion = () => {
    const { percentage, elapsedTime } = progressData;
    if (percentage > 0 && percentage < 100) {
      const estimatedTotal = (elapsedTime / percentage) * 100;
      const remaining = Math.max(0, estimatedTotal - elapsedTime);
      return Math.round(remaining);
    }
    return null;
  };

  const estimatedRemaining = getEstimatedCompletion();

  return (
    <main className="lg-progress">
      {/* Background with floating icons */}
      <div className="lg-progress__background">
        {/* Process Icons positioned around the screen perimeter */}
        {/* Top area icons */}
        <div className="process-icon process-icon--instagram process-icon--top-left">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.65-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3z" />
          </svg>
        </div>

        <div className="process-icon process-icon--google process-icon--top-center">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <div className="process-icon process-icon--linkedin process-icon--top-right">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>

        {/* Left side icons */}
        <div className="process-icon process-icon--gmail process-icon--left-top">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </div>

        <div className="process-icon process-icon--facebook process-icon--left-bottom">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>

        {/* Right side icons */}
        <div className="process-icon process-icon--phone process-icon--right-top">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
        </div>

        <div className="process-icon process-icon--twitter process-icon--right-bottom">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.20-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
          </svg>
        </div>

        {/* Bottom area icons */}
        <div className="process-icon process-icon--youtube process-icon--bottom-left">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        </div>

        <div className="process-icon process-icon--internet process-icon--bottom-right">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>
      </div>

      <div className="lg-progress__card">
        <div className="lg-progress__header">
          <h1>Searching for leads...</h1>
          {keyword && loc && (
            <p className="lg-progress__query">
              <strong>{keyword}</strong> in <strong>{loc}</strong>
            </p>
          )}
        </div>

        {/* Top area: INFORMATIVE messages (longer, explanatory) */}
        <div className="lg-progress__status">
          <p className="lg-progress__message">
            {status === "completed"
              ? getInformativeMessage("completed")
              : status === "failed"
              ? // prefer explicit error text if present, otherwise fallback to informative failed text
                error || getInformativeMessage("failed")
              : getInformativeMessage(progressData.phase, progressData.message)}
          </p>
          <p className="lg-progress__phase">Phase: {progressData.phase}...</p>
        </div>

        <div className="lg-progress__bar-container">
          <div className="lg-progress__bar">
            <div
              className="lg-progress__fill"
              style={{
                width: `${progressData.percentage}%`,
                transition: "width 0.5s ease-in-out",
              }}
            />
            <span className="lg-progress__percentage">
              {Math.round(progressData.percentage)}%
            </span>
          </div>
        </div>

        <div className="lg-progress__stats">
          <div className="lg-progress__stat">
            <span className="lg-progress__stat-label">Leads Found:</span>
            <span className="lg-progress__stat-value">
              {progressData.leadsFound}
            </span>
          </div>

          <div className="lg-progress__stat">
            <span className="lg-progress__stat-label">URLs Processed:</span>
            <span className="lg-progress__stat-value">
              {progressData.urlsProcessed} / {progressData.totalUrls}
            </span>
          </div>

          <div className="lg-progress__stat">
            <span className="lg-progress__stat-label">Elapsed Time:</span>
            <span className="lg-progress__stat-value">
              {formatElapsedTime(progressData.elapsedTime)}
            </span>
          </div>

          {estimatedRemaining && (
            <div className="lg-progress__stat">
              <span className="lg-progress__stat-label">Est. Remaining:</span>
              <span className="lg-progress__stat-value">
                {formatElapsedTime(estimatedRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Bottom footer: keep short/concise messages (same as prior behavior) */}
        <div className="lg-progress__footer">
          <p>
            {status === "completed"
              ? getStatusMessage("completed")
              : status === "failed"
              ? error || getStatusMessage("failed")
              : getStatusMessage(progressData.phase, progressData.message)}
          </p>
        </div>

        {error && status !== "failed" && (
          <div className="lg-progress__error">
            <p>{error}</p>
            <button
              className="lg-btn lg-btn--primary"
              onClick={() => navigate("/lead-generation")}
            >
              Back to Search
            </button>
          </div>
        )}

        <div className="lg-progress__actions">
          <button
            className="lg-btn lg-btn--ghost"
            onClick={() => navigate("/lead-generation")}
            disabled={status === "completed"}
          >
            Back to Search
          </button>
        </div>
      </div>
    </main>
  );
};

export default LeadGenProgress;
