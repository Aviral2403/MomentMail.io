/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './ProtectedRoute.css'

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo || !userInfo.token) {
        setIsAuthenticated(false);
        setError("Please login to access this page");
        setLoading(false);
      } else {
        setIsAuthenticated(true);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="protected-page-container">
        <div className="protected-floating-images">
          <div className="protected-floating-image protected-image-1">
            <img src="/bento-8.jpg" alt="Image 1" />
          </div>
          <div className="protected-floating-image protected-image-2">
            <img src="/bento-333.png" alt="Image 2" />
          </div>
          <div className="protected-floating-image protected-image-3">
            <img src="/bento-7.webp" alt="Image 3" />
          </div>
          <div className="protected-floating-image protected-image-4">
            <img src="/template-10.webp" alt="Image 4" />
          </div>
        </div>
        
        <div className="protected-content">
          <div className="protected-loading">
            <div className="protected-spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="protected-page-container">
        <div className="protected-floating-images">
          <div className="protected-floating-image protected-image-1">
            <img src="/bento-8.jpg" alt="Image 1" />
          </div>
          <div className="protected-floating-image protected-image-2">
            <img src="/template-10.webp" alt="Image 2" />
          </div>
          <div className="protected-floating-image protected-image-3">
            <img src="/bento-7.webp" alt="Image 3" />
          </div>
          <div className="protected-floating-image protected-image-4">
            <img src="/bento-333.png" alt="Image 4" />
          </div>
        </div>

        <div className="protected-content">
          <div className="protected-auth-required">
            <div className="protected-auth-message">
              <img
                className="protected-auth-icon"
                src="/auth.png"
                width="180"
                height="180"
                alt="Authentication required"
              />
              <h1 className="protected-auth-title">
                Authentication 
                <span className="protected-gradient-text"> Required</span>
              </h1>
              <p className="protected-auth-subtitle">
                Please login to access this page and continue with your workflow
              </p>
              <div className="protected-auth-buttons">
                <Link to="/login" className="protected-btn-primary">
                  Go to Login
                </Link>
              </div>
            </div>
            {error && (
              <div className="protected-error-message">
                <svg
                  className="protected-error-icon"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;