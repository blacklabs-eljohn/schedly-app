import { useState, useEffect, useCallback } from 'react';
import { Course, NotificationSettings, StudentProfile, DayOfWeek } from './types';
import { User } from '@supabase/supabase-js';
import { 
  getStoredCourses, 
  saveCourses, 
  getStoredSettings, 
  saveSettings, 
  getStoredStudentProfile, 
  saveStudentProfile, 
  resetScheduleData,
  createBlankProfile
} from './services/storageService';
import { detectScheduleConflicts, getDayScheduleInfo, formatTime12H, timeToMinutes, getSubjectCardGradient } from './services/scheduleEngine';
import { scheduleClassReminders, showSystemToast, triggerTestClassNotification } from './services/notificationService';
import { onAuthStateChange, getCurrentUser, signOutUser } from './services/authService';
import { 
  pullCloudData, 
  pushCoursesToCloud, 
  pushProfileToCloud, 
  pushSettingsToCloud, 
  uploadAvatarToStorage, 
  isNetworkOnline 
} from './services/syncService';

import { BottomTabBar, TabType } from './components/BottomTabBar';
import { DigitalIDCard } from './components/DigitalIDCard';
import { NextClassHero } from './components/NextClassHero';
import { TimelineSchedule } from './components/TimelineSchedule';
import { ConflictAlertBanner } from './components/ConflictAlertBanner';
import { SubjectsList } from './components/SubjectsList';
import { SettingsView } from './components/SettingsView';
import { ScannerModal } from './components/ScannerModal';
import { CorrectionScreen } from './components/CorrectionScreen';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { InstructorDetailModal } from './components/InstructorDetailModal';
import { FullscreenIDModal } from './components/FullscreenIDModal';
import { EditIDModal } from './components/EditIDModal';
import { SplashScreen } from './components/SplashScreen';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from './services/hapticsService';
import { AuthScreen } from './components/AuthScreen';
import { syncWidgetsData } from './services/widgetBridge';

import { Camera, ArrowRight, MapPin, User as UserIcon, Sun, Moon, Sparkles, CheckCircle2, Clock, CalendarDays, Edit3, ChevronUp, Code2, Atom, Cpu, BookOpen, GraduationCap } from 'lucide-react';
import './styles/apple-design-system.css';

const VIBRANT_PALETTES = [
  'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', // Electric Indigo
  'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Ocean Blue
  'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald Green
  'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', // Sunset Rose
  'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Royal Purple
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber Gold
  'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', // Cyber Teal
  'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'  // Neon Pink
];

