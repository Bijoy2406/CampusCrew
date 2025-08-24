import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../CSS/EventAttendee.css";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import defaultavator from "../assets/img/defaultavator.png";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

function EventAttendee() {
  const { id } = useParams();
  const [users, setUsers] = useState([]);
  const backend = import.meta.env.VITE_BACKEND_LINK;
  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${backend}/api/registrations/event/${id}`
      );
      if (data.success) {
        setUsers(data.registration);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    fetchData();
  }, [id]);
  const BanUser = async (userid) => {
    try {
      const { data } = await axios.put(`${backend}/api/unregister`, {
        userId: userid,
        eventId: id,
      });
      if (data.success) {
        console.log(data);
        showSuccessToast("Unregistered successfully. ");
        fetchData();
      }
    } catch (error) {
      showErrorToast("Unregistration failed.");
    }
  };
  return (
    <div className="page-wrapper">
      <Header />
      <div className="content-wrapper">
        <div className="attendees-container">
          <h2>Event Attendees</h2>
          {users.length === 0 ? (
            <p>No attendees found.</p>
          ) : (
            <div className="attendees-grid">
              {users.map((user) => (
                <div className="attendee-card" key={user._id}>
                  <div className="profile-pic-container">
                    <img
                      src={user.userId.profilePic || defaultavator}
                      alt={user.userId.username}
                      className="profile-pic"
                    />
                  </div>
                  <h3>{user.userId.username}</h3>
                  <p>
                    <strong>Email:</strong> {user.userId.email}
                  </p>
                  <p>
                    <strong>Location:</strong> {user.userId.location}
                  </p>
                  <p>
                    <strong>Date of Birth:</strong>{" "}
                    {new Date(user.userId.dob).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Registration Status:</strong>{" "}
                    {user.is_registered ? "Registered" : "Not Registered"}
                  </p>
                  <p>
                    <strong>Payment Status:</strong> {user.payment_status}
                  </p>
                  <p>
                    <strong>Registered At:</strong>{" "}
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                  <button
                    className="attendee-button"
                    onClick={() => BanUser(user.userId._id)}
                  >
                    Ban user
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default EventAttendee;
