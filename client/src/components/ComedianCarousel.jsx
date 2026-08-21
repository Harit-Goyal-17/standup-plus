import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ComedianCarousel({ title, comedians }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  if (!comedians || comedians.length === 0) return null;

  const filteredComedians = comedians.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredComedians.length / itemsPerPage);

  const scroll = (direction) => {
    if (direction === 'left') {
      setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
    } else {
      setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
    }
  };

  // Reset page if search changes
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0);
  };

  return (
    <div className="carousel-container" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4%', marginBottom: '16px' }}>
        <h2 className="carousel-title" style={{ margin: 0 }}>{title}</h2>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search comedians..." 
            value={searchTerm}
            onChange={handleSearch}
            style={{ 
              width: '100%', 
              padding: '8px 10px 8px 36px', 
              borderRadius: '20px',
              border: '1px solid var(--bg-glass)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              outline: 'none'
            }} 
          />
        </div>
      </div>
      
      {filteredComedians.length > itemsPerPage && (
        <button className="carousel-btn left" onClick={() => scroll('left')}>
          <ChevronLeft />
        </button>
      )}

      <div className="carousel-view-window" style={{ '--current-page': currentPage, padding: '10px 4%' }}>
        <div className="carousel-row" style={{ gap: '25px' }}>
          {filteredComedians.length > 0 ? filteredComedians.map(c => (
            <Link 
              to={`/comedians/${c.comedian_id}`} 
              key={c.comedian_id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textDecoration: 'none',
                flex: `0 0 calc(${100 / itemsPerPage}% - 25px)`, 
                minWidth: '100px'
              }}
            >
              <img 
                src={c.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&chars=2&backgroundColor=random`} 
                alt={c.name} 
                className="comedian-story-avatar" 
                style={{ width: '100px', height: '100px', marginBottom: '10px' }}
              />
              <div className="comedian-story-name" style={{ fontSize: '0.9rem', maxWidth: '100px', textAlign: 'center' }}>{c.name}</div>
            </Link>
          )) : (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>No comedians found matching "{searchTerm}"</div>
          )}
        </div>
      </div>

      {filteredComedians.length > itemsPerPage && (
        <button className="carousel-btn right" onClick={() => scroll('right')}>
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
