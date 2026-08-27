import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Pencil, 
  Plus, 
  ChevronRight, 
  ShieldCheck, 
  Lock, 
  Check, 
  History, 
  CreditCard, 
  LogOut, 
  Trash2, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';
import { 
  API_BASE, 
  COMEDIAN_AVATARS, 
  SHOW_AVATARS, 
  CLASSIC_AVATARS, 
  ALL_AVATARS, 
  cleanHandle 
} from '../utils';

export default function ProfilePage() {
  const { user, token, activeProfile, selectProfile, profiles, setProfiles, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  // Navigation View Modes: 'overview' | 'edit' | 'avatars' | 'security' | 'activity'
  const [pageView, setPageView] = useState('overview');
  const [editingProfile, setEditingProfile] = useState(null);

  // Form Fields for Editing Profile
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [watchHistory, setWatchHistory] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Load active profile into edit state
  useEffect(() => {
    if (activeProfile && !editingProfile) {
      setProfileName(activeProfile.name || '');
      setAvatarUrl(activeProfile.avatar_url || CLASSIC_AVATARS[0].url);
      setIsLocked(Boolean(activeProfile.is_locked));
    }
  }, [activeProfile, editingProfile]);

  // Fetch watch history for viewing activity
  const loadWatchHistory = () => {
    if (token) {
      setFetchingHistory(true);
      fetch(`${API_BASE}/user/watch-history`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        }
      })
      .then(res => res.json())
      .then(data => {
        setWatchHistory(Array.isArray(data) ? data : []);
        setFetchingHistory(false);
      })
      .catch(() => setFetchingHistory(false));
    }
  };

  const handleStartEdit = (p) => {
    const target = p || activeProfile;
    setEditingProfile(target);
    setProfileName(target.name || '');
    setAvatarUrl(target.avatar_url || CLASSIC_AVATARS[0].url);
    setIsLocked(Boolean(target.is_locked));
    setPin('');
    setSaveError('');
    setPageView('edit');
  };

  const handleCreateNewProfile = () => {
    if (profiles.length >= 5) {
      alert('You have reached the maximum limit of 5 profiles per account.');
      return;
    }
    const newTemp = {
      profile_id: null,
      name: `Profile ${profiles.length + 1}`,
      avatar_url: ALL_AVATARS[profiles.length % ALL_AVATARS.length].url,
      is_locked: false
    };
    setEditingProfile(newTemp);
    setProfileName(newTemp.name);
    setAvatarUrl(newTemp.avatar_url);
    setIsLocked(false);
    setPin('');
    setSaveError('');
    setPageView('edit');
  };

  const handleSelectAvatar = (url) => {
    setAvatarUrl(url);
    setPageView('edit');
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileName.trim()) {
      setSaveError('Please enter a profile name');
      return;
    }

    if (isLocked && pin && pin.length !== 4) {
      setSaveError('Please enter a 4-digit numeric PIN for Profile Lock');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      if (editingProfile && editingProfile.profile_id) {
        // Update existing profile
        const res = await fetch(`${API_BASE}/profiles/${editingProfile.profile_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: profileName.trim(),
            avatar_url: avatarUrl,
            is_locked: isLocked,
            pin: isLocked && pin ? pin : (isLocked ? undefined : null)
          })
        });

        if (res.ok) {
          const updated = await res.json();
          setProfiles(profiles.map(p => p.profile_id === updated.profile_id ? updated : p));
          if (activeProfile?.profile_id === updated.profile_id) {
            selectProfile(updated);
          }
          setPageView('overview');
        } else {
          const errData = await res.json();
          setSaveError(errData.error || 'Failed to update profile');
        }
      } else {
        // Create new profile
        const res = await fetch(`${API_BASE}/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: profileName.trim(),
            avatar_url: avatarUrl,
            is_locked: isLocked,
            pin: isLocked ? pin : null
          })
        });

        if (res.ok) {
          const created = await res.json();
          setProfiles([...profiles, created]);
          setPageView('overview');
        } else {
          const errData = await res.json();
          setSaveError(errData.error || 'Failed to create profile');
        }
      }
    } catch (err) {
      setSaveError('Connection error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!editingProfile?.profile_id) {
      setPageView('overview');
      return;
    }

    if (profiles.length <= 1) {
      alert('You cannot delete the only profile on your account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete profile "${editingProfile.name}"? Watch history for this profile will be permanently removed.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profiles/${editingProfile.profile_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const remaining = profiles.filter(p => p.profile_id !== editingProfile.profile_id);
        setProfiles(remaining);
        if (activeProfile?.profile_id === editingProfile.profile_id) {
          selectProfile(remaining[0]);
        }
        setPageView('overview');
      }
    } catch (err) {
      alert('Failed to delete profile');
    }
  };

  if (loading || !user) {
    return (
      <div style={{ paddingTop: '120px', minHeight: '80vh', textAlign: 'center', color: '#9ca3af' }}>
        <div className="skeleton" style={{ width: 200, height: 32, margin: '0 auto 20px', borderRadius: 6 }} />
        <span>Loading your account & profiles...</span>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: PROFILES OVERVIEW (SCREENSHOT 3)
  // ==========================================
  if (pageView === 'overview') {
    return (
      <div style={{ minHeight: '90vh', paddingTop: '100px', paddingBottom: '80px', maxWidth: '820px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        {/* Back link */}
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '24px', padding: 0 }}
        >
          <ArrowLeft size={18} />
          <span>Back to StandUp+</span>
        </button>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Profiles & Parental Controls
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginBottom: '32px' }}>
          Manage profiles, custom avatars, security PINs, and viewing permissions
        </p>

        {/* Top Control Cards */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '36px' }}>
          <div 
            onClick={() => handleStartEdit(activeProfile)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', cursor: 'pointer', transition: 'background 0.2s' }}
            className="settings-hover-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ShieldCheck size={22} color="#9ca3af" />
              <div>
                <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '1rem' }}>Adjust parental controls & maturity</div>
                <div style={{ color: '#6b7280', fontSize: '0.84rem' }}>Set content maturity ratings, lock titles</div>
              </div>
            </div>
            <ChevronRight size={18} color="#6b7280" />
          </div>

          <div 
            onClick={() => { loadWatchHistory(); setPageView('activity'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', cursor: 'pointer', transition: 'background 0.2s' }}
            className="settings-hover-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <History size={22} color="#9ca3af" />
              <div>
                <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '1rem' }}>Viewing activity & history</div>
                <div style={{ color: '#6b7280', fontSize: '0.84rem' }}>Manage watch history, ratings, and saved comedy</div>
              </div>
            </div>
            <ChevronRight size={18} color="#6b7280" />
          </div>
        </div>

        {/* Section Heading */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
          Profile settings
        </h2>

        {/* Profile List Rows */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
          {profiles.map((p, idx) => {
            const isCurrent = activeProfile?.profile_id === p.profile_id;
            return (
              <div
                key={p.profile_id || idx}
                onClick={() => handleStartEdit(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: idx < profiles.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                className="settings-hover-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  {/* Square Avatar */}
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={p.avatar_url || CLASSIC_AVATARS[0].url} 
                      alt={p.name}
                      style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', background: '#1e293b' }} 
                    />
                    {p.is_locked && (
                      <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#111827', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', padding: '3px' }}>
                        <Lock size={10} color="#e50914" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '1.05rem' }}>{p.name}</span>
                      {isCurrent && (
                        <span style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                          Now watching
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '2px' }}>
                      {p.is_locked ? '🔒 Profile Protected with 4-digit PIN' : 'All Maturity Ratings • Unlocked'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ChevronRight size={18} color="#6b7280" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Profile Button */}
        <button
          onClick={handleCreateNewProfile}
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s ease',
            marginBottom: '40px'
          }}
        >
          <Plus size={18} />
          <span>Add Profile</span>
        </button>

        {/* Account Info Footer */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Signed in as:</div>
            <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '0.95rem' }}>{user.email || user.username}</div>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#9ca3af',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: EDIT PROFILE (SCREENSHOT 4)
  // ==========================================
  if (pageView === 'edit') {
    return (
      <div style={{ minHeight: '90vh', paddingTop: '100px', paddingBottom: '80px', maxWidth: '640px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '32px' }}>
          {editingProfile?.profile_id ? 'Edit Profile' : 'Add Profile'}
        </h1>

        {saveError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
            {saveError}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          {/* Top Avatar & Name Section */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '36px' }}>
            {/* Square Avatar with Pencil Overlay */}
            <div 
              onClick={() => setPageView('avatars')}
              style={{
                position: 'relative',
                width: '110px',
                height: '110px',
                borderRadius: '12px',
                cursor: 'pointer',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
              className="profile-avatar-large-hover"
            >
              <img 
                src={avatarUrl || CLASSIC_AVATARS[0].url} 
                alt="Profile Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#1e293b' }} 
              />
              {/* Pencil Badge Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: '#ffffff'
              }}>
                <Pencil size={22} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Change</span>
              </div>
            </div>

            {/* Profile Name Field */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '8px' }}>
                Profile Name
              </label>
              <input 
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Harit"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  fontSize: '1.05rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', marginBottom: '32px' }} />

          {/* Profile Security PIN Section */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} color="#9ca3af" />
                  <span>Profile Lock PIN</span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '2px' }}>
                  Require a 4-digit PIN to access this profile and view history
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                style={{
                  background: isLocked ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  width: '48px',
                  height: '26px',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isLocked ? '#000000' : '#9ca3af',
                  position: 'absolute',
                  top: '3px',
                  left: isLocked ? '25px' : '3px',
                  transition: 'left 0.2s ease'
                }} />
              </button>
            </div>

            {isLocked && (
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
                <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Enter 4-Digit Numeric PIN:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '240px' }}>
                  <input 
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '1.2rem',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px' }}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', marginBottom: '32px' }} />

          {/* Action Buttons (Solid White & Subtle Grey) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              type="button"
              onClick={() => setPageView('overview')}
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {editingProfile?.profile_id && profiles.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteProfile}
                style={{
                  background: 'transparent',
                  color: '#9ca3af',
                  border: 'none',
                  padding: '12px 18px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={16} />
                <span>Delete Profile</span>
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: AVATAR CATALOG (SCREENSHOT 5)
  // ==========================================
  if (pageView === 'avatars') {
    return (
      <div style={{ minHeight: '90vh', paddingTop: '100px', paddingBottom: '80px', maxWidth: '960px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        {/* Top Back Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button 
            onClick={() => setPageView('edit')}
            style={{ background: 'none', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Choose an Avatar
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '4px 0 0' }}>
              Select a stylized comedian portrait or classic streaming character
            </p>
          </div>
        </div>

        {/* Category 1: Top Stand-Up Comedians */}
        <div style={{ marginBottom: '44px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Top Stand-Up Comedians
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '16px' }}>
            {COMEDIAN_AVATARS.map((av) => {
              const isSelected = avatarUrl === av.url;
              return (
                <div
                  key={av.id}
                  onClick={() => handleSelectAvatar(av.url)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    background: '#1e293b',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  className="netflix-avatar-square-card"
                  title={av.name}
                >
                  <img src={av.url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: '#ffffff', color: '#000000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category 2: Original Comedy Shows */}
        <div style={{ marginBottom: '44px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Comedy Shows & Specials
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '16px' }}>
            {SHOW_AVATARS.map((av) => {
              const isSelected = avatarUrl === av.url;
              return (
                <div
                  key={av.id}
                  onClick={() => handleSelectAvatar(av.url)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    background: '#1e293b',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  className="netflix-avatar-square-card"
                  title={av.name}
                >
                  <img src={av.url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: '#ffffff', color: '#000000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category 3: Classic Streaming Characters */}
        <div style={{ marginBottom: '44px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Classic Illustrated Originals
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '16px' }}>
            {CLASSIC_AVATARS.map((av) => {
              const isSelected = avatarUrl === av.url;
              return (
                <div
                  key={av.id}
                  onClick={() => handleSelectAvatar(av.url)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    background: '#1e293b',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  className="netflix-avatar-square-card"
                  title={av.name}
                >
                  <img src={av.url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: '#ffffff', color: '#000000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: VIEWING ACTIVITY & HISTORY
  // ==========================================
  if (pageView === 'activity') {
    return (
      <div style={{ minHeight: '90vh', paddingTop: '100px', paddingBottom: '80px', maxWidth: '780px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        <button 
          onClick={() => setPageView('overview')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '24px', padding: 0 }}
        >
          <ArrowLeft size={18} />
          <span>Back to Profiles</span>
        </button>

        <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
          Viewing Activity
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '28px' }}>
          Recent stand-up sets and specials watched on {activeProfile?.name || 'this profile'}
        </p>

        {fetchingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>Loading activity...</div>
        ) : watchHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <p style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '8px' }}>No watch activity yet</p>
            <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Videos you watch will appear here to easily continue where you left off.</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            {watchHistory.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(`/watch/${item.video_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: idx < watchHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  cursor: 'pointer'
                }}
                className="settings-hover-row"
              >
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '0.95rem' }}>{item.title}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{item.comedian_name}</div>
                </div>
                <ChevronRight size={16} color="#6b7280" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
