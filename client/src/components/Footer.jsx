import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="netflix-footer">
      <div className="footer-content">
        <p className="footer-contact">
          Questions or feedback? <Link to="/contact">Contact Support</Link> or visit our <Link to="/help">Help Centre</Link>
        </p>

        <div className="footer-links-grid">
          <ul className="footer-column">
            <li><Link to="/help">FAQ & Help Centre</Link></li>
            <li><Link to="/troubleshooting">Playback Troubleshooting</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/shows">Shows & Series</Link></li>
            <li><Link to="/browse">Browse Comedians</Link></li>
            <li><Link to="/submissions">Artist Submissions</Link></li>
            <li><Link to="/cookies">Cookie Preferences</Link></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/profile">Account & Settings</Link></li>
            <li><Link to="/profile">Profile PIN Lock</Link></li>
            <li><Link to="/my-list">My Watchlist</Link></li>
            <li><Link to="/activity">Viewing Activity</Link></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/contact">Contact Support</Link></li>
            <li><Link to="/contact?topic=technical">Report Playback Bug</Link></li>
            <li><Link to="/contact?topic=comedian">Suggest a Special</Link></li>
            <li><Link to="/about">About StandUp+</Link></li>
          </ul>
        </div>

        <div className="footer-lang-service-row">
          <div className="footer-lang-select">
            <Globe size={15} />
            <select aria-label="Language selection" defaultValue="en">
              <option value="en">English (India)</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.82rem' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Official Streaming Hub</span>
          </div>
        </div>

        <p className="footer-country">StandUp+ India — The Ultimate Stand-Up Comedy Streaming Platform</p>
        <p className="footer-copyright">© 2026 StandUp+, Inc. Curated with love for comedy fans worldwide.</p>
      </div>
    </footer>
  );
}
