import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('cricbeas_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          localStorage.removeItem('cricbeas_token');
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const login = async (phoneOrUsername, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrUsername, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('cricbeas_token', data.token);
      
      // Fetch full user details (linked profile)
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      if (meRes.ok) {
        const fullUser = await meRes.json();
        setUser(fullUser);
        return fullUser;
      } else {
        setUser({
          _id: data._id,
          username: data.username,
          phone: data.phone,
          role: data.role,
          playerId: data.playerId,
        });
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('cricbeas_token', data.token);
      
      // Fetch full user details
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      if (meRes.ok) {
        const fullUser = await meRes.json();
        setUser(fullUser);
        return fullUser;
      } else {
        setUser({
          _id: data._id,
          username: data.username,
          phone: data.phone,
          role: data.role,
          playerId: data.playerId,
        });
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cricbeas_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    token: localStorage.getItem('cricbeas_token'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
