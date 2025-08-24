import React, { useState } from "react";
import axios from "axios";
import "../CSS/AdminSignup.css"; // 🔹 Import custom CSS
import { useNavigate } from "react-router-dom";

function AdminSignup() {
  const backend = import.meta.env.VITE_BACKEND_LINK;
  const secret = import.meta.env.VITE_ADMIN_SECRET;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    dob: "",
    location: "",
    isAdmin: true,
    admin_secret: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.confirm_password !== formData.password) {
      setError("Passwords do not match");
      return;
    }
    if (formData.admin_secret !== secret) {
      setError("Admin secret doesn't match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data } = await axios.post(`${backend}/api/signup`, formData);
      if (data.success) {
        setMessage(
          "Admin registered successfully! Please check your email for verification."
        );
        setFormData({
          username: "",
          email: "",
          password: "",
          confirm_password: "",
          dob: "",
          location: "",
          isAdmin: true,
          admin_secret: "",
        });
        navigate("/login");
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Something went wrong, try again"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2 className="signup-title">Admin Signup</h2>

        {error && <p className="error-msg">{error}</p>}
        {message && <p className="success-msg">{message}</p>}

        <form onSubmit={handleSubmit} className="signup-form">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm Password"
            value={formData.confirm_password}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
          />
          <input
            type="text"
            name="admin_secret"
            placeholder="Admin Secret"
            value={formData.admin_secret}
            onChange={handleChange}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminSignup;
