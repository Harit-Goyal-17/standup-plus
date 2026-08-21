import os

base_dir = "/Users/harit/Downloads/youtube_api_project/client/src"

directories = [
    "components",
    "pages",
    "context",
    "hooks",
    "utils"
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

files = {
    "index.css": """
:root {
  --bg-color: #0a0a0f;
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  
  --primary-gradient: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%);
  --primary-color: #f43f5e;
  --primary-hover: #e11d48;
  
  --card-bg: rgba(25, 25, 30, 0.6);
  --card-border: rgba(255, 255, 255, 0.1);
  --glass-bg: rgba(10, 10, 15, 0.7);
  
  --tag-style: #3b82f6;
  --tag-tone: #8b5cf6;
  --tag-theme: #10b981;
  
  --rating-ua: #10b981;
  --rating-13: #f59e0b;
  --rating-16: #f97316;
  --rating-18: #ef4444;

  --transition: 0.3s ease;
  
  --font-sans: 'Inter', sans-serif;
  --font-display: 'Outfit', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background-color: var(--bg-color);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); font-weight: 700; line-height: 1.2; }
a { color: inherit; text-decoration: none; }
button { font-family: var(--font-sans); cursor: pointer; border: none; background: none; color: inherit; }

.gradient-text {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-color); }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }

.app-container { display: flex; flex-direction: column; min-height: 100vh; }
.main-content { flex: 1; margin-top: 60px; }

/* Utilities */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.75rem 1.5rem; border-radius: 9999px; font-weight: 600;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.btn:active { transform: scale(0.95); }
.btn-primary { background: var(--primary-gradient); color: white; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: rgba(255, 255, 255, 0.2); color: white; backdrop-filter: blur(8px); }
.btn-secondary:hover { background: rgba(255, 255, 255, 0.3); }

.glass-card {
  background: var(--card-bg); backdrop-filter: blur(12px);
  border: 1px solid var(--card-border); border-radius: 12px;
}

/* Navbar */
.navbar {
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 2rem; z-index: 100;
  transition: background 0.3s ease;
}
.navbar.scrolled { background: rgba(10, 10, 15, 0.9); backdrop-filter: blur(10px); }
.nav-brand { font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; }
.nav-actions { display: flex; align-items: center; gap: 1rem; }

/* Hero */
.hero { position: relative; width: 100%; height: 70vh; display: flex; align-items: flex-end; padding: 4rem 2rem; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: -1; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, var(--bg-color) 0%, transparent 100%); z-index: -1; }
.hero-content { max-width: 600px; }
.hero-title { font-size: 3rem; margin-bottom: 0.5rem; }

/* Carousel */
.carousel-section { padding: 2rem; }
.carousel-title { margin-bottom: 1rem; font-size: 1.5rem; }
.carousel-container { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: none; }
.carousel-container::-webkit-scrollbar { display: none; }

/* Video Card */
.video-card {
  min-width: 250px; position: relative; border-radius: 8px; overflow: hidden;
  transition: transform var(--transition); cursor: pointer;
}
.video-card:hover { transform: scale(1.05); z-index: 10; }
.video-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.video-info { padding: 1rem; background: var(--card-bg); }
.duration-badge { position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }

/* Tag Pill */
.tag-pill { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.tag-style { background: var(--tag-style); }
.tag-tone { background: var(--tag-tone); }
.tag-theme { background: var(--tag-theme); }
""",
    "context/AuthContext.jsx": """
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Mock user for now
      setUser({ username: 'StandupFan', email: 'fan@example.com' });
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthModalOpen, setAuthModalOpen }}>
      {children}
    </AuthContext.Provider>
  );
};
""",
    "components/Navbar.jsx": """
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user, setAuthModalOpen, logout } = useContext(AuthContext);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="nav-brand">
        🎤 <span className="gradient-text">StandupStream</span>
      </Link>
      <div className="nav-actions">
        <Link to="/search"><Search size={20} /></Link>
        <Link to="/browse">Browse</Link>
        {user ? (
          <div className="user-menu" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/profile"><User size={20} /></Link>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Logout</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)}>Sign In</button>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
""",
    "components/AuthModal.jsx": """
import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

const AuthModal = () => {
  const { isAuthModalOpen, setAuthModalOpen, login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ username: 'DemoUser' }, 'mock-jwt-token');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
        <button onClick={() => setAuthModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.5rem' }}>&times;</button>
        <h2 style={{ marginBottom: '1.5rem' }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && <input type="text" placeholder="Username" style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }} />}
          <input type="email" placeholder="Email" required style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }} />
          <input type="password" placeholder="Password" required style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }} />
          <button type="submit" className="btn btn-primary">{isLogin ? 'Sign In' : 'Register'}</button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
};
export default AuthModal;
""",
    "components/HeroSection.jsx": """
import React from 'react';
import { Play, Plus } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="hero">
      <div className="hero-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1920&q=80)' }}></div>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="tag-pill tag-style">Observational</span>
          <span className="tag-pill tag-tone">Cynical</span>
        </div>
        <h1 className="hero-title">Live at the Apollo</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>John Mulaney</p>
        <p style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ background: 'var(--rating-18)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>18+</span>
          <span>1h 24m</span>
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary"><Play size={20} /> Play</button>
          <button className="btn btn-secondary"><Plus size={20} /> My List</button>
        </div>
      </div>
    </div>
  );
};
export default HeroSection;
""",
    "components/VideoCard.jsx": """
import React from 'react';
import { Play } from 'lucide-react';

const VideoCard = ({ title, comedian, thumbnail, duration }) => {
  return (
    <div className="video-card glass-card">
      <div style={{ position: 'relative' }}>
        <img src={thumbnail || 'https://images.unsplash.com/photo-1590432363567-0744fb86eaf4?auto=format&fit=crop&w=400&q=80'} alt={title} className="video-thumb" />
        <span className="duration-badge">{duration || '58m'}</span>
      </div>
      <div className="video-info">
        <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{title || 'Comedy Special'}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{comedian || 'Comedian Name'}</p>
      </div>
    </div>
  );
};
export default VideoCard;
""",
    "components/VideoCarousel.jsx": """
import React from 'react';
import VideoCard from './VideoCard';

const VideoCarousel = ({ title }) => {
  return (
    <div className="carousel-section">
      <h2 className="carousel-title">{title}</h2>
      <div className="carousel-container">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <VideoCard key={i} title={`Special ${i}`} comedian={`Comedian ${i}`} />
        ))}
      </div>
    </div>
  );
};
export default VideoCarousel;
""",
    "pages/HomePage.jsx": """
import React from 'react';
import HeroSection from '../components/HeroSection';
import VideoCarousel from '../components/VideoCarousel';

const HomePage = () => {
  return (
    <div>
      <HeroSection />
      <VideoCarousel title="🔥 Trending Now" />
      <VideoCarousel title="😈 Dark & Cynical" />
      <VideoCarousel title="🎤 Crowd Work Masters" />
    </div>
  );
};
export default HomePage;
""",
    "pages/BrowsePage.jsx": """
import React from 'react';
import VideoCard from '../components/VideoCard';

const BrowsePage = () => {
  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem' }}>
      <aside style={{ width: '250px', flexShrink: 0 }} className="glass-card">
        <div style={{ padding: '1.5rem' }}>
          <h3>Filters</h3>
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Style</p>
            <label style={{ display: 'block' }}><input type="checkbox" /> Observational</label>
            <label style={{ display: 'block' }}><input type="checkbox" /> Crowd Work</label>
          </div>
        </div>
      </aside>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <VideoCard key={i} />)}
      </div>
    </div>
  );
};
export default BrowsePage;
""",
    "pages/SearchPage.jsx": """
import React from 'react';

const SearchPage = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Search</h1>
      <input type="text" placeholder="Search for comedians, titles, or tags..." 
             style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', marginTop: '1.5rem' }} />
    </div>
  );
};
export default SearchPage;
""",
    "pages/ComedianPage.jsx": """
import React from 'react';
import { useParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';

const ComedianPage = () => {
  const { id } = useParams();
  return (
    <div style={{ padding: '2rem' }}>
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: '#333', margin: '0 auto 1rem' }}></div>
        <h1>Comedian Name</h1>
        <p style={{ color: 'var(--text-secondary)' }}>24 Videos • 1.2M Views</p>
      </div>
      <h2>Videos</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {[1, 2, 3, 4].map(i => <VideoCard key={i} />)}
      </div>
    </div>
  );
};
export default ComedianPage;
""",
    "pages/WatchlistPage.jsx": """
import React from 'react';
import VideoCard from '../components/VideoCard';

const WatchlistPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>My List</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3].map(i => <VideoCard key={i} />)}
      </div>
    </div>
  );
};
export default WatchlistPage;
""",
    "pages/ProfilePage.jsx": """
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useContext(AuthContext);
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Profile</h1>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>
    </div>
  );
};
export default ProfilePage;
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    with open(full_path, "w") as f:
        f.write(content.strip() + "\\n")
