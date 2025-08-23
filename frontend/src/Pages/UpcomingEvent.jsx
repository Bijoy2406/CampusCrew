import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../CSS/upEventPage.css";
import Footer from "../Components/Footer";
 import Header from "../Components/Header"; // Adjust the path according to your folder structure


function EventsPage() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${backend_link}/api/events`);
        if (response.data.success) {
          setEvents(response.data.events);
        } else {
          setError("Failed to load events");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <p className="text-center mt-5">Loading events...</p>;
  if (error) return <p className="text-center text-danger mt-5">{error}</p>;

  return (
    <div className="events-page-container d-flex flex-column min-vh-100">
      {/* Header */}
      <Header />
      {/* Main content */}
      <div className="container my-5 flex-grow-1">
        <h1 className="text-center mb-5">Upcoming Events</h1>
        <div className="row">
          {events.length === 0 && <p className="text-center">No events found</p>}

          {events.map((event) => {
            let [hours = 0, minutes = 0] = event.duration
              ? event.duration.split("h").map((s) => parseInt(s))
              : [0, 0];

            return (
              <div key={event._id} className="col-12 col-md-6 col-lg-4 mb-4">
                <div className="card event-card shadow-sm h-100">
                  <div className="position-relative">
                    {event.event_image ? (
                      <img
                        src={event.event_image}
                        className="card-img-top event-img"
                        alt={event.title}
                      />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    <span className="badge-prize">🏆 {event.prize_money} BDT</span>
                    <span className="badge-fee">💰 {event.registration_fee} BDT</span>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{event.title}</h5>
                    <p className="card-text">{event.description}</p>

                    <div className="event-detail-box">
                      <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="event-detail-box">
                      <strong>Location:</strong> {event.location}
                    </div>
                    <div className="event-detail-box">
                      <strong>Type:</strong> {event.event_type}
                    </div>
                    <div className="event-detail-box">
                      <strong>Deadline:</strong>{" "}
                      {new Date(event.registration_deadline).toLocaleDateString()}
                    </div>

                    <a href="#" className="btn btn-theme mt-auto">
                      Register
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Footer */}
      <Footer />
    </div>
  );
}

export default EventsPage;
