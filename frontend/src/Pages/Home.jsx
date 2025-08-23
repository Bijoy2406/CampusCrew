import React from "react";
import { Link } from "react-router-dom";
import { FaRocket, FaBullseye, FaTools } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import "../CSS/home.css";
import logo from "../assets/img/abacus.png";
import Footer from "../Components/Footer";
import Header from "../Components/Header";

const Home = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="home-container">
      <Header />
      {/* <header className="home-header">
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
      </header> */}

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Build, Launch, and Grow</h1>
            <p className="hero-subtitle">
              Our platform provides the tools you need to bring your ideas to
              life. Join our community and start your journey today.
            </p>
            {!isAuthenticated && (
              <Link to="/login" className="button primary large">
                Sign Up for Free
              </Link>
            )}
          </div>
        </section>

        <section className="features-section">
          <h2 className="section-title">Why Choose Us?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaRocket />
              </div>
              <h3 className="feature-title">Fast Deployment</h3>
              <p className="feature-description">
                Get your projects up and running in minutes, not hours. Our
                streamlined process makes deployment a breeze.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaBullseye />
              </div>
              <h3 className="feature-title">Achieve Your Goals</h3>
              <p className="feature-description">
                Set your targets and track your progress with our powerful
                analytics and reporting tools.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaTools />
              </div>
              <h3 className="feature-title">Powerful Tools</h3>
              <p className="feature-description">
                Access a wide range of tools and integrations to build and scale
                your application.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* <footer className="home-footer">
        <p>&copy; 2025 Your Company. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer> */}
      <Footer />
    </div>
  );
};

export default Home;
