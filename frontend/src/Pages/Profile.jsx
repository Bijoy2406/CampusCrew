import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/apiService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CSS/profile.css';

const Profile = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    location: '',
    dob: '',
    targetScore: 7.0,
    isAdmin: false,
    createdAt: ''
  });

  const [editData, setEditData] = useState({ ...profileData });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchProfile();
    }
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching profile...');
      const response = await apiService.getProfile();
      console.log('Profile response:', response);
      console.log('Profile response data:', response.data);
      
      if (response.data.success) {
        const userData = response.data.user;
        console.log('User data received:', userData);
        setProfileData({
          username: userData.username || '',
          email: userData.email || '',
          location: userData.location || '',
          dob: userData.dob ? new Date(userData.dob).toISOString().split('T')[0] : '',
          targetScore: userData.targetScore || 7.0,
          isAdmin: userData.isAdmin || false,
          createdAt: userData.createdAt || ''
        });
      } else {
        console.error('Profile fetch failed:', response.data.message);
        toast.error('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...profileData });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...profileData });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('Saving profile data:', editData);
      const response = await apiService.updateProfile(editData);
      console.log('Save response:', response);
      console.log('Save response data:', response.data);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        console.log('Updated user data:', updatedUser);
        setProfileData({
          username: updatedUser.username || '',
          email: updatedUser.email || '',
          location: updatedUser.location || '',
          dob: updatedUser.dob ? new Date(updatedUser.dob).toISOString().split('T')[0] : '',
          targetScore: updatedUser.targetScore || 7.0,
          isAdmin: updatedUser.isAdmin || false,
          createdAt: updatedUser.createdAt || ''
        });
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        console.error('Save failed:', response.data.message);
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          {loading ? 'Loading profile...' : 'Redirecting to login...'}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
          <h1>My Profile</h1>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <FaUser size={60} />
          </div>
          
          <div className="profile-info">
            {!isEditing ? (
              <>
                <h2>{profileData.username}</h2>
                <p className="profile-email">
                  <FaEnvelope /> {profileData.email}
                </p>
                <p className="profile-location">
                  <FaMapMarkerAlt /> {profileData.location}
                </p>
                <p className="profile-dob">
                  <FaCalendarAlt /> Born: {profileData.dob ? new Date(profileData.dob).toLocaleDateString() : 'Not provided'}
                </p>
                <p className="profile-status">
                  <FaUser /> Status: {profileData.isAdmin ? 'Admin' : 'Student'}
                </p>
                <button onClick={handleEdit} className="edit-btn">
                  <FaEdit /> Edit Profile
                </button>
              </>
            ) : (
              <div className="edit-form">
                <input
                  type="text"
                  name="username"
                  value={editData.username}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Username"
                />
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Email"
                />
                <input
                  type="text"
                  name="location"
                  value={editData.location}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Location"
                />
                <input
                  type="date"
                  name="dob"
                  value={editData.dob}
                  onChange={handleChange}
                  className="edit-input"
                />
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-btn">
                    <FaSave /> Save
                  </button>
                  <button onClick={handleCancel} className="cancel-btn">
                    <FaTimes /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Profile;
