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

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = isLogin 
      ? await login(email, password)
      : await register(username, email, password);
    
    if (!res.success) {
      setError(res.error);
    }
  };

  return (
    <div className="modal-backdrop" id="auth-modal" onClick={() => setAuthModalOpen(false)}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setAuthModalOpen(false)}>X</button>
        <h2 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        
        {error && <div style={{ color: 'var(--rating-18)', marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GoogleLogin 
            onSuccess={async (credentialResponse) => {
              const result = await loginWithGoogle(credentialResponse.credential);
              if (!result.success) setError(result.error);
            }}
            onError={() => {
              setError('Google Login Failed');
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
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 16 }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {isLogin ? "New to StandupStream? " : "Already have an account? "}
          <button style={{ background: 'none', color: 'white', fontWeight: 600 }} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? "Sign up now." : "Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}
