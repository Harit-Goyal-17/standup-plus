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
          })
          .then(res => res.json())
          .then(profs => {
            const profileList = Array.isArray(profs) ? profs : [];
            setProfiles(profileList);
            
            // Restore active profile across refreshes
            const savedProfileId = localStorage.getItem('activeProfileId');
            let matched = profileList.find(p => String(p.profile_id) === String(savedProfileId));
            if (!matched && profileList.length > 0) {
              matched = profileList[0];
            }
            if (matched) {
              setActiveProfile(matched);
              localStorage.setItem('activeProfileId', matched.profile_id);
            }
          });
        } else if (data.status === 401 || data.status === 403 || data.error === 'Invalid token') {
          // Explicit unauthorized token from server
          setToken(null);
          setUser(null);
          setActiveProfile(null);
          localStorage.removeItem('token');
          localStorage.removeItem('activeProfileId');
        }
      })
      .catch((err) => {
        // Network timeout / cold-start: do not wipe token, maintain local session
        console.warn("Auth check network notice (server may be waking up):", err);
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
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
        if (data.profile) {
          setActiveProfile(data.profile);
          localStorage.setItem('activeProfileId', data.profile.profile_id);
        }
        
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch(e) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (username, email, password, phone = null, otp = null) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, phone, otp })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
        if (data.profile) {
          setActiveProfile(data.profile);
          localStorage.setItem('activeProfileId', data.profile.profile_id);
        }
        
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch(e) {
      return { success: false, error: 'Network error' };
    }
  };

  const sendOtp = async (email, type = 'verification') => {
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type })
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to send OTP' };
    } catch(e) {
      return { success: false, error: 'Network error sending OTP' };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, verified: true };
      }
      return { success: false, error: data.error || 'Invalid OTP code' };
    } catch(e) {
      return { success: false, error: 'Network error verifying OTP' };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
        if (data.profile) {
          setActiveProfile(data.profile);
          localStorage.setItem('activeProfileId', data.profile.profile_id);
        }
        
        setAuthModalOpen(false);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to reset password' };
    } catch(e) {
      return { success: false, error: 'Network error resetting password' };
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
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
        if (data.profile) {
          setActiveProfile(data.profile);
          localStorage.setItem('activeProfileId', data.profile.profile_id);
        }
        
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
      sendOtp, verifyOtp, resetPassword,
      isAuthModalOpen, setAuthModalOpen,
      profiles, setProfiles, activeProfile, selectProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
