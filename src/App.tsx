import { useState, useEffect, useCallback } from 'react';
import { Course, NotificationSettings, StudentProfile, DayOfWeek, CustomEvent, SubjectNote, CourseLink, CourseTopic } from './types';
import { User } from '@supabase/supabase-js';
import { 
  getStoredCourses, 
  saveCourses, 
  getStoredSettings, 
  saveSettings, 
  getStoredStudentProfile, 
  saveStudentProfile, 
  getStoredEvents,
  saveEvents,
  getStoredSubjectNotes,
  saveSubjectNotes,
  getStoredCourseLinks,
  saveCourseLinks,
  getStoredCourseTopics,
  saveCourseTopics,
  resetScheduleData,
  createBlankProfile,
  getLastActiveUserId,
  setLastActiveUserId,
  hasAcceptedPrivacyPolicy,
  setAcceptedPrivacyPolicy
} from './services/storageService';
import { detectScheduleConflicts, autoResolveScheduleConflicts, getDayScheduleInfo, formatTime12H, timeToMinutes, getSubjectCardGradient, DAYS_OF_WEEK } from './services/scheduleEngine';
import { parseCORText, getDefaultOfficialCourses } from './services/corParser';
import { scheduleClassReminders, showSystemToast, triggerTestClassNotification, scheduleCustomEventNotification, cancelCustomEventNotification, syncAllCustomEventsNotifications } from './services/notificationService';
import { onAuthStateChange, getCurrentUser, signOutUser, getOfflineCachedUser } from './services/authService';
import { 
  pullCloudData, 
  flushSyncQueue,
  uploadAvatarToStorage, 
  isNetworkOnline,
  subscribeSyncState,
  SyncState
} from './services/syncService';

import { BottomTabBar, TabType } from './components/BottomTabBar';
import { DigitalIDCard } from './components/DigitalIDCard';
import { NextClassHero } from './components/NextClassHero';
import { TimelineSchedule } from './components/TimelineSchedule';
import { ConflictAlertBanner } from './components/ConflictAlertBanner';
import { SubjectsList } from './components/SubjectsList';
import { SubjectDetailScreen } from './components/SubjectDetailScreen';
import { SettingsView } from './components/SettingsView';
import { ScannerModal } from './components/ScannerModal';
import { CorrectionScreen } from './components/CorrectionScreen';
import { InstructorDetailModal } from './components/InstructorDetailModal';
import { FullscreenIDModal } from './components/FullscreenIDModal';
import { EditIDModal } from './components/EditIDModal';
import { HolidayCalendarModal } from './components/HolidayCalendarModal';
import { CalendarView } from './components/CalendarView';
import { SplashScreen } from './components/SplashScreen';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { AnnouncementModal } from './components/AnnouncementModal';
import { fetchActiveAnnouncements, dismissAnnouncement } from './services/announcementService';
import { Announcement } from './types';
import { triggerLightHaptic, triggerSuccessHaptic } from './services/hapticsService';
import { AuthScreen } from './components/AuthScreen';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { HomeTodoList } from './components/HomeTodoList';
import { AddEventModal } from './components/AddEventModal';
import { syncWidgetsData } from './services/widgetBridge';
import { getSubjectIconComponent } from './services/iconService';

