import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Star, Trash2, Ban, Eye, Clock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { API_BASE, formatDuration, formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';
import VideoModal from '../components/VideoModal';

export default function ActivityPage() {
  const { user, token, activeProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('watching'); // 'watching' | 'rating'
  const [watchHistory, setWatchHistory] = useState([]);
  const [userRatings, setUserRatings] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedModalVideoId, setSelectedModalVideoId] = useState(null);
  const [hideSuccessMsg, setHideSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (token) {
      fetchActivity();
    }
  }, [token, activeProfile?.profile_id]);

  const fetchActivity = async () => {
    setIsFetching(true);
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
    };

    try {
      const [historyRes, ratingsRes] = await Promise.all([
        fetch(`${API_BASE}/user/watch-history`, { headers: authHeaders }),
        fetch(`${API_BASE}/user/ratings`, { headers: authHeaders })
      ]);

      const historyData = await historyRes.json();
      const ratingsData = await ratingsRes.json();

      setWatchHistory(Array.isArray(historyData) ? historyData : []);
      setUserRatings(Array.isArray(ratingsData) ? ratingsData : []);
    } catch (e) {
      console.error('Error fetching activity:', e);
    } finally {
      setIsFetching(false);
    }
  };

  const handleHideFromHistory = async (videoId, title) => {
    try {
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
      };
      const res = await fetch(`${API_BASE}/user/watch-history/${videoId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        setWatchHistory(prev => prev.filter(item => item.video_id !== videoId));
        setHideSuccessMsg(`"${title}" has been hidden from your viewing history.`);
        setTimeout(() => setHideSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error('Error hiding video:', e);
    }
  };

  const formatActivityDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  if (loading || (!user && isFetching)) {
    return <div className="activity-page-loading">Loading viewing activity...</div>;
  }

  return (
    <div className="activity-page-container">
      {/* Activity Page Header (Netflix Style Matching Screenshot 3) */}
      <div className="activity-page-header">
        <div className="activity-header-left">
          <h1 className="activity-page-title">
            Activity for {activeProfile?.name || user?.username}
          </h1>
          
          <div className="activity-subnav-tabs">
            <button 
              className={`activity-tab-link ${activeTab === 'watching' ? 'active' : ''}`}
              onClick={() => setActiveTab('watching')}
            >
              Watching
            </button>
            <span className="activity-tab-divider">|</span>
            <button 
              className={`activity-tab-link ${activeTab === 'rating' ? 'active' : ''}`}
              onClick={() => setActiveTab('rating')}
            >
              Rating
            </button>
          </div>
        </div>

        {activeProfile?.avatar_url && (
          <img 
            src={activeProfile.avatar_url} 
            alt={activeProfile.name} 
            className="activity-profile-avatar"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {hideSuccessMsg && (
        <div className="activity-toast-msg">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{hideSuccessMsg}</span>
        </div>
      )}

      {/* Activity List Content */}
      <div className="activity-content-table">
        {activeTab === 'watching' ? (
          watchHistory.length === 0 ? (
            <div className="activity-empty-state">
              <Eye size={48} color="#666" style={{ marginBottom: 16 }} />
              <h3>No viewing activity yet</h3>
              <p>Videos you watch on this profile will be listed here.</p>
              <Link to="/shows" className="btn-primary" style={{ marginTop: 20 }}>
                Start Watching
              </Link>
            </div>
          ) : (
            <div className="activity-rows-list">
              {watchHistory.map((item) => {
                const progressPct = item.duration_seconds && item.watch_duration_seconds 
                  ? Math.min(100, Math.round((item.watch_duration_seconds / item.duration_seconds) * 100))
                  : (item.completed ? 100 : 0);

                return (
                  <div key={item.video_id} className="activity-row-item">
                    <div className="activity-col-date">
                      {formatActivityDate(item.watched_at)}
                    </div>

                    <div className="activity-col-media">
                      <div 
                        className="activity-thumb-wrapper"
                        onClick={() => navigate(`/watch/${item.video_id}`)}
                      >
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.title} 
                          className="activity-thumb-img" 
                        />
                        <div className="activity-play-overlay">
                          <Play size={18} fill="#fff" />
                        </div>
                      </div>

                      <div className="activity-media-info">
                        <span 
                          className="activity-video-title"
                          onClick={() => navigate(`/watch/${item.video_id}`)}
                        >
                          {item.title}
                        </span>
                        <div className="activity-video-submeta">
                          <span className="activity-comedian-name">{item.comedian_name}</span>
                          {item.watch_duration_seconds > 0 && (
                            <span className="activity-progress-text">
                              • Watched {formatDuration(item.watch_duration_seconds)} of {formatDuration(item.duration_seconds)} ({progressPct}%)
                            </span>
                          )}
                        </div>

                        {progressPct > 0 && (
                          <div className="activity-progress-bar-wrap">
                            <div 
                              className="activity-progress-bar-fill" 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="activity-col-actions">
                      <button 
                        className="activity-hide-btn"
                        title="Hide from viewing history"
                        onClick={() => handleHideFromHistory(item.video_id, item.title)}
                      >
                        <span>Hide</span>
                        <Ban size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Ratings Tab */
          userRatings.length === 0 ? (
            <div className="activity-empty-state">
              <Star size={48} color="#666" style={{ marginBottom: 16 }} />
              <h3>No ratings yet</h3>
              <p>Ratings you give to standup specials and episodes will appear here.</p>
            </div>
          ) : (
            <div className="activity-rows-list">
              {userRatings.map((item) => (
                <div key={item.video_id} className="activity-row-item">
                  <div className="activity-col-date">
                    {formatActivityDate(item.rated_at)}
                  </div>

                  <div className="activity-col-media">
                    <div 
                      className="activity-thumb-wrapper"
                      onClick={() => navigate(`/watch/${item.video_id}`)}
                    >
                      <img 
                        src={item.thumbnail_url} 
                        alt={item.title} 
                        className="activity-thumb-img" 
                      />
                    </div>

                    <div className="activity-media-info">
                      <span 
                        className="activity-video-title"
                        onClick={() => navigate(`/watch/${item.video_id}`)}
                      >
                        {item.title}
                      </span>
                      <div className="activity-video-submeta">
                        <span className="activity-comedian-name">{item.comedian_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="activity-col-rating">
                    <div className="activity-star-rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          fill={star <= item.rating ? '#e50914' : 'none'}
                          color={star <= item.rating ? '#e50914' : '#666'}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
