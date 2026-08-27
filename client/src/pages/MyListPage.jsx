import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bookmark, Heart, Sparkles, Film } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { API_BASE } from '../utils';

export default function MyListPage() {
  const { user, token, activeProfile, loading, setAuthModalOpen } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'watchlist' | 'liked'
  const [favorites, setFavorites] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loading && !user) {
      setFetching(false);
      return;
    }

    if (token) {
      setFetching(true);
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
      };

      Promise.all([
        fetch(`${API_BASE}/user/favorites`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/user/liked-videos`, { headers: authHeaders }).then(r => r.json()).catch(() => [])
      ])
      .then(([favData, likedData]) => {
        setFavorites(Array.isArray(favData) ? favData : []);
        setLikedVideos(Array.isArray(likedData) ? likedData : []);
        setFetching(false);
      })
      .catch(err => {
        console.error('Error fetching list data:', err);
        setFetching(false);
      });
    } else {
      setFetching(false);
    }
  }, [user, token, activeProfile?.profile_id, loading]);

  const handleVideoClick = (v) => {
    navigate(`/watch/${v.video_id}`);
  };

  const handleRemoveFromWatchlist = (videoId) => {
    setFavorites(prev => prev.filter(f => f.video_id !== videoId));
  };

  // Merge for 'all' tab deduplicated
  const allMergedVideos = React.useMemo(() => {
    const map = new Map();
    favorites.forEach(v => map.set(v.video_id, { ...v, inWatchlist: true }));
    likedVideos.forEach(v => {
      const existing = map.get(v.video_id);
      if (existing) {
        map.set(v.video_id, { ...existing, inLiked: true });
      } else {
        map.set(v.video_id, { ...v, inLiked: true });
      }
    });
    return Array.from(map.values());
  }, [favorites, likedVideos]);

  const displayedVideos = activeTab === 'watchlist' 
    ? favorites 
    : activeTab === 'liked' 
      ? likedVideos 
      : allMergedVideos;

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', paddingBottom: '60px', minHeight: '80vh', paddingLeft: '4%', paddingRight: '4%' }}>
        <div className="skeleton" style={{ height: 36, width: 180, marginBottom: 28, borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '80vh', textAlign: 'center', paddingLeft: '4%', paddingRight: '4%' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#ffffff', marginBottom: 12 }}>My List</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
          Sign in to view your saved watchlist and liked stand-up comedy specials.
        </p>
        <button 
          className="netflix-white-play-btn" 
          style={{ padding: '12px 32px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setAuthModalOpen(true)}
        >
          Sign In to View My List
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '60px', minHeight: '85vh', paddingLeft: '4%', paddingRight: '4%' }}>
      {/* Top Header & Tab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: 28, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
            My List & Favorites
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Personalized collection for {activeProfile?.name || user?.username}
          </p>
        </div>

        {/* Tab Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              background: activeTab === 'all' ? '#e50914' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All Saved ({allMergedVideos.length})
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            style={{
              background: activeTab === 'watchlist' ? '#e50914' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Bookmark size={14} />
            <span>Watchlist ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            style={{
              background: activeTab === 'liked' ? '#e50914' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Heart size={14} color={activeTab === 'liked' ? '#ffffff' : '#ef4444'} fill={activeTab === 'liked' ? '#ffffff' : '#ef4444'} />
            <span>Liked ({likedVideos.length})</span>
          </button>
        </div>
      </div>
      
      {fetching ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 8 }} />
          ))}
        </div>
      ) : displayedVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: 600, margin: '40px auto' }}>
          {activeTab === 'liked' ? (
            <>
              <Heart size={44} color="#ef4444" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
              <p style={{ color: '#e5e7eb', fontSize: '1.15rem', fontWeight: 500, marginBottom: 8 }}>No liked stand-up sets yet</p>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
                Give a thumbs up or rate your favorite specials with 4+ stars while watching to save them to your Liked collection.
              </p>
            </>
          ) : (
            <>
              <Bookmark size={44} color="#e50914" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
              <p style={{ color: '#e5e7eb', fontSize: '1.15rem', fontWeight: 500, marginBottom: 8 }}>Your watchlist is empty</p>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
                Explore stand-up specials, crowd work sets, and original shows and click the <strong>+</strong> button to add them here.
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" className="netflix-white-play-btn" style={{ padding: '10px 22px', fontSize: '0.9rem', display: 'inline-block', textDecoration: 'none' }}>
              Explore Home
            </Link>
            <Link to="/shows" style={{ padding: '10px 22px', fontSize: '0.9rem', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderRadius: 4, textDecoration: 'none', fontWeight: 500 }}>
              Browse Shows
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px 20px' }}>
          {displayedVideos.map(vid => (
            <VideoCard 
              key={vid.video_id} 
              video={vid} 
              onClick={handleVideoClick} 
              isInWatchlist={vid.inWatchlist || activeTab === 'watchlist'}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
