import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    // Clear user info from localStorage
    localStorage.removeItem("user-info");
    
    // Close the menu
    closeMenu();
    
    // Redirect to homepage
    navigate("/");
    
    // Reload the page to reset the state (optional)
    window.location.reload();
  };

  // Handle navigation and close menu at the same time
  const handleNavigation = (path) => {
    closeMenu();
    navigate(path);
  };

  // Check if the user is logged in
  const isLoggedIn = !!localStorage.getItem("user-info");

  return (
    <>
      <div className="navbar-section">
        <nav className="navbar">
          <button className="menu-button" onClick={toggleMenu}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="logo-container">
            <Link to="/" className="logo" onClick={closeMenu}>
              <div className="logo-text">
                <div className="svg-wrapper">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="m-svg">
                    <defs>
                      <linearGradient id="leftGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2555eb" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                      
                      <linearGradient id="leftDiagonalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#de0a26" />
                        <stop offset="100%" stopColor="#FBBC05" />
                      </linearGradient>
                      
                      <linearGradient id="middleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FBBC05" />
                        <stop offset="100%" stopColor="#34A853" />
                      </linearGradient>
                      
                      <linearGradient id="rightDiagonalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6cc173" />
                        <stop offset="100%" stopColor="#4caf50" />
                      </linearGradient>
                      
                      <linearGradient id="rightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                    </defs>
                    
                    <g>
                      <path d="M40,40 L40,160 M40,40 L100,120 L160,40 M160,40 L160,160" 
                            strokeWidth="25" 
                            strokeLinecap="round" 
                            fill="none" 
                            stroke="url(#leftGradient)" 
                            strokeLinejoin="round" />
                            
                      <path d="M40,40 L40,160" 
                            strokeWidth="25" 
                            strokeLinecap="round" 
                            fill="none" 
                            stroke="url(#leftGradient)" />
                            
                      <path d="M40,40 L100,120" 
                            strokeWidth="25" 
                            strokeLinecap="round" 
                            fill="none" 
                            stroke="url(#leftDiagonalGradient)" />
                            
                      <path d="M100,120 L160,40" 
                            strokeWidth="25" 
                            strokeLinecap="round" 
                            fill="none" 
                            stroke="url(#rightDiagonalGradient)" />
                            
                      <path d="M160,40 L160,160" 
                            strokeWidth="25" 
                            strokeLinecap="round" 
                            fill="none" 
                            stroke="url(#rightGradient)" />
                    </g>
                  </svg>
                </div>
                <span className="moment">oment</span>
                <span className="mail">Mail</span>
              </div>
            </Link>
          </div>

          <div className="nav-links desktop">
            <Link to="/templates" className="nav-link">
              Templates
            </Link>

            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>

            <Link to="/ask-ai" className="nav-link">
              Ask AI
            </Link>
            
            {isLoggedIn ? (
              <button className="nav-link" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link to="/login" className="nav-link">
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <button className="close-button" onClick={toggleMenu}>
            <X size={24} />
          </button>
          <div className="sidebar-links">
            <Link to="/templates" className="nav-link" onClick={closeMenu}>
              Templates
            </Link>

            <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
              Dashboard
            </Link>
            <Link to="/ask-ai" className="nav-link" onClick={closeMenu}>
              Ask AI
            </Link>

            {isLoggedIn ? (
              <button className="nav-link" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link to="/login" className="nav-link" onClick={closeMenu}>
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;