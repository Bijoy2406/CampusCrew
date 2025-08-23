import React from "react";
import { Link } from "react-router-dom";
function Footer() {
  return (
    <>
      <footer className="home-footer">
        <p>&copy; 2025 Your Company. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </>
  );
}

export default Footer;
