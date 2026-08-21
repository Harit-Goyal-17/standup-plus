import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import { API_BASE } from '../utils';

export default function BrowsePage({ defaultSort = 'view_count' }) {
  const [tags, setTags] = useState({ style: [], tone: [], theme: [] });
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    style: [],
    tone: [],
    theme: [],
    rating: '',
    minDuration: '',
    maxDuration: ''
  });

  useEffect(() => {
    fetch(`${API_BASE}/tags`)
      .then(res => res.json())
      .then(data => setTags(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.style.length) params.append('style', filters.style.join(','));
    if (filters.tone.length) params.append('tone', filters.tone.join(','));
    if (filters.theme.length) params.append('theme', filters.theme.join(','));
    if (filters.rating && filters.rating !== 'All') params.append('rating', filters.rating);
    if (filters.minDuration) params.append('minDuration', filters.minDuration);
    if (filters.maxDuration) params.append('maxDuration', filters.maxDuration);
    params.append('sort', defaultSort);
    
    fetch(`${API_BASE}/videos/filter?${params.toString()}`)
      .then(res => res.json())
      .then(data => setVideos(data))
      .catch(console.error);
  }, [filters]);

  const handleCheckbox = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const handleDuration = (val) => {
    let min = '', max = '';
    if (val === '<30m') { max = 1800; }
    else if (val === '30-60m') { min = 1800; max = 3600; }
    else if (val === '1-2h') { min = 3600; max = 7200; }
    else if (val === '2h+') { min = 7200; }
    setFilters(prev => ({ ...prev, minDuration: min, maxDuration: max }));
  };

  const clearFilters = () => {
    setFilters({ style: [], tone: [], theme: [], rating: '', minDuration: '', maxDuration: '' });
  };

  const handleVideoClick = (v) => navigate(`/watch/${v.video_id}`);

  return (
    <div className="browse-container">
      <aside className="filter-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Filters</h2>
          <button onClick={clearFilters} style={{ background: 'none', color: 'var(--primary)', fontSize: '0.8rem' }}>Clear All</button>
        </div>

        <div className="filter-group">
          <div className="filter-group-title">Style</div>
          {tags.style.map(t => (
            <label key={t} className="filter-label">
              <input type="checkbox" checked={filters.style.includes(t)} onChange={() => handleCheckbox('style', t)} /> {t}
            </label>
          ))}
        </div>
        
        <div className="filter-group">
          <div className="filter-group-title">Tone</div>
          {tags.tone.map(t => (
            <label key={t} className="filter-label">
              <input type="checkbox" checked={filters.tone.includes(t)} onChange={() => handleCheckbox('tone', t)} /> {t}
            </label>
          ))}
        </div>

        <div className="filter-group">
          <div className="filter-group-title">Rating</div>
          {['All', 'U/A', '13+', '16+', '18+'].map(r => (
            <label key={r} className="filter-label">
              <input type="radio" name="rating" checked={filters.rating === r || (r === 'All' && !filters.rating)} onChange={() => setFilters(prev => ({...prev, rating: r === 'All' ? '' : r}))} /> {r}
            </label>
          ))}
        </div>
      </aside>

      <main className="browse-main">
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>Browse Standup</h2>
        <div className="video-grid">
          {videos.map(vid => <VideoCard key={vid.video_id} video={vid} onClick={handleVideoClick} />)}
        </div>
        {videos.length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 40, textAlign: 'center' }}>No results match your filters.</div>}
      </main>
    </div>
  );
}
