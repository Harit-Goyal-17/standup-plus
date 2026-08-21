import React, { useState, useEffect } from 'react';
import { X, Heart, Star, Play } from 'lucide-react';
import { formatDuration, formatDate, formatViews, getRatingColor, getTagColor, API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function VideoModal({ videoId, onClose }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();
  
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
  };

  const ratingVocab = {
    1: "Tough Crowd 🍅",
    2: "Mild Chuckles 😐",
    3: "Solid Laughs 🙂",
    4: "Hilarious 😂",
    5: "Absolute Masterclass 👑"
  };

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    fetch(`${API_BASE}/videos/${videoId}`)
      .then(res => res.json())
      .then(data => {
        setVideo(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    if (user && token) {
      fetch(`${API_BASE}/user/favorites`, {
        headers: authHeaders
      })
      .then(res => res.json())
      .then(favorites => {
        if (Array.isArray(favorites) && favorites.some(f => f.video_id === videoId)) {
          setIsLiked(true);
        } else {
          setIsLiked(false);
        }
      })
      .catch(console.error);
    }
  }, [videoId, user, token, activeProfile?.profile_id]);

  const handleToggleLike = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    try {
      if (newLikedState) {
        await fetch(`${API_BASE}/user/favorites`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ videoId })
        });
      } else {
        await fetch(`${API_BASE}/user/favorites/${videoId}`, {
          method: 'DELETE',
          headers: authHeaders
        });
      }
    } catch(e) {
      setIsLiked(!newLikedState); // revert on error
    }
  };

  const handleRate = (val) => {
    if (!user) { setAuthModalOpen(true); return; }
    setRating(val);
  };

  const handleSubmitRating = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    if (rating === 0) return;
    try {
      await fetch(`${API_BASE}/user/ratings`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ videoId, rating })
      });
      setShowRatingSuccess(true);
      setTimeout(() => setShowRatingSuccess(false), 3000);
    } catch(e) {}
  };

  if (!videoId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="video-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} style={{ zIndex: 10, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 40, height: 40 }}><X /></button>
        
        {loading ? (
          <div className="skeleton" style={{ height: 400 }}></div>
        ) : video ? (
          <>
            <div className="video-player-wrapper">
              <iframe 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`} 
                title="YouTube player" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="video-modal-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{video.title}</h2>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ color: getRatingColor(video.suggested_rating), fontWeight: 'bold' }}>{video.suggested_rating}</span>
                    <span>{video.comedian_name}</span>
                    <span>{formatDuration(video.duration_seconds)}</span>
                    <span>{formatDate(video.published_at)}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <button className="icon-btn" onClick={handleToggleLike} style={{ background: 'var(--bg-glass)', transition: 'all 0.3s' }}>
                    <Heart fill={isLiked ? '#ff416c' : 'none'} color={isLiked ? '#ff416c' : 'white'} />
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 24, marginBottom: 24, color: 'var(--text-secondary)' }}>
                <span>{formatViews(video.view_count)} views</span>
                <span>{formatViews(video.like_count)} likes</span>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                {['style', 'tone', 'theme'].map(type => {
                  const typeTags = video.tags?.filter(t => t.tag_type === type);
                  if (!typeTags || typeTags.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', width: 60, fontSize: '0.9rem' }}>{type}:</span>
                      <div className="tag-pills">
                        {typeTags.map(t => (
                          <span key={t.tag_name} className={`tag-pill ${getTagColor(t.tag_type)}`}>{t.tag_name}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rate:</span>
                <div style={{ display: 'flex' }} onMouseLeave={() => setHoverRating(0)}>
                  {[1,2,3,4,5].map(star => (
                    <button 
                      key={star} 
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      style={{ background: 'none', color: star <= (hoverRating || rating) ? '#f59e0b' : 'var(--text-secondary)', transition: 'color 0.2s, transform 0.2s', transform: star <= hoverRating ? 'scale(1.2)' : 'scale(1)' }}
                    >
                      <Star size={24} fill={star <= (hoverRating || rating) ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
                { (hoverRating > 0 || rating > 0) && (
                  <span style={{ marginLeft: 8, fontSize: '1.1rem', fontWeight: 'bold', color: 'white', animation: 'fadeIn 0.3s ease' }}>
                    {ratingVocab[hoverRating || rating]}
                  </span>
                )}
                { rating > 0 && !showRatingSuccess && (
                  <button className="btn-primary" onClick={handleSubmitRating} style={{ marginLeft: 16, padding: '6px 12px', fontSize: '0.9rem' }}>
                    Submit Rating
                  </button>
                )}
                { showRatingSuccess && (
                  <span style={{ marginLeft: 16, color: '#10b981', fontWeight: 'bold', animation: 'fadeIn 0.3s ease' }}>
                    Thanks for rating! 🎉
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>Error loading video</div>
        )}
      </div>
    </div>
  );
}
