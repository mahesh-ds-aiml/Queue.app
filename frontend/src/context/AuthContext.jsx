import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('printq_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('printq_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('printq_user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Failed to verify user token", err);
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchMe();

    const handleLogoutEvent = () => logout();
    window.addEventListener('printq_logout', handleLogoutEvent);
    return () => window.removeEventListener('printq_logout', handleLogoutEvent);
  }, [token]);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('printq_token', access_token);
    localStorage.setItem('printq_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (name, register_number, email, password, role = "student") => {
    await apiClient.post('/auth/register', { name, register_number, email, password, role });
    // Automatically log in after registration
    return await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('printq_token');
    localStorage.removeItem('printq_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
