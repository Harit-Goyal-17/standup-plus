import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="netflix-footer">
      <div className="footer-content">
        <p className="footer-contact">
          Questions? Call <a href="tel:0008009191694">000-800-919-1694</a> (Toll-Free) or <Link to="/help">Contact Support</Link>
        </p>

        <div className="footer-links-grid">
          <ul className="footer-column">
            <li><Link to="/help">FAQ</Link></li>
            <li><Link to="/about">Investor Relations</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><a href="https://fast.com" target="_blank" rel="noreferrer">Speed Test</a></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/help">Help Centre</Link></li>
            <li><Link to="/jobs">Jobs & Careers</Link></li>
            <li><Link to="/cookies">Cookie Preferences</Link></li>
            <li><Link to="/legal">Legal Notices</Link></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/account">Account</Link></li>
            <li><Link to="/devices">Ways to Watch</Link></li>
            <li><Link to="/corporate">Corporate Information</Link></li>
            <li><Link to="/shows">Only on StandUp+</Link></li>
          </ul>

          <ul className="footer-column">
            <li><Link to="/press">Media Centre</Link></li>
            <li><Link to="/terms">Terms of Use</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/comedians/1">Featured Comedians</Link></li>
          </ul>
        </div>

        <div className="footer-lang-service-row">
          <div className="footer-lang-select">
            <Globe size={15} />
            <select aria-label="Language selection" defaultValue="en">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>

          <button className="footer-service-code" onClick={() => alert('Service Code: 893-412')}>
            Service Code
          </button>
        </div>

        <p className="footer-country">StandUp+ India — The Ultimate Stand-Up Comedy Streaming Hub</p>
        <p className="footer-copyright">© 2026 StandUp+, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
