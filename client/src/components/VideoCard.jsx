import React, { useState, useRef } from 'react';
import { Play, Plus, Heart, ChevronDown, Check } from 'lucide-react';
import { formatDuration, formatViews, getRatingColor, getDotSeparatedTopics, API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function VideoCard({ video, onClick }) {
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [alignment, setAlignment] = useState('center');
  const cardRef = useRef(null);

  if (!video) return null;

  const topics = getDotSeparatedTopics(video);

  const progressPercent = video.watch_duration_seconds && video.duration_seconds 
    ? Math.min(100, Math.max(0, (video.watch_duration_seconds / video.duration_seconds) * 100))
    : 0;

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.left < 160) {
        setAlignment('left');
      } else if (window.innerWidth - rect.right < 160) {
        setAlignment('right');
      } else {
        setAlignment('center');
      }
    }
  };

  const handleAdd = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (added) return;
    try {
      await fetch(`${API_BASE}/user/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        },
        body: JSON.stringify({ videoId: video.video_id })
      });
      setAdded(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (liked) return;
    setLiked(true);
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 1000);
  };

  const handleCardClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    onClick(video);
  };

  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const isRecentlyAdded = Boolean(
    video.isRecentlyAdded || 
    (video.published_at && (Date.now() - new Date(video.published_at).getTime()) <= TWO_WEEKS_MS && (Date.now() - new Date(video.published_at).getTime()) >= 0)
  );

  return (
    <div 
      ref={cardRef}
      className={`video-card align-${alignment}`} 
      onClick={handleCardClick} 
      id={`video-${video.video_id}`}
      onMouseEnter={handleMouseEnter}
    >
      <div className="video-thumb-container">
        <img src={video.thumbnail_url} alt={video.title} className="video-thumb" loading="lazy" />
        <span className="duration-badge">{formatDuration(video.duration_seconds)}</span>
        
        {/* Strictly Recently Added (<= 2 Weeks) */}
        {isRecentlyAdded && (
          <span className="recently-added-badge">Recently Added</span>
        )}

        {/* Netflix Red Progress Bar on Base Card */}
        {progressPercent > 0 && (
          <div className="video-progress-bar-container">
            <div className="video-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      {/* Netflix-style hover expansion card */}
      <div className={`video-hover-card align-${alignment}`}>
        <div className="video-hover-media-wrapper">
          {isRecentlyAdded && (
            <span className="recently-added-badge hover">Recently Added</span>
          )}
          <img src={video.thumbnail_url} alt={video.title} className="video-hover-thumb" loading="lazy" />

          {progressPercent > 0 && (
            <div className="video-progress-bar-container">
              <div className="video-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        <div className="video-hover-body">
          {/* Action buttons row */}
          <div className="video-hover-actions">
            <div className="video-hover-actions-left">
              <button 
                className="video-hover-action-btn action-play" 
                data-tooltip="Play" 
                onClick={handleCardClick}
              >
                <Play size={18} fill="black" color="black" />
              </button>
              <button className="video-hover-action-btn" data-tooltip="Add to My List" onClick={handleAdd}>
                {added ? <Check size={18} /> : <Plus size={18} />}
              </button>
              <button className="video-hover-action-btn" data-tooltip="I like this" onClick={handleLike} style={{ position: 'relative' }}>
                <Heart size={18} fill={liked ? '#ff416c' : 'none'} color={liked ? '#ff416c' : 'white'} />
                {showLikeAnim && <div className="floating-like-anim"><Heart size={30} fill="#ff416c" color="#ff416c" /></div>}
              </button>
            </div>
            <button className="video-hover-action-btn" data-tooltip="More info" onClick={handleCardClick}>
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Title & Comedian Name */}
          <div className="video-hover-title-row">
            <span className="video-hover-title">{video.title}</span>
          </div>

          {/* Meta line: rating + duration + views */}
          <div className="video-hover-meta">
            <span className="video-hover-rating" style={{ color: getRatingColor(video.suggested_rating) }}>
              {video.suggested_rating || 'U/A 16+'}
            </span>
            <span className="video-hover-duration">{formatDuration(video.duration_seconds)}</span>
            <span className="video-hover-hd-badge">HD</span>
            <span className="video-hover-views">{formatViews(video.view_count)} views</span>
          </div>

          {/* Dot-separated themes and topics (like Netflix) */}
          <div className="video-hover-genres">
            {topics.map((topic, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="genre-dot">•</span>}
                <span className="genre-label">{topic}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
