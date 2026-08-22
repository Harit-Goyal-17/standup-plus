import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Star, Plus, Share2, Play, X, RotateCcw, Check } from 'lucide-react';
import { formatDuration, formatDate, formatViews, getRatingColor, getTagColor, getMaturityInfo, formatTagLabel, API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import VideoModal from '../components/VideoModal';

export default function VideoPage() {
  const { id: videoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialStartTime = parseInt(searchParams.get('t')) || 0;
  const [startSeconds, setStartSeconds] = useState(initialStartTime);
  
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isAddedToList, setIsAddedToList] = useState(false);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const [moreLikeThis, setMoreLikeThis] = useState([]);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [comedianVideos, setComedianVideos] = useState([]);
  const [selectedModalVideoId, setSelectedModalVideoId] = useState(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  
  // Autoplay Countdown State
  const [countdown, setCountdown] = useState(null); // null when not counting down
  const [nextVideo, setNextVideo] = useState(null);
  
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();
  const playerRef = useRef(null);
  const progressPollIntervalRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const countdownActiveRef = useRef(false);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
  }), [token, activeProfile?.profile_id]);

  const ratingVocab = {
    1: "Tough Crowd 🍅",
    2: "Mild Chuckles 😐",
    3: "Solid Laughs 🙂",
    4: "Hilarious 😂",
    5: "Absolute Masterclass 👑"
  };

  // Require sign-in to watch any video
  useEffect(() => {
    if (!user) {
      setAuthModalOpen(true);
      navigate('/');
    }
  }, [user, navigate, setAuthModalOpen]);

  // 1. Fetch saved watch history on initial load
  useEffect(() => {
    if (!videoId) return;

    if (user && token && initialStartTime === 0) {
      fetch(`${API_BASE}/user/watch-history`, {
        headers: authHeaders
      })
      .then(res => res.json())
      .then(history => {
        if (Array.isArray(history)) {
          const item = history.find(h => h.video_id === videoId);
          if (item && item.watch_duration_seconds > 0) {
            setStartSeconds(Math.floor(item.watch_duration_seconds));
          }
        }
      })
      .catch(() => {});
    }
  }, [videoId, user, token, authHeaders, initialStartTime]);

  // 2. Fetch Video Details & Suggestions
  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    setCountdown(null);
    window.scrollTo(0, 0);

    fetch(`${API_BASE}/videos/${videoId}`)
      .then(res => res.json())
      .then(data => {
        setVideo(data);
        setLoading(false);

        if (data.comedian_id) {
          fetch(`${API_BASE}/comedians/${data.comedian_id}`)
            .then(res => res.json())
            .then(comedian => {
              const others = (comedian.videos || [])
                .filter(v => v.video_id !== videoId)
                .sort((a, b) => b.view_count - a.view_count)
                .slice(0, 12);
              setComedianVideos(others);
              if (others.length > 0) {
                setNextVideo(others[0]);
              }
            })
            .catch(() => {});
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    fetch(`${API_BASE}/videos/featured`)
      .then(res => res.json())
      .then(data => {
        const others = data.filter(v => v.video_id !== videoId).slice(0, 12);
        setMoreLikeThis(others);
        if (!nextVideo && others.length > 0) {
          setNextVideo(others[0]);
        }
      })
      .catch(() => {});

    if (user && token) {
      fetch(`${API_BASE}/user/favorites`, { headers: authHeaders })
        .then(res => res.json())
        .then(favorites => {
          if (Array.isArray(favorites) && favorites.some(f => f.video_id === videoId)) {
            setIsLiked(true);
            setIsAddedToList(true);
          } else {
            setIsLiked(false);
            setIsAddedToList(false);
          }
        })
        .catch(() => {});
    }
  }, [videoId, user, token, authHeaders]);

  // 3. YouTube IFrame API Initialization & Real-Time Sync
  useEffect(() => {
    let isCancelled = false;

    function initYT() {
      if (!window.YT || !window.YT.Player) {
        if (!document.getElementById('yt-iframe-api-script')) {
          const tag = document.createElement('script');
          tag.id = 'yt-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = () => {
          if (!isCancelled) createPlayer();
        };
      } else {
        createPlayer();
      }
    }

    function createPlayer() {
      const container = document.getElementById('yt-player-target');
      if (!container) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('yt-player-target', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          start: startSeconds,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            if (startSeconds > 0) {
              event.target.seekTo(startSeconds, true);
            }
          },
          onStateChange: (event) => {
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
            if (event.data === 1) { // Playing
              startProgressTracker();
            } else if (event.data === 2) { // Paused
              stopProgressTracker();
              reportCurrentProgress();
            } else if (event.data === 0) { // Video Ended
              stopProgressTracker();
              reportCurrentProgress(true);
              triggerAutoplayCountdown();
            }
          }
        }
      });
    }

    function startProgressTracker() {
      if (progressPollIntervalRef.current) clearInterval(progressPollIntervalRef.current);
      progressPollIntervalRef.current = setInterval(() => {
        reportCurrentProgress();
      }, 1000);
    }

    function stopProgressTracker() {
      if (progressPollIntervalRef.current) {
        clearInterval(progressPollIntervalRef.current);
        progressPollIntervalRef.current = null;
      }
    }

    function reportCurrentProgress(completed = false) {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
      if (!user || !token || !videoId) return;

      try {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        const totalDuration = video?.duration_seconds || Math.floor(playerRef.current.getDuration() || 0);
        const isCompleted = completed || (totalDuration > 0 && currentTime / totalDuration >= 0.9);

        // Near end of video -> Trigger autoplay countdown once
        if (totalDuration > 10 && currentTime >= totalDuration - 6 && !countdownActiveRef.current) {
          triggerAutoplayCountdown();
        }

        if (currentTime > 0) {
          fetch(`${API_BASE}/user/watch-history`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              videoId,
              watchDurationSeconds: currentTime,
              completed: isCompleted
            })
          }).catch(() => {});
        }
      } catch (err) {}
    }

    initYT();

    return () => {
      isCancelled = true;
      if (progressPollIntervalRef.current) clearInterval(progressPollIntervalRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        reportCurrentProgress();
      }
    };
  }, [videoId, startSeconds, user, token, authHeaders, video?.duration_seconds]);

  // 4. Handle Autoplay Countdown
  const triggerAutoplayCountdown = () => {
    if (!autoplayEnabled || countdownActiveRef.current) return;
    const targetNext = nextVideo || (comedianVideos.length > 0 ? comedianVideos[0] : moreLikeThis[0]);
    if (!targetNext || targetNext.video_id === videoId) return;

    countdownActiveRef.current = true;
    setNextVideo(targetNext);
    setCountdown(5);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let sec = 5;
    countdownTimerRef.current = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownActiveRef.current = false;
        navigate(`/watch/${targetNext.video_id}`);
      } else {
        setCountdown(sec);
      }
    }, 1000);
  };

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownActiveRef.current = false;
    setCountdown(null);
  };

  const handlePlayNextImmediately = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownActiveRef.current = false;
    if (nextVideo) {
      navigate(`/watch/${nextVideo.video_id}`);
    }
  };

  const handleToggleLike = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    try {
      const newState = !isLiked;
      setIsLiked(newState);
      if (newState) {
        setShowLikeAnim(true);
        setTimeout(() => setShowLikeAnim(false), 1000);
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
    } catch {
      setIsLiked(!isLiked);
    }
  };

  const handleAddToList = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    try {
      setIsAddedToList(true);
      await fetch(`${API_BASE}/user/favorites`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ videoId })
      });
    } catch {}
  };

  const handleRate = (val) => {
    if (!user) { setAuthModalOpen(true); return; }
    setRating(val);
  };

  const handleSubmitRating = async () => {
    if (!user || rating === 0) return;
    try {
      await fetch(`${API_BASE}/user/ratings`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ videoId, rating })
      });
      setShowRatingSuccess(true);
      setTimeout(() => setShowRatingSuccess(false), 3000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {}
  };

  const genreLabels = video?.tags?.map(t =>
    t.tag_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ) || [];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <div className="skeleton" style={{ width: '92%', maxWidth: 1200, height: '70vh', borderRadius: 20 }} />
      </div>
    );
  }

  if (!video) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: 20 }}>Video not found</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  return (
    <div className="video-page">
      {/* Netflix Watch Top Header Bar */}
      <div className="video-player-top-header">
        <button className="video-page-back-pill" onClick={() => navigate(-1)} title="Back to previous page">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="video-player-title-preview">
          <span className="video-player-badge">NOW PLAYING</span>
          <span className="video-player-title-text">{video.title}</span>
        </div>
      </div>

      {/* Full-width player area */}
      <div className="video-page-player-wrapper">
        <div className="video-page-player">
          <div id="yt-player-target" className="yt-player-embed" />
          
          {/* Netflix-Style Up Next Autoplay Countdown Banner */}
          {countdown !== null && nextVideo && (
            <div className="autoplay-countdown-overlay">
              <div className="autoplay-card">
                <button className="autoplay-close-btn" onClick={handleCancelCountdown} title="Cancel autoplay">
                  <X size={16} />
                </button>
                <div className="autoplay-header">
                  <span className="autoplay-label">UP NEXT IN {countdown}s</span>
                </div>
                <div className="autoplay-body">
                  <img 
                    src={nextVideo.thumbnail_url} 
                    alt={nextVideo.title} 
                    className="autoplay-thumb" 
                  />
                  <div className="autoplay-details">
                    <h4 className="autoplay-title">{nextVideo.title}</h4>
                    <p className="autoplay-comedian">{nextVideo.comedian_name || 'Standup Special'}</p>
                    <span className="autoplay-duration">{formatDuration(nextVideo.duration_seconds)}</span>
                  </div>
                </div>
                <div className="autoplay-actions">
                  <button className="btn-primary autoplay-play-btn" onClick={handlePlayNextImmediately}>
                    <Play size={16} fill="black" /> Play Now
                  </button>
                  <button className="btn-secondary autoplay-cancel-btn" onClick={handleCancelCountdown}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video info section (Netflix-style 2-column) */}
      <div className="video-page-info">
        <div className="video-page-info-left">
          {/* Action buttons */}
          <div className="video-page-actions">
            <button 
              className="video-page-action-btn" 
              data-tooltip="I like this" 
              onClick={handleToggleLike} 
              style={{ position: 'relative' }}
            >
              <Heart size={20} fill={isLiked ? '#ff416c' : 'none'} color={isLiked ? '#ff416c' : 'white'} />
              {showLikeAnim && <div className="floating-like-anim"><Heart size={40} fill="#ff416c" color="#ff416c" /></div>}
            </button>
            <button 
              className="video-page-action-btn" 
              data-tooltip={isAddedToList ? "In My List" : "Add to My List"} 
              onClick={handleAddToList}
            >
              {isAddedToList ? <Check size={20} color="#4ade80" /> : <Plus size={20} />}
            </button>
            <button 
              className="video-page-action-btn" 
              data-tooltip="Share" 
              onClick={handleShare}
            >
              <Share2 size={20} />
            </button>
            <button 
              className={`video-page-action-btn ${autoplayEnabled ? 'active-autoplay' : ''}`}
              data-tooltip={autoplayEnabled ? "Autoplay Next: ON" : "Autoplay Next: OFF"}
              onClick={() => setAutoplayEnabled(!autoplayEnabled)}
              style={{ marginLeft: 'auto', fontSize: '0.82rem', padding: '6px 12px', width: 'auto', borderRadius: 20 }}
            >
              <RotateCcw size={14} style={{ marginRight: 4 }} />
              Autoplay {autoplayEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Meta line */}
          <div className="video-page-meta-line">
            <span style={{ color: getRatingColor(video.suggested_rating), fontWeight: 700, border: `1px solid ${getRatingColor(video.suggested_rating)}`, padding: '2px 6px', fontSize: '0.8rem', borderRadius: 3 }}>
              {video.suggested_rating || 'U/A 16+'}
            </span>
            <span>{formatDate(video.published_at)}</span>
            <span>{formatDuration(video.duration_seconds)}</span>
            <span className="hero-hd-badge">HD</span>
          </div>

          {/* Title */}
          <h1 className="video-page-title">{video.title}</h1>

          {/* Genre tags Netflix-style */}
          <div className="video-page-genres">
            {genreLabels.map((label, i) => (
              <span key={i}>
                {i > 0 && <span className="genre-dot">•</span>}
                {label}
              </span>
            ))}
          </div>

          {/* Rating section */}
          <div className="video-page-rate-section">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rate this special:</span>
            <div style={{ display: 'flex' }} onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  style={{
                    background: 'none',
                    color: star <= (hoverRating || rating) ? '#f59e0b' : '#555',
                    transition: 'all 0.2s',
                    transform: star <= hoverRating ? 'scale(1.2)' : 'scale(1)',
                    padding: '4px'
                  }}
                >
                  <Star size={22} fill={star <= (hoverRating || rating) ? '#f59e0b' : 'none'} />
                </button>
              ))}
            </div>
            {(hoverRating > 0 || rating > 0) && (
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                {ratingVocab[hoverRating || rating]}
              </span>
            )}
            {rating > 0 && !showRatingSuccess && (
              <button className="btn-primary" onClick={handleSubmitRating} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                Submit
              </button>
            )}
            {showRatingSuccess && (
              <span style={{ color: '#10b981', fontWeight: 600 }}>Thanks for rating! 🎉</span>
            )}
          </div>
        </div>

        {/* Right column: About details */}
        <div className="video-page-info-right">
          <p><span className="info-label">Comedian:</span> <strong>{video.comedian_name}</strong></p>
          <p><span className="info-label">Views:</span> {formatViews(video.view_count)}</p>
          <p><span className="info-label">Likes:</span> {formatViews(video.like_count)}</p>
          {video.tags && video.tags.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <span className="info-label" style={{ display: 'block', marginBottom: '8px' }}>Themes & Style:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {video.tags.map((t, idx) => (
                  <span key={idx} className={`tag-pill ${getTagColor(t.tag_type)}`}>
                    {formatTagLabel(t.tag_name)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comedian's other videos */}
      {comedianVideos.length > 0 && (
        <div className="video-page-section">
          <h2 className="video-page-section-title">More by {video.comedian_name}</h2>
          <div className="video-grid more-videos-grid">
            {comedianVideos.map(v => (
              <VideoCard key={v.video_id} video={v} onClick={() => navigate(`/watch/${v.video_id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* More like this section */}
      {moreLikeThis.length > 0 && (
        <div className="video-page-section">
          <h2 className="video-page-section-title">More Like This</h2>
          <div className="video-grid more-videos-grid">
            {moreLikeThis.map(v => (
              <VideoCard key={v.video_id} video={v} onClick={() => navigate(`/watch/${v.video_id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Netflix-style Detailed About Section (Matches user screenshot) */}
      <div className="netflix-about-container">
        <h2 className="netflix-about-header">
          About <span className="netflix-about-title-highlight">{video.title}</span>
        </h2>
        
        <div className="netflix-about-details-list">
          <div className="netflix-about-row">
            <span className="netflix-about-label">Creators:</span>
            <span className="netflix-about-val">
              <strong style={{ color: '#fff' }}>{video.comedian_name}</strong>
            </span>
          </div>

          <div className="netflix-about-row">
            <span className="netflix-about-label">Cast:</span>
            <span className="netflix-about-val">
              {video.comedian_name}, Stand-Up Live Audience
            </span>
          </div>

          <div className="netflix-about-row">
            <span className="netflix-about-label">Genres:</span>
            <span className="netflix-about-val">
              {genreLabels.length > 0 ? genreLabels.join(', ') : 'Stand-Up Comedy, Hindi Comedy, Comedy Specials'}
            </span>
          </div>

          <div className="netflix-about-row">
            <span className="netflix-about-label">This Special Is:</span>
            <span className="netflix-about-val">
              {video.tags && video.tags.length > 0 
                ? video.tags.map(t => t.tag_name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')
                : 'Hilarious, Relatable, Witty, High Energy'}
            </span>
          </div>

          <div className="netflix-about-row">
            <span className="netflix-about-label">Maturity Rating:</span>
            <div className="netflix-about-maturity-wrap">
              <span className="netflix-about-maturity-badge">
                {getMaturityInfo(video.suggested_rating).badge}
              </span>
              <span className="netflix-about-maturity-desc">
                {getMaturityInfo(video.suggested_rating).advisories} • {getMaturityInfo(video.suggested_rating).warning}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal fallback for embedded previews */}
      {selectedModalVideoId && (
        <VideoModal videoId={selectedModalVideoId} onClose={() => setSelectedModalVideoId(null)} />
      )}
    </div>
  );
}
