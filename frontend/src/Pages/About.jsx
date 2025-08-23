import React from "react";
import "../CSS/about.css"

const AboutUs = () => {
  return (
    <div className="about-container">
      <section className="about-section">
        <h1>Who We Are</h1>
        <p>
          We are a passionate team dedicated to delivering the best products
          and services. Our mission is to drive innovation and quality in
          every aspect of our work.
        </p>
      </section>

      <section className="team-section">
        <h2>Meet Our Team</h2>
        <div className="team-cards">
          {[
            { name: "Asif Avaash", role: "CEO & Founder", email: "asif13.aak@gmail.com" },
            { name: "Sanjida Amin", role: "Art Director", email: "sanjidasunny25@gmail.com" },
            { name: "Tajuddin Ahmed", role: "Art Director", email: "bijoy.ahmed12555@gmail.com" },

          ].map((member, idx) => (
            <div className="card" key={idx}>
              <img
                src={`https://via.placeholder.com/150?text=${member.name.split(" ")[0]}`}
                alt={member.name}
              />
              <div className="card-content">
                <h3>{member.name}</h3>
                <p className="role">{member.role}</p>
                <p>{member.email}</p>
                <button className="contact-btn">Contact</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
