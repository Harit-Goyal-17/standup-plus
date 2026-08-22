import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard from './VideoCard';

export default function VideoCarousel({ title, videos, onVideoClick, isTop10, actionButton, onRemoveFromRow }) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!videos || videos.length === 0) return null;

  const itemsPerPage = 5;
  const totalPages = Math.ceil(videos.length / itemsPerPage);

  const scroll = (direction) => {
    if (direction === 'left') {
      setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
    } else {
      setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
    }
  };

  // Calculate sliding transform offset to avoid blank space on the last page
  let transformPercent = currentPage * -100;
  if (currentPage === totalPages - 1 && videos.length > itemsPerPage) {
    transformPercent = -(videos.length - itemsPerPage) * (100 / itemsPerPage);
  }

  return (
    <div className={`carousel-container ${isTop10 ? 'top10-carousel' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px', position: 'relative' }}>
        <h2 className="carousel-title">{title}</h2>
        {actionButton}
        
        {videos.length > 5 && (
          <div className="carousel-pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} className={`pagination-bar ${i === currentPage ? 'active' : ''}`} />
            ))}
          </div>
        )}
      </div>
      
      {videos.length > 5 && (
        <button className="carousel-btn left" onClick={() => scroll('left')}>
          <ChevronLeft />
        </button>
      )}

      <div className="carousel-view-window">
        <div className={`carousel-row ${isTop10 ? 'top10-row' : ''}`} style={{ transform: `translateX(${transformPercent}%)` }}>
          {videos.map((vid, index) => {
            if (isTop10) {
              return (
                <div key={vid.video_id} className="top10-item">
                  <span className="top10-number">{index + 1}</span>
                  <VideoCard video={vid} onClick={onVideoClick} onRemoveFromRow={onRemoveFromRow} />
                </div>
              );
            }
            return <VideoCard key={vid.video_id} video={vid} onClick={onVideoClick} onRemoveFromRow={onRemoveFromRow} />;
          })}
        </div>
      </div>

      {videos.length > 5 && (
        <button className="carousel-btn right" onClick={() => scroll('right')}>
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
