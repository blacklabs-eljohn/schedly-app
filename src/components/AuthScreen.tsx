import React, { useState } from 'react';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  sendPasswordResetEmail, 
  signInWithGoogle 
} from '../services/authService';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles,
  Zap,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { triggerSelectionHaptic, triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { showSystemToast } from '../services/notificationService';

type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  onContinueGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onContinueGuest }) => {
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

  const handleGoogleAuth = async () => {
    triggerLightHaptic();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInWithGoogle();
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message || 'Google Sign In is not configured on this Supabase project.');
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Brand Header */}
      <div className="auth-header">
        <div className="auth-logo-glow">
          <img 
            src="/schedly-logo.png" 
            alt="Schedly Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--ios-blue-light)', padding: '3px 9px', borderRadius: 999, marginBottom: 8 }}>
          <ShieldCheck size={12} color="var(--ios-blue)" />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ios-blue)', letterSpacing: '0.04em' }}>
            SCHEDLY CLOUD
          </span>
        </div>

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

      {/* Form Card */}
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
              style={{ marginTop: 4 }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>

            {/* Social Divider */}
            <div className="auth-social-divider">
              <div className="line" />
              <span>OR</span>
              <div className="line" />
            </div>

            <button 
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
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
              style={{ marginTop: 4 }}
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

      {/* Guest Mode Action Pill */}
      {onContinueGuest && authMode !== 'forgot_password' && (
        <button 
          type="button"
          className="auth-guest-btn"
          onClick={() => {
            triggerLightHaptic();
            onContinueGuest();
          }}
        >
          <Zap size={14} color="var(--ios-blue)" />
          <span>Continue as Guest (Offline Mode)</span>
        </button>
      )}
    </div>
  );
};

export default AuthScreen;
