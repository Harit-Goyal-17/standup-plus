import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, COMEDIAN_AVATARS, CLASSIC_AVATARS } from '../utils';
import { Plus, Pencil, Lock, X, Check, ShieldCheck, ArrowLeft, Info } from 'lucide-react';

export default function ProfileSelector() {
  const { profiles, selectProfile, setProfiles, token } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isManaging, setIsManaging] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(COMEDIAN_AVATARS[0].url);
  const [avatarCategory, setAvatarCategory] = useState('comedians');
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  
  // Fullscreen Netflix PIN Screen State
  const [verifyingProfile, setVerifyingProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [showForgotPinNotice, setShowForgotPinNotice] = useState(false);
  const pinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleProfileClick = (p) => {
    if (isManaging) {
      setEditingProfile(p);
      setName(p.name);
      setSelectedAvatar(p.avatar_url);
      setIsLocked(Boolean(p.is_locked));
      setPin('');
      return;
    }

    if (p.is_locked) {
      setVerifyingProfile(p);
      setEnteredPin(['', '', '', '']);
      setPinError(false);
      setShowForgotPinNotice(false);
      setTimeout(() => pinInputRefs[0].current?.focus(), 150);
    } else {
      selectProfile(p);
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

    // Auto verify when 4th digit entered
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

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    if (isLocked && pin && pin.length !== 4) {
      alert('PIN must be exactly 4 numeric digits');
      return;
    }

    try {
      if (editingProfile) {
        const res = await fetch(`${API_BASE}/profiles/${editingProfile.profile_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            avatar_url: selectedAvatar,
            is_locked: isLocked,
            pin: isLocked ? pin : null
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setProfiles(profiles.map(p => p.profile_id === updated.profile_id ? updated : p));
          setEditingProfile(null);
        }
      } else {
        const res = await fetch(`${API_BASE}/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            avatar_url: selectedAvatar,
            is_locked: isLocked,
            pin: isLocked ? pin : null
          })
        });
        if (res.ok) {
          const created = await res.json();
          setProfiles([...profiles, created]);
          setIsAdding(false);
          if (!isLocked) selectProfile(created);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fullscreen Netflix-style PIN Lock Screen (Matching Screenshots 4 & 5)
  if (verifyingProfile) {
    return (
      <div className="netflix-pin-fullscreen">
        <button 
          className="netflix-pin-back-btn" 
          onClick={() => setVerifyingProfile(null)}
          title="Back to profile selection"
        >
          <ArrowLeft size={24} style={{ marginRight: 8 }} /> Back
        </button>

        <div className="netflix-pin-center-content">
          <div className="netflix-pin-subtitle">Profile Lock is currently on.</div>

          {pinError ? (
            <h1 className="netflix-pin-title error">
              Whoops, wrong PIN. Please try again.
            </h1>
          ) : (
            <h1 className="netflix-pin-title">
              Enter your PIN to access this profile.
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
        </div>

        {/* Forgot PIN info notice modal */}
        {showForgotPinNotice && (
          <div className="profile-modal-backdrop" onClick={() => setShowForgotPinNotice(false)}>
            <div className="profile-pin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ background: 'rgba(229, 9, 20, 0.15)', padding: 16, borderRadius: '50%' }}>
                  <Info size={36} color="#e50914" />
                </div>
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Forgot your Profile PIN?</h2>
              <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
                A 4-digit PIN reset option will be sent to your registered account email. You can also edit or disable your PIN anytime via <strong>Manage Profiles</strong>.
              </p>
              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => setShowForgotPinNotice(false)}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="profile-gate">
      {/* Brand Logo Header */}
      <div className="profile-gate-logo">
        <img src="/logo.svg" alt="StandUp+" style={{ width: 34, height: 34, marginRight: 8 }} />
        <span>StandUp<span style={{ color: '#e50914' }}>+</span></span>
      </div>

      <div className="profile-gate-center">
        <h1 className="profile-gate-title">
          {isManaging ? 'Manage Profiles:' : "Who's watching?"}
        </h1>

        <div className="profile-gate-grid">
          {profiles.map(p => (
            <div
              key={p.profile_id}
              className="profile-gate-card"
              onClick={() => handleProfileClick(p)}
            >
              <div className="profile-gate-avatar-wrap">
                <img 
                  src={p.avatar_url} 
                  alt={p.name} 
                  className="profile-gate-avatar" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=e50914`;
                  }}
                />

                {isManaging && (
                  <div className="profile-gate-edit-overlay">
                    <Pencil size={36} />
                  </div>
                )}
              </div>
              
              <span className="profile-gate-name">{p.name}</span>

              {/* Centered Lock icon at the bottom of the card like Screenshot 3 */}
              {Boolean(p.is_locked) && !isManaging && (
                <div className="profile-gate-lock-under-name" title="PIN Locked">
                  <Lock size={16} color="#808080" />
                </div>
              )}
            </div>
          ))}

          {profiles.length < 5 && (
            <div 
              className="profile-gate-card" 
              onClick={() => {
                setIsAdding(true);
                setName('');
                setSelectedAvatar(COMEDIAN_AVATARS[profiles.length % COMEDIAN_AVATARS.length].url);
                setIsLocked(false);
                setPin('');
              }}
            >
              <div className="profile-gate-avatar-wrap">
                <div className="profile-gate-add-btn">
                  <Plus size={52} strokeWidth={1.5} />
                </div>
              </div>
              <span className="profile-gate-name">Add Profile</span>
            </div>
          )}
        </div>

        <button
          className="profile-gate-manage-btn"
          onClick={() => setIsManaging(!isManaging)}
        >
          {isManaging ? 'Done' : 'Manage Profiles'}
        </button>
      </div>

      {/* Add / Edit Profile Modal with Comedian & Classic Avatars */}
      {(isAdding || editingProfile) && (
        <div className="profile-modal-backdrop" onClick={() => { setIsAdding(false); setEditingProfile(null); }}>
          <div className="profile-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-edit-header">
              <h2>{editingProfile ? 'Edit Profile' : 'Add Profile'}</h2>
              <button className="profile-modal-close" onClick={() => { setIsAdding(false); setEditingProfile(null); }}>
                <X size={20} />
              </button>
            </div>

            <div className="profile-edit-body">
              {/* Avatar Selector Gallery with Tabs */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-tabs">
                  <button 
                    type="button" 
                    className={`profile-tab-btn ${avatarCategory === 'comedians' ? 'active' : ''}`}
                    onClick={() => setAvatarCategory('comedians')}
                  >
                    🎭 Stand-Up Comedians
                  </button>
                  <button 
                    type="button" 
                    className={`profile-tab-btn ${avatarCategory === 'classics' ? 'active' : ''}`}
                    onClick={() => setAvatarCategory('classics')}
                  >
                    🤖 Classic Icons
                  </button>
                </div>

                <div className="profile-avatars-grid">
                  {(avatarCategory === 'comedians' ? COMEDIAN_AVATARS : CLASSIC_AVATARS).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`profile-avatar-option ${selectedAvatar === item.url ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(item.url)}
                      title={item.name}
                    >
                      <img 
                        src={item.url} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}&chars=2`;
                        }}
                      />
                      <span className="profile-avatar-caption">{item.name}</span>
                      {selectedAvatar === item.url && <div className="avatar-check"><Check size={14} /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Name Input */}
              <div className="profile-input-group">
                <label className="profile-edit-label">Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. Harit, Zakir OG, Family"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="profile-text-input"
                  autoFocus
                />
              </div>

              {/* Profile PIN Lock Security Feature (Like Netflix) */}
              <div className="profile-lock-section">
                <div className="profile-lock-toggle-row">
                  <div className="profile-lock-info">
                    <div className="profile-lock-title">
                      <ShieldCheck size={18} color="#e50914" /> Profile Lock (4-Digit PIN)
                    </div>
                    <p className="profile-lock-desc">
                      Require a 4-digit PIN to access this profile and view Continue Watching history.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={isLocked} 
                      onChange={(e) => setIsLocked(e.target.checked)} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {isLocked && (
                  <div className="profile-pin-set-container">
                    <label className="profile-edit-label">Set 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={pin}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value)) setPin(e.target.value);
                      }}
                      className="profile-pin-set-input"
                    />
                    <small style={{ color: '#9ca3af', display: 'block', marginTop: 4 }}>
                      Remember this PIN. You'll need it every time you switch to this profile.
                    </small>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-edit-actions">
              <button className="btn-primary" onClick={handleSaveProfile}>
                Save Profile
              </button>
              <button className="btn-secondary" onClick={() => { setIsAdding(false); setEditingProfile(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
