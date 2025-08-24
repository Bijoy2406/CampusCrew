import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../CSS/upEventPage.css";
import Footer from "../Components/Footer";
import Header from "../Components/Header";

function EventsPage() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isShrunk, setIsShrunk] = useState(false);

  // extract unique categories from events
  const categories = [...new Set(events.map((e) => e.event_type).filter(Boolean))];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${backend_link}/api/events`);
        if (response.data.success) {
          setEvents(response.data.events || []);
          setFilteredEvents(response.data.events || []);
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

  // Scroll listener for sticky + blur search bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsShrunk(true);
      } else {
        setIsShrunk(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset to original size + scroll to top whenever an input/dropdown is focused
  const handleFocus = () => {
    setIsShrunk(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Combined search and filters
  useEffect(() => {
    let filtered = events.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (categoryFilter) {
      filtered = filtered.filter(
        (event) => event.event_type && event.event_type === categoryFilter
      );
    }
    setFilteredEvents(filtered);
  }, [searchQuery, categoryFilter, events]);

  if (loading) return <p className="eventsPage-loading">Loading events...</p>;
  if (error) return <p className="eventsPage-error">{error}</p>;

  return (
    <div className="eventsPage-container">
      <Header />
      <main className="eventsPage-main">
        <h1 className="sr-only">Upcoming Events</h1>

        {/* 🔹 Search + Filters */}
        <div
          className={`eventsPage-searchWrapper sticky-top ${
            isShrunk ? "eventsPage-searchWrapper--scrolled" : ""
          }`}
        >
          <div className="eventsPage-searchRow">
            {/* Search Input with Icon */}
            <div className="eventsPage-searchBox">
              <span className="eventsPage-searchIcon">🔍</span>
              <input
                id="eventSearch"
                type="text"
                placeholder="Search by event title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleFocus}
                onClick={handleFocus}
                className="eventsPage-searchInput"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              onFocus={handleFocus}
              onClick={handleFocus}
              className="eventsPage-filterSelect"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEvents.length === 0 && (
          <p className="eventsPage-noEvents">No events found.</p>
        )}

        <div className="eventCard-grid">
          {filteredEvents.map((event, index) => {
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
