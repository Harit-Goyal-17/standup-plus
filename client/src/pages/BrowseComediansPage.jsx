import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, X, ChevronRight, Mic } from 'lucide-react';
import { API_BASE, formatViews, cleanHandle } from '../utils';

export default function BrowseComediansPage() {
  const [comedians, setComedians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    fetch(`${API_BASE}/comedians`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComedians(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const categories = [
    { id: 'all', label: 'All Artists' },
    { id: 'popular', label: '🔥 Most Popular' },
    { id: 'roast', label: '🎯 Roasts & Crowd Work' },
    { id: 'observational', label: '☕ Observational' },
    { id: 'storytelling', label: '📖 Storytellers' },
    { id: 'clean', label: '✨ Clean & Family' },
    { id: 'female', label: '👑 Female Stand-Up' },
    { id: 'global', label: '🌍 Global Stand-Up' }
  ];

  const filteredComedians = useMemo(() => {
    let list = [...comedians];

    // Filter by category tag/name
    if (selectedCategory === 'popular') {
      list = list.sort((a, b) => (b.video_count || 0) - (a.video_count || 0)).slice(0, 24);
    } else if (selectedCategory === 'roast') {
      const roastComics = ['Samay Raina', 'Aashish Solanki', 'Harsh Gujral', 'Madhur Virli', 'Munawar Faruqui', 'Tanmay Bhat', 'Sundeep Sharma'];
      list = list.filter(c => roastComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    } else if (selectedCategory === 'observational') {
      const obsComics = ['Anubhav Singh Bassi', 'Zakir Khan', 'Abhishek Upmanyu', 'Aakash Gupta', 'Rahul Dua', 'Gaurav Kapoor', 'Kanan Gill', 'Biswa Kalyan Rath'];
      list = list.filter(c => obsComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    } else if (selectedCategory === 'storytelling') {
      const storyComics = ['Zakir Khan', 'Anubhav Singh Bassi', 'Gaurav Kapoor', 'Prashasti Singh', 'Manish Chaubey', 'Ashish Shakya', 'Ravi Gupta'];
      list = list.filter(c => storyComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    } else if (selectedCategory === 'clean') {
      const cleanComics = ['Aashish Solanki', 'Aakash Gupta', 'Amit Tandon', 'Jaspreet Singh', 'Rahul Dua', 'Appurv Gupta', 'Gaurav Gupta'];
      list = list.filter(c => cleanComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    } else if (selectedCategory === 'female') {
      const femaleComics = ['Prashasti Singh', 'Swati Sachdeva', 'Gurleen Pannu', 'Urooj Ashfaq', 'Shreeja Chaturvedi', 'Sumukhi Suresh', 'Kaneez Surka', 'Aishwarya Mohanraj', 'Sejal Bhat', 'Pavitra Shetty', 'Taylor Tomlinson'];
      list = list.filter(c => femaleComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    } else if (selectedCategory === 'global') {
      const globalComics = ['Taylor Tomlinson', 'Trevor Noah', 'Hasan Minhaj', 'Russell Peters', 'Max Amini', 'Trevor Wallace', 'Gianmarco', 'Pete Holmes', 'Akaash Singh'];
      list = list.filter(c => globalComics.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [comedians, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', padding: '60px 4%', maxWidth: 1400, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="browse-comedians-hub">
      {/* Header Banner */}
      <div className="comedians-hub-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Mic size={18} color="#e50914" />
            <span style={{ color: '#e50914', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Artist Directory
            </span>
          </div>
          <h1 className="comedians-hub-title">Browse Stand-Up Comedians</h1>
          <p className="comedians-hub-subtitle">
            Explore verified stand-up artists, their full-length specials, comedy series, crowd work, and viral bits.
          </p>
        </div>

        {/* Live Search Input */}
        <div className="comedians-hub-search-wrap">
          <Search size={18} className="hub-search-icon" />
          <input 
            type="text" 
            className="hub-search-input" 
            placeholder="Search by artist name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="hub-search-clear" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="comedians-hub-categories">
        {categories.map(cat => (
          <button 
            key={cat.id}
            className={`hub-category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Comedian Cards Grid */}
      {filteredComedians.length === 0 ? (
        <div className="comedians-empty-state">
          <p style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 8 }}>No comedians found matching "{searchQuery}"</p>
          <button className="pill-btn" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="comedians-hub-grid">
          {filteredComedians.map((c) => (
            <div 
              key={c.comedian_id}
              className="comedian-hub-card"
              onClick={() => navigate(`/comedians/${c.comedian_id}`)}
            >
              <div className="comedian-avatar-wrap">
                <img 
                  src={c.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                  alt={c.name}
                  className="comedian-card-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                  }}
                />
              </div>

              <div className="comedian-card-details">
                <h3 className="comedian-card-name">{cleanHandle(c.name)}</h3>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <span className="comedian-card-badge">Verified Artist</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" fill="#1d9bf0"/>
                    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                <div className="comedian-card-stats">
                  <span>{c.video_count || 1} {(c.video_count || 1) === 1 ? 'Special' : 'Specials'}</span>
                </div>

                <button className="comedian-card-view-btn">
                  <span>View Specials</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
