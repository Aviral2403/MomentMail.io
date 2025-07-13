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
      <div className="protected-route-loading">
        <div className="protected-route-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="protected-route-container">
        <div className="protected-route-auth-required">
          <div className="protected-route-auth-message">
            <img
              className="protected-route-auth-icon"
              src="/auth.png"
              width="180"
              height="180"
              alt="Authentication required"
            />
            <h2>Authentication Required</h2>
            <p>Please login to access this page</p>
            <Link to="/login" className="protected-route-login-button">
              Go to Login
            </Link>
          </div>
          {error && (
            <div className="protected-route-error-message">
              <svg
                className="protected-route-error-icon"
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
    );
  }

  return children;
};

export default ProtectedRoute;