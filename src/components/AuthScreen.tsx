import React, { useState, useRef } from 'react';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  sendPasswordResetEmail
} from '../services/authService';
import { StudentProfile, IDTheme } from '../types';
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
  UserPlus, 
  Shield, 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  Hash,
  Camera,
  Trash2,
  Check,
  Zap
} from 'lucide-react';
import { triggerSelectionHaptic, triggerSuccessHaptic, triggerLightHaptic } from '../services/hapticsService';
import { showSystemToast } from '../services/notificationService';
import { saveStudentProfile } from '../services/storageService';
import { pushProfileToCloud } from '../services/syncService';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

type AuthMode = 'signin' | 'signup_step1' | 'signup_step2' | 'forgot_password';

const POPULAR_PROGRAMS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Civil Engineering',
  'BS Business Administration',
  'BS Nursing',
  'BS Education'
];

const YEAR_LEVELS = ['1ST YEAR', '2ND YEAR', '3RD YEAR', '4TH YEAR', '5TH YEAR'];

const ID_THEMES: { id: IDTheme; name: string; gradient: string; class: string }[] = [
  { id: 'digital-blue', name: 'Navy Gold', gradient: 'linear-gradient(145deg, #0F2042 0%, #1A365D 50%, #0F172A 100%)', class: 'theme-navy-gold' },
  { id: 'silver-specular', name: 'Midnight Slate', gradient: 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)', class: 'theme-midnight-slate' },
  { id: 'lime-tech', name: 'Emerald Campus', gradient: 'linear-gradient(145deg, #064E3B 0%, #065F46 60%, #022C22 100%)', class: 'theme-emerald-campus' },
  { id: 'y2k-pink', name: 'Sunset Coral', gradient: 'linear-gradient(145deg, #9F1239 0%, #BE123C 50%, #4C0519 100%)', class: 'theme-sunset-coral' },
  { id: 'lavender', name: 'Cyber Lavender', gradient: 'linear-gradient(145deg, #4C1D95 0%, #5B21B6 50%, #2E1065 100%)', class: 'theme-cyber-lavender' },
  { id: 'minimal-white', name: 'Clean White', gradient: 'linear-gradient(145deg, #F8FAFC 0%, #E2E8F0 100%)', class: 'theme-clean-white' }
];

function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = typeof error === 'string' ? error : (error.message || '');
  const lower = msg.toLowerCase();

  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please verify your details.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  return msg || 'Authentication failed. Please check your credentials.';
}

interface AuthScreenProps {
  onAuthSuccess: (user: any, initialProfile?: StudentProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  
  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Academic Profile & Digital Pass Setup
  const [schoolName, setSchoolName] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('1ST YEAR');
  const [section, setSection] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<IDTheme>('digital-blue');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (mode: AuthMode) => {
    triggerSelectionHaptic();
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'transparent', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;
    
    if (score === 1 || pwd.length < 6) {
      return { score: 1, label: 'Weak', color: '#EF4444', width: '33%' };
    }
    if (score === 2) {
      return { score: 2, label: 'Fair', color: '#F59E0B', width: '66%' };
    }
    return { score: 3, label: 'Strong', color: '#10B981', width: '100%' };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerSelectionHaptic();
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setProfilePhoto(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    triggerLightHaptic();
    setProfilePhoto('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      setErrorMessage(formatAuthError(res.error));
      return;
    }

    if (res.user) {
      triggerSuccessHaptic();
      showSystemToast('Welcome Back!', 'Logged in to Schedly.');
      onAuthSuccess(res.user);
    }
  };

  const handleStep1Proceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your confirm password field.');
      return;
    }

    triggerSuccessHaptic();
    setErrorMessage(null);
    setAuthMode('signup_step2');
  };

  const executeSignUp = async (skipCustomization: boolean = false) => {
    if (!schoolName.trim()) {
      setErrorMessage('Please enter your university or college campus.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(formatAuthError(res.error));
      return;
    }

    if (res.user) {
      triggerSuccessHaptic();
      showSystemToast('Account Created!', 'Your student pass is ready.');

      // Construct customized student profile (or sensible defaults if skipped)
      const customProfile: StudentProfile = {
        id: res.user.id,
        fullName: fullName.trim() || 'Student Name',
        studentNumber: (!skipCustomization && studentIdNumber.trim()) ? studentIdNumber.trim() : 'Unassigned',
        program: (!skipCustomization && program.trim()) ? program.trim() : 'General Program',
        yearLevel: yearLevel || '1ST YEAR',
        section: (!skipCustomization && section.trim()) ? section.trim() : '1A',
        schoolName: schoolName.trim(),
        academicYear: '2026–2027',
        profilePhoto: (!skipCustomization && profilePhoto) ? profilePhoto : undefined,
        selectedTheme: selectedTheme || 'digital-blue',
        accentColor: '#2563EB',
        bloodType: 'O+'
      };

      saveStudentProfile(customProfile, res.user.id);
      try {
        await pushProfileToCloud(res.user.id, customProfile);
      } catch (err) {
        console.warn('Profile push warning on signup:', err);
      }

      onAuthSuccess(res.user, customProfile);
    }
  };

  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSignUp(false);
  };

