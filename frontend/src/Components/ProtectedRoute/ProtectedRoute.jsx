/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import './ProtectedRoute.css'

// Route-specific content configuration
const routeContent = {
  '/dashboard': {
    title: 'Dashboard Access',
    subtitle: 'Please login to access your dashboard and view your analytics',
    features: ['View Analytics', 'Manage Projects', 'Track Progress']
  },
  '/my-templates': {
    title: 'Templates Library',
    subtitle: 'Please login to access your personal template collection',
    features: ['View Templates', 'Create New', 'Edit Existing']
  },
  '/templates/create/new': {
    title: 'Template Builder',
    subtitle: 'Please login to create and customize new templates',
    features: ['Drag & Drop Builder', 'Custom Components', 'Save Templates']
  },
  '/templates/:slug/edit': {
    title: 'Template Editor',
    subtitle: 'Please login to edit and customize this template',
    features: ['Edit Content', 'Customize Design', 'Save Changes']
  },
  '/templates/:slug/recipients': {
    title: 'Recipient Selection',
    subtitle: 'Please login to select and manage email recipients',
    features: ['Select Recipients', 'Manage Contacts', 'Import Lists']
  },
  '/templates/:slug/preview': {
    title: 'Email Preview',
    subtitle: 'Please login to preview your email before sending',
    features: ['Live Preview', 'Test Sending', 'Final Review']
  },
  '/templates/:slug/schedule': {
    title: 'Schedule Email',
    subtitle: 'Please login to schedule your email delivery',
    features: ['Set Date & Time', 'Timezone Selection', 'Recurring Options']
  },
  '/my-templates/:templateId/edit': {
    title: 'Template Editor',
    subtitle: 'Please login to edit your custom template',
    features: ['Edit Template', 'Update Content', 'Manage Versions']
  }
};

// Function to match dynamic routes
const getRouteContent = (pathname) => {
  // Direct match first
  if (routeContent[pathname]) {
    return routeContent[pathname];
  }
  
  // Pattern matching for dynamic routes
  const patterns = [
    { pattern: /^\/templates\/[^\/]+\/edit$/, key: '/templates/:slug/edit' },
    { pattern: /^\/templates\/[^\/]+\/recipients$/, key: '/templates/:slug/recipients' },
    { pattern: /^\/templates\/[^\/]+\/preview$/, key: '/templates/:slug/preview' },
    { pattern: /^\/templates\/[^\/]+\/schedule$/, key: '/templates/:slug/schedule' },
    { pattern: /^\/my-templates\/[^\/]+\/edit$/, key: '/my-templates/:templateId/edit' }
  ];
  
  for (const { pattern, key } of patterns) {
    if (pattern.test(pathname)) {
      return routeContent[key];
    }
  }
  
  // Default fallback
  return {
    title: 'Protected Content',
    subtitle: 'Please login to access this page and continue with your workflow',
    features: ['Secure Access', 'User Authentication', 'Protected Features']
  };
};

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const location = useLocation();

  // Get current route content
  const currentContent = getRouteContent(location.pathname);

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

  // Handle content transition for better UX
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      setShowContent(false);
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isAuthenticated, loading]);

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

        {!showContent ? (
          <div className="protected-content">
            <div className="protected-transition-loading">
              <div className="protected-pulse-loader">
                <div className="protected-pulse-circle"></div>
                <div className="protected-pulse-circle"></div>
                <div className="protected-pulse-circle"></div>
              </div>
              <p className="protected-transition-text">Loading page...</p>
            </div>
          </div>
        ) : (
          <div className="protected-content protected-content-visible">
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
                  {currentContent.title.split(' ')[0]}
                  <span className="protected-gradient-text">
                    {' ' + currentContent.title.split(' ').slice(1).join(' ')}
                  </span>
                </h1>
                
                <p className="protected-auth-subtitle">
                  {currentContent.subtitle}
                </p>

                {/* Feature list */}
                <div className="protected-features">
                  {currentContent.features.map((feature, index) => (
                    <div key={index} className="protected-feature-item">
                      <span className="protected-feature-dot"></span>
                      {feature}
                    </div>
                  ))}
                </div>
                
                <div className="protected-auth-buttons">
                  <Link to="/login" className="protected-btn-primary">
                    Login to Continue
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
        )}
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;