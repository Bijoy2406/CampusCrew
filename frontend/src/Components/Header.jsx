import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import logo from "../assets/img/campuscrew.png";
import "../CSS/home.css";
import "../CSS/header.css";
import "../CSS/themes.css";

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAdmin = user && user.isAdmin; // Use isAdmin property from backend data
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get user's initials if no profile picture
  const getUserInitials = (user) => {
    if (user?.username) {
      return user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };
  
  return (
    <>
      {" "}
      <header className="home-header">
        <div className="logo">
          <Link to="/">
            <img src={logo} alt="Logo" style={{ height: "40px" }} />
          </Link>
        </div>
        <nav className="main-nav">
          {isAuthenticated ? (
            <>
              <Link to="/upcoming-events" className="nav-link">
                Upcoming Events
              </Link>
              {isAdmin && (
                <Link to="/create-event" className="nav-link">
                  Create Event
                </Link>
              )}
              <Link to="/joined-events" className="nav-link">
                Joined Events
              </Link>
              <Link to="/about" className="nav-link">
                About
              </Link>
              <Link to="/contact" className="nav-link">
                Contact Us
              </Link>
              {isAdmin && (
                <Link to="/dashboard" className="nav-link">
                  Dashboard
                </Link>
              )}
              
              {/* Theme Toggle Button */}
              <button 
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              {/* Profile Dropdown */}
              <div className="profile-dropdown" ref={dropdownRef}>
                <button 
                  className="profile-button" 
                  onClick={toggleDropdown}
                  aria-label="Profile menu"
                >
                  {user?.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt="Profile" 
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-initials">
                      {getUserInitials(user)}
                    </div>
                  )}
                </button>
                
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <Link 
                      to="/profile" 
                      className="dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="dropdown-icon">👤</span>
                      <span className="btn-txt">Profile</span>
                    </Link>
                    <button 
                      onClick={handleLogout} 
                      className="dropdown-item dropdown-logout"
                    >
                      <span className="btn-txt">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Theme Toggle Button for non-authenticated users */}
              <button 
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              <Link to="/login" className="nav-link">
                Log In
              </Link>
              <Link to="/login" className="nav-button primary">
                <span className="btn-txt">Get Started</span>
              </Link>
            </>
          )}
        </nav>
      </header>
    </>
  );
}

export default Header;