const getSubjectIcon = (code: string, name: string) => {
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('cs') || text.includes('it') || text.includes('comp') || text.includes('prog') || text.includes('struct')) {
    return <Code2 size={17} color="#FFFFFF" />;
  }
  if (text.includes('phys') || text.includes('chem') || text.includes('sci') || text.includes('bio')) {
    return <Atom size={17} color="#FFFFFF" />;
  }
  if (text.includes('eng') || text.includes('tech') || text.includes('circ')) {
    return <Cpu size={17} color="#FFFFFF" />;
  }
  if (text.includes('math') || text.includes('calc') || text.includes('stat') || text.includes('alg')) {
    return <BookOpen size={17} color="#FFFFFF" />;
  }
  return <GraduationCap size={17} color="#FFFFFF" />;
};

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isOnline, setIsOnline] = useState(isNetworkOnline());
  const [isSyncing, setIsSyncing] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => getStoredSettings());
  const [profile, setProfile] = useState<StudentProfile>(() => createBlankProfile());
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<DayOfWeek>('Mon');

  // Modals & Flows
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isEditIDOpen, setIsEditIDOpen] = useState(false);
  const [isFullscreenIDOpen, setIsFullscreenIDOpen] = useState(false);

  const [reviewCourses, setReviewCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync notifications
  useEffect(() => {
    scheduleClassReminders(courses, settings);
  }, [courses, settings]);

  // Cloud Sync Handler
  const handleTriggerCloudSync = useCallback(async (userId: string, defaultName?: string, showToast = true) => {
    if (!isNetworkOnline()) {
      setCourses(getStoredCourses(userId));
      setProfile(getStoredStudentProfile(userId, defaultName));
      setSettings(getStoredSettings(userId));
      return;
    }

    setIsSyncing(true);
    try {
      const cloudData = await pullCloudData(userId, defaultName);
      setCourses(cloudData.courses);
      setProfile(cloudData.profile);
      setSettings(cloudData.settings);
      setTheme(cloudData.settings.appearanceMode === 'dark' ? 'dark' : 'light');

      if (showToast) {
        showSystemToast('Cloud Synced', 'Your timetable & pass are up to date.');
      }
    } catch (err) {
      console.error('Cloud sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Network Online/Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser) {
        handleTriggerCloudSync(currentUser.id, currentUser.user_metadata?.full_name, false);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, handleTriggerCloudSync]);

  // Supabase Auth State Listener
  useEffect(() => {
    let mounted = true;

    getCurrentUser().then((user) => {
      if (!mounted) return;
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (user) {
        handleTriggerCloudSync(user.id, user.user_metadata?.full_name, false);
      } else {
        // Guest mode initial load
        setCourses(getStoredCourses('guest'));
        setProfile(getStoredStudentProfile('guest'));
        setSettings(getStoredSettings('guest'));
      }
    });

    const { data: authListener } = onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user || null;
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (user) {
        handleTriggerCloudSync(user.id, user.user_metadata?.full_name, false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [handleTriggerCloudSync]);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const updated = { ...settings, appearanceMode: next as 'light' | 'dark' };
    setSettings(updated);
    saveSettings(updated, currentUser?.id);

    if (currentUser) {
      pushSettingsToCloud(currentUser.id, updated);
    }
  };

  const handleUpdateSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, currentUser?.id);

    if (currentUser) {
      pushSettingsToCloud(currentUser.id, newSettings);
    }
  };

  const handleSaveProfile = async (updatedProfile: StudentProfile) => {
    let finalProfile = { ...updatedProfile };

    // If there's a base64 photo, upload to Supabase storage when online
    if (
      currentUser && 
      isOnline && 
      finalProfile.profilePhoto && 
      finalProfile.profilePhoto.startsWith('data:image')
    ) {
      const publicUrl = await uploadAvatarToStorage(currentUser.id, finalProfile.profilePhoto);
      if (publicUrl) {
        finalProfile.profilePhoto = publicUrl;
      }
    }

    setProfile(finalProfile);
    saveStudentProfile(finalProfile, currentUser?.id);
    setIsEditIDOpen(false);
    showSystemToast('ID Updated', 'Your Digital Student ID has been saved.');

    if (currentUser) {
      pushProfileToCloud(currentUser.id, finalProfile);
    }
  };

  const isCorruptedName = (name?: string) => {
    if (!name) return true;
    const upper = name.toUpperCase().trim();
    return upper.includes('MIDDLE NAME') || upper.includes('SEX FIRST') || upper.includes('FIRST NAME') || upper === 'STUDENT NAME' || upper === 'NEW STUDENT';
  };

  // Self-heal corrupted student name from previous OCR bug if present
  useEffect(() => {
    if (profile.fullName && isCorruptedName(profile.fullName)) {
      const cleanName = currentUser?.user_metadata?.full_name || 'Student';
      const healed = { ...profile, fullName: cleanName };
      setProfile(healed);
      saveStudentProfile(healed, currentUser?.id);
      if (currentUser) {
        pushProfileToCloud(currentUser.id, healed);
      }
    }
  }, [profile, currentUser]);

  const handleScanComplete = (extractedCourses: Course[], extractedProfile?: Partial<StudentProfile>) => {
    setIsScannerOpen(false);
    setReviewCourses(extractedCourses);
    setIsCorrectionOpen(true);

    if (extractedProfile && Object.keys(extractedProfile).length > 0) {
      const cleanScannedName = extractedProfile.fullName && !isCorruptedName(extractedProfile.fullName)
        ? extractedProfile.fullName
        : profile.fullName && !isCorruptedName(profile.fullName)
        ? profile.fullName
        : currentUser?.user_metadata?.full_name || 'Student';

      const merged: StudentProfile = {
        ...profile,
        fullName: cleanScannedName,
        studentNumber: extractedProfile.studentNumber || profile.studentNumber,
        program: extractedProfile.program || profile.program,
        yearLevel: extractedProfile.yearLevel || profile.yearLevel,
        schoolName: extractedProfile.schoolName || profile.schoolName,
        academicYear: extractedProfile.academicYear || profile.academicYear
      };
      setProfile(merged);
      saveStudentProfile(merged, currentUser?.id);

      if (currentUser) {
        pushProfileToCloud(currentUser.id, merged);
      }
    }
  };

  const handleSaveSchedule = (finalCourses: Course[], updatedProfile?: Partial<StudentProfile>) => {
    setCourses(finalCourses);
    saveCourses(finalCourses, currentUser?.id);

    if (updatedProfile && Object.keys(updatedProfile).length > 0) {
      const merged: StudentProfile = {
        ...profile,
        ...updatedProfile,
        fullName: updatedProfile.fullName && !isCorruptedName(updatedProfile.fullName)
          ? updatedProfile.fullName
          : profile.fullName
      };
      setProfile(merged);
      saveStudentProfile(merged, currentUser?.id);

      if (currentUser) {
        pushProfileToCloud(currentUser.id, merged);
      }
    }

    setIsCorrectionOpen(false);
    setActiveTab('home');
    showSystemToast('Schedule Updated', `${finalCourses.length} classes added to timetable.`);

    if (currentUser) {
      pushCoursesToCloud(currentUser.id, finalCourses);
    }
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    const updatedList = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id);
    setSelectedCourse(updatedCourse);
    showSystemToast('Subject Updated', `${updatedCourse.courseCode} has been saved.`);

    if (currentUser) {
      pushCoursesToCloud(currentUser.id, updatedList);
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    const updatedList = courses.filter(c => c.id !== courseId);
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id);
    setSelectedCourse(null);
    showSystemToast('Subject Removed', 'The course was removed from your timetable.');

    if (currentUser) {
      pushCoursesToCloud(currentUser.id, updatedList);
    }
  };

  const handleAddCourse = (newCourse: Course) => {
    if (!newCourse.courseCode.trim()) {
      showSystemToast('Error', 'Please enter a course code.');
      return;
    }
    const updatedList = [...courses, newCourse];
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id);
    showSystemToast('Subject Added', `${newCourse.courseCode} added to your schedule.`);

    if (currentUser) {
      pushCoursesToCloud(currentUser.id, updatedList);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to clear all schedule data?')) {
      resetScheduleData(currentUser?.id);
      setCourses([]);
      showSystemToast('Schedule Reset', 'All classes removed.');

      if (currentUser) {
        pushCoursesToCloud(currentUser.id, []);
      }
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setIsGuestMode(false);
    setCourses([]);
    setProfile(createBlankProfile());
    showSystemToast('Signed Out', 'You have been logged out.');
  };

  const handleTestNotification = async () => {
    await triggerTestClassNotification(settings.reminderMinutes || 15);
  };

  const handleViewInTimetable = (day: string) => {
    setSelectedTimetableDay(day as DayOfWeek);
    setActiveTab('schedule');
  };

  const conflicts = detectScheduleConflicts(courses);
  const todayDayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]) as DayOfWeek;
  const todayInfo = getDayScheduleInfo(courses, todayDayName || 'Mon');
  const firstName = profile.fullName ? profile.fullName.split(' ')[0] : 'Student';

  // Sync latest schedule, up next, and profile to Android Home Screen Widgets
  useEffect(() => {
    syncWidgetsData(courses, profile, todayDayName);
  }, [courses, profile, todayDayName]);

  // Automatically maintain scheduled local push notifications for all classes
  useEffect(() => {
    scheduleClassReminders(courses, settings);
  }, [courses, settings]);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const nowMins = today.getHours() * 60 + today.getMinutes();

  return (
    <div id="root">
      {/* 3-Step Animated Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Authentication & Onboarding Screen (Rendered if not logged in) */}
      {!showSplash && !isAuthChecking && !currentUser ? (
        <AuthScreen 
          onAuthSuccess={(authenticatedUser, initialProfile) => {
            setCurrentUser(authenticatedUser);
            setIsGuestMode(false);
            if (initialProfile) {
              setProfile(initialProfile);
              saveStudentProfile(initialProfile, authenticatedUser.id);
              pushProfileToCloud(authenticatedUser.id, initialProfile);
            }
            handleTriggerCloudSync(authenticatedUser.id, initialProfile?.fullName || authenticatedUser.user_metadata?.full_name, true);
          }}
        />
      ) : (
        <>
          {/* Top Utility Header Bar (Editorial Minimal Style Matching Mockup) */}
          {activeTab === 'home' && (
            <header className="top-utility-row">
              <div className="top-utility-left">
                <span className="top-utility-subheading">
                  {today.getHours() < 12 ? 'Good Morning' : today.getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                </span>
                <h1 className="top-utility-greeting">
                  {profile.fullName || 'New Student'}
                </h1>
              </div>

              <div className="top-utility-right">
                <div 
                  className="home-logo-circle"
                  onClick={handleToggleTheme}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src="/schedly-logo.png" 
                    alt="Schedly" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </header>
          )}

          {/* Main Content Area based on Active Tab */}
          {isCorrectionOpen ? (
            <CorrectionScreen 
              courses={reviewCourses}
              profile={profile}
              onSaveSchedule={handleSaveSchedule}
              onCancel={() => setIsCorrectionOpen(false)}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <main>
                  {/* DIGITAL STUDENT ID CARD HERO AT THE VERY TOP (WITH 3D FLIP) */}
                  <div className="ios-section" style={{ paddingBottom: 0, paddingTop: 4 }}>
                    {/* Conflict Alerts if any */}
                    <ConflictAlertBanner conflicts={conflicts} />

                    <DigitalIDCard 
                      profile={profile}
                      onEditClick={() => setIsEditIDOpen(true)}
                      onCardClick={() => setIsFullscreenIDOpen(true)}
                    />

                    {/* AMIE & CRON INSPIRED UPCOMING CLASS HERO */}
                    <NextClassHero 
                      courses={courses}
                      onSelectCourse={setSelectedCourse}
                      onOpenScanner={() => setIsScannerOpen(true)}
                    />

                    {/* Onboarding Welcome Card if no courses */}
                    {courses.length === 0 && (
                      <div className="ios-card" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 14 }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: 'var(--ios-blue-light)',
                          color: 'var(--ios-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px auto'
                        }}>
                          <Sparkles size={24} />
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Welcome to Schedly</h3>
                        <p style={{ fontSize: 13, color: 'var(--ios-text-muted)', marginBottom: 16 }}>
                          Upload or scan your Certificate of Registration (COR) to generate your smart student timetable.
                        </p>
                        <button 
                          className="ios-btn-primary" 
                          onClick={() => setIsScannerOpen(true)}
                        >
                          <Camera size={16} /> Scan / Upload COR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Today's Classes List (Stacked Cards) */}
                  {courses.length > 0 && (
                    <div className="ios-section" style={{ paddingBottom: 90, paddingTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div className="ios-section-header" style={{ margin: 0 }}>
                          Classes Today ({todayInfo.courses.length})
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setSelectedTimetableDay(todayDayName);
                            setActiveTab('schedule');
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          View Timetable <ArrowRight size={13} />
                        </button>
                      </div>

                      {todayInfo.courses.length === 0 ? (
                        <div className="ios-card" style={{ color: 'var(--ios-text-muted)', textAlign: 'center', padding: '24px 16px', fontSize: 13 }}>
                          No classes scheduled for today ({todayDayName}). Enjoy your free day! 🎉
                        </div>
                      ) : (
                        <div className="wallet-stack-container" style={{ marginTop: 4 }}>
                          {todayInfo.courses.map((course, idx) => {
                            const startMins = timeToMinutes(course.startTime);
                            const endMins = timeToMinutes(course.endTime);
                            const isCompleted = nowMins > endMins;
                            const isLive = nowMins >= startMins && nowMins <= endMins;
                            const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
                            const isExpanded = selectedCourse?.id === course.id;
                            const customBg = getSubjectCardGradient(idx, todayInfo.courses.length, settings.subjectCardTheme || 'blue-cascade');

                            const cleanInstructor = course.instructor 
                              ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
                              : 'No Instructor Assigned';

                            return (
                              <div 
                                key={course.id}
                                className={`wallet-card-item ${isExpanded ? 'is-expanded' : 'is-stacked'}`}
                                style={{ 
                                  background: customBg,
                                  zIndex: isExpanded ? 99 : idx + 1
                                }}
                                onClick={() => {
                                  triggerLightHaptic();
                                  if (isExpanded) {
                                    setSelectedCourse(null);
                                  } else {
                                    setSelectedCourse(course);
                                  }
                                }}
                              >
                                <div className="wallet-card-header">
                                  <div className="wallet-card-header-left">
                                    <div className="wallet-card-avatar-circle">
                                      {getSubjectIcon(course.courseCode, course.courseName)}
                                    </div>

                                    <div className="wallet-card-text-group">
                                      <div className="wallet-card-category">
                                        {isLab ? 'LABORATORY' : 'LECTURE'} · {course.units || 3} UNITS
                                      </div>
                                      <div className="wallet-card-code">
                                        {course.courseCode}
                                      </div>
                                      <div className="wallet-card-sub">
                                        {course.courseName}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="wallet-card-header-right">
                                    {isLive && (
                                      <span className="wallet-pill-tag" style={{ background: '#10B981', color: '#FFFFFF', border: 'none' }}>
                                        ● LIVE
                                      </span>
                                    )}

                                    {isCompleted && (
                                      <span className="wallet-pill-tag" style={{ background: 'rgba(255, 255, 255, 0.25)', color: '#FFFFFF' }}>
                                        ✓ DONE
                                      </span>
                                    )}

                                    <div className="wallet-card-right-bold" style={{ marginTop: isLive || isCompleted ? 3 : 0 }}>
                                      {formatTime12H(course.startTime)}
                                    </div>
                                    <div className="wallet-card-right-sub">
                                      {formatTime12H(course.endTime)}
                                    </div>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="wallet-card-expanded-body" onClick={e => e.stopPropagation()}>
                                    <div className="wallet-detail-grid">
                                      <div className="wallet-detail-cell">
                                        <label>SCHEDULE & TIME</label>
                                        <span>
                                          <Clock size={13} style={{ flexShrink: 0 }} /> 
                                          <span>{formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}</span>
                                        </span>
                                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                                          Today ({todayDayName})
                                        </div>
                                      </div>

                                      <div className="wallet-detail-cell">
                                        <label>CLASSROOM</label>
                                        <span>
                                          <MapPin size={13} style={{ flexShrink: 0 }} /> 
                                          <span>{course.room || 'TBA'}</span>
                                        </span>
                                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                                          {course.units || 3} Academic Units
                                        </div>
                                      </div>
                                    </div>

                                    <div className="wallet-detail-cell">
                                      <label>INSTRUCTOR</label>
                                      <span>
                                        <UserIcon size={13} style={{ flexShrink: 0 }} /> 
                                        <span>{cleanInstructor}</span>
                                      </span>
                                    </div>

                                    <div className="wallet-card-actions">
                                      <button 
                                        type="button"
                                        className="wallet-action-btn"
                                        onClick={() => setSelectedCourse(course)}
                                      >
                                        <CalendarDays size={13} /> Open Class Details
                                      </button>

                                      <button 
                                        type="button"
                                        className="wallet-action-btn wallet-action-btn-secondary"
                                        style={{ maxWidth: 46, padding: 0 }}
                                        onClick={() => setSelectedCourse(null)}
                                        title="Collapse Card"
                                      >
                                        <ChevronUp size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </main>
              )}

              {activeTab === 'schedule' && (
                <main>
                  <div className="ios-section" style={{ paddingBottom: 0, paddingTop: 14 }}>
                    <ConflictAlertBanner conflicts={conflicts} />
                  </div>
                  <TimelineSchedule 
                    courses={courses}
                    onSelectCourse={setSelectedCourse}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    initialDay={selectedTimetableDay}
                    onToggleTheme={handleToggleTheme}
                    theme={theme}
                  />
                </main>
              )}

              {activeTab === 'subjects' && (
                <main>
                  <SubjectsList 
                    courses={courses}
                    conflicts={conflicts}
                    onSelectCourse={setSelectedCourse}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    onAddCourse={handleAddCourse}
                    onToggleTheme={handleToggleTheme}
                    theme={theme}
                    subjectCardTheme={settings.subjectCardTheme || 'blue-cascade'}
                  />
                </main>
              )}

              {activeTab === 'settings' && (
                <main>
                  <SettingsView 
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    onResetData={handleResetData}
                    onTestNotification={handleTestNotification}
                    onToggleTheme={handleToggleTheme}
                    theme={theme}
                    userEmail={currentUser?.email}
                    onSignOut={handleSignOut}
                    onManualSync={() => currentUser && handleTriggerCloudSync(currentUser.id, currentUser.user_metadata?.full_name, true)}
                    isSyncing={isSyncing}
                    isOnline={isOnline}
                  />
                </main>
              )}
            </>
          )}

          {/* Floating Bottom Tab Bar */}
          {!isCorrectionOpen && (
            <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
          )}

          {/* Document Scanner Modal */}
          <ScannerModal 
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanComplete={handleScanComplete}
          />

          {/* Subject Detail Modal with Edit Course & Color Customizer */}
          <SubjectDetailModal 
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            onSelectInstructor={setSelectedInstructor}
            onViewInTimetable={handleViewInTimetable}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
            isConflicting={conflicts.some(c => c.course1.id === selectedCourse?.id || c.course2.id === selectedCourse?.id)}
          />

          {/* Instructor Detail Modal */}
          <InstructorDetailModal 
            instructorName={selectedInstructor}
            allCourses={courses}
            onClose={() => setSelectedInstructor(null)}
          />

          {/* Fullscreen Digital ID Modal with PNG Image Export & 3D Flip */}
          <FullscreenIDModal 
            profile={profile}
            courses={courses}
            isOpen={isFullscreenIDOpen}
            onClose={() => setIsFullscreenIDOpen(false)}
            onEdit={() => {
              setIsFullscreenIDOpen(false);
              setIsEditIDOpen(true);
            }}
          />

          {/* Edit Student ID Customization Modal */}
          <EditIDModal 
            profile={profile}
            isOpen={isEditIDOpen}
            onClose={() => setIsEditIDOpen(false)}
            onSave={handleSaveProfile}
          />
        </>
      )}
    </div>
  );
}

export default App;
