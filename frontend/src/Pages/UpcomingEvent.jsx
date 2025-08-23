import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';
import "../CSS/upEventPage.css";
import Footer from "../Components/Footer";
import Header from "../Components/Header";

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
          setEvents(response.data.events || []);
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
  }, [backend_link]);

  if (loading) return <p className="eventsPage-loading">Loading events...</p>;
  if (error) return <p className="eventsPage-error">{error}</p>;

  return (
    <div className="eventsPage-container">
      <Header />
      <main className="eventsPage-main">
        <h1 className="sr-only">Upcoming Events</h1>
        {events.length === 0 && (
          <p className="eventsPage-noEvents">No events found.</p>
        )}

        <div className="eventCard-grid">
          {events.map((event, index) => {
            const startDate = event.date ? new Date(event.date) : null;
            const endDate = event.end_date ? new Date(event.end_date) : null;

            const formatMonth = (d) =>
              d.toLocaleDateString("en-US", { month: "short" });
            const formatDay = (d) => d.getDate();

            let dateTop = "";
            let dateBottom = "";

            if (startDate && endDate) {
              if (startDate.getMonth() === endDate.getMonth()) {
                dateTop = formatMonth(startDate);
                dateBottom = `${formatDay(startDate)}-${formatDay(endDate)}`;
              } else {
                dateTop = `${formatMonth(startDate)} ${formatDay(startDate)}`;
                dateBottom = `${formatMonth(endDate)} ${formatDay(endDate)}`;
              }
            } else if (startDate) {
              dateTop = formatMonth(startDate);
              dateBottom = formatDay(startDate);
            } else {
              dateTop = "--";
              dateBottom = "--";
            }

            return (
              <Link
                to={`/events/${event._id}`}
                key={event._id || index}
                className="eventCard"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {event.event_image ? (
                  <img
                    src={event.event_image}
                    alt={event.title}
                    className="eventCard-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="eventCard-image eventCard-image--placeholder">
                    <span>No Image</span>
                  </div>
                )}

                {/* Full dark gradient overlay */}
                <div className="eventCard-gradient" aria-hidden="true" />

                {/* Blurred info bar */}
                <div className="eventCard-infoBar">
                  <div className="eventCard-dateBlock">
                    <span className="eventCard-dateTop">{dateTop}</span>
                    <span className="eventCard-dateBottom">{dateBottom}</span>
                  </div>

                  <div className="eventCard-divider" aria-hidden="true" />

                  <div className="eventCard-meta">
                    <span className="eventCard-category">
                      {(event.event_type || "EVENT").toUpperCase()}
                    </span>
                    <h3 className="eventCard-title" title={event.title}>
                      {event.title}
                    </h3>
                    {event.location && (
                      <p className="eventCard-location">{event.location}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default EventsPage;