import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, User, LogOut, X, Users, ChevronDown, Edit3, ExternalLink, History, HelpCircle, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, cleanHandle } from '../utils';

export default function Navbar() {
  const { user, token, logout, setAuthModalOpen, profiles, activeProfile, selectProfile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [comediansOpen, setComediansOpen] = useState(false);
  const [allComedians, setAllComedians] = useState([]);
  const [comedianSearch, setComedianSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Locked Profile PIN Verification from Dropdown
  const [verifyingProfile, setVerifyingProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [showForgotPinNotice, setShowForgotPinNotice] = useState(false);
  const pinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  
  const navigate = useNavigate();
  const location = useLocation();
  const comediansRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch favorites count for the heart badge
  useEffect(() => {
    if (user && token) {
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
      };
      fetch(`${API_BASE}/user/favorites`, {
        headers: authHeaders
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFavCount(data.length);
        else setFavCount(0);
      })
      .catch(() => {});
    } else {
      setFavCount(0);
    }
  }, [user, token, activeProfile?.profile_id, location]);

  // Sync navbar search with URL if on /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get('q') || '');
    } else {
      setSearchQuery('');
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) setScrolled(true);
      else setScrolled(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/comedians`)
      .then(res => res.json())
      .then(data => setAllComedians(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // Handle clicking outside comedians or profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (comediansRef.current && !comediansRef.current.contains(event.target)) {
        setComediansOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      navigate(`/search?q=${encodeURIComponent(val)}`);
    } else if (location.pathname === '/search') {
      navigate('/');
    }
  };

  const handleSwitchToProfile = (targetProfile) => {
    setDropdownOpen(false);
    if (targetProfile.is_locked) {
      setVerifyingProfile(targetProfile);
      setEnteredPin(['', '', '', '']);
      setPinError(false);
      setShowForgotPinNotice(false);
      setTimeout(() => pinInputRefs[0].current?.focus(), 150);
    } else {
      selectProfile(targetProfile);
    }
  };

  const handlePinDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...enteredPin];
    newPin[index] = value.slice(-1);
    setEnteredPin(newPin);
    setPinError(false);

    if (value && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    if (index === 3 && value) {
      const fullPin = newPin.join('');
      verifyAndUnlock(verifyingProfile, fullPin);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !enteredPin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const verifyAndUnlock = async (targetProfile, pinString) => {
    try {
      const res = await fetch(`${API_BASE}/profiles/${targetProfile.profile_id}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pinString })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyingProfile(null);
        selectProfile(data.profile);
      } else {
        setPinError(true);
        setEnteredPin(['', '', '', '']);
        setTimeout(() => pinInputRefs[0].current?.focus(), 100);
      }
    } catch(err) {
      setPinError(true);
    }
  };

  const filteredComedians = allComedians.filter(c => 
    c.name.toLowerCase().includes(comedianSearch.toLowerCase())
  );

  const otherProfiles = (profiles || []).filter(p => p.profile_id !== activeProfile?.profile_id);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Left Brand Area */}
        <div className="nav-brand-wrap">
          <Link to="/" className="nav-brand">
            <img 
              src="/logo.svg" 
              alt="StandUp+" 
              className="nav-logo-icon" 
              style={{ width: 36, height: 36, maxWidth: 36, maxHeight: 36, objectFit: 'contain' }}
            />
            <span className="nav-brand-text">StandUp<span style={{ color: '#e50914' }}>+</span></span>
          </Link>
        </div>

        {/* Center Navigation Links */}
        <div className="nav-center-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/shows" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Shows
          </NavLink>
          <NavLink to="/new-popular" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            New & Popular
          </NavLink>
          <NavLink to="/my-list" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My List
          </NavLink>
          
          {/* Comedians Dropdown */}
          <div className="nav-dropdown-container" ref={comediansRef}>
            <button 
              className={`nav-link nav-dropdown-btn ${comediansOpen ? 'active' : ''}`}
              onClick={() => setComediansOpen(!comediansOpen)}
            >
              Browse Comedians <ChevronDown size={15} style={{ marginLeft: 4, transition: 'transform 0.2s', transform: comediansOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {comediansOpen && (
              <div className="nav-comedians-expanded-modal">
                <div className="nav-comedians-modal-header">
                  <div className="nav-comedians-search-box">
                    <Search className="nav-search-icon-inside" size={16} />
                    <input 
                      className="nav-comedians-input"
                      type="text" 
                      placeholder="Search comedians..." 
                      value={comedianSearch}
                      onChange={(e) => setComedianSearch(e.target.value)}
                      autoFocus
                    />
                    {comedianSearch && (
                      <button className="nav-clear-search" onClick={() => setComedianSearch('')}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="nav-comedians-grid">
                  {filteredComedians.length === 0 ? (
                    <div className="nav-comedians-empty">No comedians found matching "{comedianSearch}"</div>
                  ) : (
                    filteredComedians.map((c) => (
                      <Link 
                        key={c.comedian_id} 
                        to={`/comedians/${c.comedian_id}`}
                        className="nav-comedian-card-item"
                        onClick={() => setComediansOpen(false)}
                      >
                        <img 
                          src={c.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`} 
                          alt={c.name}
                          className="nav-comedian-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                          }}
                        />
                        <div className="nav-comedian-info">
                          <span className="nav-comedian-name">{cleanHandle(c.name)}</span>
                          <span className="nav-comedian-count">{c.video_count || 1} special{(c.video_count || 1) > 1 ? 's' : ''}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="nav-actions">
          {/* Netflix Integrated Expanding Search Bar in Navbar */}
          <div className="nav-search-wrapper">
            <Search size={18} className="nav-search-icon" />
            <input 
              type="text"
              className="nav-search-input"
              placeholder="Titles, comedians, genres..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button 
                className="nav-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  if (location.pathname === '/search') navigate('/');
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          {user ? (
            <>
              <Link 
                to="/my-list" 
                className="icon-btn nav-heart-btn" 
                aria-label="My List & Liked Specials"
                title="My List & Liked Specials"
              >
                <Heart 
                  size={22} 
                  fill={favCount > 0 ? '#ff416c' : 'none'} 
                  color={favCount > 0 ? '#ff416c' : 'white'} 
                />
                {favCount > 0 && (
                  <span className="nav-heart-badge">{favCount}</span>
                )}
              </Link>
              
              {/* Netflix-Style Profile Dropdown */}
              <div className="nav-profile-menu-wrap" ref={dropdownRef}>
                <button 
                  className="nav-profile-trigger" 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  title={activeProfile?.name || user?.username}
                >
                  <img 
                    src={activeProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`} 
                    alt={activeProfile?.name || user?.username} 
                    className="nav-profile-trigger-avatar"
                    referrerPolicy="no-referrer"
                  />
                  <ChevronDown 
                    size={15} 
                    className={`nav-profile-chevron ${dropdownOpen ? 'rotated' : ''}`} 
                  />
                </button>

                {dropdownOpen && (
                  <div className="netflix-dropdown-menu">
                    {/* Other profiles in account */}
                    {otherProfiles.length > 0 && (
                      <div className="netflix-dropdown-profiles-list">
                        {otherProfiles.map((p) => (
                          <button
                            key={p.profile_id}
                            className="netflix-dropdown-profile-row"
                            onClick={() => handleSwitchToProfile(p)}
                          >
                            <img 
                              src={p.avatar_url} 
                              alt={p.name} 
                              className="netflix-dropdown-profile-img"
                              referrerPolicy="no-referrer"
                            />
                            <span className="netflix-dropdown-profile-name">{p.name}</span>
                            {Boolean(p.is_locked) && (
                              <Lock size={14} color="#888" style={{ marginLeft: 'auto' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="netflix-dropdown-links-list">
                      <Link 
                        to="/profile" 
                        className="netflix-dropdown-item" 
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Edit3 size={18} />
                        <span>Manage Profiles</span>
                      </Link>

                      <button 
                        onClick={() => { selectProfile(null); setDropdownOpen(false); }} 
                        className="netflix-dropdown-item"
                      >
                        <ExternalLink size={18} />
                        <span>Exit Profile</span>
                      </button>

                      <Link 
                        to="/activity" 
                        className="netflix-dropdown-item" 
                        onClick={() => setDropdownOpen(false)}
                      >
                        <History size={18} />
                        <span>Viewing Activity</span>
                      </Link>

                      <Link 
                        to="/profile" 
                        className="netflix-dropdown-item" 
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User size={18} />
                        <span>Account</span>
                      </Link>

                      <button 
                        onClick={() => { setShowHelpModal(true); setDropdownOpen(false); }} 
                        className="netflix-dropdown-item"
                      >
                        <HelpCircle size={18} />
                        <span>Help Centre</span>
                      </button>
                    </div>

                    <div className="netflix-dropdown-divider" />

                    {/* Sign Out Trigger - Aligned with other items */}
                    <button 
                      onClick={() => { setDropdownOpen(false); setShowSignOutModal(true); }} 
                      className="netflix-dropdown-item netflix-signout-item"
                    >
                      <LogOut size={18} />
                      <span>Sign out of StandUp+</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setAuthModalOpen(true)}>Sign In</button>
          )}
        </div>
      </nav>

      {/* Netflix Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="signout-modal-backdrop" onClick={() => setShowSignOutModal(false)}>
          <div className="signout-modal-card" onClick={e => e.stopPropagation()}>
            <div className="signout-modal-icon-wrap">
              <AlertCircle size={36} color="#e50914" />
            </div>
            <h2 className="signout-modal-title">Sign out of StandUp+?</h2>
            <p className="signout-modal-desc">
              Are you sure you want to sign out? You'll need to enter your email and password to sign back in.
            </p>
            <div className="signout-modal-actions">
              <button 
                className="btn-primary signout-confirm-btn"
                onClick={() => {
                  setShowSignOutModal(false);
                  logout();
                  navigate('/');
                }}
              >
                Sign Out
              </button>
              <button 
                className="btn-secondary signout-cancel-btn"
                onClick={() => setShowSignOutModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Centre Modal */}
      {showHelpModal && (
        <div className="signout-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="signout-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>StandUp+ Help Centre</h2>
              <button className="profile-modal-close" onClick={() => setShowHelpModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>• How do Profile Locks work?</strong>
                You can set a 4-digit PIN for any profile in Profile Settings to secure your Continue Watching and favorite specials.
              </div>
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>• Where can I see my watch history?</strong>
                Click your profile avatar on the top right and select <strong>Viewing Activity</strong> to view, resume, or hide watched videos.
              </div>
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>• Video Playback & Quality:</strong>
                All specials are streamed in crisp HD quality directly through official stand-up comedy channel streams.
              </div>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: 24 }}
              onClick={() => setShowHelpModal(false)}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Locked Profile PIN Verification Modal */}
      {verifyingProfile && (
        <div className="netflix-pin-fullscreen" style={{ zIndex: 3000 }}>
          <button 
            className="netflix-pin-back-btn" 
            onClick={() => setVerifyingProfile(null)}
            title="Cancel"
          >
            <X size={24} style={{ marginRight: 8 }} /> Cancel
          </button>

          <div className="netflix-pin-center-content">
            <div className="netflix-pin-subtitle">Profile Lock is currently on.</div>

            {pinError ? (
              <h1 className="netflix-pin-title error">
                Whoops, wrong PIN. Please try again.
              </h1>
            ) : (
              <h1 className="netflix-pin-title">
                Enter PIN to access {verifyingProfile.name}'s profile.
              </h1>
            )}

            <div className="netflix-pin-box-row">
              {enteredPin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={pinInputRefs[idx]}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  className={`netflix-pin-square ${pinError ? 'error' : ''}`}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button 
              className="netflix-pin-forgot-link"
              onClick={() => setShowForgotPinNotice(true)}
            >
              Forgot PIN?
            </button>

            {showForgotPinNotice && (
              <div className="netflix-pin-forgot-alert">
                <AlertCircle size={16} />
                <span>To reset your profile PIN, go to Manage Profiles from your account settings.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
