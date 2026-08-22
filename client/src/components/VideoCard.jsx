import React, { useState, useRef, useEffect } from 'react';
import { Play, Plus, Heart, ChevronDown, Check, X, Trash2 } from 'lucide-react';
import { formatDuration, formatViews, getRatingColor, getDotSeparatedTopics, API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function VideoCard({ video, onClick, onRemoveFromRow }) {
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [alignment, setAlignment] = useState('center');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const cardRef = useRef(null);
  const hoverTimerRef = useRef(null);

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

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Start playing video preview after user hovers for 2 seconds
    hoverTimerRef.current = setTimeout(() => {
      setIsPlayingPreview(true);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    setIsPlayingPreview(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

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

  const handleConfirmRemove = async (reason) => {
    setShowRemoveModal(false);
    try {
      await fetch(`${API_BASE}/user/watch-history/${video.video_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        },
        body: JSON.stringify({ reason })
      });
      if (onRemoveFromRow) {
        onRemoveFromRow(video.video_id);
      }
    } catch (err) {
      console.error(err);
    }
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
      onMouseLeave={handleMouseLeave}
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
          {isPlayingPreview ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1`}
              title={video.title}
              className="video-hover-iframe"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <img src={video.thumbnail_url} alt={video.title} className="video-hover-thumb" loading="lazy" />
          )}

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
                {added ? <Check size={18} color="#4ade80" /> : <Plus size={18} />}
              </button>
              <button className="video-hover-action-btn" data-tooltip="I like this" onClick={handleLike} style={{ position: 'relative' }}>
                <Heart size={18} fill={liked ? '#ff416c' : 'none'} color={liked ? '#ff416c' : 'white'} />
                {showLikeAnim && <div className="floating-like-anim"><Heart size={30} fill="#ff416c" color="#ff416c" /></div>}
              </button>
              {(progressPercent > 0 || onRemoveFromRow) && (
                <button 
                  className="video-hover-action-btn" 
                  data-tooltip="Remove from row" 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowRemoveModal(true);
                  }}
                >
                  <X size={18} />
                </button>
              )}
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

          {/* In-place Netflix Popover for Remove from Row */}
          {showRemoveModal && (
            <div 
              className="card-inplace-popover" 
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              <div className="inplace-popover-header">
                <span className="inplace-popover-title">Tell us more</span>
                <button 
                  className="inplace-popover-close" 
                  onClick={(e) => { e.stopPropagation(); setShowRemoveModal(false); }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="inplace-popover-options">
                <button className="inplace-popover-opt" onClick={() => handleConfirmRemove('like')}>
                  <span className="inplace-opt-icon">👍</span>
                  <span>I like this but don't want to continue watching</span>
                </button>
                <button className="inplace-popover-opt" onClick={() => handleConfirmRemove('dislike')}>
                  <span className="inplace-opt-icon">👎</span>
                  <span>I don't like this</span>
                </button>
                <button className="inplace-popover-opt" onClick={() => handleConfirmRemove('cleanup')}>
                  <span className="inplace-opt-icon">🧹</span>
                  <span>Just cleaning up</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
