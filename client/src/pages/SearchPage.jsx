import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, TrendingUp, X, Compass } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { API_BASE } from '../utils';

const MOOD_CHIPS = [
  { label: 'Cheer Me Up 😔', query: 'feeling sad cheer me up' },
  { label: 'Workplace Stress 💼', query: 'corporate office work stress' },
  { label: 'Relationships & Breakup 💔', query: 'relationship breakup dating' },
  { label: 'Dark & Cynical 🖤', query: 'dark sarcastic and biting comedy' },
  { label: 'High Energy & Roasts 🔥', query: 'crowd work roast chaos' },
  { label: 'Family & Wholesome 🛋️', query: 'family and wholesome childhood' }
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [aiMoodData, setAiMoodData] = useState(null);
  const [popularRecommendations, setPopularRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load popular specials on mount for recommendation fallback
  useEffect(() => {
    fetch(`${API_BASE}/videos/featured`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPopularRecommendations(data);
      })
      .catch(console.error);
  }, []);

  // Sync state with URL param
  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setAiMoodData(null);
      return;
    }
    const controller = new AbortController();
    const delay = setTimeout(() => {
      setLoading(true);
      fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            setResults(Array.isArray(data.results) ? data.results : []);
            if (data.isAiMood) {
              setAiMoodData(data);
            } else {
              setAiMoodData(null);
            }
          } else if (Array.isArray(data)) {
            setResults(data);
            setAiMoodData(null);
          } else {
            setResults([]);
            setAiMoodData(null);
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error(err);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val });
    } else {
      navigate('/');
    }
  };

  const handleChipClick = (chipQuery) => {
    setQuery(chipQuery);
    setSearchParams({ q: chipQuery });
  };

  const handleVideoClick = (v) => navigate(`/watch/${v.video_id}`);

  return (
    <div className="search-page-container" style={{ minHeight: '85vh', paddingTop: '90px', paddingBottom: '60px', paddingLeft: '4%', paddingRight: '4%' }}>
      {/* Search Header Banner */}
      <div className="search-input-header" style={{ marginBottom: '24px' }}>
        <div className="search-large-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px', padding: '12px 18px', maxWidth: '800px', margin: '0 auto' }}>
          <Search size={22} style={{ color: '#9ca3af', marginRight: '12px', flexShrink: 0 }} />
          <input 
            type="text" 
            className="search-large-input"
            style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.1rem', width: '100%', outline: 'none' }}
            placeholder="Search by comedian, show, or describe your mood (e.g. 'feeling sad', 'work stress')..."
            value={query}
            onChange={handleInputChange}
            autoFocus
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); navigate('/'); }}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* AI Mood Quick Chips */}
        <div style={{ maxWidth: '800px', margin: '16px auto 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e50914', fontSize: '0.82rem', fontWeight: 600, marginRight: '4px' }}>
            <Sparkles size={14} />
            <span>AI Moods:</span>
          </div>
          {MOOD_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip.query)}
              style={{
                background: query.toLowerCase().includes(chip.query.split(' ')[0]) ? 'rgba(229, 9, 20, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                border: query.toLowerCase().includes(chip.query.split(' ')[0]) ? '1px solid #e50914' : '1px solid rgba(255, 255, 255, 0.12)',
                color: query.toLowerCase().includes(chip.query.split(' ')[0]) ? '#ffffff' : '#d1d5db',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
          <div className="skeleton" style={{ height: 24, width: 220, margin: '0 auto 20px', borderRadius: 4 }} />
          <span>Searching standup library & computing mood matches...</span>
        </div>
      )}
      
      {/* AI Mood Match Banner */}
      {!loading && aiMoodData && results.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(90deg, rgba(229, 9, 20, 0.15) 0%, rgba(20, 20, 30, 0.6) 100%)', 
          border: '1px solid rgba(229, 9, 20, 0.4)', 
          borderRadius: '12px', 
          padding: '18px 24px', 
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '1.8rem', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {aiMoodData.moodEmoji}
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '1.05rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#e50914" />
                <span>AI Mood Match: {aiMoodData.moodTitle}</span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>
                {aiMoodData.aiMessage}
              </p>
            </div>
          </div>

          <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600 }}>
            {results.length} Curated Sets
          </span>
        </div>
      )}

      {/* Standard Results Header */}
      {!loading && query && results.length > 0 && !aiMoodData && (
        <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Results for <span style={{ color: '#e50914' }}>"{query}"</span> ({results.length})
          </h2>
        </div>
      )}

      {/* No Results Fallback */}
      {!loading && query && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: 600, margin: '40px auto' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '8px' }}>No comedy found for "{query}"</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: 0 }}>
            Try searching for comedians like <em>Zakir Khan, Samay Raina, Bassi, Gaurav Kapoor</em> or try an AI Mood query like <em>"cheer me up"</em> or <em>"workplace stress"</em>.
          </p>
        </div>
      )}

      {/* When Query is Empty -> Show Rich Recommendations & Trending Specials */}
      {!query && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <TrendingUp size={22} color="#e50914" />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Popular & Trending Stand-Up Specials</h2>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: '2px 0 0' }}>Top rated comedy specials, roast battles, and panel shows</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px 18px' }}>
            {popularRecommendations.map(vid => (
              <VideoCard key={vid.video_id} video={vid} onClick={handleVideoClick} />
            ))}
          </div>
        </div>
      )}

      {/* Render Search Results Grid */}
      {results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px 18px' }}>
          {results.map(vid => (
            <VideoCard key={vid.video_id} video={vid} onClick={handleVideoClick} />
          ))}
        </div>
      )}
    </div>
  );
}
