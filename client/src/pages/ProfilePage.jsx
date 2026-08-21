import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Users, Lock, Check, Save, Sparkles, RefreshCw, CreditCard, History, ChevronRight, AlertCircle, LogOut } from 'lucide-react';
import { API_BASE, COMEDIAN_AVATARS, CLASSIC_AVATARS, ALL_AVATARS, cleanHandle } from '../utils';

export default function ProfilePage() {
  const { user, token, activeProfile, selectProfile, profiles, setProfiles, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'profiles' | 'plan' | 'activity'
  const [profileName, setProfileName] = useState(activeProfile?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(activeProfile?.avatar_url || COMEDIAN_AVATARS[0].url);
  const [avatarCategory, setAvatarCategory] = useState('comedians'); // 'comedians' | 'classics'
  const [isLocked, setIsLocked] = useState(Boolean(activeProfile?.is_locked));
  const [pin, setPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [watchCount, setWatchCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (activeProfile) {
      setProfileName(activeProfile.name || '');
      setAvatarUrl(activeProfile.avatar_url || COMEDIAN_AVATARS[0].url);
      setIsLocked(Boolean(activeProfile.is_locked));
    }
  }, [activeProfile]);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/user/watch-history`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWatchCount(data.length);
      })
      .catch(() => {});
    }
  }, [token, activeProfile?.profile_id]);

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
      if (activeProfile) {
        const res = await fetch(`${API_BASE}/profiles/${activeProfile.profile_id}`, {
          method: 'PUT',
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
          const updated = await res.json();
          selectProfile(updated);
          setProfiles(profiles.map(p => p.profile_id === updated.profile_id ? updated : p));
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          const errData = await res.json();
          setSaveError(errData.error || 'Failed to update profile');
        }
      } else {
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
          selectProfile(created);
          setProfiles([...profiles, created]);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          const errData = await res.json();
          setSaveError(errData.error || 'Failed to create profile');
        }
      }
    } catch(err) {
      console.error('Error saving profile:', err);
      setSaveError('Network error while saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="profile-settings-page">
      {/* Top Header */}
      <div className="profile-settings-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 500, color: '#ffffff', marginBottom: 6 }}>Account & Settings</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: 400 }}>Manage your profile, avatars, security and membership plan</p>
        </div>
        <div className="profile-settings-top-actions">
          <button 
            className="btn-secondary profile-action-btn"
            onClick={() => selectProfile(null)}
            title="Switch to profile gate"
          >
            <RefreshCw size={16} /> Switch Profile
          </button>
        </div>
      </div>

      {/* Structured Navigation Tabs */}
      <div className="profile-tabs-nav">
        <button 
          className={`profile-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <User size={18} />
          <span>Edit Profile & Avatars</span>
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={18} />
          <span>Security & PIN</span>
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          <Users size={18} />
          <span>Profiles on Account ({profiles.length})</span>
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          <CreditCard size={18} />
          <span>Membership & Plan</span>
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <History size={18} />
          <span>Viewing History ({watchCount})</span>
        </button>
      </div>

      {/* Tab 1: Edit Active Profile */}
      {activeTab === 'edit' && (
        <div className="profile-tab-content-card">
          <form onSubmit={handleSaveProfile}>
            <div className="profile-edit-section">
              <h2 className="profile-section-heading">Choose Avatar Icon</h2>
              
              {/* Avatar Type Pill Switcher */}
              <div className="avatar-cat-pill-switch">
                <button
                  type="button"
                  className={`avatar-cat-pill ${avatarCategory === 'comedians' ? 'active' : ''}`}
                  onClick={() => setAvatarCategory('comedians')}
                >
                  🎭 Stand-Up Comedians ({COMEDIAN_AVATARS.length})
                </button>
                <button
                  type="button"
                  className={`avatar-cat-pill ${avatarCategory === 'classics' ? 'active' : ''}`}
                  onClick={() => setAvatarCategory('classics')}
                >
                  🤖 Classic Avatars ({CLASSIC_AVATARS.length})
                </button>
              </div>

              {/* Avatar Grid */}
              <div className="avatar-selection-grid">
                {(avatarCategory === 'comedians' ? COMEDIAN_AVATARS : CLASSIC_AVATARS).map((av, idx) => (
                  <div
                    key={idx}
                    className={`avatar-option-item ${avatarUrl === av.url ? 'selected' : ''}`}
                    onClick={() => setAvatarUrl(av.url)}
                  >
                    <img 
                      src={av.url} 
                      alt={av.name} 
                      className="avatar-img-circle"
                      referrerPolicy="no-referrer"
                    />
                    {avatarUrl === av.url && (
                      <div className="avatar-selected-badge">
                        <Check size={14} color="#fff" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-form-group" style={{ marginTop: 32 }}>
              <label className="profile-form-label">Profile Display Name</label>
              <input
                type="text"
                className="profile-input-field"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter profile name"
                required
              />
            </div>



            {saveSuccess && (
              <div className="profile-save-toast">
                <Check size={18} color="#10b981" /> Profile changes saved successfully!
              </div>
            )}

            {saveError && (
              <div className="profile-save-toast" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <AlertCircle size={18} color="#ef4444" /> {saveError}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary profile-save-btn" 
              style={{ marginTop: 28 }}
              disabled={isSaving}
            >
              <Save size={18} /> {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 1.5: Security & PIN */}
      {activeTab === 'security' && (
        <div className="profile-tab-content-card">
          <h2 className="profile-section-heading">Security & PIN</h2>
          <p className="profile-section-desc">Manage your profile lock and security settings.</p>

          <div className="security-lock-card">
            <div className="security-lock-status">
              <div>
                <div className="security-lock-label">
                  <Lock size={18} color={isLocked ? "#e50914" : "#ffffff"} /> Profile Lock
                </div>
                <div className="security-lock-sublabel">
                  {isLocked ? 'A PIN is required to access this profile.' : 'No PIN required to access this profile.'}
                </div>
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
              <>
                <div className="security-pin-edit-section">
                  <label className="profile-form-label">Update 4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="pin-input-field"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <div className="security-note">
                    {activeProfile?.pin ? 'Enter a new 4-digit PIN to update, or leave blank to keep current PIN.' : 'Enter 4 numbers to set your PIN.'}
                  </div>
                </div>

                <div className="security-actions">
                  <button type="button" className="security-action-btn edit-pin" onClick={() => handleSaveProfile()}>
                    Save PIN
                  </button>
                  <button type="button" className="security-action-btn delete-lock" onClick={() => { setIsLocked(false); setPin(''); handleSaveProfile(); }}>
                    Remove Profile Lock
                  </button>
                </div>
              </>
            )}
          </div>
          
          {saveSuccess && (
            <div className="profile-save-toast">
              <Check size={18} color="#10b981" /> Security changes saved successfully!
            </div>
          )}
          {saveError && (
            <div className="profile-save-toast" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <AlertCircle size={18} color="#ef4444" /> {saveError}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profiles on Account */}
      {activeTab === 'profiles' && (
        <div className="profile-tab-content-card">
          <h2 className="profile-section-heading">Profiles on this Account</h2>
          <p className="profile-section-desc">Click any profile to instantly switch or manage their security</p>

          <div className="account-profiles-stack">
            {profiles.map(p => {
              const isActive = p.profile_id === activeProfile?.profile_id;
              return (
                <div 
                  key={p.profile_id} 
                  className={`account-profile-item ${isActive ? 'current-active' : ''}`}
                  onClick={() => selectProfile(p)}
                >
                  <img 
                    src={p.avatar_url} 
                    alt={p.name} 
                    className="account-profile-thumb"
                    referrerPolicy="no-referrer"
                  />
                  <div className="account-profile-details">
                    <div className="account-profile-row-top">
                      <span className="account-profile-name">{p.name}</span>
                      {isActive && <span className="active-profile-pill">Current Active</span>}
                    </div>
                    <div className="account-profile-meta">
                      {Boolean(p.is_locked) ? (
                        <span className="profile-lock-status locked"><Lock size={13} /> Locked with PIN</span>
                      ) : (
                        <span className="profile-lock-status unlocked">Unlocked</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} color="#666" style={{ marginLeft: 'auto' }} />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
            <button 
              className="btn-secondary" 
              onClick={() => selectProfile(null)}
              style={{ padding: '10px 20px' }}
            >
              <Users size={16} /> Manage Profiles Screen
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Membership & Plan */}
      {activeTab === 'plan' && (
        <div className="profile-tab-content-card">
          <h2 className="profile-section-heading">Membership Details</h2>
          
          <div className="membership-info-table">
            <div className="membership-row">
              <span className="membership-label">Account Email</span>
              <span className="membership-val">{user?.email || 'haritgoyal2007@gmail.com'}</span>
            </div>
            <div className="membership-row">
              <span className="membership-label">Account Owner</span>
              <span className="membership-val">{user?.username || 'Harit'}</span>
            </div>
            <div className="membership-row">
              <span className="membership-label">Current Plan</span>
              <span className="membership-val highlight-red">StandUp+ Premium Ultra HD</span>
            </div>
            <div className="membership-row">
              <span className="membership-label">Streaming Quality</span>
              <span className="membership-val">4K Ultra HD + HDR & 1080p</span>
            </div>
            <div className="membership-row">
              <span className="membership-label">Audio Fidelity</span>
              <span className="membership-val">Dolby Atmos & Spatial Audio</span>
            </div>
            <div className="membership-row">
              <span className="membership-label">Screens</span>
              <span className="membership-val">4 Devices Simultaneously</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Viewing Activity Link */}
      {activeTab === 'activity' && (
        <div className="profile-tab-content-card">
          <h2 className="profile-section-heading">Viewing Activity for {activeProfile?.name}</h2>
          <p className="profile-section-desc">You have watched {watchCount} standup comedy specials on this profile.</p>

          <div style={{ marginTop: 24 }}>
            <Link to="/activity" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
              <History size={18} /> Open Full Viewing Activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
