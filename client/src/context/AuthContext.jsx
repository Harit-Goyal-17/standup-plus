import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE } from '../utils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          // Fetch profiles
          return fetch(`${API_BASE}/profiles`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(profs => {
            setProfiles(profs);
            const savedProfileId = localStorage.getItem('activeProfileId');
            if (savedProfileId) {
              const prof = profs.find(p => p.profile_id === savedProfileId);
              if (prof) setActiveProfile(prof);
            }
          });
        }
        else {
          setToken(null);
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch(e) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch(e) {
      return { success: false, error: 'Network error' };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Google login failed' };
    } catch(e) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveProfile(null);
    setProfiles([]);
    localStorage.removeItem('token');
    localStorage.removeItem('activeProfileId');
  };

  const selectProfile = (profile) => {
    setActiveProfile(profile);
    if (profile) localStorage.setItem('activeProfileId', profile.profile_id);
    else localStorage.removeItem('activeProfileId');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, login, register, loginWithGoogle, logout,
      isAuthModalOpen, setAuthModalOpen,
      profiles, setProfiles, activeProfile, selectProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
