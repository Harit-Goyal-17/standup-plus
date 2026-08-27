import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ArrowLeft, Mail, Phone, Lock, KeyRound, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal() {
  const { 
    isAuthModalOpen, setAuthModalOpen, 
    login, register, loginWithGoogle, 
    sendOtp, verifyOtp, resetPassword 
  } = useAuth();

  // Mode: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');

  // Form Fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character (@$!%*#?&)', met: /[@$!%*#?&]/.test(password) }
  ];

  const allPasswordReqsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // 1. Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await login(emailOrPhone.trim(), password);
    setIsLoading(false);
    if (!res.success) {
      triggerError(res.error || 'Invalid credentials. Please try again.');
    }
  };

  // 2. Handle Send OTP (Registration or Forgot Password)
  const handleRequestOtp = async (targetEmail, type) => {
    if (!isClientEmailValid(targetEmail)) {
      triggerError('Please enter a valid, real email address (e.g. name@gmail.com)');
      return;
    }

    setIsSendingOtp(true);
    setError('');
    const res = await sendOtp(targetEmail.trim().toLowerCase(), type);
    setIsSendingOtp(false);

    if (res.success) {
      setOtpSent(true);
      setOtpSuccessMessage(`6-digit OTP code sent to ${targetEmail.trim().toLowerCase()}`);
    } else {
      triggerError(res.error || 'Failed to send OTP code.');
    }
  };

  // 3. Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isClientEmailValid(email)) {
      triggerError('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }

    if (!allPasswordReqsMet) {
      triggerError('Please meet all password requirements before continuing.');
      return;
    }

    if (password !== confirmPassword) {
      triggerError('Passwords do not match. Please re-enter your confirm password.');
      return;
    }

    // If OTP step not sent yet, send OTP first
    if (!otpSent) {
      await handleRequestOtp(email, 'registration');
      return;
    }

    // If OTP code entered, finalize registration
    if (!otpCode || otpCode.length < 6) {
      triggerError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setIsLoading(true);
    const res = await register(
      username.trim(), 
      email.trim().toLowerCase(), 
      password, 
      phone.trim() || null, 
      otpCode.trim()
    );
    setIsLoading(false);

    if (!res.success) {
      triggerError(res.error || 'Registration failed.');
    }
  };

  // 4. Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpSent) {
      await handleRequestOtp(email, 'forgot_password');
      return;
    }

    if (!otpCode || otpCode.length < 6) {
      triggerError('Please enter the 6-digit OTP code.');
      return;
    }

    if (!allPasswordReqsMet) {
      triggerError('New password must meet all password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(email.trim().toLowerCase(), otpCode.trim(), password);
    setIsLoading(false);

    if (!res.success) {
      triggerError(res.error || 'Failed to reset password.');
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setOtpSent(false);
    setOtpCode('');
    setOtpSuccessMessage('');
  };

  return (
    <div className="modal-backdrop" id="auth-modal" onClick={() => setAuthModalOpen(false)}>
      <div className={`auth-modal ${shaking ? 'auth-shake' : ''}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%' }}>
        <button className="close-btn" onClick={() => setAuthModalOpen(false)} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {authMode === 'forgot' && (
            <button 
              onClick={() => switchMode('login')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', marginBottom: '12px', padding: 0 }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          )}

          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            {authMode === 'login' && 'Sign In'}
            {authMode === 'register' && (otpSent ? 'Verify Your Email' : 'Create Account')}
            {authMode === 'forgot' && (otpSent ? 'Set New Password' : 'Reset Password')}
          </h2>

          <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>
            {authMode === 'login' && 'Sign in to access your comedy watchlist and personalized recommendations.'}
            {authMode === 'register' && (otpSent ? `Enter the 6-digit code sent to ${email}` : 'Join StandUp+ for unlimited access to stand-up comedy specials.')}
            {authMode === 'forgot' && (otpSent ? 'Enter the OTP and choose a new secure password.' : 'Enter your registered email address to receive a 6-digit OTP code.')}
          </p>
        </div>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: 16, fontSize: '0.88rem', lineHeight: '1.4' }}>
            {error}
          </div>
        )}

        {otpSuccessMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: 16, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {/* Google Login for Sign In & Initial Register */}
        {authMode !== 'forgot' && !otpSent && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <GoogleLogin 
                onSuccess={async (credentialResponse) => {
                  const result = await loginWithGoogle(credentialResponse.credential);
                  if (!result.success) triggerError(result.error);
                }}
                onError={() => {
                  triggerError('Google Login Failed. Please try email sign in.');
                }}
                theme="filled_black"
                shape="pill"
                width="100%"
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px', color: '#6b7280', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>
          </>
        )}

        {/* 1. SIGN IN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '6px', display: 'block' }}>Email or Mobile Number</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="name@gmail.com or 10-digit number"
                value={emailOrPhone} 
                onChange={e => setEmailOrPhone(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => switchMode('forgot')}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Enter password"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading}
              style={{ width: '100%', marginTop: 18, padding: '12px', fontSize: '0.98rem', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            {!otpSent ? (
              <>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>Username / Display Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Rahul Sharma"
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>Gmail / Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="e.g. name@gmail.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>
                    Mobile Number <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>(Optional)</span>
                  </label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="e.g. 9876543210"
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>Create Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="At least 8 chars, 1 uppercase, 1 number"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                  
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} style={{ color: req.met ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{req.met ? '✓' : '•'}</span>
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>Confirm Password</label>
                    {confirmPassword && (
                      <span style={{ fontSize: '0.78rem', color: passwordsMatch ? '#10b981' : '#ef4444' }}>
                        {passwordsMatch ? '✓ Passwords match' : '✗ Does not match'}
                      </span>
                    )}
                  </div>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Re-enter password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSendingOtp}
                  style={{ width: '100%', padding: '12px', fontSize: '0.98rem', opacity: isSendingOtp ? 0.7 : 1 }}
                >
                  {isSendingOtp ? 'Sending OTP to Email...' : 'Send Verification OTP →'}
                </button>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '6px', display: 'block' }}>Enter 6-Digit Email OTP</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    className="form-control" 
                    placeholder="e.g. 849201"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    style={{ fontSize: '1.4rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 700 }}
                    required 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.84rem' }}>
                  <span style={{ color: '#9ca3af' }}>Didn't receive code?</span>
                  <button 
                    type="button" 
                    onClick={() => handleRequestOtp(email, 'registration')}
                    disabled={isSendingOtp}
                    style={{ background: 'none', border: 'none', color: '#e50914', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    {isSendingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isLoading}
                  style={{ width: '100%', padding: '12px', fontSize: '0.98rem', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? 'Verifying & Creating...' : 'Verify & Create Account'}
                </button>
              </>
            )}
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {authMode === 'forgot' && (
          <form onSubmit={handleResetPasswordSubmit}>
            {!otpSent ? (
              <>
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '6px', display: 'block' }}>Registered Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="Enter your registered email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSendingOtp}
                  style={{ width: '100%', padding: '12px', fontSize: '0.98rem', opacity: isSendingOtp ? 0.7 : 1 }}
                >
                  {isSendingOtp ? 'Sending OTP Code...' : 'Send Password Reset OTP'}
                </button>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>6-Digit OTP Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    className="form-control" 
                    placeholder="849201"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    style={{ fontSize: '1.3rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 700 }}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '4px', display: 'block' }}>New Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="At least 8 chars, 1 uppercase, 1 number"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>Confirm New Password</label>
                    {confirmPassword && (
                      <span style={{ fontSize: '0.78rem', color: passwordsMatch ? '#10b981' : '#ef4444' }}>
                        {passwordsMatch ? '✓ Passwords match' : '✗ Does not match'}
                      </span>
                    )}
                  </div>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Re-enter new password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isLoading}
                  style={{ width: '100%', padding: '12px', fontSize: '0.98rem', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
                </button>
              </>
            )}
          </form>
        )}
        
        {/* Toggle between Sign In / Sign Up */}
        {authMode !== 'forgot' && (
          <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {authMode === 'login' ? "New to StandUp+? " : "Already have an account? "}
            <button 
              style={{ background: 'none', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }} 
              onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? "Sign up now." : "Sign in."}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
