import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Track if user has attempted to submit (for inline validation)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  // Track if user has blurred the password field
  const [passwordTouched, setPasswordTouched] = useState(false);

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

  // ---- Password Strength Logic ----
  const pwChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*#?&^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password)
  };
  const metCount = Object.values(pwChecks).filter(Boolean).length;
  const allPasswordReqsMet = metCount === 4;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Strength label + color
  const getStrength = () => {
    if (password.length === 0) return { label: '', color: '#4b5563', percent: 0 };
    if (metCount <= 1) return { label: 'Weak', color: '#ef4444', percent: 25 };
    if (metCount === 2) return { label: 'Fair', color: '#f59e0b', percent: 50 };
    if (metCount === 3) return { label: 'Good', color: '#3b82f6', percent: 75 };
    return { label: 'Strong', color: '#10b981', percent: 100 };
  };
  const strength = getStrength();

  // Inline validation errors shown ONLY after user tries to submit or blurs field
  const showPasswordErrors = (hasAttemptedSubmit || passwordTouched) && password.length > 0 && !allPasswordReqsMet;

  // ---- Handlers ----

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

  const handleRequestOtp = async (targetEmail, type) => {
    if (!isClientEmailValid(targetEmail)) {
      triggerError('Please enter a valid email address');
      return;
    }

    setIsSendingOtp(true);
    setError('');
    try {
      const res = await sendOtp(targetEmail.trim().toLowerCase(), type);
      setIsSendingOtp(false);

      if (res.success) {
        setOtpSent(true);
        if (res.debugOtp) {
          setOtpCode(res.debugOtp);
          setOtpSuccessMessage(`OTP sent! (Verification Code: ${res.debugOtp})`);
        } else {
          setOtpSuccessMessage(`6-digit verification code sent to ${targetEmail.trim().toLowerCase()}`);
        }
      } else {
        triggerError(res.error || 'Failed to send OTP code.');
      }
    } catch (err) {
      setIsSendingOtp(false);
      triggerError('Connection error. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHasAttemptedSubmit(true);

    if (!username.trim() || username.trim().length < 2) {
      triggerError('Please enter a display name (at least 2 characters).');
      return;
    }

    if (!isClientEmailValid(email)) {
      triggerError('Please enter a valid email address.');
      return;
    }

    if (!allPasswordReqsMet) {
      triggerError('Your password does not meet the requirements below.');
      return;
    }

    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return;
    }

    if (!otpSent) {
      await handleRequestOtp(email, 'registration');
      return;
    }

    if (!otpCode || otpCode.length < 6) {
      triggerError('Please enter the 6-digit verification code sent to your email.');
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

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHasAttemptedSubmit(true);

    if (!otpSent) {
      await handleRequestOtp(email, 'forgot_password');
      return;
    }

    if (!otpCode || otpCode.length < 6) {
      triggerError('Please enter the 6-digit OTP code.');
      return;
    }

    if (!allPasswordReqsMet) {
      triggerError('New password must meet all requirements.');
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
    setHasAttemptedSubmit(false);
    setPasswordTouched(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // ---- Shared Styling ----
  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  };

  const inputFocusStyle = '1px solid rgba(255, 255, 255, 0.5)';

  const labelStyle = {
    fontSize: '0.85rem',
    color: '#d1d5db',
    marginBottom: '6px',
    display: 'block',
    fontWeight: 500
  };

  const passwordInputWrapper = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  };

  // ---- Render ----

  return (
    <div className="modal-backdrop" id="auth-modal" onClick={() => setAuthModalOpen(false)}>
      <div className={`auth-modal ${shaking ? 'auth-shake' : ''}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '92%' }}>
        <button className="close-btn" onClick={() => setAuthModalOpen(false)} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {authMode === 'forgot' && (
            <button 
              onClick={() => switchMode('login')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '12px', padding: 0 }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          )}

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            {authMode === 'login' && 'Sign In'}
            {authMode === 'register' && (otpSent ? 'Verify Your Email' : 'Create Account')}
            {authMode === 'forgot' && (otpSent ? 'Set New Password' : 'Reset Password')}
          </h2>

          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            {authMode === 'login' && 'Access your personalized comedy feed and watchlist.'}
            {authMode === 'register' && (otpSent ? `Enter the 6-digit code sent to ${email}` : 'Join StandUp+ — curated stand-up specials, just for you.')}
            {authMode === 'forgot' && (otpSent ? 'Enter the OTP and set a new secure password.' : 'Enter your email to receive a verification code.')}
          </p>
        </div>
        
        {/* Error Banner */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: 16, fontSize: '0.85rem', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Success Banner */}
        {otpSuccessMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: 16, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {/* Google Login (only when valid Client ID is configured) */}
        {authMode !== 'forgot' && !otpSent && Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID && !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('dummy') && import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <GoogleLogin 
                onSuccess={async (credentialResponse) => {
                  const result = await loginWithGoogle(credentialResponse.credential);
                  if (!result.success) triggerError(result.error);
                }}
                onError={() => triggerError('Google Login failed. Please try email sign in.')}
                theme="filled_black"
                shape="pill"
                width="100%"
              />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '16px', color: '#6b7280', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </>
        )}

        {/* ========== 1. SIGN IN FORM ========== */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email or Mobile Number</label>
              <input 
                type="text" 
                style={inputStyle}
                placeholder="your@email.com or 10-digit number"
                value={emailOrPhone} 
                onChange={e => setEmailOrPhone(e.target.value)} 
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                required 
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => switchMode('forgot')}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={passwordInputWrapper}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  style={inputStyle}
                  placeholder="Enter password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                width: '100%', marginTop: 18, padding: '12px', fontSize: '0.95rem', 
                background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer', opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ========== 2. SIGN UP FORM ========== */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            {!otpSent ? (
              <>
                {/* Display Name */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Display Name</label>
                  <input 
                    type="text" 
                    style={inputStyle}
                    placeholder="Your name"
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                    required 
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Email Address</label>
                  <input 
                    type="email" 
                    style={{
                      ...inputStyle,
                      borderColor: hasAttemptedSubmit && email && !isClientEmailValid(email) ? '#ef4444' : inputStyle.border
                    }}
                    placeholder="you@example.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = hasAttemptedSubmit && !isClientEmailValid(email) ? '#ef4444' : 'rgba(255,255,255,0.18)'}
                    required 
                  />
                  {hasAttemptedSubmit && email && !isClientEmailValid(email) && (
                    <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', margin: '4px 0 0' }}>
                      Please enter a valid email address
                    </p>
                  )}
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={11} /> We'll send a verification code to confirm your email
                  </p>
                </div>

                {/* Mobile Number */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>
                    Mobile Number <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                      ...inputStyle, 
                      width: '60px', 
                      flexShrink: 0, 
                      textAlign: 'center', 
                      color: '#9ca3af',
                      cursor: 'default',
                      padding: '12px 8px'
                    }}>
                      +91
                    </div>
                    <input 
                      type="tel" 
                      style={inputStyle}
                      placeholder="10-digit number"
                      maxLength={10}
                      value={phone} 
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} 
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Create Password</label>
                  <div style={passwordInputWrapper}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      style={inputStyle}
                      placeholder="Min. 8 characters"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                      onBlur={e => { 
                        e.target.style.borderColor = 'rgba(255,255,255,0.18)';
                        setPasswordTouched(true);
                      }}
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength Bar (compact single line) */}
                  {password.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', gap: '3px', flex: 1, marginRight: '12px' }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{
                              flex: 1,
                              height: '3px',
                              borderRadius: '2px',
                              background: i <= metCount ? strength.color : 'rgba(255,255,255,0.1)',
                              transition: 'background 0.3s ease'
                            }} />
                          ))}
                        </div>
                        <span style={{ color: strength.color, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                          {strength.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Inline Validation Errors (shown on blur or submit attempt) */}
                  {showPasswordErrors && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {!pwChecks.minLength && (
                        <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>
                          ✕ Must be at least 8 characters
                        </p>
                      )}
                      {!pwChecks.hasUpper && (
                        <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>
                          ✕ Must contain an uppercase letter (A–Z)
                        </p>
                      )}
                      {!pwChecks.hasNumber && (
                        <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>
                          ✕ Must contain a number (0–9)
                        </p>
                      )}
                      {!pwChecks.hasSpecial && (
                        <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>
                          ✕ Must contain a special character (@, #, $, etc.)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={passwordInputWrapper}>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      style={{
                        ...inputStyle,
                        borderColor: confirmPassword && !passwordsMatch ? '#ef4444' : inputStyle.border
                      }}
                      placeholder="Re-enter password"
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                      onBlur={e => e.target.style.borderColor = confirmPassword && !passwordsMatch ? '#ef4444' : 'rgba(255,255,255,0.18)'}
                      required 
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p style={{ 
                      color: passwordsMatch ? '#10b981' : '#ef4444', 
                      fontSize: '0.76rem', 
                      marginTop: '4px', 
                      margin: '4px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {passwordsMatch ? <><CheckCircle2 size={12} /> Passwords match</> : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                {/* Submit Button — White/Grey premium */}
                <button 
                  type="submit" 
                  disabled={isSendingOtp}
                  style={{ 
                    width: '100%', padding: '12px', fontSize: '0.95rem',
                    background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', opacity: isSendingOtp ? 0.7 : 1,
                    transition: 'opacity 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  {isSendingOtp ? 'Sending Verification Code...' : (
                    <>
                      <Shield size={16} />
                      <span>Continue — Verify Email</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              /* OTP Verification Step */
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    style={{ ...inputStyle, fontSize: '1.4rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700 }}
                    placeholder="— — — — — —"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                    autoFocus
                    required 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.82rem' }}>
                  <span style={{ color: '#9ca3af' }}>Didn't receive code?</span>
                  <button 
                    type="button" 
                    onClick={() => handleRequestOtp(email, 'registration')}
                    disabled={isSendingOtp}
                    style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 600, padding: 0, textDecoration: 'underline' }}
                  >
                    {isSendingOtp ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{ 
                    width: '100%', padding: '12px', fontSize: '0.95rem',
                    background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', opacity: isLoading ? 0.7 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {isLoading ? 'Creating Account...' : 'Verify & Create Account'}
                </button>
              </>
            )}
          </form>
        )}

        {/* ========== 3. FORGOT PASSWORD FORM ========== */}
        {authMode === 'forgot' && (
          <form onSubmit={handleResetPasswordSubmit}>
            {!otpSent ? (
              <>
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Registered Email Address</label>
                  <input 
                    type="email" 
                    style={inputStyle}
                    placeholder="Enter your registered email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSendingOtp}
                  style={{ 
                    width: '100%', padding: '12px', fontSize: '0.95rem',
                    background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', opacity: isSendingOtp ? 0.7 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {isSendingOtp ? 'Sending Code...' : 'Send Password Reset Code'}
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    style={{ ...inputStyle, fontSize: '1.3rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700 }}
                    placeholder="— — — — — —"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                    required 
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>New Password</label>
                  <div style={passwordInputWrapper}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      style={inputStyle}
                      placeholder="Min. 8 characters"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.18)';
                        setPasswordTouched(true);
                      }}
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '3px', flex: 1, marginRight: '12px' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '3px', borderRadius: '2px',
                            background: i <= metCount ? strength.color : 'rgba(255,255,255,0.1)',
                            transition: 'background 0.3s ease'
                          }} />
                        ))}
                      </div>
                      <span style={{ color: strength.color, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                        {strength.label}
                      </span>
                    </div>
                  )}

                  {showPasswordErrors && (
                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {!pwChecks.minLength && <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>✕ Must be at least 8 characters</p>}
                      {!pwChecks.hasUpper && <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>✕ Must contain an uppercase letter</p>}
                      {!pwChecks.hasNumber && <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>✕ Must contain a number</p>}
                      {!pwChecks.hasSpecial && <p style={{ color: '#ef4444', fontSize: '0.76rem', margin: 0 }}>✕ Must contain a special character</p>}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={passwordInputWrapper}>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      style={inputStyle}
                      placeholder="Re-enter new password"
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                      required 
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p style={{ color: passwordsMatch ? '#10b981' : '#ef4444', fontSize: '0.76rem', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordsMatch ? <><CheckCircle2 size={12} /> Passwords match</> : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{ 
                    width: '100%', padding: '12px', fontSize: '0.95rem',
                    background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', opacity: isLoading ? 0.7 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
                </button>
              </>
            )}
          </form>
        )}
        
        {/* Toggle between Sign In / Sign Up */}
        {authMode !== 'forgot' && (
          <div style={{ marginTop: 20, textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            {authMode === 'login' ? "New to StandUp+? " : "Already have an account? "}
            <button 
              style={{ background: 'none', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', textDecoration: 'underline' }} 
              onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? "Create account" : "Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
