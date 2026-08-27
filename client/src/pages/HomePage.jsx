import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import VideoCarousel from '../components/VideoCarousel';
import ComedianCarousel from '../components/ComedianCarousel';
import { API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [favoriteComedianData, setFavoriteComedianData] = useState(null);
  const [watchHistory, setWatchHistory] = useState([]);
  const [comedians, setComedians] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token, activeProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [featRes, catRes, comRes] = await Promise.all([
          fetch(`${API_BASE}/videos/featured`),
          fetch(`${API_BASE}/categories`),
          fetch(`${API_BASE}/comedians`)
        ]);
        
        const featData = await featRes.json();
        const catData = await catRes.json();
        const comData = await comRes.json();
        
        setFeatured(featData);
        setCategories(catData);
        setComedians(comData);

        if (user && token) {
          const authHeaders = { 
            'Authorization': `Bearer ${token}`,
            'x-profile-id': activeProfile?.profile_id || ''
          };

          const [recRes, favComedianRes, historyRes] = await Promise.all([
            fetch(`${API_BASE}/recommendations?limit=10`, { headers: authHeaders }),
            fetch(`${API_BASE}/user/favorite-comedian`, { headers: authHeaders }),
            fetch(`${API_BASE}/user/watch-history?inProgress=true`, { headers: authHeaders })
          ]);
          
          if (recRes.ok) {
            const recData = await recRes.json();
            setRecommendations(recData);
          }
          
          if (favComedianRes.ok) {
            const favData = await favComedianRes.json();
            setFavoriteComedianData(favData);
          }
          
          if (historyRes.ok) {
            const histData = await historyRes.json();
            setWatchHistory(histData);
          }
        }
      } catch (err) {
        console.error("Error fetching home data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, [user, token, activeProfile]);

  const handleVideoClick = (video) => {
    if (video.watch_duration_seconds > 0) {
      navigate(`/watch/${video.video_id}?t=${Math.floor(video.watch_duration_seconds)}`);
    } else {
      navigate(`/watch/${video.video_id}`);
    }
  };

  const profileDisplayName = activeProfile?.name || user?.username || 'You';
  const recentlyAddedCategory = categories.find(c => c.isRecentlyAdded || c.title === 'Recently Added');
  const otherCategories = categories.filter(c => !c.isRecentlyAdded && c.title !== 'Recently Added');

  return (
    <div className="home-page-layout">
      <HeroSection videos={featured} />
      
      <div className="home-rows-container">
        {/* Row 1: Recently Added (Always at the very top so user immediately sees what is brand new) */}
        {recentlyAddedCategory && recentlyAddedCategory.videos?.length > 0 && (
          <VideoCarousel 
            key="recently-added-top"
            title="Recently Added" 
            videos={recentlyAddedCategory.videos} 
            onVideoClick={handleVideoClick} 
            isRecentlyAdded={true}
          />
        )}

        {/* Row 2: Your Next Watch (Personalized recommendations + fresh discovery mix) */}
        {user && recommendations.length > 0 && (
          <VideoCarousel 
            title="Your Next Watch" 
            videos={recommendations} 
            onVideoClick={handleVideoClick} 
          />
        )}
        
        {/* Row 3: Continue Watching for active profile */}
        {user && watchHistory.length > 0 && (
          <VideoCarousel 
            title={`Continue Watching for ${profileDisplayName}`} 
            videos={watchHistory} 
            onVideoClick={handleVideoClick} 
            onRemoveFromRow={(id) => setWatchHistory(prev => prev.filter(v => v.video_id !== id))}
          />
        )}

        {/* Row 4: Favorite Comedian (if applicable) */}
        {user && favoriteComedianData?.videos?.length > 0 && (
          <VideoCarousel 
            title={`Because you like ${favoriteComedianData.comedian.name}`} 
            videos={favoriteComedianData.videos} 
            onVideoClick={handleVideoClick} 
          />
        )}

        {/* Remaining Category Rows (Top 10 Specials Today, Trending Now, Crowd Work, Dark Comedy, etc.) */}
        {loading ? (
          <div style={{ padding: '20px 4%' }}>
            <div className="skeleton" style={{ height: 30, width: 200, marginBottom: 20 }}></div>
            <div className="carousel-row">
              {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 300px' }}></div>)}
            </div>
          </div>
        ) : (
          otherCategories.map(cat => (
            cat.videos?.length > 0 && (
              <VideoCarousel 
                key={cat.title} 
                title={cat.title} 
                videos={cat.videos} 
                onVideoClick={handleVideoClick} 
                isTop10={cat.isTop10} 
              />
            )
          ))
        )}
      </div>
    </div>
  );
}
