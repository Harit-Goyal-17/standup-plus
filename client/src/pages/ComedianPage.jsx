import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Share2, Sparkles, Check, ArrowLeft, Users, Tv, Mic, Flame } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import VideoCarousel from '../components/VideoCarousel';
import { API_BASE, formatViews, cleanHandle } from '../utils';
import { updateSEO } from '../utils/seo';

export default function ComedianPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comedian, setComedian] = useState(null);
  const [allComedians, setAllComedians] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('views');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);

    Promise.all([
      fetch(`${API_BASE}/comedians/${id}`).then(res => res.json()),
      fetch(`${API_BASE}/comedians`).then(res => res.json())
    ])
      .then(([comedianData, comediansList]) => {
        setComedian(comedianData);
        setAllComedians(Array.isArray(comediansList) ? comediansList : []);
        setLoading(false);
        if (comedianData && comedianData.name) {
          updateSEO({
            title: `${cleanHandle(comedianData.name)} Stand-Up Specials`,
            description: `Stream stand-up comedy specials, crowd work sets, and original shows by ${cleanHandle(comedianData.name)} on StandUp+`,
            image: comedianData.profile_image_url
          });
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const videos = useMemo(() => comedian?.videos || [], [comedian]);
  const totalViews = useMemo(() => videos.reduce((sum, v) => sum + (v.view_count || 0), 0), [videos]);

  // Section 1: Most Loved & Popular (Top 10 by Views)
  const popularVideos = useMemo(() => {
    return [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);
  }, [videos]);

  // Section 2: Shows & Hosted Series (e.g. Lie Hard, Pretty Good Roast Show, India's Got Latent)
  const showVideos = useMemo(() => {
    return videos.filter(v => {
      const titleLower = (v.title || '').toLowerCase();
      return v.content_type === 'episode' || 
             v.content_type === 'roast' || 
             titleLower.includes('lie hard') || 
             titleLower.includes('latent') || 
             titleLower.includes('roast show') || 
             titleLower.includes('roast battle') || 
             titleLower.includes('podcast') || 
             titleLower.includes('bhadwon') || 
             titleLower.includes('season') || 
             titleLower.includes('episode');
    });
  }, [videos]);

  // Section 3: Full Specials & Long Sets (Duration >= 35m or marked full_special)
  const fullSpecials = useMemo(() => {
    return videos.filter(v => {
      const titleLower = (v.title || '').toLowerCase();
      return (v.duration_seconds >= 2100 || v.content_type === 'full_special' || titleLower.includes('special') || titleLower.includes('full set')) &&
             !showVideos.some(sv => sv.video_id === v.video_id);
    });
  }, [videos, showVideos]);

  // Section 4: Crowd Work & Live Banter
  const crowdWorkVideos = useMemo(() => {
    return videos.filter(v => {
      const titleLower = (v.title || '').toLowerCase();
      return (v.content_type === 'crowd_work' || titleLower.includes('crowd') || titleLower.includes('interaction') || titleLower.includes('unscripted')) &&
             !showVideos.some(sv => sv.video_id === v.video_id);
    });
  }, [videos, showVideos]);

  // Section 5: Stand-Up Bits & Viral Sets (Standalone shorter comedy sets)
  const standupBits = useMemo(() => {
    return videos.filter(v => {
      const titleLower = (v.title || '').toLowerCase();
      return v.duration_seconds < 2100 &&
             !titleLower.includes('crowd') &&
             !titleLower.includes('interaction') &&
             !showVideos.some(sv => sv.video_id === v.video_id);
    });
  }, [videos, showVideos]);

  // Filtered & Sorted Videos for Complete Catalog Grid
  const filteredCatalogVideos = useMemo(() => {
    let result = [...videos];
    if (activeTab === 'specials') {
      result = result.filter(v => fullSpecials.some(fs => fs.video_id === v.video_id));
    } else if (activeTab === 'shows') {
      result = result.filter(v => showVideos.some(sv => sv.video_id === v.video_id));
    } else if (activeTab === 'crowd_work') {
      result = result.filter(v => crowdWorkVideos.some(cw => cw.video_id === v.video_id));
    } else if (activeTab === 'bits') {
      result = result.filter(v => standupBits.some(sb => sb.video_id === v.video_id));
    }

    if (sortBy === 'views') {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    }
    return result;
  }, [videos, activeTab, sortBy, fullSpecials, showVideos, crowdWorkVideos, standupBits]);

  const otherComedians = useMemo(() => {
    return allComedians.filter(c => String(c.comedian_id) !== String(id)).slice(0, 15);
  }, [allComedians, id]);

  const handleVideoClick = (v) => navigate(`/watch/${v.video_id}`);

  if (loading) {
    return (
      <div style={{ minHeight: '70vh', padding: '60px 4%', textAlign: 'center', color: '#9ca3af' }}>
        <div className="skeleton" style={{ width: '100%', height: '220px', borderRadius: '12px', marginBottom: '30px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '8px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!comedian || comedian.error || !comedian.name) {
    return (
      <div style={{ padding: '90px 4%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '12px', color: '#ffffff' }}>Comedian Profile Not Found</h2>
        <p style={{ color: '#9ca3af', marginBottom: '24px' }}>The comedian catalog you are looking for has been updated or moved.</p>
        <button className="btn-primary" onClick={() => navigate('/browse')}>
          Browse All Comedians
        </button>
      </div>
    );
  }

  const latestSpecial = popularVideos[0] || videos[0];

  return (
    <div className="comedian-page-layout">
      {/* Back button */}
      <button 
        onClick={() => navigate('/browse')} 
        className="comedian-back-link"
      >
        <ArrowLeft size={16} /> All Comedians
      </button>

      {/* Comedian Profile Hero Card (Sleek Netflix Style, No Red Glow) */}
      <div className="comedian-profile-hero">
        <div className="comedian-hero-left">
          <img 
            src={comedian.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
            alt={comedian.name} 
            className="comedian-hero-avatar"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            }}
          />
          <div className="comedian-hero-meta">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="comedian-verified-tag">Verified Stand-Up Artist</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" fill="#1d9bf0"/>
                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="comedian-hero-name">{cleanHandle(comedian.name)}</h1>
            <div className="comedian-hero-stats">
              <span>{videos.length} Stand-Up {videos.length === 1 ? 'Video' : 'Videos'}</span>
              <span>•</span>
              <span>{formatViews(totalViews)} Total Views</span>
              <span>•</span>
              <span>StandUp+ Exclusive Catalog</span>
            </div>
          </div>
        </div>

        {/* Action Buttons with Iconic Netflix White Play Button */}
        <div className="comedian-hero-actions">
          {latestSpecial && (
            <button 
              className="netflix-white-play-btn" 
              onClick={() => handleVideoClick(latestSpecial)}
            >
              <Play size={18} fill="black" color="black" />
              <span>Play Top Special</span>
            </button>
          )}
          <button 
            className="comedian-share-btn"
            onClick={handleShare}
          >
            {copied ? <Check size={16} color="#4ade80" /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* NETFLIX-STYLE SLIDING CAROUSELS BY CONTENT CATEGORY */}
      {/* ==================================================== */}
      <div className="comedian-carousels-container">
        {/* Section 1: Most Loved & Popular */}
        {popularVideos.length > 0 && (
          <VideoCarousel 
            title={`Popular by ${cleanHandle(comedian.name)}`} 
            videos={popularVideos} 
            onVideoClick={handleVideoClick} 
          />
        )}

        {/* Section 2: Shows & Hosted Series (e.g. Lie Hard, Pretty Good Roast Show, India's Got Latent) */}
        {showVideos.length > 0 && (
          <VideoCarousel 
            title={`Shows & Series`} 
            videos={showVideos} 
            onVideoClick={handleVideoClick} 
          />
        )}

        {/* Section 3: Full Specials & Long Sets (35+ min) */}
        {fullSpecials.length > 0 && (
          <VideoCarousel 
            title={`Specials & Long Sets`} 
            videos={fullSpecials} 
            onVideoClick={handleVideoClick} 
          />
        )}

        {/* Section 4: Crowd Work & Live Banter */}
        {crowdWorkVideos.length > 0 && (
          <VideoCarousel 
            title={`Crowd Work`} 
            videos={crowdWorkVideos} 
            onVideoClick={handleVideoClick} 
          />
        )}

        {/* Section 5: Stand-Up Bits & Viral Sets */}
        {standupBits.length > 0 && (
          <VideoCarousel 
            title={`Stand-Up Bits`} 
            videos={standupBits} 
            onVideoClick={handleVideoClick} 
          />
        )}
      </div>

      {/* ==================================================== */}
      {/* COMPLETE CATALOG GRID (With Sleek Filters & Sort)     */}
      {/* ==================================================== */}
      <div className="comedian-complete-catalog-section">
        <div className="comedian-catalog-header">
          <div>
            <h2 className="comedian-catalog-title">Complete Catalog ({videos.length})</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Explore every stand-up bit, crowd work set, and full-length special in one place
            </p>
          </div>

          <div className="comedian-catalog-controls">
            {/* Tab Filter Pills */}
            <div className="comedian-catalog-tabs">
              <button 
                className={`catalog-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({videos.length})
              </button>
              {fullSpecials.length > 0 && (
                <button 
                  className={`catalog-tab-pill ${activeTab === 'specials' ? 'active' : ''}`}
                  onClick={() => setActiveTab('specials')}
                >
                  Specials ({fullSpecials.length})
                </button>
              )}
              {showVideos.length > 0 && (
                <button 
                  className={`catalog-tab-pill ${activeTab === 'shows' ? 'active' : ''}`}
                  onClick={() => setActiveTab('shows')}
                >
                  Shows & Series ({showVideos.length})
                </button>
              )}
              {crowdWorkVideos.length > 0 && (
                <button 
                  className={`catalog-tab-pill ${activeTab === 'crowd_work' ? 'active' : ''}`}
                  onClick={() => setActiveTab('crowd_work')}
                >
                  Crowd Work ({crowdWorkVideos.length})
                </button>
              )}
              {standupBits.length > 0 && (
                <button 
                  className={`catalog-tab-pill ${activeTab === 'bits' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bits')}
                >
                  Bits ({standupBits.length})
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="comedian-catalog-sort">
              <span>Sort:</span>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="catalog-sort-select"
              >
                <option value="views">Most Viewed</option>
                <option value="latest">Recently Released</option>
                <option value="duration">Longest Duration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        {filteredCatalogVideos.length > 0 ? (
          <div className="comedian-catalog-grid">
            {filteredCatalogVideos.map(vid => (
              <VideoCard 
                key={vid.video_id} 
                video={vid} 
                onClick={handleVideoClick} 
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
            <p>No videos found matching this filter.</p>
            <button 
              className="pill-btn" 
              style={{ marginTop: '12px' }} 
              onClick={() => setActiveTab('all')}
            >
              Show All Videos
            </button>
          </div>
        )}
      </div>

      {/* Explore Other Comedians Carousel */}
      {otherComedians.length > 0 && (
        <div className="comedian-explore-more-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Explore More Stand-Up Comedians</h2>
            <Link to="/browse" style={{ color: '#e50914', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 500 }}>
              View All Artists →
            </Link>
          </div>
          <div className="comedian-explore-row">
            {otherComedians.map(c => (
              <Link 
                key={c.comedian_id} 
                to={`/comedians/${c.comedian_id}`}
                className="comedian-explore-item"
              >
                <img 
                  src={c.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                  alt={c.name}
                  className="comedian-explore-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                  }}
                />
                <span className="comedian-explore-name">{cleanHandle(c.name)}</span>
                <span className="comedian-explore-count">{c.video_count || 1} specials</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