  const handleSkipAndSignUp = async () => {
    triggerLightHaptic();
    await executeSignUp(true);
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
      setErrorMessage(formatAuthError(res.error));
    } else {
      triggerSuccessHaptic();
      setSuccessMessage('Password reset link sent! Please check your inbox.');
    }
  };

  const currentThemeObj = ID_THEMES.find(t => t.id === selectedTheme) || ID_THEMES[0];

  return (
    <div className="auth-screen-container">
      {/* Soft Vignette Overlay */}
      <div className="auth-screen-backdrop" />

      <div className="auth-wrapper" style={{ maxWidth: authMode === 'signup_step2' ? 460 : 440 }}>
        {/* Brand Header: Freestanding Clean Schedly Logo */}
        <div className="auth-header">
          <img 
            src="/schedly-logo.png" 
            alt="Schedly" 
            className="auth-clean-logo" 
          />

          <h1 className="auth-title">
            {authMode === 'signin' && 'Welcome Back'}
            {authMode === 'signup_step1' && 'Create Your Account'}
            {authMode === 'signup_step2' && 'Setup Digital Student ID'}
            {authMode === 'forgot_password' && 'Reset Password'}
          </h1>

          <p className="auth-subtitle">
            {authMode === 'signin' && 'Sign in to access your timetable and digital pass'}
            {authMode === 'signup_step1' && 'Step 1 of 2 · Account Credentials'}
            {authMode === 'signup_step2' && 'Step 2 of 2 · Customize your campus identity pass'}
            {authMode === 'forgot_password' && 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Segmented Switcher for Sign In & Create Account */}
        {authMode !== 'forgot_password' && authMode !== 'signup_step2' && (
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
              className={`auth-tab-btn ${authMode === 'signup_step1' ? 'active' : ''}`}
              onClick={() => switchMode('signup_step1')}
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

          {/* 2. SIGN UP STEP 1: CREDENTIALS */}
          {authMode === 'signup_step1' && (
            <form onSubmit={handleStep1Proceed} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="ios-input-label" style={{ margin: 0 }}>Password (min 6 chars)</label>
                  {password && (
                    <span style={{ 
                      fontSize: 10.5, 
                      fontWeight: 700, 
                      color: getPasswordStrength(password).color 
                    }}>
                      {getPasswordStrength(password).label}
                    </span>
                  )}
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

                {/* Live Password Strength Meter Bar */}
                {password.length > 0 && (
                  <div style={{ 
                    marginTop: 5, 
                    height: 3, 
                    background: 'var(--ios-card-border)', 
                    borderRadius: 2, 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: getPasswordStrength(password).width, 
                      background: getPasswordStrength(password).color, 
                      transition: 'all 0.3s ease' 
                    }} />
                  </div>
                )}
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Confirm Password</label>
                <div className="auth-input-row">
                  <Lock size={16} className="auth-input-icon-left" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="auth-input-field"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button 
                    type="button"
                    className="auth-input-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Real-time Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 5, 
                    marginTop: 4, 
                    fontSize: 11, 
                    fontWeight: 600,
                    color: password === confirmPassword ? '#10B981' : 'var(--ios-red)'
                  }}>
                    {password === confirmPassword ? (
                      <>
                        <Check size={12} strokeWidth={3} />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <span>Passwords do not match yet</span>
                    )}
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="ios-btn-primary"
                style={{ marginTop: 6 }}
              >
                <span>Continue to Digital Pass Setup</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* 3. SIGN UP STEP 2: ONBOARDING DIGITAL STUDENT ID CUSTOMIZER */}
          {authMode === 'signup_step2' && (
            <form onSubmit={handleCompleteSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Real-time Live Mini Digital ID Preview */}
              <div 
                className={`digital-id-face ${currentThemeObj.class}`}
                style={{
                  padding: '14px 16px',
                  borderRadius: 18,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Holographic Metallic Shimmer Sweep */}
                <div className="id-card-shimmer-sweep" aria-hidden="true" />

                {/* Top Row: School Branding */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em' }}>
                    <Shield size={13} color="#F59E0B" />
                    <span>{(schoolName.trim() || 'CAMPUS').toUpperCase()} · STUDENT PASS</span>
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>A.Y. 2026–2027</span>
                </div>

                {/* Body Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    {profilePhoto ? (
                      <img 
                        src={profilePhoto} 
                        alt="Student" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      '🎓'
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fullName.trim() || 'Student Name'}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                      {program.trim() || 'Degree Course / Program'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 9.5, fontWeight: 700, opacity: 0.75 }}>
                      <span>{yearLevel}</span>
                      <span>•</span>
                      <span>SEC: {section.trim() || 'Pending'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Barcode */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--ios-font-mono)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    ID: {studentIdNumber.trim() || '2026-XXXXX'}
                  </span>
                  <div style={{ fontSize: 8.5, letterSpacing: '0.12em', opacity: 0.6, fontWeight: 800 }}>
                    || | ||| | || |||| | ||
                  </div>
                </div>
              </div>

              {/* Photo Upload & Quick Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handlePhotoUpload} 
                />
                <button
                  type="button"
                  className="ios-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    fontSize: 12, 
                    padding: '6px 12px', 
                    height: 32, 
                    width: 'auto', 
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Camera size={13} />
                  <span>{profilePhoto ? 'Change Photo' : 'Upload ID Photo (Optional)'}</span>
                </button>

                {profilePhoto && (
                  <button
                    type="button"
                    className="ios-btn-secondary"
                    onClick={handleRemovePhoto}
                    style={{ 
                      fontSize: 12, 
                      padding: '6px 10px', 
                      height: 32, 
                      color: 'var(--ios-red)', 
                      width: 'auto', 
                      margin: 0 
                    }}
                    title="Remove Photo"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Input Fields */}
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">
                  University / College Campus <span style={{ color: 'var(--ios-red, #EF4444)', fontWeight: 800 }}>*</span>
                </label>
                <div className="auth-input-row">
                  <Building2 size={16} className="auth-input-icon-left" />
                  <input 
                    type="text"
                    required
                    className="auth-input-field"
                    placeholder="e.g. NEMSU, UST, DLSU"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                  />
                </div>
              </div>

              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Degree Course / Program</label>
                <div className="auth-input-row">
                  <GraduationCap size={16} className="auth-input-icon-left" />
                  <input 
                    type="text"
                    className="auth-input-field"
                    placeholder="e.g. BS Computer Science"
                    value={program}
                    onChange={e => setProgram(e.target.value)}
                  />
                </div>

                {/* Quick Selection Chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {POPULAR_PROGRAMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setProgram(p);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        fontSize: 10.5,
                        fontWeight: 600,
                        border: '1px solid var(--ios-card-border)',
                        background: program === p ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                        color: program === p ? '#FFFFFF' : 'var(--ios-text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.replace('BS ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Level & Section Row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="ios-input-group" style={{ margin: 0, flex: 1 }}>
                  <label className="ios-input-label">Year Level</label>
                  <select 
                    className="auth-input-field"
                    style={{ padding: '0 12px' }}
                    value={yearLevel}
                    onChange={e => setYearLevel(e.target.value)}
                  >
                    {YEAR_LEVELS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="ios-input-group" style={{ margin: 0, flex: 1 }}>
                  <label className="ios-input-label">Section Code</label>
                  <input 
                    type="text"
                    className="auth-input-field"
                    style={{ padding: '0 14px' }}
                    placeholder="e.g. 1A or CS-1C"
                    value={section}
                    onChange={e => setSection(e.target.value)}
                  />
                </div>
              </div>

              {/* Student ID Number */}
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Student ID Number (Optional)</label>
                <div className="auth-input-row">
                  <Hash size={16} className="auth-input-icon-left" />
                  <input 
                    type="text"
                    className="auth-input-field"
                    placeholder="e.g. 2026-10492"
                    value={studentIdNumber}
                    onChange={e => setStudentIdNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Pass Theme Picker */}
              <div className="ios-input-group" style={{ margin: 0 }}>
                <label className="ios-input-label">Digital Pass Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {ID_THEMES.map(themeItem => (
                    <button
                      key={themeItem.id}
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setSelectedTheme(themeItem.id);
                      }}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 10,
                        border: selectedTheme === themeItem.id ? '2px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                        background: themeItem.gradient,
                        color: themeItem.id === 'minimal-white' ? '#0F172A' : '#FFFFFF',
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedTheme === themeItem.id ? '0 0 0 2px var(--ios-blue-light)' : 'none'
                      }}
                    >
                      {themeItem.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <button 
                type="submit"
                className="ios-btn-primary"
                disabled={isLoading}
                style={{ marginTop: 6 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    <Sparkles size={16} />
                    <span>Complete Setup & Launch Schedly</span>
                  </>
                )}
              </button>

              {/* Fast Path: Skip customization and launch immediately */}
              <button 
                type="button"
                className="ios-btn-secondary"
                disabled={isLoading}
                onClick={handleSkipAndSignUp}
                style={{ 
                  margin: 0, 
                  padding: '9px 14px', 
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Zap size={14} color="#F59E0B" />
                <span>Skip for now & setup pass later</span>
              </button>

              <button 
                type="button"
                className="ios-btn-secondary"
                onClick={() => setAuthMode('signup_step1')}
                style={{ margin: 0, padding: '9px 14px', fontSize: 12.5 }}
              >
                <ArrowLeft size={14} /> Back to Account Details
              </button>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                  By completing setup, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setIsPrivacyOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--ios-blue)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Privacy Policy & Rules
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* 4. FORGOT PASSWORD FORM */}
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

      {/* Privacy Policy & Rules Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        isConsentMode={false}
      />
    </div>
  );
};

export default AuthScreen;
