import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  HelpCircle, Shield, FileText, Briefcase, Tv, PhoneCall, 
  Globe, Check, ChevronDown, ChevronUp, Mail, Send, AlertCircle, ArrowLeft 
} from 'lucide-react';

export default function InfoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace('/', '') || 'help';

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('general');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(0);

  // Cookie prefs state
  const [cookiePrefs, setCookiePrefs] = useState({
    essential: true,
    analytics: true,
    personalization: true,
    advertising: false
  });
  const [savedCookies, setSavedCookies] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactSent(false);
    }, 4000);
  };

  const handleSaveCookies = () => {
    setSavedCookies(true);
    setTimeout(() => setSavedCookies(false), 3000);
  };

  const faqs = [
    {
      q: "What is StandUp+?",
      a: "StandUp+ is a premier streaming hub dedicated exclusively to authentic stand-up comedy specials, curated sets, and comedy series from top Indian and international stand-up comedians."
    },
    {
      q: "How do I create and manage multiple profiles?",
      a: "You can create up to 5 personalized profiles per account under 'Account & Settings'. Each profile retains its own watch history, favorites, recommendations, and custom avatar."
    },
    {
      q: "How does Profile PIN Lock work?",
      a: "Under 'Account & Settings' > 'Security & PIN', you can set a 4-digit PIN for any profile. When enabled, switching to or launching that profile will require entering the secure PIN."
    },
    {
      q: "Can I resume watching where I left off?",
      a: "Yes! StandUp+ automatically tracks your progress on every special and set in real-time. Look for the 'Continue Watching' row on your home screen or resume directly from any video card."
    },
    {
      q: "Is StandUp+ free to use?",
      a: "Yes, StandUp+ curates and organizes public stand-up comedy performances into an ad-free, Netflix-grade streaming experience with no subscription fees required."
    }
  ];

  const devicesList = [
    { name: "Web Browsers", desc: "Chrome, Safari, Firefox, Edge, Brave on macOS, Windows, Linux, and ChromeOS.", icon: "💻" },
    { name: "Smart TVs & Streaming Sticks", desc: "Android TV, Apple TV, Amazon Fire TV, LG webOS, Samsung Tizen.", icon: "📺" },
    { name: "Smartphones & Tablets", desc: "iOS and Android responsive progressive web application.", icon: "📱" },
    { name: "Casting & AirPlay", desc: "Direct 4K and 1080p Chromecast and AirPlay 2 streaming support.", icon: "📡" }
  ];

  const jobsList = [
    { title: "Senior Full-Stack Engineer (React & Node.js)", team: "Core Platform", loc: "Bengaluru / Remote", type: "Full-Time" },
    { title: "Recommendation Systems Engineer", team: "Machine Learning & AI", loc: "Bengaluru / Remote", type: "Full-Time" },
    { title: "Product Designer (UI / UX)", team: "Design & Brand", loc: "Mumbai / Remote", type: "Full-Time" },
    { title: "Comedy Curation & Editorial Lead", team: "Content & Talent", loc: "Delhi / Mumbai", type: "Full-Time" }
  ];

  return (
    <div style={{ minHeight: '80vh', padding: '40px 4%', maxWidth: '1000px', margin: '0 auto', color: '#e5e7eb' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', marginBottom: '24px', fontSize: '0.95rem' }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* 1. HELP & FAQ */}
      {(path === 'help' || path === 'faq') && (
        <div>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Help Centre & FAQs</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.05rem' }}>Find answers to common questions about streaming, profile security, and curated stand-up comedy.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '10px', 
                  overflow: 'hidden' 
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  style={{ 
                    width: '100%', 
                    padding: '20px 24px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'none', 
                    border: 'none', 
                    color: '#ffffff', 
                    fontSize: '1.1rem', 
                    fontWeight: 500, 
                    textAlign: 'left', 
                    cursor: 'pointer' 
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} color="#e50914" /> : <ChevronDown size={20} color="#9ca3af" />}
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '0 24px 20px', color: '#9ca3af', fontSize: '0.98rem', lineHeight: '1.6' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(229, 9, 20, 0.08)', border: '1px solid rgba(229, 9, 20, 0.25)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '8px' }}>Need more help?</h3>
            <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '0.95rem' }}>Our dedicated support team is available 24/7 to assist with playback, profiles, or comedy suggestions.</p>
            <Link to="/contact" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none' }}>
              Contact Support
            </Link>
          </div>
        </div>
      )}

      {/* 2. ABOUT & CORPORATE */}
      {(path === 'about' || path === 'corporate' || path === 'investor' || path === 'investors') && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>About StandUp+</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Connecting audiences with the world's finest stand-up comedy performances.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', marginBottom: '24px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '12px' }}>Our Mission</h2>
            <p style={{ marginBottom: '16px' }}>
              StandUp+ was built with a singular focus: to create the cleanest, fastest, and most delightful streaming environment for stand-up comedy. We eliminate non-comedy clutter, algorithmic noise, and junk content to showcase stand-up comedy specials, crowd work, and observational humor in pristine video quality.
            </p>
            <p>
              From legendary club sets in Mumbai and Delhi to international headline tours, StandUp+ brings high-energy laughs directly to your screen with personalized profile security, custom avatar selections, and intelligent recommendation algorithms.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e50914', marginBottom: '4px' }}>85+</div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Curated Comedians</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e50914', marginBottom: '4px' }}>100%</div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Stand-Up Content Only</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e50914', marginBottom: '4px' }}>5</div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>PIN-Locked Profiles</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. WAYS TO WATCH / DEVICES */}
      {(path === 'devices' || path === 'ways-to-watch') && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Ways to Watch</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Stream StandUp+ on all your favorite devices with synced watch progress.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {devicesList.map((dev, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>{dev.icon}</div>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '8px' }}>{dev.name}</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.92rem', lineHeight: '1.5' }}>{dev.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PRIVACY POLICY */}
      {path === 'privacy' && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Privacy Policy</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '28px' }}>Last updated: August 2026</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>1. Information We Collect</h3>
            <p style={{ marginBottom: '16px' }}>
              We collect information to provide better recommendations and secure account management. This includes account credentials (email address, encrypted password), profile preferences (profile names, custom avatars, 4-digit PINs), and watch activity (playback timestamps, favorites, and ratings).
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>2. How We Use Information</h3>
            <p style={{ marginBottom: '16px' }}>
              Your data is strictly used to deliver personalized comedy recommendations, maintain watch progress across devices, and secure your profile PIN locks. We do not sell your personal data to third parties.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>3. Data Security</h3>
            <p>
              We implement industry-standard cryptographic hashing for passwords and profile PINs. Authentication tokens are securely signed with JSON Web Tokens (JWT) with TLS encryption across all network communications.
            </p>
          </div>
        </div>
      )}

      {/* 5. TERMS OF USE */}
      {path === 'terms' && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Terms of Use</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '28px' }}>Last updated: August 2026</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>1. Platform Usage</h3>
            <p style={{ marginBottom: '16px' }}>
              StandUp+ provides access to curated stand-up comedy streaming. You agree to use the service for personal, non-commercial entertainment and comply with all applicable copyright laws.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>2. Account Responsibility</h3>
            <p style={{ marginBottom: '16px' }}>
              You are responsible for maintaining the confidentiality of your account credentials and any profile PINs configured on your account.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>3. Content Rights</h3>
            <p>
              All comedy specials, sets, audio, and visual assets are the intellectual property of their respective comedians, creators, and production studios. StandUp+ respects and promotes original artistic rights.
            </p>
          </div>
        </div>
      )}

      {/* 6. CAREERS & JOBS */}
      {(path === 'jobs' || path === 'careers') && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Careers at StandUp+</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Join the team building the future of comedy entertainment and streaming technology.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {jobsList.map((job, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '16px' 
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '6px' }}>{job.title}</h3>
                  <div style={{ display: 'flex', gap: '16px', color: '#9ca3af', fontSize: '0.88rem' }}>
                    <span>{job.team}</span>
                    <span>•</span>
                    <span>{job.loc}</span>
                    <span>•</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <Link to="/contact" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem', textDecoration: 'none' }}>
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. CONTACT US */}
      {path === 'contact' && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Contact Support & Inquiries</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Have a question, feedback, or comedy recommendation? Send us a message.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px' }}>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#4ade80' }}>
                <Check size={48} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '6px' }}>Message Received!</h3>
                <p style={{ color: '#9ca3af' }}>Thank you for reaching out. Our support team will respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Your Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={contactName} 
                      onChange={e => setContactName(e.target.value)} 
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Email Address</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      value={contactEmail} 
                      onChange={e => setContactEmail(e.target.value)} 
                      placeholder="e.g. rahul@example.com"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Topic</label>
                  <select 
                    className="form-control" 
                    value={contactSubject} 
                    onChange={e => setContactSubject(e.target.value)}
                    style={{ background: '#1e1e24', color: '#ffffff' }}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Playback / Video Bug</option>
                    <option value="account">Account & Profile Security</option>
                    <option value="comedian">Comedian / Special Suggestion</option>
                    <option value="careers">Job Application</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Message</label>
                  <textarea 
                    className="form-control" 
                    rows={5} 
                    required 
                    value={contactMessage} 
                    onChange={e => setContactMessage(e.target.value)} 
                    placeholder="Describe your question, issue, or feedback..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px' }}>
                  <Send size={18} /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. COOKIE PREFERENCES */}
      {path === 'cookies' && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Cookie Preferences</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Manage how cookies and local storage tokens are used on StandUp+.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px' }}>
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '4px' }}>Essential Authentication & Session Tokens</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Required for user login, profile security PINs, and secure watch progress storage.</p>
              </div>
              <span style={{ color: '#4ade80', fontSize: '0.88rem', fontWeight: 600 }}>Always Active</span>
            </div>

            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '4px' }}>Playback & Video Recommendation Cookies</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Allows our content recommendation engine to suggest comedians and specials matching your taste.</p>
              </div>
              <input 
                type="checkbox" 
                checked={cookiePrefs.personalization} 
                onChange={e => setCookiePrefs({...cookiePrefs, personalization: e.target.checked})}
                style={{ width: '20px', height: '20px', accentColor: '#e50914', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button className="btn-primary" onClick={handleSaveCookies}>
                Save Preferences
              </button>
              {savedCookies && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>Preferences saved successfully!</span>}
            </div>
          </div>
        </div>
      )}

      {/* 9. LEGAL & MEDIA */}
      {(path === 'legal' || path === 'press') && (
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>
            {path === 'press' ? 'Media Centre & Press' : 'Legal Notices & DMCA'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>
            Official notices, copyright compliance, and press relations.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Copyright & Platform Attribution</h3>
            <p style={{ marginBottom: '16px' }}>
              StandUp+ streams and curates official videos uploaded by verified comedy creators and artist channels. All trademarks, comedian names, logos, and likenesses belong to their respective copyright holders.
            </p>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Press Inquiries & Artist Partnerships</h3>
            <p>
              For comedy special additions, artist features, press kits, or media coverage inquiries, please contact our team via the <Link to="/contact" style={{ color: '#e50914' }}>Contact Form</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
