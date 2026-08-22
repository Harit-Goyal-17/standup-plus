import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import { API_BASE } from '../utils';

export default function MyListPage() {
  const { user, token, activeProfile, loading, setAuthModalOpen } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
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
      fetch(`${API_BASE}/user/favorites`, {
        headers: authHeaders
      })
      .then(res => res.json())
      .then(data => {
        setFavorites(Array.isArray(data) ? data : []);
        setFetching(false);
      })
      .catch(err => {
        console.error('Error fetching favorites:', err);
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
          Sign in to save your favorite stand-up specials, comedy bits, and shows to your personal watchlist.
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16 }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
          My List
        </h1>
        <span style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: 400 }}>
          {favorites.length} {favorites.length === 1 ? 'Title' : 'Titles'}
        </span>
      </div>
      
      {fetching ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 8 }} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: 600, margin: '40px auto' }}>
          <p style={{ color: '#e5e7eb', fontSize: '1.15rem', fontWeight: 500, marginBottom: 8 }}>Your watchlist is empty</p>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
            Explore stand-up comedy specials, crowd work sets, and original comedy shows and click the <strong>+</strong> button to add them here.
          </p>
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
          {favorites.map(vid => (
            <VideoCard 
              key={vid.video_id} 
              video={vid} 
              onClick={handleVideoClick} 
              isInWatchlist={true}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
