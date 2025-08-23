import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';

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
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = (token, refreshToken, userData = null) => {
    localStorage.setItem('auth-token', token);
    if (refreshToken) {
        localStorage.setItem('refresh-token', refreshToken);
    }
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
