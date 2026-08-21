import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ProfileSelector from './components/ProfileSelector';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import ShowsPage from './pages/ShowsPage';
import NewPopularPage from './pages/NewPopularPage';
import SearchPage from './pages/SearchPage';
import ComedianPage from './pages/ComedianPage';
import MyListPage from './pages/MyListPage';
import ProfilePage from './pages/ProfilePage';
import ActivityPage from './pages/ActivityPage';
import VideoPage from './pages/VideoPage';

function AppContent() {
  const { user, activeProfile, loading } = useAuth();
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch/');
  
  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>;

  if (user && !activeProfile) {
    return <ProfileSelector />;
  }

  return (
    <div className={`app-container ${isWatchPage ? 'watch-mode' : ''}`}>
      {!isWatchPage && <Navbar />}
      <AuthModal />
      <main className={isWatchPage ? "watch-main-content" : "main-content"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage key="browse" />} />
          <Route path="/shows" element={<ShowsPage />} />
          <Route path="/shows/:showId" element={<ShowsPage />} />
          <Route path="/new-popular" element={<NewPopularPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/comedians/:id" element={<ComedianPage />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="/watchlist" element={<MyListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/watch/:id" element={<VideoPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
