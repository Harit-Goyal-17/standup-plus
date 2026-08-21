import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCarousel from '../components/VideoCarousel';
import VideoCard from '../components/VideoCard';
import { API_BASE, formatViews } from '../utils';



export default function ComedianPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comedian, setComedian] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/comedians/${id}`)
      .then(res => res.json())
      .then(data => setComedian(data))
      .catch(console.error);
  }, [id]);

  if (!comedian) return <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading comedian catalog...</div>;

  if (comedian.error || !comedian.name) {
    return (
      <div style={{ padding: '80px 4%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Comedian Not Found</h2>
        <p style={{ color: '#9ca3af', marginBottom: 24 }}>The comedian profile you are looking for is unavailable or has been updated.</p>
        <button className="btn-primary" onClick={() => navigate('/browse')}>
          Browse All Comedians
        </button>
      </div>
    );
  }

  const videos = comedian.videos || [];
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0) || 0;

  // Categorize videos
  const mostLoved = [...videos].sort((a, b) => b.like_count - a.like_count).slice(0, 10);
  const specials = videos.filter(v => v.content_type === 'full_special').sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const episodes = videos.filter(v => v.content_type === 'episode').sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const crowdWork = videos.filter(v => v.content_type === 'crowd_work').sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const standupBits = videos.filter(v => v.content_type === 'standup_bit' || !v.content_type).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const handleVideoClick = (v) => navigate(`/watch/${v.video_id}`);

  return (
    <div style={{ padding: '40px 4%' }}>
      <div style={{ marginBottom: 40, padding: 40, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--bg-glass)', display: 'flex', alignItems: 'center', gap: '30px' }}>
        <img 
          src={comedian.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} 
          alt={comedian.name} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comedian.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
          }}
          style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', background: '#222' }} 
        />
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', marginBottom: 10 }}>{comedian.name}</h1>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: 24, fontSize: '1.2rem' }}>
            <span>{videos.length} Videos</span>
            <span>{formatViews(totalViews)} Total Views</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {mostLoved.length > 0 && <VideoCarousel title="❤️ Most Loved Videos" videos={mostLoved} onVideoClick={handleVideoClick} />}
        {specials.length > 0 && <VideoCarousel title="🎬 Comedy Specials" videos={specials} onVideoClick={handleVideoClick} />}
        {episodes.length > 0 && <VideoCarousel title="📺 Comedy Series" videos={episodes} onVideoClick={handleVideoClick} />}
        {crowdWork.length > 0 && <VideoCarousel title="🎤 Crowd Work" videos={crowdWork} onVideoClick={handleVideoClick} />}
        {standupBits.length > 0 && <VideoCarousel title="🔥 Standup Bits" videos={standupBits} onVideoClick={handleVideoClick} />}
      </div>
    </div>
  );
}
