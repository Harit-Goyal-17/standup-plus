import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Sparkles, Film, Flame, Users, CheckCircle, ChevronRight, X, Clock, Eye, Heart, Layers } from 'lucide-react';
import { API_BASE, formatViews, formatDuration, formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function ShowsPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();

  const [shows, setShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/shows`)
      .then(res => res.json())
      .then(data => {
        setShows(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching shows:', err);
        setLoading(false);
      });

    if (user && token) {
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
      };
      fetch(`${API_BASE}/user/watch-history`, {
        headers: authHeaders
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setWatchHistory(data);
          else setWatchHistory([]);
        })
        .catch(console.error);
    }
  }, [user, token, activeProfile?.profile_id]);

  useEffect(() => {
    if (showId) {
      loadShowDetails(showId);
    } else {
      setSelectedShow(null);
      setSelectedSeason('all');
    }
  }, [showId]);

  const loadShowDetails = (id) => {
    setModalLoading(true);
    fetch(`${API_BASE}/shows/${id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedShow(data);
        if (data.seasons && data.seasons.length > 1) {
          setSelectedSeason(data.seasons[0].season_number);
        } else {
          setSelectedSeason('all');
        }
        setModalLoading(false);
      })
      .catch(err => {
        console.error('Error loading show details:', err);
        setModalLoading(false);
      });
  };

  const handleShowClick = (show) => {
    navigate(`/shows/${show.id}`);
  };

  const handleCloseModal = () => {
    navigate('/shows');
    setSelectedShow(null);
  };

  const handlePlayEpisode = (ep) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate(`/watch/${ep.video_id}`);
  };

  const categories = ['All', 'Game & Panel Show', 'Roast Battle', 'Dark & Raw', 'Courtroom & Roast', 'Improv & Games', 'News & Quiz', 'Poetry & Roast', 'Talent & Roast', 'Dating & Advice', 'Talk & Nostalgia'];

  const filteredShows = activeCategory === 'All'
    ? shows
    : shows.filter(s => s.category.toLowerCase().includes(activeCategory.toLowerCase()) || activeCategory.toLowerCase().includes(s.category.toLowerCase()));

  const featuredShow = shows[0];

  const displayedEpisodes = selectedShow?.episodes ? (
    selectedSeason === 'all'
      ? selectedShow.episodes
      : selectedShow.episodes.filter(ep => ep.season_number === Number(selectedSeason))
  ) : [];

  return (
    <div className="shows-page-container">
      {/* Featured Show Banner */}
      {featuredShow && (
        <div className="shows-hero-banner" style={{ backgroundImage: `linear-gradient(to bottom, rgba(10,10,15,0.4) 0%, rgba(10,10,15,0.95) 100%), url(${featuredShow.thumbnail_url})` }}>
          <div className="shows-hero-content">
            <div className="shows-hero-badge">
              <Sparkles size={16} /> {featuredShow.badge || 'Original Series'}
            </div>
            <h1 className="shows-hero-title">{featuredShow.title}</h1>
            <div className="shows-hero-meta">
              {featuredShow.host_avatar && (
                <img 
                  src={featuredShow.host_avatar} 
                  alt={featuredShow.host} 
                  className="shows-host-avatar-sm"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(featuredShow.host)}&chars=2`;
                  }}
                />
              )}
              <span className="shows-hero-host">Hosted by <strong>{featuredShow.host}</strong></span>
              <span className="shows-meta-bullet">•</span>
              <span className="shows-meta-badge">{featuredShow.category}</span>
              <span className="shows-meta-bullet">•</span>
              {featuredShow.seasons_count > 1 && (
                <>
                  <span className="shows-meta-badge">{featuredShow.seasons_count} Seasons</span>
                  <span className="shows-meta-bullet">•</span>
                </>
              )}
              <span className="shows-meta-episodes">{featuredShow.episode_count} Episodes</span>
              <span className="shows-meta-bullet">•</span>
              <span className="shows-rating-pill">{featuredShow.rating}</span>
            </div>
            <p className="shows-hero-desc">{featuredShow.description}</p>
            <div className="shows-hero-actions">
              <button 
                className="netflix-white-play-btn"
                style={{ padding: '12px 28px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => handleShowClick(featuredShow)}
              >
                <Play size={20} fill="#000" color="#000" /> Browse All {featuredShow.episode_count} Episodes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shows Hub Navigation & Filter Pills */}
      <div className="shows-main-content">
        <div className="shows-section-header">
          <div>
            <h2 className="shows-heading">Original Comedy Shows & Series</h2>
            <p className="shows-subheading">Full series, multi-season panel shows, roast battles & games hosted by India's biggest comedians</p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="shows-category-chips">
          {categories.map(cat => (
            <button
              key={cat}
              className={`shows-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Shows Grid */}
        {loading ? (
          <div className="shows-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />
            ))}
          </div>
        ) : (
          <div className="shows-grid">
            {filteredShows.map(show => (
              <div 
                key={show.id} 
                className="show-card"
                onClick={() => handleShowClick(show)}
              >
                <div className="show-card-thumb-wrapper">
                  <img src={show.thumbnail_url} alt={show.title} className="show-card-thumb" />
                  <div className="show-card-badge-overlay">{show.badge}</div>
                  <div className="show-card-ep-count">
                    {show.seasons_count > 1 ? `${show.seasons_count} Seasons • ` : ''}{show.episode_count} Episodes
                  </div>
                  <div className="show-card-play-overlay">
                    <div className="show-card-play-icon">
                      <Play size={24} fill="white" />
                    </div>
                  </div>
                </div>

                <div className="show-card-info">
                  <div className="show-card-header">
                    <h3 className="show-card-title">{show.title}</h3>
                    <span className="show-card-rating">{show.rating}</span>
                  </div>

                  <div className="show-card-host-row">
                    <img 
                      src={show.host_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(show.host)}&chars=2`} 
                      alt={show.host} 
                      className="show-card-host-pic"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(show.host)}&chars=2`;
                      }}
                    />
                    <span className="show-card-host-name">Hosted by <strong>{show.host}</strong></span>
                  </div>

                  <p className="show-card-tagline">{show.tagline}</p>

                  <div className="show-card-footer">
                    <span className="show-card-category">{show.category}</span>
                    <span className="show-card-views">{formatViews(show.total_views)} Views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show Details & Episode List Modal */}
      {(selectedShow || modalLoading) && (
        <div className="show-modal-overlay" onClick={handleCloseModal}>
          <div className="show-modal-container" onClick={e => e.stopPropagation()}>
            <button className="show-modal-close" onClick={handleCloseModal}>
              <X size={24} />
            </button>

            {modalLoading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
                <div className="skeleton" style={{ height: 200, width: '100%', marginBottom: 20 }} />
                <h3>Loading Episodes...</h3>
              </div>
            ) : selectedShow && (
              <div>
                {/* Modal Banner */}
                <div className="show-modal-hero" style={{ backgroundImage: `linear-gradient(to top, #141419 0%, rgba(20,20,25,0.7) 60%, rgba(20,20,25,0.2) 100%), url(${selectedShow.thumbnail_url})` }}>
                  <div className="show-modal-hero-content">
                    <div className="show-modal-badge">{selectedShow.badge}</div>
                    <h1 className="show-modal-title">{selectedShow.title}</h1>
                    <div className="show-modal-meta">
                      <img 
                        src={selectedShow.host_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedShow.host)}&chars=2`} 
                        alt={selectedShow.host} 
                        className="shows-host-avatar-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedShow.host)}&chars=2`;
                        }}
                      />
                      <span>Hosted by <strong>{selectedShow.host}</strong></span>
                      <span>•</span>
                      <span className="shows-rating-pill">{selectedShow.rating}</span>
                      <span>•</span>
                      <span>{selectedShow.category}</span>
                      <span>•</span>
                      <span>{selectedShow.episode_count} Episodes</span>
                      <span>•</span>
                      <span>{formatViews(selectedShow.total_views)} Total Views</span>
                    </div>
                    <p className="show-modal-description">{selectedShow.description}</p>
                    
                    {selectedShow.episodes?.length > 0 && (
                      <button 
                        className="netflix-white-play-btn" 
                        style={{ marginTop: 16, padding: '12px 28px', fontSize: '1.05rem', gap: 10, display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => handlePlayEpisode(selectedShow.episodes[0])}
                      >
                        <Play size={20} fill="black" color="black" /> Play Episode 1
                      </button>
                    )}
                  </div>
                </div>

                {/* Episodes Section with Season Selection */}
                <div className="show-modal-episodes-section">
                  <div className="show-episodes-header">
                    <div>
                      <h3>Episodes ({displayedEpisodes.length})</h3>
                      <span className="show-episodes-subtitle">
                        {selectedSeason === 'all' ? 'All Seasons' : `Season ${selectedSeason}`}
                      </span>
                    </div>

                    {/* Season Selector */}
                    {selectedShow.seasons && selectedShow.seasons.length > 1 && (
                      <div className="show-season-selector-wrapper">
                        <select 
                          className="show-season-dropdown"
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(e.target.value)}
                        >
                          {selectedShow.seasons.map(s => (
                            <option key={s.season_number} value={s.season_number}>
                              {s.season_name} ({s.episode_count} Episodes)
                            </option>
                          ))}
                          <option value="all">All Seasons ({selectedShow.episode_count} Episodes)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Season Quick Pills (for fast switching) */}
                  {selectedShow.seasons && selectedShow.seasons.length > 1 && (
                    <div className="show-season-pills-row">
                      {selectedShow.seasons.map(s => (
                        <button
                          key={s.season_number}
                          className={`show-season-pill-btn ${selectedSeason === s.season_number ? 'active' : ''}`}
                          onClick={() => setSelectedSeason(s.season_number)}
                        >
                          <Layers size={14} /> {s.season_name}
                        </button>
                      ))}
                      <button
                        className={`show-season-pill-btn ${selectedSeason === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedSeason('all')}
                      >
                        All ({selectedShow.episode_count})
                      </button>
                    </div>
                  )}

                  <div className="show-episodes-list">
                    {displayedEpisodes.map((ep, idx) => {
                      const historyItem = watchHistory.find(h => h.video_id === ep.video_id);
                      const progress = historyItem && ep.duration_seconds > 0 
                        ? Math.min(100, Math.round((historyItem.watch_duration_seconds / ep.duration_seconds) * 100))
                        : 0;

                      return (
                        <div 
                          key={ep.video_id} 
                          className="show-episode-row"
                          onClick={() => handlePlayEpisode(ep)}
                        >
                          <div className="show-ep-number">{ep.episode_number || (idx + 1)}</div>
                          
                          <div className="show-ep-thumb-container">
                            <img src={ep.thumbnail_url} alt={ep.title} className="show-ep-thumb" />
                            <span className="show-ep-duration">{formatDuration(ep.duration_seconds)}</span>
                            {progress > 0 && (
                              <div className="show-ep-progress-bar">
                                <div className="show-ep-progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                            )}
                            <div className="show-ep-play-overlay">
                              <Play size={20} fill="white" />
                            </div>
                          </div>

                          <div className="show-ep-info">
                            <div className="show-ep-title-row">
                              <h4 className="show-ep-title">{ep.title}</h4>
                              <span className="show-ep-date">{formatDate(ep.published_at)}</span>
                            </div>
                            <div className="show-ep-meta-row">
                              <span className="show-ep-season-tag">{ep.season_name}</span>
                              <span className="show-ep-views"><Eye size={14} /> {formatViews(ep.view_count)} views</span>
                              {ep.suggested_rating && (
                                <span className={`rating-badge rating-${ep.suggested_rating.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                                  {ep.suggested_rating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
