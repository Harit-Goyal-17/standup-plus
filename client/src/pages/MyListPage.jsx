import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoCarousel from '../components/VideoCarousel';
import { API_BASE } from '../utils';

export default function MyListPage() {
  const { user, token, activeProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (token) {
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(activeProfile?.profile_id ? { 'x-profile-id': activeProfile.profile_id } : {})
      };
      fetch(`${API_BASE}/user/favorites`, {
        headers: authHeaders
      })
      .then(res => res.json())
      .then(data => setFavorites(Array.isArray(data) ? data : []))
      .catch(console.error);
    }
  }, [token, activeProfile?.profile_id]);

  if (loading || !user) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  const handleRemoveFromWatchlist = (videoId) => {
    setFavorites(prev => prev.filter(f => f.video_id !== videoId));
  };

  return (
    <div style={{ paddingTop: '80px', paddingBottom: '40px', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: 32, paddingLeft: '4%', fontWeight: 700 }}>My List</h1>
      
      {favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 12, margin: '0 4%' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '1.2rem' }}>You haven't added any videos to your list yet.</p>
          <Link to="/shows" className="netflix-white-play-btn" style={{ padding: '10px 24px', display: 'inline-block', textDecoration: 'none' }}>Browse Specials</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <VideoCarousel 
            title="Saved to My List" 
            videos={favorites} 
            onVideoClick={handleVideoClick} 
            isInWatchlist={true}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
          />
        </div>
      )}
    </div>
  );
}
