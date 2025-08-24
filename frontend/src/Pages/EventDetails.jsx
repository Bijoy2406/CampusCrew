import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { apiService } from '../utils/apiService';
import { useAuth } from '../contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import { showSuccessToast } from '../utils/toastUtils';
import Loader from '../Components/loader_login';
import '../CSS/upEventPage.css';
import '../CSS/eventDetails.css';

// Helper to format date/time elegantly
const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const shimmerLines = Array.from({ length: 6 });

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState('');
  // editing handled on separate page now

  const checkRegistration = useCallback(async (userId, eventId) => {
    if (!userId || !eventId) return;
    try {
      const { data } = await apiService.getUserRegistrations(userId);
      if (data.success) {
        const match = data.registration.find(r => {
          const eid = r.eventId && (r.eventId._id || r.eventId);
            return eid === eventId;
        });
        if (match) {
          // Only treat as registered if backend set is_registered true
          setIsRegistered(match.is_registered === true);
          if (match.is_registered !== true) {
            setRegError('Registration pending. Complete remaining steps.');
          }
        } else {
          setIsRegistered(false);
        }
      }
    } catch (e) {
      // silent fail
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiService.getEvent(id);
        if (data.success) {
          setEvent(data.event);
          if (user?._id) {
            checkRegistration(user._id, data.event._id);
          }
        } else {
          setError(data.message || 'Failed to load event');
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Error loading event');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, checkRegistration]);

  const openEdit = () => { if (event) navigate(`/events/${event._id}/edit`); };

  const deleteEvent = async () => {
    if (!event) return;
    if (!confirm('Delete this event?')) return;
    try {
      const { data } = await apiService.deleteEvent(event._id);
      if (data.success) {
        showSuccessToast('Event deleted');
        navigate('/upcoming-events');
      } else {
        setRegError(data.message || 'Delete failed');
      }
    } catch (err) {
      setRegError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!event) return;
    if (isRegistered) {
      return;
    }
    if (new Date(event.registration_deadline) < new Date()) return;
    setRegistering(true);
    setRegError('');
    try {
      const payload = {
        userId: user._id,
        eventId: event._id,
        payment_status: event.registration_fee > 0 ? 'pending' : 'completed',
        is_registered: event.registration_fee === 0
      };
      const { data } = await apiService.registerForEvent(payload);
      if (data.success) {
        setIsRegistered(true);
        showSuccessToast('Registered successfully');
      } else {
        setRegError(data.message || 'Failed to register');
      }
    } catch (e) {
      setRegError(e.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="eventDetails-wrapper" style={{ fontFamily: 'Silevena' }}>
      <Header />
      <main className="eventDetails-main">
        <button className="ed-backBtn" onClick={() => navigate(-1)} aria-label="Back to events">
          <span className="ed-backIcon">←</span> Back
        </button>

        {loading && (
          <div className="ed-loadingCard">
            <div className="ed-imageSkeleton shimmer" />
            <div className="ed-contentSkeleton">
              {shimmerLines.map((_, i) => (
                <div key={i} className="ed-line shimmer" style={{ width: `${80 - i * 7}%` }} />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="ed-error">
            <p>{error}</p>
            <button onClick={() => navigate('/upcoming-events')} className="ed-primaryBtn">Go Back</button>
          </div>
        )}

        {!loading && !error && event && (
          <article className="ed-card" key={event._id}>
            <div className="ed-media">
              {event.event_image ? (
                <img
                  src={event.event_image}
                  alt={event.title}
                  className="ed-heroImage"
                />
              ) : (
                <div className="ed-heroPlaceholder">No Image</div>
              )}
              <div className="ed-mediaGradient" />
              <div className="ed-badgeGroup">
                <span className="ed-badge type">{(event.event_type || 'event').toUpperCase()}</span>
                {new Date(event.date) > new Date() ? (
                  <span className="ed-badge upcoming">UPCOMING</span>
                ) : (
                  <span className="ed-badge past">PAST</span>
                )}
              </div>
            </div>

            <div className="ed-body">
              <header className="ed-header">
                <h1 className="ed-title">{event.title}</h1>
                <p className="ed-organizer">Hosted by <strong>{event.organizer}</strong></p>
              </header>

              <section className="ed-metaGrid">
                <div className="ed-metaBox">
                  <h4>Date & Time</h4>
                  <p>{formatDateTime(event.date)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Registration Ends</h4>
                  <p>{formatDateTime(event.registration_deadline)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Location</h4>
                  <p>{event.location}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Fee</h4>
                  <p>{event.registration_fee ? `৳ ${event.registration_fee}` : 'Free'}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Prize Money</h4>
                  <p>{event.prize_money ? `৳ ${event.prize_money}` : '—'}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Created</h4>
                  <p>{formatDateTime(event.createdAt)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Category</h4>
                  <p>{event.category}</p>
                </div>
              </section>

              <section className="ed-description">
                <h3>About this event</h3>
                <p>{event.description}</p>
              </section>

              <div className="ed-actions">
                {user?.isAdmin ? (
                  <>
                    <button className="ed-primaryBtn" onClick={openEdit}>Edit Event</button>
                    <button className="ed-outlineBtn" onClick={deleteEvent}>Delete</button>
                  </>
                ) : (
                  <>
                    <button 
                      className={`ed-primaryBtn ${!isRegistered ? 'pulse' : ''}`}
                      onClick={handleRegister}
                      disabled={registering || isRegistered}
                    >
                      {registering ? 'Registering...' : isRegistered ? 'Registered' : 'Register Now'}
                    </button>
                    <button className="ed-outlineBtn" onClick={() => navigate('/upcoming-events')}>More Events</button>
                  </>
                )}
              </div>
              {regError && !registering && !isRegistered && (
                <p style={{color:'var(--error-color,#ff6b6b)',fontSize:'.8rem',marginTop:'.5rem'}}>{regError}</p>
              )}
            </div>
          </article>
        )}
      </main>
      <Footer />
      <ToastContainer />
      {registering && <Loader color={document.documentElement.getAttribute('data-theme')==='dark' ? '#ffffff' : '#000000'} />}
    </div>
  );
}

export default EventDetails;
