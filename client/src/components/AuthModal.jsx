import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, Mail, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal() {
  const { 
    isAuthModalOpen, setAuthModalOpen, 
    login, register, loginWithGoogle, 
    sendOtp, verifyOtp, resetPassword 
  } = useAuth();

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

  // Validation tracking
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
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

  // ---- Brand colors ----
  const RED = '#e50914';
  const RED_DIM = 'rgba(229, 9, 20, 0.15)';
  const RED_BORDER = 'rgba(229, 9, 20, 0.4)';
  const GREEN = '#10b981';
  const ERROR_RED = '#f87171';

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

  // ---- Password Strength ----
  const pwChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*#?&^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password)
  };
  const metCount = Object.values(pwChecks).filter(Boolean).length;
  const allPasswordReqsMet = metCount === 4;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const getStrength = () => {
    if (password.length === 0) return { label: '', color: '#4b5563', percent: 0 };
    if (metCount <= 1) return { label: 'Weak', color: '#ef4444', percent: 25 };
    if (metCount === 2) return { label: 'Fair', color: '#f59e0b', percent: 50 };
    if (metCount === 3) return { label: 'Good', color: '#3b82f6', percent: 75 };
    return { label: 'Strong', color: GREEN, percent: 100 };
  };
  const strength = getStrength();

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
          setOtpSuccessMessage(`OTP sent! (Code: ${res.debugOtp})`);
        } else {
          setOtpSuccessMessage(`6-digit verification code sent to ${targetEmail.trim().toLowerCase()}`);
        }
      } else {
        triggerError(res.error || 'Failed to send verification code.');
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
      triggerError('Display name must be at least 2 characters.');
      return;
    }

    if (!isClientEmailValid(email)) {
      triggerError('Please enter a valid email address.');
      return;
    }

    if (!allPasswordReqsMet) {
      triggerError('Your password does not meet the requirements.');
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
      triggerError('Please enter the 6-digit verification code.');
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
      triggerError('Please enter the 6-digit verification code.');
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

  // ---- Shared Styles ----
  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '0.92rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '0.84rem',
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
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  };

  // Primary button style (red brand)
  const primaryBtnStyle = {
    width: '100%',
    padding: '13px',
    fontSize: '0.95rem',
    background: RED,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  // Strength bar component
  const StrengthBar = () => password.length > 0 ? (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '3px', flex: 1, marginRight: '12px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= metCount ? strength.color : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s ease'
            }} />
          ))}
        </div>
        <span style={{ color: strength.color, fontSize: '0.73rem', fontWeight: 600, flexShrink: 0 }}>
          {strength.label}
        </span>
      </div>
    </div>
  ) : null;

  // Inline password errors
  const PasswordErrors = () => showPasswordErrors ? (
    <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {!pwChecks.minLength && <p style={{ color: ERROR_RED, fontSize: '0.74rem', margin: 0 }}>✕ At least 8 characters</p>}
      {!pwChecks.hasUpper && <p style={{ color: ERROR_RED, fontSize: '0.74rem', margin: 0 }}>✕ One uppercase letter (A–Z)</p>}
      {!pwChecks.hasNumber && <p style={{ color: ERROR_RED, fontSize: '0.74rem', margin: 0 }}>✕ One number (0–9)</p>}
      {!pwChecks.hasSpecial && <p style={{ color: ERROR_RED, fontSize: '0.74rem', margin: 0 }}>✕ One special character (@, #, $ etc.)</p>}
    </div>
  ) : null;

  // ---- Render ----

  return (
    <div className="modal-backdrop" id="auth-modal" onClick={() => setAuthModalOpen(false)}>
      <div 
        className={`auth-modal ${shaking ? 'auth-shake' : ''}`} 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '420px', width: '92%' }}
      >
        <button className="close-btn" onClick={() => setAuthModalOpen(false)} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          {authMode === 'forgot' && (
            <button 
              onClick={() => switchMode('login')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', marginBottom: '12px', padding: 0 }}
            >
              <ArrowLeft size={15} /> Back to Sign In
            </button>
          )}

          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            {authMode === 'login' && 'Sign In'}
            {authMode === 'register' && (otpSent ? 'Verify Your Email' : 'Create Account')}
            {authMode === 'forgot' && (otpSent ? 'Set New Password' : 'Reset Password')}
          </h2>

          <p style={{ color: '#9ca3af', fontSize: '0.84rem', margin: 0, lineHeight: '1.4' }}>
            {authMode === 'login' && 'Access your personalized comedy feed and watchlist.'}
            {authMode === 'register' && (
              otpSent 
                ? <span>Enter the 6-digit code sent to <span style={{ color: RED, fontWeight: 600 }}>{email}</span></span> 
                : 'Join StandUp+ — curated stand-up specials, just for you.'
            )}
            {authMode === 'forgot' && (
              otpSent 
                ? <span>Code sent to <span style={{ color: RED, fontWeight: 600 }}>{email}</span>. Set your new password.</span>
                : 'Enter your email to receive a verification code.'
            )}
          </p>
        </div>
        
        {/* Error Banner */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: ERROR_RED, padding: '10px 14px', borderRadius: '8px', marginBottom: 14, fontSize: '0.84rem', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Success Banner */}
        {otpSuccessMessage && (
          <div style={{ background: RED_DIM, border: `1px solid ${RED_BORDER}`, color: '#ffffff', padding: '12px 14px', borderRadius: '8px', marginBottom: 14, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: RED, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={14} color="#fff" />
            </div>
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {/* Google Login */}
        {authMode !== 'forgot' && !otpSent && Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID && !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('dummy') && import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <GoogleLogin 
                onSuccess={async (credentialResponse) => {
                  const result = await loginWithGoogle(credentialResponse.credential);
                  if (!result.success) triggerError(result.error);
                }}
                onError={() => triggerError('Google Login failed. Please try email.')}
                theme="filled_black"
                shape="pill"
                width="100%"
              />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '14px', color: '#6b7280', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
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
                onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                required 
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => switchMode('forgot')}
                  style={{ background: 'none', border: 'none', color: RED, fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 500 }}
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
                  onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ ...primaryBtnStyle, marginTop: 18, opacity: isLoading ? 0.7 : 1 }}
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
                    onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
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
                      borderColor: hasAttemptedSubmit && email && !isClientEmailValid(email) ? ERROR_RED : undefined
                    }}
                    placeholder="you@example.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                    onBlur={e => e.target.style.borderColor = hasAttemptedSubmit && !isClientEmailValid(email) ? ERROR_RED : 'rgba(255,255,255,0.15)'}
                    required 
                  />
                  {hasAttemptedSubmit && email && !isClientEmailValid(email) && (
                    <p style={{ color: ERROR_RED, fontSize: '0.76rem', margin: '4px 0 0' }}>
                      Please enter a valid email address
                    </p>
                  )}
                  <p style={{ color: '#6b7280', fontSize: '0.73rem', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={11} color={RED} /> We'll send a verification code to confirm
                  </p>
                </div>

                {/* Mobile Number */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>
                    Mobile Number <span style={{ color: '#6b7280', fontSize: '0.73rem', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                      ...inputStyle, 
                      width: '56px', 
                      flexShrink: 0, 
                      textAlign: 'center', 
                      color: '#9ca3af',
                      cursor: 'default',
                      padding: '12px 6px',
                      fontSize: '0.85rem'
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
                      onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
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
                      onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                      onBlur={e => { 
                        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                        setPasswordTouched(true);
                      }}
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <StrengthBar />
                  <PasswordErrors />
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={passwordInputWrapper}>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      style={{
                        ...inputStyle,
                        borderColor: confirmPassword && !passwordsMatch ? ERROR_RED : undefined
                      }}
                      placeholder="Re-enter password"
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                      onBlur={e => e.target.style.borderColor = confirmPassword && !passwordsMatch ? ERROR_RED : 'rgba(255,255,255,0.15)'}
                      required 
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle}>
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p style={{ 
                      color: passwordsMatch ? GREEN : ERROR_RED, 
                      fontSize: '0.74rem', 
                      margin: '4px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {passwordsMatch ? <><CheckCircle2 size={12} /> Passwords match</> : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={isSendingOtp}
                  style={{ ...primaryBtnStyle, opacity: isSendingOtp ? 0.7 : 1 }}
                >
                  {isSendingOtp ? (
                    'Sending Verification Code...'
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Trust footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', color: '#6b7280', fontSize: '0.73rem' }}>
                  <Shield size={12} color={RED} />
                  <span>Email verified via OTP • Welcome email on signup</span>
                </div>
              </>
            ) : (
              /* OTP Verification Step */
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    style={{ ...inputStyle, fontSize: '1.4rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700, borderColor: 'rgba(229, 9, 20, 0.3)' }}
                    placeholder="— — — — — —"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    onFocus={e => e.target.style.borderColor = RED}
                    onBlur={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.3)'}
                    autoFocus
                    required 
                  />
                  <p style={{ color: '#6b7280', fontSize: '0.73rem', margin: '6px 0 0', textAlign: 'center' }}>
                    Check your inbox and spam folder
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.82rem' }}>
                  <span style={{ color: '#9ca3af' }}>Didn't receive it?</span>
                  <button 
                    type="button" 
                    onClick={() => handleRequestOtp(email, 'registration')}
                    disabled={isSendingOtp}
                    style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    {isSendingOtp ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{ ...primaryBtnStyle, opacity: isLoading ? 0.7 : 1 }}
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
                    onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSendingOtp}
                  style={{ ...primaryBtnStyle, opacity: isSendingOtp ? 0.7 : 1 }}
                >
                  {isSendingOtp ? 'Sending Code...' : (
                    <>
                      <Mail size={16} />
                      <span>Send Reset Code</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    style={{ ...inputStyle, fontSize: '1.3rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700, borderColor: 'rgba(229, 9, 20, 0.3)' }}
                    placeholder="— — — — — —"
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    onFocus={e => e.target.style.borderColor = RED}
                    onBlur={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.3)'}
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
                      onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                        setPasswordTouched(true);
                      }}
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <StrengthBar />
                  <PasswordErrors />
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
                      onFocus={e => e.target.style.borderColor = 'rgba(229, 9, 20, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                      required 
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle}>
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p style={{ color: passwordsMatch ? GREEN : ERROR_RED, fontSize: '0.74rem', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordsMatch ? <><CheckCircle2 size={12} /> Passwords match</> : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{ ...primaryBtnStyle, opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
                </button>
              </>
            )}
          </form>
        )}
        
        {/* Toggle between Sign In / Sign Up */}
        {authMode !== 'forgot' && (
          <div style={{ marginTop: 18, textAlign: 'center', color: '#9ca3af', fontSize: '0.84rem' }}>
            {authMode === 'login' ? "New to StandUp+? " : "Already have an account? "}
            <button 
              style={{ background: 'none', color: RED, fontWeight: 600, border: 'none', cursor: 'pointer' }} 
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
