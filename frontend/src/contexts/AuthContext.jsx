import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { showSuccessToast, showErrorToast, showInfoToast } from '../utils/toastUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('auth-token');
      if (token) {
        try {
          const response = await apiService.getProfile();
          if (response.data.success) {
            setIsAuthenticated(true);
            setUser(response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to fetch profile on load', error);
          showErrorToast('Session expired. Please login again.');
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (token, refreshToken, userData = null) => {
    localStorage.setItem('auth-token', token);
    if (refreshToken) {
        localStorage.setItem('refresh-token', refreshToken);
    }
    setIsAuthenticated(true);
    
    // Fetch complete user profile after login
    try {
      const response = await apiService.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        // Fallback to provided userData if profile fetch fails
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch profile after login:', error);
      // Fallback to provided userData if profile fetch fails
      setUser(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    setIsAuthenticated(false);
    setUser(null);
    showInfoToast('You have been logged out successfully.');
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('auth-token');
    if (token && isAuthenticated) {
      try {
        const response = await apiService.getProfile();
        if (response.data.success) {
          setUser(response.data.user);
          return response.data.user;
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
    return null;
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setUser,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
