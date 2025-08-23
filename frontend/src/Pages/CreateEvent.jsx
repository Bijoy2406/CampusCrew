import React, { useState } from "react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { toast, ToastContainer } from 'react-toastify';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../utils/toastUtils';
import 'react-toastify/dist/ReactToastify.css';
import "../CSS/createEvent.css"; // Only your custom CSS

function CreateEvent() {
  const [event, setEvent] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    durationHours: 1,
    durationMinutes: 0,
    location: "",
    guestEmail: "",
    guests: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEvent({ ...event, [name]: value });
    
    // Clear any previous error state for this field (optional enhancement)
    if (name === 'name' && value.trim()) {
      // Could add field-specific validation feedback here
    }
  };

  const addGuest = () => {
    if (!event.guestEmail.trim()) {
      showWarningToast("Please enter an email address");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(event.guestEmail.trim())) {
      showErrorToast("Please enter a valid email address");
      return;
    }
    
    // Check if email already exists
    if (event.guests.includes(event.guestEmail.trim())) {
      showWarningToast("This email is already in the guest list");
      return;
    }
    
    setEvent({
      ...event,
      guests: [...event.guests, event.guestEmail.trim()],
      guestEmail: "",
    });
    
    showSuccessToast(`Guest ${event.guestEmail.trim()} added to the list`);
  };

  const handleGuestEmailKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGuest();
    }
  };

  const removeGuest = (index, guestEmail) => {
    const newGuests = event.guests.filter((_, i) => i !== index);
    setEvent({ ...event, guests: newGuests });
    showInfoToast(`Guest ${guestEmail} removed from the list`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!event.name.trim()) {
      showErrorToast("Please enter an event name");
      return;
    }
    
    if (!event.date) {
      showErrorToast("Please select a date for the event");
      return;
    }
    
    if (!event.time) {
      showErrorToast("Please select a time for the event");
      return;
    }
    
    // Check if date is in the future
    const selectedDate = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    
    if (selectedDate <= now) {
      showErrorToast("Event date and time must be in the future");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Show loading toast
      showInfoToast("Creating event...");
      
      // Simulate API call (replace with actual API call later)
      const duration = `${event.durationHours}h ${event.durationMinutes}m`;
      const eventData = {
        ...event,
        duration,
        createdAt: new Date().toISOString()
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Event created:", eventData);
      
      // Show success toast
      showSuccessToast(`Event "${event.name}" has been created successfully!`);
      
      // Reset form
      setEvent({
        name: "",
        description: "",
        date: "",
        time: "",
        durationHours: 1,
        durationMinutes: 0,
        location: "",
        guestEmail: "",
        guests: [],
      });
      
      // Show additional info if guests were added
      if (event.guests.length > 0) {
        setTimeout(() => {
          showInfoToast(`Invitations will be sent to ${event.guests.length} guest(s)`);
        }, 1000);
      }
      
    } catch (error) {
      console.error("Error creating event:", error);
      showErrorToast("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ce-wrapper" style={{ fontFamily: "Silevena" }}>
      <Header />
      <div className="ce-form-container">
        <form className="ce-form" onSubmit={handleSubmit}>
          <h2 className="ce-form-title">Create Event</h2>

          {/* Event Name */}
          <div className="ce-form-group">
            <label className="ce-label">Event Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter event name"
              value={event.name}
              onChange={handleChange}
              className="ce-input"
              required
            />
          </div>

          {/* Description */}
          <div className="ce-form-group">
            <label className="ce-label">Description</label>
            <textarea
              name="description"
              placeholder="Add description"
              value={event.description}
              onChange={handleChange}
              className="ce-textarea"
            />
          </div>

          {/* Date and Time */}
          <div className="ce-form-row">
            <div className="ce-form-group">
              <label className="ce-label">Date</label>
              <input
                type="date"
                name="date"
                value={event.date}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>
            <div className="ce-form-group">
              <label className="ce-label">Time</label>
              <input
                type="time"
                name="time"
                value={event.time}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="ce-form-row">
            <div className="ce-form-group">
              <label className="ce-label">Duration (Hours)</label>
              <input
                type="number"
                name="durationHours"
                min="0"
                max="23"
                value={event.durationHours}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>
            <div className="ce-form-group">
              <label className="ce-label">Duration (Minutes)</label>
              <input
                type="number"
                name="durationMinutes"
                min="0"
                max="59"
                value={event.durationMinutes}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="ce-form-group">
            <label className="ce-label">Location</label>
            <div className="ce-input-inline">
              <input
                type="text"
                name="location"
                placeholder="Choose Location"
                value={event.location}
                onChange={handleChange}
                className="ce-input"
              />
              <button type="button" className="ce-btn">
                Set meeting room
              </button>
            </div>
          </div>

          {/* Guests */}
          <div className="ce-form-group">
            <label className="ce-label">Add Guests</label>
            <div className="ce-input-inline">
              <input
                type="email"
                name="guestEmail"
                placeholder="contact@example.com"
                value={event.guestEmail}
                onChange={handleChange}
                onKeyPress={handleGuestEmailKeyPress}
                className="ce-input"
              />
              <button type="button" className="ce-btn" onClick={addGuest}>
                Add
              </button>
            </div>

            <div className="ce-guest-list">
              {event.guests.map((g, index) => (
                <div key={index} className="ce-guest-item">
                  {g[0].toUpperCase()} - {g}
                  <button
                    type="button"
                    className="ce-remove-btn"
                    onClick={() => removeGuest(index, g)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className={`ce-btn ce-full-width ${isSubmitting ? 'ce-btn-loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="ce-loading-spinner"></span>
                Creating Event...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </form>
      </div>
      <Footer />
      
      {/* Toast Container */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default CreateEvent;