import { Camera, ArrowRight, MapPin, User as UserIcon, Sparkles, Clock, CalendarDays, ChevronUp, CloudOff, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import './styles/apple-design-system.css';

export function App() {
  const initialCachedUser = getOfflineCachedUser();
  const initialUserId = initialCachedUser?.id || getLastActiveUserId();

  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => initialCachedUser);
  const [_isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(() => !initialCachedUser);
  const [isOnline, setIsOnline] = useState(isNetworkOnline());
  const [syncState, setSyncState] = useState<SyncState>(isNetworkOnline() ? 'ONLINE' : 'OFFLINE');

  const getTodayDayOfWeek = (): DayOfWeek => {
    const dayNames: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[new Date().getDay()];
    return DAYS_OF_WEEK.includes(dayName) ? dayName : 'Mon';
  };

  // Eagerly hydrate from local cache on first frame to guarantee 0ms latency & instant UI
  const [courses, setCourses] = useState<Course[]>(() => getStoredCourses(initialUserId));
  const [settings, setSettings] = useState<NotificationSettings>(() => getStoredSettings(initialUserId));
  const [profile, setProfile] = useState<StudentProfile>(() => getStoredStudentProfile(initialUserId));
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => getStoredEvents(initialUserId));
  const [subjectNotes, setSubjectNotes] = useState<SubjectNote[]>(() => getStoredSubjectNotes(initialUserId));
  const [courseLinks, setCourseLinks] = useState<CourseLink[]>(() => getStoredCourseLinks(initialUserId));
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>(() => getStoredCourseTopics(initialUserId));
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredSettings(initialUserId).appearanceMode === 'dark' ? 'dark' : 'light');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<DayOfWeek>(getTodayDayOfWeek);

  // Modals & Flows
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isEditIDOpen, setIsEditIDOpen] = useState(false);
  const [isFullscreenIDOpen, setIsFullscreenIDOpen] = useState(false);
  const [isHolidayCalendarOpen, setIsHolidayCalendarOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isPrivacyConsentMode, setIsPrivacyConsentMode] = useState(false);

  // Home View Mode: Schedule vs Deadlines/Tasks
  const [homeViewMode, setHomeViewMode] = useState<'schedule' | 'tasks'>('schedule');
  const [isAddingHomeEvent, setIsAddingHomeEvent] = useState(false);
  const [editingHomeEvent, setEditingHomeEvent] = useState<CustomEvent | null>(null);

  const [reviewCourses, setReviewCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);

  // Check Privacy Policy Acceptance after splash screen
  useEffect(() => {
    if (!showSplash && currentUser) {
      const isAccepted = hasAcceptedPrivacyPolicy(currentUser.id);
      if (!isAccepted) {
        setIsPrivacyConsentMode(true);
        setIsPrivacyModalOpen(true);
      }
    }
  }, [showSplash, currentUser]);

  const handlePrivacyAccept = () => {
    const uid = currentUser?.id || getLastActiveUserId();
    setAcceptedPrivacyPolicy(uid, true);
    setIsPrivacyModalOpen(false);
    showSystemToast('Welcome to Schedly!', 'Privacy policy & guidelines accepted.');
  };

  // Developer Remote Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Fetch Remote Announcements from Supabase
  useEffect(() => {
    fetchActiveAnnouncements(currentUser?.id).then(data => {
      setAnnouncements(data);
    });
  }, [currentUser]);

  const handleDismissAnnouncement = (id: string) => {
    dismissAnnouncement(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const isCorruptedName = (name?: string) => {
    if (!name) return true;
    const upper = name.toUpperCase().trim();
    return upper.includes('MIDDLE NAME') || upper.includes('SEX FIRST') || upper.includes('FIRST NAME') || upper === 'STUDENT NAME' || upper === 'NEW STUDENT';
  };

  // Sync theme (light / dark)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync Schedly 8 Personality Color Themes
  useEffect(() => {
    const rawTheme = settings.colorTheme || settings.subjectCardTheme || 'bluebook';
    let normalized = rawTheme;
    if (rawTheme === 'blue-cascade') normalized = 'bluebook';
    else if (rawTheme === 'dual-tone') normalized = 'duos';
    else if (rawTheme === 'rainbow') normalized = 'highlighter';

    document.documentElement.setAttribute('data-color-theme', normalized);
  }, [settings.colorTheme, settings.subjectCardTheme]);

  // Sync class notifications locally (works 100% offline on device)
  useEffect(() => {
    scheduleClassReminders(courses, settings);
  }, [courses, settings]);

  // Sync custom event notifications locally (works 100% offline on device)
  useEffect(() => {
    syncAllCustomEventsNotifications(customEvents);
  }, [customEvents]);

  // Centralized Connectivity & Sync State listener
  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
      setIsOnline(state !== 'OFFLINE');
    });
    return unsubscribe;
  }, []);

  // Background Cloud Sync Handler (Non-blocking)
  const handleTriggerCloudSync = useCallback(async (userId: string, defaultName?: string, showToast = false) => {
    setLastActiveUserId(userId);

    // Eager local state update from cache first
    const localCourses = getStoredCourses(userId);
    const localProfile = getStoredStudentProfile(userId, defaultName);
    const localSettings = getStoredSettings(userId);
    const localEvents = getStoredEvents(userId);

    if (localCourses.length > 0) {
      setCourses(localCourses);
    }
    if (localProfile.fullName && !isCorruptedName(localProfile.fullName) && localProfile.fullName !== 'New Student') {
      setProfile(localProfile);
    }
    setSettings(localSettings);
    setCustomEvents(localEvents);
    setTheme(localSettings.appearanceMode === 'dark' ? 'dark' : 'light');

    if (!isNetworkOnline()) {
      return;
    }

    try {
      // 1. Flush offline sync mutations first
      await flushSyncQueue(userId);

      // 2. Incremental pull from cloud
      const cloudData = await pullCloudData(userId, defaultName);
      if (cloudData.courses.length > 0 || localCourses.length === 0) {
        setCourses(cloudData.courses);
      }
      setProfile(cloudData.profile);
      setSettings(cloudData.settings);
      setCustomEvents(cloudData.customEvents);
      setTheme(cloudData.settings.appearanceMode === 'dark' ? 'dark' : 'light');

      if (showToast) {
        showSystemToast('Cloud Synced', 'Your timetable & pass are backed up.');
      }
    } catch (err) {
      console.warn('[CloudSync] Background sync exception:', err);
    }
  }, []);

  // Network Online/Offline auto-sync listener
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

  // Supabase Auth State Listener with Offline Persistence
  useEffect(() => {
    let mounted = true;

    getCurrentUser().then((user) => {
      if (!mounted) return;
      if (user) {
        setCurrentUser(user);
        setLastActiveUserId(user.id);
        setIsAuthChecking(false);

        const cachedCourses = getStoredCourses(user.id);
        const cachedProfile = getStoredStudentProfile(user.id, user.user_metadata?.full_name);
        const cachedSettings = getStoredSettings(user.id);
        const cachedEvents = getStoredEvents(user.id);
        const cachedNotes = getStoredSubjectNotes(user.id);
        const cachedLinks = getStoredCourseLinks(user.id);
        const cachedTopics = getStoredCourseTopics(user.id);

        if (cachedCourses.length > 0) {
          setCourses(cachedCourses);
        }
        if (cachedProfile.fullName && !isCorruptedName(cachedProfile.fullName) && cachedProfile.fullName !== 'New Student') {
          setProfile(cachedProfile);
        }
        setSettings(cachedSettings);
        setCustomEvents(cachedEvents);
        setSubjectNotes(cachedNotes);
        setCourseLinks(cachedLinks);
        setCourseTopics(cachedTopics);

        // Silent background sync
        if (isNetworkOnline()) {
          handleTriggerCloudSync(user.id, user.user_metadata?.full_name, false);
        }
      } else {
        const lastId = getLastActiveUserId();
        if (lastId && lastId !== 'guest') {
          // If we had a previous session, keep authenticated offline
          const cachedProfile = getStoredStudentProfile(lastId);
          if (cachedProfile && cachedProfile.fullName !== 'New Student') {
            setIsAuthChecking(false);
            return;
          }
        }
        setIsAuthChecking(false);
      }
    });

    const { data: authListener } = onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthChecking(false);
        return;
      }

      const user = session?.user || null;
      if (user) {
        setCurrentUser(user);
        setLastActiveUserId(user.id);
        setIsAuthChecking(false);

        const cachedCourses = getStoredCourses(user.id);
        const cachedProfile = getStoredStudentProfile(user.id, user.user_metadata?.full_name);
        const cachedSettings = getStoredSettings(user.id);
        const cachedEvents = getStoredEvents(user.id);
        const cachedNotes = getStoredSubjectNotes(user.id);
        const cachedLinks = getStoredCourseLinks(user.id);
        const cachedTopics = getStoredCourseTopics(user.id);

        if (cachedCourses.length > 0) {
          setCourses(cachedCourses);
        }
        if (cachedProfile.fullName && !isCorruptedName(cachedProfile.fullName) && cachedProfile.fullName !== 'New Student') {
          setProfile(cachedProfile);
        }
        setSettings(cachedSettings);
        setCustomEvents(cachedEvents);
        setSubjectNotes(cachedNotes);
        setCourseLinks(cachedLinks);
        setCourseTopics(cachedTopics);

        if (isNetworkOnline()) {
          handleTriggerCloudSync(user.id, user.user_metadata?.full_name, false);
        }
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
    saveSettings(updated, currentUser?.id, true);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleUpdateSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, currentUser?.id, true);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
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
    saveStudentProfile(finalProfile, currentUser?.id, true);
    setIsEditIDOpen(false);
    showSystemToast('ID Updated', 'Your Digital Student ID has been saved.');

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  // Self-heal corrupted student name from previous OCR bug if present
  useEffect(() => {
    if (profile.fullName && isCorruptedName(profile.fullName)) {
      const cleanName = currentUser?.user_metadata?.full_name || 'Student';
      const healed = { ...profile, fullName: cleanName };
      setProfile(healed);
      saveStudentProfile(healed, currentUser?.id, true);
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
      saveStudentProfile(merged, currentUser?.id, true);

      if (currentUser && isNetworkOnline()) {
        flushSyncQueue(currentUser.id);
      }
    }
  };

  const handleSaveSchedule = (finalCourses: Course[], updatedProfile?: Partial<StudentProfile>) => {
    setCourses(finalCourses);
    saveCourses(finalCourses, currentUser?.id, true);

    if (updatedProfile && Object.keys(updatedProfile).length > 0) {
      const merged: StudentProfile = {
        ...profile,
        ...updatedProfile,
        fullName: updatedProfile.fullName && !isCorruptedName(updatedProfile.fullName)
          ? updatedProfile.fullName
          : profile.fullName
      };
      setProfile(merged);
      saveStudentProfile(merged, currentUser?.id, true);
    }

    setIsCorrectionOpen(false);
    setActiveTab('home');
    showSystemToast('Schedule Updated', `${finalCourses.length} classes added to timetable.`);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    const updatedList = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id, true);
    setSelectedCourse(updatedCourse);
    showSystemToast('Course Updated', `${updatedCourse.courseCode} has been saved.`);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    const updatedList = courses.filter(c => c.id !== courseId);
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id, true);
    setSelectedCourse(null);
    showSystemToast('Course Removed', 'The course was removed from your timetable.');

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleAddCourse = (newCourse: Course) => {
    if (!newCourse.courseCode.trim()) {
      showSystemToast('Error', 'Please enter a course code.');
      return;
    }
    const updatedList = [...courses, newCourse];
    setCourses(updatedList);
    saveCourses(updatedList, currentUser?.id, true);
    showSystemToast('Course Added', `${newCourse.courseCode} added to your schedule.`);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to clear all schedule data?')) {
      resetScheduleData(currentUser?.id);
      setCourses([]);
      showSystemToast('Schedule Reset', 'All classes removed.');

      if (currentUser && isNetworkOnline()) {
        flushSyncQueue(currentUser.id);
      }
    }
  };

  const handleSaveCustomEvent = (event: CustomEvent) => {
    setCustomEvents(prev => {
      const exists = prev.some(e => e.id === event.id);
      const updated = exists 
        ? prev.map(e => e.id === event.id ? event : e) 
        : [event, ...prev];
      saveEvents(updated, currentUser?.id, true);
      return updated;
    });
    scheduleCustomEventNotification(event);
    showSystemToast('Event Saved', `${event.title} scheduled.`);

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    setCustomEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId);
      saveEvents(updated, currentUser?.id, true);
      return updated;
    });
    cancelCustomEventNotification(eventId);
    showSystemToast('Event Deleted', 'Custom event removed.');

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleToggleEventComplete = (eventId: string) => {
    setCustomEvents(prev => {
      const updated = prev.map(e => {
        if (e.id === eventId) {
          const nextState = !e.isCompleted;
          if (nextState) cancelCustomEventNotification(e.id);
          else scheduleCustomEventNotification({ ...e, isCompleted: false });
          return { ...e, isCompleted: nextState };
        }
        return e;
      });
      saveEvents(updated, currentUser?.id, true);
      return updated;
    });

    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleSaveSubjectNote = (note: SubjectNote) => {
    setSubjectNotes(prev => {
      const exists = prev.some(n => n.id === note.id);
      const updated = exists ? prev.map(n => n.id === note.id ? note : n) : [note, ...prev];
      saveSubjectNotes(updated, currentUser?.id, true);
      return updated;
    });
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleDeleteSubjectNote = (noteId: string) => {
    setSubjectNotes(prev => {
      const updated = prev.filter(n => n.id !== noteId);
      saveSubjectNotes(updated, currentUser?.id, true);
      return updated;
    });
    showSystemToast('Note Deleted', 'Course note removed.');
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleTogglePinSubjectNote = (noteId: string) => {
    setSubjectNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n);
      saveSubjectNotes(updated, currentUser?.id, true);
      return updated;
    });
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleSaveCourseLink = (link: CourseLink) => {
    setCourseLinks(prev => {
      const exists = prev.some(l => l.id === link.id);
      const updated = exists ? prev.map(l => l.id === link.id ? link : l) : [link, ...prev];
      saveCourseLinks(updated, currentUser?.id, true);
      return updated;
    });
    showSystemToast('Link Saved', `"${link.title}" is ready in your Course Hub.`);
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleDeleteCourseLink = (linkId: string) => {
    setCourseLinks(prev => {
      const updated = prev.filter(l => l.id !== linkId);
      saveCourseLinks(updated, currentUser?.id, true);
      return updated;
    });
    showSystemToast('Link Removed', 'Course resource link deleted.');
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleSaveCourseTopic = (topic: CourseTopic) => {
    setCourseTopics(prev => {
      const exists = prev.some(t => t.id === topic.id);
      const updated = exists ? prev.map(t => t.id === topic.id ? topic : t) : [...prev, topic];
      saveCourseTopics(updated, currentUser?.id, true);
      return updated;
    });
    showSystemToast('Syllabus Updated', `"${topic.title}" saved.`);
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleDeleteCourseTopic = (topicId: string) => {
    setCourseTopics(prev => {
      const updated = prev.filter(t => t.id !== topicId);
      saveCourseTopics(updated, currentUser?.id, true);
      return updated;
    });
    showSystemToast('Topic Removed', 'Syllabus topic deleted.');
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleToggleCourseTopicComplete = (topicId: string) => {
    setCourseTopics(prev => {
      const updated = prev.map(t => t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t);
      saveCourseTopics(updated, currentUser?.id, true);
      return updated;
    });
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleAutoResolveConflicts = () => {
    triggerSuccessHaptic();
    const healedCourses = autoResolveScheduleConflicts(courses);
    setCourses(healedCourses);
    saveCourses(healedCourses, currentUser?.id, true);
    showSystemToast('Schedule Repaired ✨', 'All class overlaps and time conflicts have been resolved.');
    if (currentUser && isNetworkOnline()) {
      flushSyncQueue(currentUser.id);
    }
  };

  const handleResetOfficialSchedule = () => {
    if (window.confirm('Reset timetable to the clean official NEMSU college schedule?')) {
      triggerSuccessHaptic();
      const officialCourses = getDefaultOfficialCourses();
      setCourses(officialCourses);
      saveCourses(officialCourses, currentUser?.id, true);
      showSystemToast('Official Schedule Loaded 🎓', 'Your timetable has been restored to default.');
      if (currentUser && isNetworkOnline()) {
        flushSyncQueue(currentUser.id);
      }
    }
  };

  const handleSignOut = async () => {
    setLastActiveUserId(undefined);
    await signOutUser();
    setCurrentUser(null);
    setIsGuestMode(false);
    setCourses([]);
    setCustomEvents([]);
    setSubjectNotes([]);
    setCourseLinks([]);
    setCourseTopics([]);
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

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'schedule' && activeTab !== 'schedule') {
      setSelectedTimetableDay(getTodayDayOfWeek());
    }
    if (tab !== 'subjects') {
      setSelectedCourse(null);
    }
    setActiveTab(tab);
  };

  const conflicts = detectScheduleConflicts(courses);
  const today = new Date();
  const todayDayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()]) as DayOfWeek;
  const todayInfo = getDayScheduleInfo(courses, todayDayName || 'Mon');

  const getStudentFirstName = (name?: string): string => {
    if (!name || !name.trim()) return 'Student';
    const clean = name.trim();
    if (clean.includes(',')) {
      const parts = clean.split(',');
      const afterComma = parts[1]?.trim() || '';
      const firstWord = afterComma.split(' ')[0]?.trim();
      if (firstWord) {
        return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      }
    }
    const firstWord = clean.split(' ')[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  };

  const studentFirstName = getStudentFirstName(profile?.fullName);
  const timeOfDayGreeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  // Sync latest schedule, up next, and profile to Android Home Screen Widgets
  useEffect(() => {
    if (profile) {
      syncWidgetsData(courses, profile, todayDayName);
    }
  }, [courses, profile, todayDayName]);

  const nowMins = today.getHours() * 60 + today.getMinutes();

  return (
    <div id="root">
      {/* 3-Step Animated Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Authentication & Onboarding Screen (Rendered only if truly not logged in) */}
      {!showSplash && !isAuthChecking && !currentUser ? (
        <AuthScreen 
          onAuthSuccess={(authenticatedUser, initialProfile) => {
            setLastActiveUserId(authenticatedUser.id);
            setCurrentUser(authenticatedUser);
            setIsGuestMode(false);
            const cachedCourses = getStoredCourses(authenticatedUser.id);
            const cachedSettings = getStoredSettings(authenticatedUser.id);
            const cachedEvents = getStoredEvents(authenticatedUser.id);
            const cachedProfile = initialProfile || getStoredStudentProfile(authenticatedUser.id, authenticatedUser.user_metadata?.full_name);
            
            setCourses(cachedCourses);
            setSettings(cachedSettings);
            setCustomEvents(cachedEvents);
            setProfile(cachedProfile);
            setTheme(cachedSettings.appearanceMode === 'dark' ? 'dark' : 'light');

            if (initialProfile) {
              saveStudentProfile(initialProfile, authenticatedUser.id, true);
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
                  {timeOfDayGreeting},
                </span>
                <h1 className="top-utility-greeting">
                  {studentFirstName}
                </h1>
              </div>

              <div className="top-utility-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {syncState === 'SYNCING' && (
                  <div className="sync-indicator-pill" title="Syncing schedule with cloud...">
                    <div className="sync-spinner" />
                    <span>Syncing...</span>
                  </div>
                )}
                {syncState === 'OFFLINE' && (
                  <div 
                    className="sync-indicator-pill" 
                    title="Offline Mode: All your data is saved locally on device."
                    style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--ios-text-muted)' }}
                  >
                    <CloudOff size={12} />
                    <span>Offline</span>
                  </div>
                )}
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
                    {/* Developer Remote Announcements & Maintenance Notice Banners */}
                    {announcements.filter(a => a.type === 'banner').map(banner => (
                      <AnnouncementBanner 
                        key={banner.id}
                        announcement={banner}
                        onDismiss={handleDismissAnnouncement}
                      />
                    ))}

                    {/* Conflict Alerts if any */}
                    <ConflictAlertBanner 
                      conflicts={conflicts} 
                      onAutoResolve={handleAutoResolveConflicts}
                      onResetOfficialSchedule={handleResetOfficialSchedule}
                      onSelectConflictCourse={(code) => {
                        const target = courses.find(c => c.courseCode === code);
                        if (target) {
                          setSelectedCourse(target);
                          setActiveTab('subjects');
                        }
                      }}
                    />

                    <DigitalIDCard 
                      profile={profile}
                      onEditClick={() => setIsEditIDOpen(true)}
                      onCardClick={() => setIsFullscreenIDOpen(true)}
                    />

                    {/* AMIE & CRON INSPIRED UPCOMING CLASS HERO */}
                    <NextClassHero 
                      courses={courses}
                      onSelectCourse={(course) => {
                        setSelectedCourse(course);
                        setActiveTab('subjects');
                      }}
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

                    {/* iOS Segmented Mode Switcher: Class Schedule ⇄ Deadlines & Tasks */}
                    <div style={{ marginTop: 10, marginBottom: 8 }}>
                      <div 
                        style={{
                          background: 'var(--ios-card-bg)',
                          borderRadius: 14,
                          padding: 3,
                          display: 'flex',
                          gap: 4,
                          border: '1px solid var(--ios-card-border)',
                          boxShadow: 'var(--ios-shadow-sm)'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setHomeViewMode('schedule');
                          }}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '9px 12px',
                            borderRadius: 11,
                            border: 'none',
                            background: homeViewMode === 'schedule' ? 'var(--ios-blue)' : 'transparent',
                            color: homeViewMode === 'schedule' ? '#FFFFFF' : 'var(--ios-text-secondary)',
                            fontSize: 13,
                            fontWeight: homeViewMode === 'schedule' ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: homeViewMode === 'schedule' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
                          }}
                        >
                          <CalendarIcon size={14} />
                          <span>Class Schedule</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setHomeViewMode('tasks');
                          }}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '9px 12px',
                            borderRadius: 11,
                            border: 'none',
                            background: homeViewMode === 'tasks' ? 'var(--ios-blue)' : 'transparent',
                            color: homeViewMode === 'tasks' ? '#FFFFFF' : 'var(--ios-text-secondary)',
                            fontSize: 13,
                            fontWeight: homeViewMode === 'tasks' ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: homeViewMode === 'tasks' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Deadlines & Tasks</span>
                          {customEvents.filter(e => !e.isCompleted).length > 0 && (
                            <span 
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 10,
                                background: homeViewMode === 'tasks' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(239, 68, 68, 0.14)',
                                color: homeViewMode === 'tasks' ? '#FFFFFF' : '#EF4444'
                              }}
                            >
                              {customEvents.filter(e => !e.isCompleted).length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode 1: Tasks & Deadlines Board */}
                  {homeViewMode === 'tasks' && (
                    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 6 }}>
                      <HomeTodoList 
                        events={customEvents}
                        courses={courses}
                        onToggleEventComplete={handleToggleEventComplete}
                        onEditEvent={(event) => {
                          setEditingHomeEvent(event);
                          setIsAddingHomeEvent(true);
                        }}
                        onDeleteEvent={handleDeleteCustomEvent}
                        onOpenAddTask={() => {
                          setEditingHomeEvent(null);
                          setIsAddingHomeEvent(true);
                        }}
                        onSelectCourse={(course) => {
                          setSelectedCourse(course);
                          setActiveTab('subjects');
                        }}
                      />
                    </div>
                  )}

                  {/* Mode 2: Today's Classes List (Stacked Cards) */}
                  {homeViewMode === 'schedule' && courses.length > 0 && (
                    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div className="ios-section-header" style={{ margin: 0 }}>
                          Classes Today ({todayInfo.courses.length})
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setSelectedTimetableDay(todayDayName);
                            handleSelectTab('schedule');
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
                            const customBg = getSubjectCardGradient(idx, todayInfo.courses.length, settings.colorTheme || settings.subjectCardTheme || 'bluebook');

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
                                      {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 17, '#FFFFFF')}
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
                    <ConflictAlertBanner 
                      conflicts={conflicts} 
                      onAutoResolve={handleAutoResolveConflicts}
                      onResetOfficialSchedule={handleResetOfficialSchedule}
                      onSelectConflictCourse={(code) => {
                        const target = courses.find(c => c.courseCode === code);
                        if (target) {
                          setSelectedCourse(target);
                          setActiveTab('subjects');
                        }
                      }}
                    />
                  </div>
                  <TimelineSchedule 
                    courses={courses}
                    onSelectCourse={(course) => {
                      setSelectedCourse(course);
                      setActiveTab('subjects');
                    }}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    initialDay={selectedTimetableDay}
                    onSelectDay={setSelectedTimetableDay}
                    onOpenHolidays={() => handleSelectTab('calendar')}
                    onToggleTheme={handleToggleTheme}
                    theme={theme}
                  />
                </main>
              )}

              {activeTab === 'calendar' && (
                <main>
                  <CalendarView 
                    events={customEvents}
                    courses={courses}
                    onOpenSubject={(course) => {
                      setSelectedCourse(course);
                      setActiveTab('subjects');
                    }}
                    onSaveEvent={handleSaveCustomEvent}
                    onDeleteEvent={handleDeleteCustomEvent}
                    onToggleEventComplete={handleToggleEventComplete}
                    onToggleTheme={handleToggleTheme} 
                    theme={theme} 
                  />
                </main>
              )}

              {activeTab === 'subjects' && (
                <main>
                  {selectedCourse ? (
                    <SubjectDetailScreen 
                      course={selectedCourse}
                      allCourses={courses}
                      events={customEvents}
                      notes={subjectNotes}
                      conflicts={conflicts}
                      links={courseLinks}
                      topics={courseTopics}
                      onBack={() => setSelectedCourse(null)}
                      onSelectInstructor={setSelectedInstructor}
                      onViewInTimetable={(day) => {
                        setSelectedCourse(null);
                        handleViewInTimetable(day);
                      }}
                      onUpdateCourse={handleUpdateCourse}
                      onDeleteCourse={handleDeleteCourse}
                      onSaveEvent={handleSaveCustomEvent}
                      onDeleteEvent={handleDeleteCustomEvent}
                      onToggleEventComplete={handleToggleEventComplete}
                      onSaveNote={handleSaveSubjectNote}
                      onDeleteNote={handleDeleteSubjectNote}
                      onTogglePinNote={handleTogglePinSubjectNote}
                      onSaveLink={handleSaveCourseLink}
                      onDeleteLink={handleDeleteCourseLink}
                      onSaveTopic={handleSaveCourseTopic}
                      onDeleteTopic={handleDeleteCourseTopic}
                      onToggleTopicComplete={handleToggleCourseTopicComplete}
                    />
                  ) : (
                    <SubjectsList 
                      courses={courses}
                      conflicts={conflicts}
                      events={customEvents}
                      notes={subjectNotes}
                      onSelectCourse={setSelectedCourse}
                      onUpdateCourse={handleUpdateCourse}
                      onDeleteCourse={handleDeleteCourse}
                      onAddCourse={handleAddCourse}
                      onToggleTheme={handleToggleTheme}
                      theme={theme}
                      subjectCardTheme={settings.colorTheme || settings.subjectCardTheme || 'blue-cascade'}
                    />
                  )}
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
                    isSyncing={syncState === 'SYNCING'}
                    isOnline={isOnline}
                    onOpenPrivacyPolicy={() => {
                      setIsPrivacyConsentMode(false);
                      setIsPrivacyModalOpen(true);
                    }}
                  />
                </main>
              )}
            </>
          )}

          {/* Floating Bottom Tab Bar */}
          {!isCorrectionOpen && !selectedCourse && (
            <BottomTabBar activeTab={activeTab} onSelectTab={handleSelectTab} />
          )}

          {/* Document Scanner Modal */}
          <ScannerModal 
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanComplete={handleScanComplete}
            onAddManually={() => {
              setIsScannerOpen(false);
              setActiveTab('subjects');
            }}
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

          {/* Philippine National Holidays & Campus Calendar Modal */}
          <HolidayCalendarModal 
            isOpen={isHolidayCalendarOpen}
            onClose={() => setIsHolidayCalendarOpen(false)}
          />

          {/* Developer Remote Update / Feature / Alert Popups */}
          {announcements.find(a => a.type === 'modal') && (
            <AnnouncementModal 
              announcement={announcements.find(a => a.type === 'modal')!}
              onDismiss={handleDismissAnnouncement}
            />
          )}

          {/* Privacy Policy & Rules Modal */}
          <PrivacyPolicyModal 
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
            onAccept={handlePrivacyAccept}
            isConsentMode={isPrivacyConsentMode}
          />

          {/* Home Tab Add / Edit Task Modal */}
          <AddEventModal 
            isOpen={isAddingHomeEvent}
            onClose={() => {
              setIsAddingHomeEvent(false);
              setEditingHomeEvent(null);
            }}
            onSaveEvent={(evt) => {
              handleSaveCustomEvent(evt);
              setIsAddingHomeEvent(false);
              setEditingHomeEvent(null);
            }}
            onDeleteEvent={(id) => {
              handleDeleteCustomEvent(id);
              setIsAddingHomeEvent(false);
              setEditingHomeEvent(null);
            }}
            initialEvent={editingHomeEvent}
            courses={courses}
          />
        </>
      )}
    </div>
  );
}

export default App;
