import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, TrendingUp, X } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { API_BASE } from '../utils';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState([]);
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
      return;
    }
    const delay = setTimeout(() => {
      setLoading(true);
      fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setResults(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(delay);
  }, [query]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val });
    } else {
      // If user completely deletes all characters, navigate back to Home!
      navigate('/');
    }
  };

  const handleVideoClick = (v) => navigate(`/watch/${v.video_id}`);

  return (
    <div className="search-page-container">
      {/* Search Header Banner */}
      <div className="search-input-header">
        <div className="search-large-bar">
          <Search size={22} className="search-large-icon" />
          <input 
            type="text" 
            className="search-large-input"
            placeholder="Search for specials, comedians, shows, or topics..."
            value={query}
            onChange={handleInputChange}
            autoFocus
          />
          {query && (
            <button className="search-clear-btn" onClick={() => navigate('/')}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="search-status-message">
          <div className="skeleton" style={{ height: 24, width: 220, margin: '0 auto 20px' }} />
          <span>Searching standup library...</span>
        </div>
      )}
      
      {/* Results Title */}
      {!loading && query && results.length > 0 && (
        <div className="search-section-header">
          <h2 className="search-results-heading">
            Results for <span className="search-highlight">"{query}"</span> ({results.length})
          </h2>
        </div>
      )}

      {/* No Results Fallback */}
      {!loading && query && results.length === 0 && (
        <div className="search-no-results">
          <h3>No comedy found for "{query}"</h3>
          <p>Try searching for comedians like <em>Zakir Khan, Samay Raina, Bassi, Gaurav Kapoor</em> or shows like <em>Lie Hard, Pitch Please</em></p>
        </div>
      )}

      {/* When Query is Empty -> Show Rich Recommendations & Trending Specials */}
      {!query && (
        <div className="search-recommendations-section">
          <div className="search-recommendations-header">
            <TrendingUp size={22} color="#e50914" />
            <div>
              <h2>Popular & Trending Stand-Up Specials</h2>
              <p>Top rated comedy specials, roast battles, and panel shows</p>
            </div>
          </div>

          <div className="video-grid">
            {popularRecommendations.map(vid => (
              <VideoCard key={vid.video_id} video={vid} onClick={handleVideoClick} />
            ))}
          </div>
        </div>
      )}

      {/* Render Search Results Grid */}
      {results.length > 0 && (
        <div className="video-grid">
          {results.map(vid => (
            <VideoCard key={vid.video_id} video={vid} onClick={handleVideoClick} />
          ))}
        </div>
      )}
    </div>
  );
}
