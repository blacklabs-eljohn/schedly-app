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
  Zap
} from 'lucide-react';
import { showSystemToast } from '../services/notificationService';

type AuthViewMode = 'welcome' | 'signin' | 'signup' | 'forgot_password';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  onContinueGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onContinueGuest }) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
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
      showSystemToast('Account Created!', 'Welcome to Schedly.');
      onAuthSuccess(res.user);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await sendPasswordResetEmail(email);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      setSuccessMessage('Password reset link sent! Check your inbox.');
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInWithGoogle();
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message || 'Google Sign In is not enabled on this Supabase project.');
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        backgroundColor: 'var(--ios-bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative'
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div 
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            overflow: 'hidden',
            margin: '0 auto 14px auto',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)'
          }}
        >
          <img 
            src="/schedly-icon.png" 
            alt="Schedly" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--ios-blue-light)', padding: '2px 8px', borderRadius: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ios-blue)', letterSpacing: '0.04em' }}>SCHEDLY CLOUD</span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ios-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          {viewMode === 'welcome' && 'Welcome to Schedly'}
          {viewMode === 'signin' && 'Sign In to Schedly'}
          {viewMode === 'signup' && 'Create Account'}
          {viewMode === 'forgot_password' && 'Reset Password'}
        </h1>

        <p style={{ fontSize: 13.5, color: 'var(--ios-text-muted)', marginTop: 4 }}>
          {viewMode === 'welcome' && 'Your student life, organized.'}
          {viewMode === 'signin' && 'Access your synchronized schedule & digital pass'}
          {viewMode === 'signup' && 'Instant access · Cloud sync across Android and Web'}
          {viewMode === 'forgot_password' && "We'll send a password recovery link to your inbox"}
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="ios-conflict-alert" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} className="ios-conflict-icon" />
          <div style={{ fontSize: 12.5, color: 'var(--ios-red)', fontWeight: 600 }}>
            {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div style={{ background: 'var(--ios-green-light)', border: '1px solid var(--ios-green)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <CheckCircle2 size={16} color="var(--ios-green)" />
          <div style={{ fontSize: 12.5, color: 'var(--ios-green)', fontWeight: 700 }}>
            {successMessage}
          </div>
        </div>
      )}

      {/* VIEW 1: WELCOME SCREEN */}
      {viewMode === 'welcome' && (
        <div className="ios-card" style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              type="button"
              className="ios-btn-primary"
              onClick={() => {
                resetForm();
                setViewMode('signup');
              }}
            >
              <Sparkles size={16} /> Create Free Account
            </button>

            <button 
              type="button"
              className="ios-btn-secondary"
              onClick={() => {
                resetForm();
                setViewMode('signin');
              }}
            >
              Sign In with Email <ArrowRight size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--ios-divider)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--ios-divider)' }} />
            </div>

            <button 
              type="button"
              className="ios-btn-secondary"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {onContinueGuest && (
              <button 
                type="button"
                className="ios-btn-secondary"
                onClick={onContinueGuest}
                style={{ marginTop: 4, background: 'transparent', border: '1px dashed var(--ios-card-border)', color: 'var(--ios-text-muted)', fontSize: 12.5 }}
              >
                <Zap size={14} /> Continue as Guest (Offline Mode)
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SIGN IN SCREEN */}
      {viewMode === 'signin' && (
        <form onSubmit={handleSignIn} className="ios-card" style={{ padding: '24px 20px' }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email"
                required
                className="ios-input"
                placeholder="student@nemsu.edu.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          <div className="ios-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="ios-input-label">Password</label>
              <button 
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode('forgot_password');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="ios-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: 36 }}
              />
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ios-text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              type="submit"
              className="ios-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ios-text-muted)', marginTop: 4 }}>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode('signup');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', fontWeight: 700, cursor: 'pointer' }}
              >
                Create Account
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 3: CREATE ACCOUNT SCREEN (INSTANT) */}
      {viewMode === 'signup' && (
        <form onSubmit={handleSignUp} className="ios-card" style={{ padding: '24px 20px' }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                required
                className="ios-input"
                placeholder="e.g. Ethan Rivera"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <UserIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email"
                required
                className="ios-input"
                placeholder="student@nemsu.edu.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Password (min 6 characters)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="ios-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: 36 }}
              />
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ios-text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="ios-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              type="submit"
              className="ios-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ios-text-muted)', marginTop: 4 }}>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode('signin');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 4: FORGOT PASSWORD */}
      {viewMode === 'forgot_password' && (
        <form onSubmit={handleForgotPassword} className="ios-card" style={{ padding: '24px 20px' }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Account Email</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email"
                required
                className="ios-input"
                placeholder="student@nemsu.edu.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              type="submit"
              className="ios-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <button 
              type="button"
              className="ios-btn-secondary"
              onClick={() => {
                resetForm();
                setViewMode('signin');
              }}
            >
              Back to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AuthScreen;
