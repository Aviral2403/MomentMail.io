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
              <span className="moment">Moment</span>
              <span className="mail">Mail</span>
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