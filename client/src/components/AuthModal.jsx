import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, login, register, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  if (!isAuthModalOpen) return null;

  const triggerError = (errMsg) => {
    setError(errMsg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const isClientEmailValid = (em) => {
    if (!em) return false;
    const clean = em.trim().toLowerCase();
    const basic = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    if (!basic.test(clean)) return false;
    if (/^gmail\.(?!com$)[a-z]+$/.test(clean.split('@')[1] || '')) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isClientEmailValid(email)) {
      triggerError('Please enter a valid email address (e.g., name@gmail.com)');
      return;
    }

    if (!isLogin) {
      const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
      if (!passRegex.test(password)) {
        triggerError('Please meet all password requirements before signing up.');
        return;
      }
    }

    const res = isLogin 
      ? await login(email, password)
      : await register(username, email, password);
    
    if (!res.success) {
      triggerError(res.error);
    }
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character (@$!%*#?&)', met: /[@$!%*#?&]/.test(password) }
  ];

  return (
    <div className="modal-backdrop" id="auth-modal" onClick={() => setAuthModalOpen(false)}>
      <div className={`auth-modal ${shaking ? 'auth-shake' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setAuthModalOpen(false)}>X</button>
        <h2 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        
        {error && <div style={{ color: 'var(--rating-18)', marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GoogleLogin 
            onSuccess={async (credentialResponse) => {
              const result = await loginWithGoogle(credentialResponse.credential);
              if (!result.success) triggerError(result.error);
            }}
            onError={() => {
              triggerError('Google Login Failed');
            }}
            theme="filled_black"
            shape="pill"
            width="100%"
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '15px', color: '#9ca3af', fontSize: '14px' }}>
          or continue with email
        </div>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
            {!isLogin && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} style={{ color: req.met ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s ease' }}>
                    <span>{req.met ? '✓' : '✗'}</span>
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 16 }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {isLogin ? "New to StandUp+? " : "Already have an account? "}
          <button style={{ background: 'none', color: 'white', fontWeight: 600 }} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? "Sign up now." : "Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}
