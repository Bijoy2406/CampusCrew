import React from "react";
import "../CSS/about.css";
import Header from "../Components/Header";
import aboutUs from "../assets/img/aboutUs.jpg";
import Footer from "../Components/Footer";

import sunny from "../assets/img/Sunny.jpg";
import bijoy from "../assets/img/Bijoy.jpg";
import asif from "../assets/img/Asif.jpg";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();
  return (
    <>
      <Header />

      <div className="about-page-container">
        <div className=" about-page">
          <div className="about-text">
            <h1>About Us</h1>
            <p className="about-description">
              {" "}
              Who are we? We are a passionate team dedicated to delivering the
              best products and services. Our mission is to drive innovation and
              quality in every aspect of our work.
            </p>
            <button className="about-btn" onClick={() => navigate("/contact")}>
              Contact Us
            </button>
          </div>
          <div className="about-pic">
            <div className="shadow-container">
              <div className="shadow"></div>
              <div className="border-box"></div>
              <div className="pic-container">
                <img src={aboutUs} alt="about us" className="hero-pic" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="members-container">
        <div className=" member-page">
          <h1 className="member-header">Meet Our Team</h1>
          <div className="team-container">
            <div className="member">
              <img
                src={asif}
                alt="Asif"
                className="member-pic"
                height={250}
                width={250}
              />
              <h3>Asif A Khuda</h3>
              <h6>asif13.aak@gmail.com</h6>
            </div>
            <div className="member">
              <img
                src={sunny}
                alt="sunny"
                className="member-pic"
                height={250}
                width={250}
              />
              <h3>Sanjida Amin</h3>
              <h6>sanjidasunny25@gmail.com</h6>
            </div>
            <div className="member">
              <img
                src={bijoy}
                alt="Bijoy"
                className="member-pic"
                height={250}
                width={250}
              />
              <h3>Tajuddin Ahmed</h3>
              <h6>bijoy.ahmed12555@gmail.com</h6>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AboutUs;
