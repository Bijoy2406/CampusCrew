import React, { useState, useEffect } from "react";
import axios from "axios";
import "../CSS/upEventPage.css";
import Header from "../Components/Header";
import Footer from "../Components/Footer";

function JoinedEvent() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK; // Backend URL
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await axios.get(
          `${backend_link}/api/registrations/user/68a95ccf82873d9ae915dee9`
        );
        if (response.data.success) {
          setRegistrations(response.data.registration);
        } else {
          setError("Failed to load registered events");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching events");
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [backend_link]);

  if (loading) {
    return (
      <div className="eventsPage-container">
        <Header />
        <main className="eventsPage-main">
          <p className="eventsPage-loading">Loading your events...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="eventsPage-container">
        <Header />
        <main className="eventsPage-main">
          <p className="eventsPage-error">{error}</p>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDateParts = (isoDate) => {
    if (!isoDate) return { month: "—", day: "—" };
    const d = new Date(isoDate);
    const month = d.toLocaleString("default", { month: "short" }).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    return { month, day };
  };

  return (
    <div className="eventsPage-container">
      <Header />

      <main className="eventsPage-main">
        <h1 className="sr-only">My Joined Events</h1>

        {registrations.length === 0 && (
          <p className="eventsPage-noEvents">
            You haven't joined any events yet.
          </p>
        )}

        {registrations.length > 0 && (
          <div className="eventCard-grid">
            {registrations.map((reg) => {
              const event = reg.eventId || {};
              const { month, day } = formatDateParts(event.date);
              return (
                <article
                  key={reg._id}
                  className="eventCard"
                  aria-labelledby={`event-title-${reg._id}`}
                >
                  {event.event_image ? (
                    <img
                      src={event.event_image}
                      alt={event.title || "Event image"}
                      className="eventCard-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="eventCard-image eventCard-image--placeholder">
                      No Image
                    </div>
                  )}

                  <div className="eventCard-gradient" />

                  <div className="eventCard-infoBar">
                    <div className="eventCard-dateBlock">
                      <span className="eventCard-dateTop">{month}</span>
                      <span className="eventCard-dateBottom">{day}</span>
                    </div>
                    <div className="eventCard-divider" />
                    <div className="eventCard-meta">
                      <span className="eventCard-category">
                        {(event.event_type || "EVENT").toUpperCase()}
                      </span>
                      <h2
                        id={`event-title-${reg._id}`}
                        className="eventCard-title"
                        title={event.title}
                      >
                        {event.title || "Untitled Event"}
                      </h2>
                      <p className="eventCard-location">
                        {event.location || "Location TBA"}
                      </p>
                    </div>
                  </div>

                  {/* Extra details for screen readers only */}
                  <div className="sr-only">
                    Prize: {event.prize_money} BDT. Fee: {event.registration_fee} BDT.
                    Registration deadline:{" "}
                    {event.registration_deadline
                      ? new Date(
                          event.registration_deadline
                        ).toLocaleDateString()
                      : "—"}
                    . Payment status: {reg.payment_status}. Registered:{" "}
                    {reg.is_registered ? "Yes" : "No"}.
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default JoinedEvent;