import { Course, NotificationSettings, StudentProfile } from '../types';

const getCoursesKey = (userId?: string) => `schedly_courses_${userId || 'guest'}`;
const getProfileKey = (userId?: string) => `schedly_profile_${userId || 'guest'}`;
const getSettingsKey = (userId?: string) => `schedly_settings_${userId || 'guest'}`;

export const DEFAULT_SETTINGS: NotificationSettings = {
  remindersEnabled: true,
  reminderMinutes: 30,
  soundEnabled: true,
  appearanceMode: 'light',
  subjectCardTheme: 'blue-cascade'
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
  selectedTheme: 'digital-blue',
  accentColor: '#2563EB',
  bloodType: 'O+'
});

export function getStoredCourses(userId?: string): Course[] {
  try {
    const raw = localStorage.getItem(getCoursesKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse stored courses', err);
    return [];
  }
}

export function saveCourses(courses: Course[], userId?: string): void {
  try {
    localStorage.setItem(getCoursesKey(userId), JSON.stringify(courses));
  } catch (err) {
    console.error('Failed to save courses', err);
  }
}

export function getStoredSettings(userId?: string): NotificationSettings {
  try {
    const raw = localStorage.getItem(getSettingsKey(userId));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: NotificationSettings, userId?: string): void {
  try {
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function getStoredStudentProfile(userId?: string, fullName?: string): StudentProfile {
  try {
    const raw = localStorage.getItem(getProfileKey(userId));
    if (!raw) {
      const blank = createBlankProfile(userId, fullName);
      saveStudentProfile(blank, userId);
      return blank;
    }
    return JSON.parse(raw);
  } catch (err) {
    return createBlankProfile(userId, fullName);
  }
}

export function saveStudentProfile(profile: StudentProfile, userId?: string): void {
  try {
    localStorage.setItem(getProfileKey(userId), JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save student profile', err);
  }
}

export function resetScheduleData(userId?: string): void {
  localStorage.removeItem(getCoursesKey(userId));
}

export function clearUserStorage(userId?: string): void {
  localStorage.removeItem(getCoursesKey(userId));
  localStorage.removeItem(getProfileKey(userId));
  localStorage.removeItem(getSettingsKey(userId));
}
