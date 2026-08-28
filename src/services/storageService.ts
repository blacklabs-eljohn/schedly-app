import { Course, NotificationSettings, StudentProfile, CustomEvent } from '../types';
import { idbSet, idbDelete, enqueueSyncMutation, clearSyncQueue } from './indexedDbService';

const LAST_USER_ID_KEY = 'schedly_last_active_user_id';

export function getLastActiveUserId(): string | undefined {
  try {
    return localStorage.getItem(LAST_USER_ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function setLastActiveUserId(userId?: string): void {
  try {
    if (userId) {
      localStorage.setItem(LAST_USER_ID_KEY, userId);
    } else {
      localStorage.removeItem(LAST_USER_ID_KEY);
    }
  } catch (err) {
    console.error('Failed to set last active user id', err);
  }
}

export const getCoursesKey = (userId?: string) => `schedly_courses_${userId || getLastActiveUserId() || 'guest'}`;
export const getProfileKey = (userId?: string) => `schedly_profile_${userId || getLastActiveUserId() || 'guest'}`;
export const getSettingsKey = (userId?: string) => `schedly_settings_${userId || getLastActiveUserId() || 'guest'}`;
export const getEventsKey = (userId?: string) => `schedly_custom_events_${userId || getLastActiveUserId() || 'guest'}`;

export const DEFAULT_SETTINGS: NotificationSettings = {
  remindersEnabled: true,
  reminderMinutes: 30,
  soundEnabled: true,
  appearanceMode: 'light',
  colorTheme: 'bluebook',
  subjectCardTheme: 'bluebook'
};

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563EB"/><stop offset="100%" stop-color="%2360A5FA"/></linearGradient></defs><rect width="120" height="120" rx="20" fill="url(%23g)"/><circle cx="60" cy="45" r="22" fill="%23FFFFFF"/><path d="M25 102c0-20 16-32 35-32s35 12 35 32" fill="%23FFFFFF"/></svg>`;

export const createBlankProfile = (userId?: string, fullName?: string): StudentProfile => ({
  id: userId || `profile_${Date.now()}`,
  fullName: fullName || 'New Student',
  studentNumber: '',
  program: '',
  yearLevel: '1ST YEAR',
  section: '',
  schoolName: 'NEMSU',
  academicYear: '2026–2027',
  profilePhoto: DEFAULT_AVATAR,
  schoolLogo: 'nemsu_star',
  selectedTheme: 'app-dynamic',
  accentColor: '#2563EB',
  useAppTheme: true,
  bloodType: 'O+'
});

/**
 * Get courses synchronously on frame 0 (from localStorage mirror / fast memory)
 */
export function getStoredCourses(userId?: string): Course[] {
  try {
    const raw = localStorage.getItem(getCoursesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse stored courses', err);
    return [];
  }
}

/**
 * Save courses locally immediately into IndexedDB + localStorage mirror
 * Also optionally enqueues sync mutation if queueForSync = true
 */
export function saveCourses(courses: Course[], userId?: string, queueForSync: boolean = true): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const key = getCoursesKey(resolvedUserId);
  const safeList = courses || [];

  // 1. Synchronous mirror for instant frame-0 render
  try {
    localStorage.setItem(key, JSON.stringify(safeList));
  } catch (err) {
    console.error('Failed to save courses to localStorage', err);
  }

  // 2. Persistent IndexedDB write
  idbSet(key, safeList);

  // 3. Queue for background cloud sync if authenticated user
  if (queueForSync && resolvedUserId && resolvedUserId !== 'guest') {
    enqueueSyncMutation({
      userId: resolvedUserId,
      table: 'courses',
      action: 'upsert',
      payload: safeList
    });
  }
}

export function getStoredSettings(userId?: string): NotificationSettings {
  try {
    const raw = localStorage.getItem(getSettingsKey(userId));
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: NotificationSettings, userId?: string, queueForSync: boolean = true): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const key = getSettingsKey(resolvedUserId);
  const safeSettings = settings || DEFAULT_SETTINGS;

  try {
    localStorage.setItem(key, JSON.stringify(safeSettings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }

  idbSet(key, safeSettings);

  if (queueForSync && resolvedUserId && resolvedUserId !== 'guest') {
    enqueueSyncMutation({
      userId: resolvedUserId,
      table: 'user_settings',
      action: 'upsert',
      payload: safeSettings
    });
  }
}

export function getStoredStudentProfile(userId?: string, fullName?: string): StudentProfile {
  const fallback = createBlankProfile(userId, fullName);
  try {
    const raw = localStorage.getItem(getProfileKey(userId));
    if (!raw) {
      saveStudentProfile(fallback, userId, false);
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      saveStudentProfile(fallback, userId, false);
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function saveStudentProfile(profile: StudentProfile, userId?: string, queueForSync: boolean = true): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const key = getProfileKey(resolvedUserId);

  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save student profile to localStorage', err);
  }

  idbSet(key, profile);

  if (queueForSync && resolvedUserId && resolvedUserId !== 'guest') {
    enqueueSyncMutation({
      userId: resolvedUserId,
      table: 'profiles',
      action: 'upsert',
      payload: profile
    });
  }
}

export function getStoredEvents(userId?: string): CustomEvent[] {
  try {
    const raw = localStorage.getItem(getEventsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse stored events', err);
    return [];
  }
}

export function saveEvents(events: CustomEvent[], userId?: string, queueForSync: boolean = true): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const key = getEventsKey(resolvedUserId);
  const safeEvents = events || [];

  try {
    localStorage.setItem(key, JSON.stringify(safeEvents));
  } catch (err) {
    console.error('Failed to save events to localStorage', err);
  }

  idbSet(key, safeEvents);

  if (queueForSync && resolvedUserId && resolvedUserId !== 'guest') {
    enqueueSyncMutation({
      userId: resolvedUserId,
      table: 'custom_events',
      action: 'upsert',
      payload: safeEvents
    });
  }
}

export function resetScheduleData(userId?: string): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const key = getCoursesKey(resolvedUserId);
  try {
    localStorage.removeItem(key);
  } catch {}
  idbDelete(key);

  if (resolvedUserId && resolvedUserId !== 'guest') {
    enqueueSyncMutation({
      userId: resolvedUserId,
      table: 'courses',
      action: 'upsert',
      payload: []
    });
  }
}

export function clearUserStorage(userId?: string): void {
  const resolvedUserId = userId || getLastActiveUserId();
  const coursesKey = getCoursesKey(resolvedUserId);
  const profileKey = getProfileKey(resolvedUserId);
  const settingsKey = getSettingsKey(resolvedUserId);
  const eventsKey = getEventsKey(resolvedUserId);

  try {
    localStorage.removeItem(coursesKey);
    localStorage.removeItem(profileKey);
    localStorage.removeItem(settingsKey);
    localStorage.removeItem(eventsKey);
  } catch {}

  idbDelete(coursesKey);
  idbDelete(profileKey);
  idbDelete(settingsKey);
  idbDelete(eventsKey);

  if (resolvedUserId) {
    clearSyncQueue(resolvedUserId);
  }
}
