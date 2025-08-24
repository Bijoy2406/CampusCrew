import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Hero banner with enlarged glowing planet (ring removed)

const HeroBanner = () => {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  // No rotating words now; could add future ambient animation hooks here.
  }, []);

  return (
    <section className="hero-3d-wrapper">
      <div className="hero-3d-bg" aria-hidden />
      {/* Planet behind content */}
      <div className={`ring-stage planet-only ${mounted ? "stage-in" : ""}`} aria-hidden>
        <div className="center-core large-planet">
          <div className="core-glow" />
        </div>
      </div>
      <div className="hero-3d-content">
        <p className="eyebrow">Campus Event OS</p>
        <h1 className="headline">
          Where <span className="gradient-text">Ideas</span> Become <span className="outline-text">Impact</span>
        </h1>
        <p className="tagline">
          Plan, promote & analyze student events in one intuitive platform. Boost engagement, streamline logistics,
          and grow a vibrant academic innovation culture.
        </p>
        <div className="cta-row">
          {!isAuthenticated && (
            <Link to="/login" className="button primary large">Get Started Free</Link>
          )}
          <Link to="/about" className="button ghost large">How It Works</Link>
        </div>
        <ul className="stats">
          <li><strong>2K+</strong><span> Active Students</span></li>
          <li><strong>150+</strong><span> Events Hosted</span></li>
          <li><strong>40%</strong><span> Higher Attendance</span></li>
        </ul>
      </div>
      <div className="scroll-hint" aria-hidden>
        <span />
      </div>
    </section>
  );
};

export default HeroBanner;
