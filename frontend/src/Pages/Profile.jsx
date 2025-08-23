import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCamera, FaUpload } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/apiService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CSS/profile.css';

const Profile = () => {
  const { isAuthenticated, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    _id: '',
    username: '',
    email: '',
    location: '',
    dob: '',
    profilePic: '',
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
          _id: userData._id || '',
          username: userData.username || '',
          email: userData.email || '',
          location: userData.location || '',
          dob: userData.dob ? new Date(userData.dob).toISOString().split('T')[0] : '',
          profilePic: userData.profilePic || '',
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
          _id: updatedUser._id || profileData._id,
          username: updatedUser.username || '',
          email: updatedUser.email || '',
          location: updatedUser.location || '',
          dob: updatedUser.dob ? new Date(updatedUser.dob).toISOString().split('T')[0] : '',
          profilePic: updatedUser.profilePic || profileData.profilePic,
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

  // Image upload functions
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (3MB limit)
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > maxSize) {
      toast.error(`File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please select a file smaller than 3MB.`);
      e.target.value = ''; // Clear the input
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      e.target.value = ''; // Clear the input
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('photo', file);

      console.log('Uploading image for user ID:', profileData._id);
      const response = await apiService.uploadProfilePhoto(profileData._id, formData);
      
      if (response.data.success) {
        // Update profile data with new image URL
        setProfileData({
          ...profileData,
          profilePic: response.data.url
        });
        // Also refresh user data in AuthContext to update navbar
        await refreshUserData();
        toast.success('Profile photo updated successfully!');
      } else {
        toast.error(response.data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 413) {
        toast.error('File is too large. Please select a smaller image.');
      } else {
        toast.error('Failed to upload image. Please try again.');
      }
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Clear the input for future uploads
    }
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
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
          <div className="profile-avatar" onClick={!isEditing ? handleImageClick : undefined} style={{ cursor: !isEditing ? 'pointer' : 'default', position: 'relative' }}>
            {profileData.profilePic ? (
              <img 
                src={profileData.profilePic} 
                alt="Profile" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  borderRadius: '50%' 
                }} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            {!profileData.profilePic && (
              <span style={{ fontSize: '60px', fontWeight: 'bold' }}>
                {getInitials(profileData.username)}
              </span>
            )}
            {!isEditing && (
              <div className="upload-overlay">
                <FaCamera size={20} />
                <span style={{ fontSize: '12px', marginTop: '5px' }}>Change Photo</span>
              </div>
            )}
            {uploadingImage && (
              <div className="upload-spinner">
                <div className="spinner"></div>
                <span style={{ fontSize: '12px', marginTop: '10px', color: 'white' }}>Uploading...</span>
              </div>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
          />
          
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
                <div className="upload-photo-section">
                  <button
                    type="button"
                    onClick={handleImageClick}
                    className="upload-photo-btn"
                    disabled={uploadingImage}
                  >
                    <FaUpload /> {uploadingImage ? 'Uploading...' : 'Change Photo'}
                  </button>
                  <small>Accepted formats: JPEG, PNG, GIF, WebP (Max: 3MB)</small>
                </div>
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
