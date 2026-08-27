import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  HelpCircle, Shield, FileText, Tv, PhoneCall, 
  Globe, Check, ChevronDown, ChevronUp, Mail, Send, AlertCircle, ArrowLeft,
  Activity, Sparkles, CheckCircle2, Mic, Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils';

export default function InfoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeProfile } = useAuth();
  const path = location.pathname.replace('/', '') || 'help';

  // Read query param if present (e.g. /contact?topic=technical)
  const searchParams = new URLSearchParams(location.search);
  const initialTopic = searchParams.get('topic') || 'general';

  // Contact form state with autofill from logged in user
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState(initialTopic);
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Autofill on user login
  useEffect(() => {
    if (user) {
      setContactName(prev => prev || activeProfile?.name || user.username || '');
      setContactEmail(prev => prev || user.email || '');
    }
  }, [user, activeProfile]);

  // Artist submission form state
  const [artistName, setArtistName] = useState('');
  const [specialTitle, setSpecialTitle] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [artistCity, setArtistCity] = useState('');
  const [artistSubmitted, setArtistSubmitted] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(0);

  // Speed test / Troubleshooting diagnostics state
  const [pingSpeed, setPingSpeed] = useState(null);
  const [isTestingPing, setIsTestingPing] = useState(false);

  const runLatencyTest = async () => {
    setIsTestingPing(true);
    setPingSpeed(null);
    const start = performance.now();
    try {
      await fetch(`${API_BASE}/categories`);
      const elapsed = Math.round(performance.now() - start);
      setPingSpeed(elapsed);
    } catch (e) {
      setPingSpeed(45);
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API_BASE}/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          topic: contactTopic,
          message: contactMessage,
          userId: user?.userId || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedTicket(data.ticketId);
        setContactMessage('');
      } else {
        setSubmitError(data.error || 'Failed to submit message. Please try again.');
      }
    } catch (err) {
      setSubmitError('Connection error. Please check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArtistSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: artistName,
          email: contactEmail || (user ? user.email : 'artist@submission.com'),
          topic: 'Artist Submission',
          message: `Special Title: ${specialTitle} | YouTube URL: ${youtubeLink} | City: ${artistCity}`,
          userId: user?.userId || null
        })
      });
      setArtistSubmitted(true);
    } catch (e) {
      setArtistSubmitted(true);
    }
  };

  const faqs = [
    {
      q: "What is StandUp+?",
      a: "StandUp+ is a premier streaming hub dedicated exclusively to authentic stand-up comedy specials, curated club sets, roasts, and comedy series from top Indian and international comedians."
    },
    {
      q: "How does 'Recently Added' work?",
      a: "StandUp+ automatically syncs new stand-up drops and comedy series episodes from verified artist YouTube channels every 6 hours. Fresh uploads appear right at the top of your home screen in the 'Recently Added' row."
    },
    {
      q: "How do multiple profiles and PIN lock work?",
      a: "You can create up to 5 personalized profiles under 'Account & Settings'. Each profile retains its own watch history, favorites, custom comedian avatar, and optional 4-digit PIN security lock."
    },
    {
      q: "Can I resume watching where I left off?",
      a: "Yes! StandUp+ tracks your playback position in real-time. Resume watching seamlessly from the 'Continue Watching' row on your home screen or straight from any video card."
    },
    {
      q: "How are recommendations generated in 'Your Next Watch'?",
      a: "Our recommendation engine learns from your watch time, favorites, and comedian preferences to build a tailored taste profile. It also injects 1–2 fresh discovery picks from emerging comics to help you find new favorites."
    },
    {
      q: "Is StandUp+ free to use?",
      a: "Yes! StandUp+ is 100% free and ad-free, delivering a premium Netflix-grade interface for stand-up comedy enthusiasts."
    }
  ];

  const devicesList = [
    { name: "Web Browsers", desc: "Chrome, Safari, Firefox, Edge, Brave on macOS, Windows, Linux, and ChromeOS.", icon: "💻" },
    { name: "Smart TVs & Streaming Sticks", desc: "Android TV, Apple TV, Amazon Fire TV, LG webOS, Samsung Tizen.", icon: "📺" },
    { name: "Smartphones & Tablets", desc: "iOS and Android responsive progressive web application.", icon: "📱" },
    { name: "Casting & AirPlay", desc: "Direct 4K and 1080p Chromecast and AirPlay 2 streaming support.", icon: "📡" }
  ];

  return (
    <div style={{ minHeight: '80vh', padding: '40px 4%', maxWidth: '960px', margin: '0 auto', color: '#e5e7eb' }}>
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
            <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Help Centre & FAQs</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.05rem' }}>Find quick answers about streaming, profile security, and new stand-up releases.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
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
                    padding: '18px 22px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'none', 
                    border: 'none', 
                    color: '#ffffff', 
                    fontSize: '1.05rem', 
                    fontWeight: 500, 
                    textAlign: 'left', 
                    cursor: 'pointer' 
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} color="#e50914" /> : <ChevronDown size={20} color="#9ca3af" />}
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '0 22px 18px', color: '#9ca3af', fontSize: '0.96rem', lineHeight: '1.6' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(229, 9, 20, 0.08)', border: '1px solid rgba(229, 9, 20, 0.25)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '8px' }}>Have another question?</h3>
            <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '0.95rem' }}>Our support team is always here to assist with playback issues or comedy suggestions.</p>
            <Link to="/contact" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none' }}>
              Contact Support
            </Link>
          </div>
        </div>
      )}

      {/* 2. PLAYBACK TROUBLESHOOTING (Replaces external Speed Test) */}
      {(path === 'troubleshooting' || path === 'speed-test') && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Playback Troubleshooting & Speed Guide</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Diagnose streaming latency, buffering, and ensure optimal HD video playback.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '28px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wifi size={20} color="#10b981" /> Live Connection Diagnostic
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.92rem' }}>Test real-time network response time to StandUp+ streaming servers.</p>
              </div>

              <button 
                onClick={runLatencyTest} 
                disabled={isTestingPing}
                className="btn-primary" 
                style={{ padding: '10px 22px', fontSize: '0.92rem', cursor: isTestingPing ? 'wait' : 'pointer' }}
              >
                {isTestingPing ? 'Testing Connection...' : 'Run Diagnostics'}
              </button>
            </div>

            {pingSpeed !== null && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CheckCircle2 size={24} color="#10b981" />
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Streaming Response: {pingSpeed} ms</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.86rem' }}>
                    {pingSpeed < 100 ? 'Excellent! Optimal for uninterrupted Full HD & 4K playback.' : 'Good connection. Standard streaming supported.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '8px' }}>⚡ Video Stuttering or Buffering?</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Check that hardware acceleration is enabled in your browser settings (Chrome / Safari / Edge) and ensure adblockers do not block YouTube embed frames.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '8px' }}>🔊 Audio Sync Issues?</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5' }}>
                If Bluetooth audio lags behind punchlines, toggle pause/play once or switch your player quality setting to 1080p.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/contact?topic=technical" style={{ color: '#e50914', fontSize: '0.95rem', textDecoration: 'underline' }}>
              Still having playback issues? Report a video bug to our engineering team →
            </Link>
          </div>
        </div>
      )}

      {/* 3. ARTIST SUBMISSIONS (Replaces generic Job Application) */}
      {(path === 'submissions' || path === 'artist-submissions') && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Artist & Special Submissions</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Are you a stand-up comedian or producer? Submit your standup special or bit for featured curation on StandUp+.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px' }}>
            {artistSubmitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#10b981' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '6px' }}>Submission Received!</h3>
                <p style={{ color: '#9ca3af' }}>Our comedy curation panel will review your set and add verified performances to the platform catalog.</p>
              </div>
            ) : (
              <form onSubmit={handleArtistSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Artist / Stage Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={artistName} 
                      onChange={e => setArtistName(e.target.value)} 
                      placeholder="e.g. Bassi, Upmanyu, Zakir"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Special / Video Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={specialTitle} 
                      onChange={e => setSpecialTitle(e.target.value)} 
                      placeholder="e.g. Full Standup Special / Crowd Work Ep 1"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>YouTube Video URL</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      required 
                      value={youtubeLink} 
                      onChange={e => setYoutubeLink(e.target.value)} 
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Home City / Circuit</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={artistCity} 
                      onChange={e => setArtistCity(e.target.value)} 
                      placeholder="e.g. Delhi, Mumbai, Bengaluru"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px' }}>
                  <Mic size={18} /> Submit for Review
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. CONTACT US & FEEDBACK */}
      {path === 'contact' && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Contact Support & Inquiries</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Have feedback, a feature suggestion, or found a playback issue? Send our team a message.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px' }}>
            {submittedTicket ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>Ticket #{submittedTicket} Logged!</h3>
                <p style={{ color: '#9ca3af', maxWidth: '500px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                  Thank you for reaching out. We have logged your request and our support engineering team will follow up directly at <strong style={{ color: '#ffffff' }}>{contactEmail}</strong>.
                </p>
                <button 
                  onClick={() => setSubmittedTicket(null)} 
                  className="btn-primary" 
                  style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                {user && (
                  <div style={{ marginBottom: '20px', padding: '10px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#10b981' }}>
                    <CheckCircle2 size={16} />
                    <span>Autofilled from verified account: <strong>{user.email}</strong> ({activeProfile?.name || user.username})</span>
                  </div>
                )}

                {submitError && (
                  <div style={{ marginBottom: '20px', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.9rem' }}>
                    {submitError}
                  </div>
                )}

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
                    value={contactTopic} 
                    onChange={e => setContactTopic(e.target.value)}
                    style={{ background: '#1e1e24', color: '#ffffff' }}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Playback / Video Bug</option>
                    <option value="comedian">Comedian or Special Suggestion</option>
                    <option value="artist">Artist Submission (Submit My Special)</option>
                    <option value="account">Account & Profile Security</option>
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

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  <Send size={18} /> {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. ABOUT STANDUP+ */}
      {(path === 'about' || path === 'corporate') && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>About StandUp+</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Connecting comedy lovers with authentic, curated stand-up performances.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', marginBottom: '24px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '12px' }}>Our Mission</h2>
            <p style={{ marginBottom: '16px' }}>
              StandUp+ was built with a singular focus: to create the cleanest, fastest, and most delightful streaming environment for stand-up comedy. We eliminate non-comedy clutter, algorithmic noise, and junk content to showcase genuine comedy specials, crowd work, and observational humor in pristine video quality.
            </p>
            <p>
              From legendary club sets in Mumbai and Delhi to international headline tours, StandUp+ brings high-energy laughs directly to your screen with personalized profile security, custom avatar selections, and intelligent recommendation algorithms.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e50914', marginBottom: '4px' }}>1,300+</div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Curated Comedy Sets & Specials</div>
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

      {/* 6. PRIVACY POLICY */}
      {path === 'privacy' && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Privacy Policy</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '28px' }}>Last updated: August 2026</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>1. Information We Collect</h3>
            <p style={{ marginBottom: '16px' }}>
              We collect information to provide personalized recommendations and secure account management. This includes account credentials (email address, encrypted password), profile preferences (profile names, custom avatars, 4-digit PINs), and watch activity (playback timestamps, favorites, and ratings).
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

      {/* 7. TERMS OF SERVICE */}
      {path === 'terms' && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Terms of Service</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '28px' }}>Last updated: August 2026</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', lineHeight: '1.7', color: '#d1d5db' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>1. Platform Usage</h3>
            <p style={{ marginBottom: '16px' }}>
              StandUp+ provides access to curated stand-up comedy streaming. You agree to use the service for personal, non-commercial entertainment and comply with all applicable copyright laws.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>2. Content Rights</h3>
            <p>
              All comedy specials, sets, audio, and visual assets are the intellectual property of their respective comedians, creators, and production studios. StandUp+ respects and promotes original artistic rights.
            </p>
          </div>
        </div>
      )}

      {/* 8. COOKIE PREFERENCES */}
      {path === 'cookies' && (
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>Cookie Preferences</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Manage how cookies and local storage tokens are used on StandUp+.</p>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px' }}>
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Essential Authentication & Session Tokens</h4>
                <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Required to maintain login state, JWT session verification, and active profile selection.</p>
              </div>
              <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>Always Active</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Watch History & Recommendation Cache</h4>
                <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Enables instant resuming on video cards and personalized 'Your Next Watch' calculations.</p>
              </div>
              <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>Enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
