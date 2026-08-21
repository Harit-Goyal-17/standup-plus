import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Trophy, Volume2, VolumeX } from 'lucide-react';
import { formatDuration, API_BASE, cleanHandle } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function HeroSection({ videos }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const { user, setAuthModalOpen, token, activeProfile } = useAuth();
  const navigate = useNavigate();
  const trailerTimerRef = useRef(null);

  // Curate top specials
  const heroVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return videos.slice(0, 10);
  }, [videos]);

  useEffect(() => {
    if (heroVideos.length > 0) {
      setCurrentIndex(Math.floor(Math.random() * heroVideos.length));
    }
  }, [heroVideos.length]);

  // Handle auto-play trailer when user stays on hero without scrolling
  useEffect(() => {
    setIsPlayingTrailer(false);
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);

    // After 2.5 seconds on the current slide, start video preview
    trailerTimerRef.current = setTimeout(() => {
      if (window.scrollY < 200) {
        setIsPlayingTrailer(true);
      }
    }, 2500);

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    };
  }, [currentIndex]);

  // Stop trailer if user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 220) {
        setIsPlayingTrailer(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Slide rotation every 14s (longer to allow trailer viewing)
  useEffect(() => {
    if (heroVideos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroVideos.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [heroVideos.length]);

  if (!heroVideos || heroVideos.length === 0) {
    return (
      <div className="hero-banner-wrapper">
        <div className="hero-section hero-loading">
          <div className="hero-content">
            <div className="hero-title skeleton" style={{ height: '48px', width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const current = heroVideos[currentIndex] || heroVideos[0];

  const handleAddToList = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      setIsAdded(true);
      await fetch(`${API_BASE}/user/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        },
        body: JSON.stringify({ videoId: current.video_id })
      });
      setTimeout(() => setIsAdded(false), 2500);
    } catch(e) {
      console.error(e);
      setIsAdded(false);
    }
  };

  const handlePlay = () => {
    navigate(`/watch/${current.video_id}`);
  };

  // Smart Title Formatting
  const rawTitle = current.title || '';
  let mainTitle = rawTitle;
  let subtitle = '';

  if (rawTitle.toLowerCase().includes("india's got latent") || rawTitle.toLowerCase().includes("indias got latent")) {
    const epMatch = rawTitle.match(/s\d+\s*ep\d+/i) || rawTitle.match(/ep\d+/i) || rawTitle.match(/episode\s*\d+/i);
    mainTitle = "INDIA'S GOT LATENT";
    if (epMatch) mainTitle += ` ${epMatch[0].toUpperCase()}`;
    const ftMatch = rawTitle.match(/ft\.?\s*(.*)/i);
    if (ftMatch) subtitle = `ft. ${ftMatch[1].replace(/@/g, '')}`;
  } else if (rawTitle.toLowerCase().includes('lie hard')) {
    const epMatch = rawTitle.match(/s\d+\s*ep\s*\d+/i) || rawTitle.match(/ep\.?\s*\d+/i);
    mainTitle = 'LIE HARD';
    if (epMatch) mainTitle += ` ${epMatch[0].toUpperCase()}`;
    const ftMatch = rawTitle.match(/ft\.?\s*(.*)/i);
    if (ftMatch) subtitle = `ft. ${ftMatch[1].replace(/@/g, '')}`;
  } else {
    const parts = rawTitle.split(/\||-/);
    mainTitle = parts[0].trim();
    if (parts.length > 1) {
      subtitle = parts.slice(1).join(' • ').replace(/stand\s*up\s*comedy/gi, '').replace(/\(202\d\)/g, '').trim();
    }
  }

  const year = current.published_at ? new Date(current.published_at).getFullYear() : '2025';
  const durationText = formatDuration(current.duration_seconds);

  return (
    <div className="hero-banner-wrapper">
      <div className="hero-section" id="hero-section">
        {/* Full HD Background Image / Active Video Trailer */}
        <div className="hero-bg">
          {isPlayingTrailer ? (
            <div className="hero-video-trailer-wrap">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${current.video_id}?autoplay=1&mute=${isMuted ? '1' : '0'}&controls=0&showinfo=0&rel=0&loop=1&playlist=${current.video_id}&enablejsapi=1`}
                title={current.title}
                className="hero-video-trailer-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            heroVideos.map((vid, idx) => (
              <img 
                key={vid.video_id} 
                src={vid.thumbnail_url} 
                alt={vid.title} 
                className={`hero-bg-image ${idx === currentIndex ? 'active' : ''}`}
              />
            ))
          )}
        </div>
        
        {/* Seamless Netflix Gradient Overlay */}
        <div className="hero-overlay"></div>
        
        {/* Hero Details Content */}
        <div className="hero-content">
          <div className="hero-badge-row">
            <span className="hero-pill-brand">STANDUP+ SPECIAL</span>
            <span className="hero-rating-badge">{current.suggested_rating || 'U/A 16+'}</span>
          </div>

          <h1 className="hero-title">{mainTitle}</h1>
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
          
          <div className="hero-meta">
            <span className="hero-comedian-tag">{current.comedian_name}</span>
            <span className="hero-meta-dot">•</span>
            <span>Standup</span>
            <span className="hero-meta-dot">•</span>
            <span>{year}</span>
            <span className="hero-meta-dot">•</span>
            <span>{durationText}</span>
          </div>

          <p className="hero-description">
            Experience razor-sharp punchlines, crowd banter, and hilarious storytelling from {current.comedian_name}.
          </p>

          <div className="hero-actions">
            <button className="hero-btn-play" onClick={handlePlay}>
              <Play fill="black" size={20} /> Play
            </button>
            <button className="hero-btn-info" onClick={handleAddToList}>
              {isAdded ? <Check size={20} color="#4ade80" /> : <Plus size={20} />} 
              {isAdded ? 'Added to List' : 'Add to List'}
            </button>
          </div>
        </div>

        {/* Bottom Right Badges & Indicators (Netflix Style) */}
        <div className="hero-bottom-right-container">
          {isPlayingTrailer && (
            <button 
              className="hero-sound-toggle-btn"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute preview' : 'Mute preview'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}

          <div className="hero-trending-badge">
            <Trophy size={14} className="hero-badge-icon" /> #1 in Comedy Today
          </div>
          
          {/* Hero Slider Dots */}
          <div className="hero-slider-pills">
            {heroVideos.map((vid, idx) => (
              <button 
                key={vid.video_id} 
                className={`hero-pill-indicator ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
