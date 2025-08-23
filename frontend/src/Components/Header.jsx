import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/img/abacus.png";
import "../CSS/home.css";

function Header() {
  const { isAuthenticated, logout } = useAuth();
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
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              <button onClick={logout} className="nav-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Log In
              </Link>
              <Link to="/login" className="nav-button primary">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>
    </>
  );
}

export default Header;
