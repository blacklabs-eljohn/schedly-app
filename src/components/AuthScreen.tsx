import React, { useState } from 'react';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  sendPasswordResetEmail
} from '../services/authService';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  LogIn,
  UserPlus
} from 'lucide-react';
import { triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { showSystemToast } from '../services/notificationService';

type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (mode: AuthMode) => {
    triggerSelectionHaptic();
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInWithEmail(email, password);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message);
      return;
    }

    if (res.user) {
      triggerSuccessHaptic();
      showSystemToast('Welcome Back!', 'Logged in to Schedly.');
      onAuthSuccess(res.user);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message);
      return;
    }

    if (res.user) {
      triggerSuccessHaptic();
      showSystemToast('Account Created!', 'Welcome to Schedly.');
      onAuthSuccess(res.user);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await sendPasswordResetEmail(email);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      triggerSuccessHaptic();
      setSuccessMessage('Password reset link sent! Please check your inbox.');
    }
  };

  return (
    <div className="auth-screen-container">
      {/* Soft Vignette Overlay */}
      <div className="auth-screen-backdrop" />

      <div className="auth-wrapper">
        {/* Brand Header: Freestanding Clean Schedly Logo */}
        <div className="auth-header">
          <img 
            src="/schedly-logo.png" 
            alt="Schedly" 
            className="auth-clean-logo" 
          />

          <h1 className="auth-title">
            {authMode === 'signin' && 'Welcome Back'}
            {authMode === 'signup' && 'Create Your Pass'}
            {authMode === 'forgot_password' && 'Reset Password'}
          </h1>

          <p className="auth-subtitle">
            {authMode === 'signin' && 'Sign in to access your timetable and digital pass'}
            {authMode === 'signup' && 'Instant cloud sync across your devices'}
            {authMode === 'forgot_password' && 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Segmented Switcher for Sign In & Create Account */}
        {authMode !== 'forgot_password' && (
          <div className="auth-segmented-tabs">
            <button 
              type="button"
              className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              <UserPlus size={14} /> Create Account
            </button>
          </div>
        )}

        {/* Form Frosted Card */}
        <div className="auth-card">
          {/* Error Notification */}
          {errorMessage && (
            <div className="ios-conflict-alert" style={{ marginBottom: 14 }}>
              <AlertCircle size={15} className="ios-conflict-icon" />
              <div style={{ fontSize: 12.5, color: 'var(--ios-red)', fontWeight: 600, lineHeight: 1.3 }}>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div style={{ background: 'var(--ios-green-light)', border: '1px solid var(--ios-green)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle2 size={16} color="var(--ios-green)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: 'var(--ios-green)', fontWeight: 700 }}>
                {successMessage}
              </div>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Email Address</label>
                <div className="auth-input-row">
                  <Mail size={16} className="auth-input-icon-left" />
                  <input 
                    type="email"
                    required
                    className="auth-input-field"
                    placeholder="student@nemsu.edu.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="ios-input-label" style={{ margin: 0 }}>Password</label>
                  <button 
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="auth-input-row">
                  <Lock size={16} className="auth-input-icon-left" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="auth-input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button 
                    type="button"
                    className="auth-input-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="ios-btn-primary"
                disabled={isLoading}
                style={{ marginTop: 6 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* 2. SIGN UP FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Full Name</label>
                <div className="auth-input-row">
                  <UserIcon size={16} className="auth-input-icon-left" />
                  <input 
                    type="text"
                    required
                    className="auth-input-field"
                    placeholder="e.g. Ethan Rivera"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Email Address</label>
                <div className="auth-input-row">
                  <Mail size={16} className="auth-input-icon-left" />
                  <input 
                    type="email"
                    required
                    className="auth-input-field"
                    placeholder="student@nemsu.edu.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Password (min 6 chars)</label>
                <div className="auth-input-row">
                  <Lock size={16} className="auth-input-icon-left" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="auth-input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button 
                    type="button"
                    className="auth-input-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Confirm Password</label>
                <div className="auth-input-row">
                  <Lock size={16} className="auth-input-icon-left" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="auth-input-field"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="ios-btn-primary"
                disabled={isLoading}
                style={{ marginTop: 6 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Account Email Address</label>
                <div className="auth-input-row">
                  <Mail size={16} className="auth-input-icon-left" />
                  <input 
                    type="email"
                    required
                    className="auth-input-field"
                    placeholder="student@nemsu.edu.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="ios-btn-primary"
                disabled={isLoading}
                style={{ marginTop: 4 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Link'}
              </button>

              <button 
                type="button"
                className="ios-btn-secondary"
                onClick={() => switchMode('signin')}
                style={{ marginTop: 2 }}
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
