import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Flame, Play, Plus, Check, Trophy, Clock, Calendar, Star, TrendingUp, Grid, Compass } from 'lucide-react';
import { API_BASE, formatDuration, formatViews, formatDate, getRatingColor, getDotSeparatedTopics } from '../utils';
import { useAuth } from '../context/AuthContext';
import VideoCarousel from '../components/VideoCarousel';
import VideoCard from '../components/VideoCard';
import VideoModal from '../components/VideoModal';

export default function NewPopularPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [isHeroAdded, setIsHeroAdded] = useState(false);
  const { user, token, activeProfile, setAuthModalOpen } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/videos?limit=150&sort=published_at&order=desc`)
      .then(res => res.json())
      .then(resData => {
        let raw = [];
        if (Array.isArray(resData)) raw = resData;
        else if (resData && Array.isArray(resData.data)) raw = resData.data;
        else if (resData && Array.isArray(resData.videos)) raw = resData.videos;
        
        setVideos(raw);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading new & popular videos:', err);
        setLoading(false);
      });
  }, []);

  // Top 10 ranked by views / recency
  const top10Videos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos].sort((a, b) => b.view_count - a.view_count).slice(0, 10);
  }, [videos]);

  // Fresh releases (sorted by published_at)
  const freshReleases = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos].sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 24);
  }, [videos]);

  // Crowd work & interactive specials
  const crowdWorkVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    const matched = videos.filter(v => {
      const tags = (v.tags || []).map(t => t.tag_name);
      const title = (v.title || '').toLowerCase();
      return tags.includes('crowd-work-heavy') || title.includes('crowd') || title.includes('latent') || title.includes('unscripted') || title.includes('spontaneous');
    });
    return matched.length > 0 ? matched : videos.slice(10, 25);
  }, [videos]);

  // Full length 40m+ specials
  const fullLengthSpecials = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    const matched = videos.filter(v => (v.duration_seconds || 0) >= 2400);
    return matched.length > 0 ? matched : videos.slice(0, 15);
  }, [videos]);

  // Dark, sarcastic & roast
  const darkComedy = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    const matched = videos.filter(v => {
      const tags = (v.tags || []).map(t => t.tag_name);
      const title = (v.title || '').toLowerCase();
      return tags.includes('dark-and-cynical') || tags.includes('sarcastic-and-biting') || title.includes('roast') || title.includes('dark') || title.includes('angry') || title.includes('insult') || title.includes('cynical');
    });
    return matched.length > 0 ? matched : videos.slice(5, 20);
  }, [videos]);

  // Family, college & relatable
  const familyComedy = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    const matched = videos.filter(v => {
      const tags = (v.tags || []).map(t => t.tag_name);
      const title = (v.title || '').toLowerCase();
      return tags.includes('family-and-upbringing') || tags.includes('wholesome-and-lighthearted') || tags.includes('nostalgic-and-warm') || title.includes('school') || title.includes('family') || title.includes('parents') || title.includes('college') || title.includes('wedding');
    });
    return matched.length > 0 ? matched : videos.slice(15, 30);
  }, [videos]);

  // Active category video list for Grid View
  const currentCategoryVideos = useMemo(() => {
    switch (selectedCategory) {
      case 'Top10': return top10Videos;
      case 'New': return freshReleases;
      case 'CrowdWork': return crowdWorkVideos;
      case 'Specials': return fullLengthSpecials;
      case 'Dark': return darkComedy;
      case 'Family': return familyComedy;
      default: return [];
    }
  }, [selectedCategory, top10Videos, freshReleases, crowdWorkVideos, fullLengthSpecials, darkComedy, familyComedy]);

  const featuredSpotlight = top10Videos[0] || videos[0];

  const handleHeroAddToList = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    if (!featuredSpotlight) return;
    try {
      setIsHeroAdded(true);
      await fetch(`${API_BASE}/user/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
        },
        body: JSON.stringify({ videoId: featuredSpotlight.video_id })
      });
      setTimeout(() => setIsHeroAdded(false), 2500);
    } catch(e) {
      setIsHeroAdded(false);
    }
  };

  const handleVideoCardClick = (v) => {
    navigate(`/watch/${v.video_id}`);
  };

  const categories = [
    { id: 'All', label: '🔥 All New & Popular', icon: <Flame size={16} /> },
    { id: 'Top10', label: '👑 Top 10 in India Today', icon: <Trophy size={16} /> },
    { id: 'New', label: '🆕 Fresh Releases', icon: <Calendar size={16} /> },
    { id: 'CrowdWork', label: '💬 Viral Crowd Work', icon: <Sparkles size={16} /> },
    { id: 'Specials', label: '🎭 Full Length Specials', icon: <Star size={16} /> },
    { id: 'Dark', label: '🌶️ Roast & Dark Humor', icon: <Flame size={16} /> }
  ];

  if (loading) {
    return (
      <div className="new-popular-page">
        <div className="new-popular-hero skeleton" style={{ height: '75vh', minHeight: 560 }} />
      </div>
    );
  }

  return (
    <div className="new-popular-page">
      {/* Featured Spotlight Banner (Full HD Height & Uncropped Artwork) */}
      {featuredSpotlight && (
        <div 
          className="new-popular-hero"
          style={{
            backgroundImage: `linear-gradient(to top, #0a0a0f 0%, rgba(10, 10, 15, 0.4) 50%, rgba(10, 10, 15, 0.8) 100%), url(${featuredSpotlight.thumbnail_url})`
          }}
        >
          <div className="new-popular-hero-content">
            <div className="new-popular-badge">
              <Trophy size={15} /> #1 TRENDING COMEDY SPECIAL
            </div>
            
            <h1 className="new-popular-hero-title">{featuredSpotlight.title}</h1>

            <div className="new-popular-hero-meta">
              <span className="hero-meta-tag hero-rating-pill" style={{ color: getRatingColor(featuredSpotlight.suggested_rating) }}>
                {featuredSpotlight.suggested_rating || 'U/A 16+'}
              </span>
              <span className="hero-meta-tag">{formatDuration(featuredSpotlight.duration_seconds)}</span>
              <span className="hero-hd-badge">HD</span>
              <span className="hero-meta-tag">{formatViews(featuredSpotlight.view_count)} views</span>
              <span className="hero-date-badge">Released {formatDate(featuredSpotlight.published_at)}</span>
            </div>

            <div className="new-popular-topics">
              {getDotSeparatedTopics(featuredSpotlight)}
            </div>

            <div className="new-popular-hero-actions">
              <button 
                className="hero-btn-play"
                onClick={() => navigate(`/watch/${featuredSpotlight.video_id}`)}
              >
                <Play size={20} fill="#000" /> Play Now
              </button>
              
              <button 
                className="hero-btn-info"
                onClick={handleHeroAddToList}
              >
                {isHeroAdded ? <Check size={18} color="#4ade80" /> : <Plus size={18} />}
                {isHeroAdded ? 'Added to My List' : 'Add to My List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Netflix Category Navigation Pills */}
      <div className="new-popular-filters-container">
        <div className="new-popular-filter-pills">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`new-popular-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* When a specific filter is clicked: Show Title & Grid of All Videos in that Category */}
      {selectedCategory !== 'All' ? (
        <div className="new-popular-filtered-grid-wrap" style={{ padding: '0 4% 40px' }}>
          <div className="section-title-wrapper" style={{ marginBottom: 24 }}>
            <h2 className="section-title" style={{ fontSize: '1.6rem' }}>
              {categories.find(c => c.id === selectedCategory)?.label}
              <span style={{ fontSize: '0.95rem', color: '#9ca3af', fontWeight: 500, marginLeft: 12 }}>
                ({currentCategoryVideos.length} titles)
              </span>
            </h2>
          </div>

          <div className="video-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '28px 20px' }}>
            {currentCategoryVideos.map((video) => (
              <VideoCard
                key={video.video_id}
                video={video}
                onClick={handleVideoCardClick}
              />
            ))}
          </div>
        </div>
      ) : (
        /* 'All' View: Rich Categorized Netflix Carousels including Top 10 Row with Full Hover Support */
        <div className="new-popular-sections">
          {/* Netflix Top 10 in India Today - Standard Netflix 5-per-slide with Hover Popouts & Pagination */}
          <VideoCarousel
            title="🏆 Top 10 Comedy Specials Today"
            videos={top10Videos}
            onVideoClick={handleVideoCardClick}
            isTop10={true}
          />

          {/* Fresh Releases */}
          <VideoCarousel
            title="🆕 Fresh This Month — Just Dropped"
            videos={freshReleases}
            onVideoClick={handleVideoCardClick}
          />

          {/* Viral Crowd Work */}
          <VideoCarousel
            title="💬 Viral Crowd Work & Unscripted Chaos"
            videos={crowdWorkVideos}
            onVideoClick={handleVideoCardClick}
          />

          {/* 1-Hour Full Length Specials */}
          <VideoCarousel
            title="🎭 1-Hour Masterclass Standup Specials"
            videos={fullLengthSpecials}
            onVideoClick={handleVideoCardClick}
          />

          {/* Roast & Dark Humor */}
          <VideoCarousel
            title="🌶️ Sarcastic, Dark & Roast Battles"
            videos={darkComedy}
            onVideoClick={handleVideoCardClick}
          />

          {/* Family & Relatable */}
          <VideoCarousel
            title="👨‍👩‍👧 Family, College & Relatable Anecdotes"
            videos={familyComedy}
            onVideoClick={handleVideoCardClick}
          />
        </div>
      )}
    </div>
  );
}
