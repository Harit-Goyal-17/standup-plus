import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Share2, Sparkles, Check, ArrowLeft, Users } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import VideoCarousel from '../components/VideoCarousel';
import { API_BASE, formatViews, cleanHandle } from '../utils';

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

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];
    if (activeTab === 'specials') {
      result = result.filter(v => v.content_type === 'full_special' || v.duration_seconds >= 3000 || (v.title && v.title.toLowerCase().includes('special')));
    } else if (activeTab === 'crowd_work') {
      result = result.filter(v => v.content_type === 'crowd_work' || (v.title && v.title.toLowerCase().includes('crowd')));
    } else if (activeTab === 'bits') {
      result = result.filter(v => v.duration_seconds < 3000 && !v.title?.toLowerCase().includes('crowd'));
    }

    if (sortBy === 'views') {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    }
    return result;
  }, [videos, activeTab, sortBy]);

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

  const latestSpecial = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];

  return (
    <div style={{ padding: '30px 4% 60px', minHeight: '80vh' }}>
      {/* Back button */}
      <button 
        onClick={() => navigate('/browse')} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', marginBottom: '20px', fontSize: '0.9rem' }}
      >
        <ArrowLeft size={16} /> All Comedians
      </button>

      {/* Comedian Profile Hero Card */}
      <div className="comedian-profile-hero" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(20,20,24,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '28px',
        marginBottom: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap' }}>
          <img 
            src={comedian.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
            alt={comedian.name} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            }}
            style={{ 
              width: 120, 
              height: 120, 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '3px solid rgba(229, 9, 20, 0.8)',
              boxShadow: '0 8px 24px rgba(229, 9, 20, 0.3)'
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e50914', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Verified Stand-Up Artist
              </span>
            </div>
            <h1 style={{ fontSize: '2.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px', lineHeight: 1.1 }}>
              {comedian.name}
            </h1>
            <div style={{ color: '#9ca3af', display: 'flex', gap: '20px', fontSize: '0.95rem', flexWrap: 'wrap' }}>
              <span>{videos.length} Stand-Up {videos.length === 1 ? 'Video' : 'Videos'}</span>
              <span>•</span>
              <span>{formatViews(totalViews)} Total Views</span>
              <span>•</span>
              <span>StandUp+ Catalog</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {latestSpecial && (
            <button 
              className="btn-primary" 
              onClick={() => handleVideoClick(latestSpecial)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Play size={18} fill="currentColor" /> Play Top Special
            </button>
          )}
          <button 
            onClick={handleShare}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.18)', 
              color: '#ffffff', 
              padding: '12px 18px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={16} color="#4ade80" /> : <Share2 size={16} />}
            {copied ? 'Link Copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px', 
        marginBottom: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '16px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className={`pill-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Videos ({videos.length})
          </button>
          <button 
            className={`pill-btn ${activeTab === 'specials' ? 'active' : ''}`}
            onClick={() => setActiveTab('specials')}
          >
            Specials & Long Sets
          </button>
          <button 
            className={`pill-btn ${activeTab === 'crowd_work' ? 'active' : ''}`}
            onClick={() => setActiveTab('crowd_work')}
          >
            Crowd Work
          </button>
          <button 
            className={`pill-btn ${activeTab === 'bits' ? 'active' : ''}`}
            onClick={() => setActiveTab('bits')}
          >
            Standup Bits
          </button>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9ca3af', fontSize: '0.88rem' }}>
          <span>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ 
              background: '#18181f', 
              color: '#ffffff', 
              border: '1px solid rgba(255,255,255,0.15)', 
              borderRadius: '6px', 
              padding: '6px 12px',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="views">Most Viewed</option>
            <option value="latest">Recently Released</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Main Responsive Video Grid */}
      {filteredVideos.length > 0 ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '24px', 
          marginBottom: '60px' 
        }}>
          {filteredVideos.map(vid => (
            <VideoCard 
              key={vid.video_id} 
              video={vid} 
              onClick={handleVideoClick} 
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#9ca3af' }}>
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

      {/* Explore Other Comedians Carousel */}
      {otherComedians.length > 0 && (
        <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ffffff' }}>Explore More Stand-Up Comedians</h2>
            <Link to="/browse" style={{ color: '#e50914', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}>
              View All Comedians →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px' }}>
            {otherComedians.map(c => (
              <Link 
                key={c.comedian_id} 
                to={`/comedians/${c.comedian_id}`}
                style={{ 
                  textDecoration: 'none', 
                  flex: '0 0 130px', 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <img 
                  src={c.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                  alt={c.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                  }}
                  style={{ 
                    width: '84px', 
                    height: '84px', 
                    borderRadius: '50%', 
                    objectFit: 'cover', 
                    border: '2px solid rgba(255,255,255,0.15)',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                />
                <span style={{ color: '#e5e7eb', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {c.name}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  {c.video_count || 0} specials
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
