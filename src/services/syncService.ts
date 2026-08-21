import { supabase } from './supabaseClient';
import { Course, StudentProfile, NotificationSettings, DayOfWeek } from '../types';
import { 
  getStoredCourses, 
  saveCourses, 
  getStoredStudentProfile, 
  saveStudentProfile, 
  getStoredSettings, 
  saveSettings,
  createBlankProfile
} from './storageService';

/**
 * Check if the browser currently has internet connectivity
 */
export function isNetworkOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
    ? navigator.onLine 
    : true;
}

/**
 * Pull cloud data for the authenticated user and merge with local storage
 */
export async function pullCloudData(userId: string, defaultFullName?: string): Promise<{
  courses: Course[];
  profile: StudentProfile;
  settings: NotificationSettings;
}> {
  if (!isNetworkOnline()) {
    return {
      courses: getStoredCourses(userId),
      profile: getStoredStudentProfile(userId, defaultFullName),
      settings: getStoredSettings(userId)
    };
  }

  try {
    // 1. Fetch Profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let userProfile = getStoredStudentProfile(userId, defaultFullName);

    if (profileRow) {
      userProfile = {
        id: profileRow.id,
        fullName: profileRow.full_name || defaultFullName || userProfile.fullName,
        studentNumber: profileRow.student_number || '',
        program: profileRow.program || '',
        yearLevel: profileRow.year_level || '1ST YEAR',
        section: profileRow.section || '',
        schoolName: profileRow.school_name || 'NEMSU',
        academicYear: profileRow.academic_year || '2026–2027',
        profilePhoto: profileRow.profile_photo_url || userProfile.profilePhoto,
        schoolLogo: profileRow.school_logo_url || 'nemsu_star',
        selectedTheme: profileRow.selected_theme || 'digital-blue',
        accentColor: profileRow.accent_color || '#2563EB',
        emergencyContactName: profileRow.emergency_contact_name || '',
        emergencyContactPhone: profileRow.emergency_contact_phone || '',
        bloodType: profileRow.blood_type || 'O+'
      };
      saveStudentProfile(userProfile, userId);
    } else {
      // Initialize fresh cloud profile for this new user
      const newBlankProfile = createBlankProfile(userId, defaultFullName);
      await pushProfileToCloud(userId, newBlankProfile);
      userProfile = newBlankProfile;
      saveStudentProfile(userProfile, userId);
    }

    // 2. Fetch Settings
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let userSettings = getStoredSettings(userId);

    if (settingsRow) {
      userSettings = {
        remindersEnabled: settingsRow.reminders_enabled ?? userSettings.remindersEnabled,
        reminderMinutes: settingsRow.reminder_minutes ?? userSettings.reminderMinutes,
        soundEnabled: settingsRow.sound_enabled ?? userSettings.soundEnabled,
        appearanceMode: settingsRow.appearance_mode ?? userSettings.appearanceMode
      };
      saveSettings(userSettings, userId);
    } else {
      await pushSettingsToCloud(userId, userSettings);
    }

    // 3. Fetch Courses & Schedules strictly belonging to this userId
    const { data: coursesRows } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId);

    const { data: scheduleRows } = await supabase
      .from('course_schedules')
      .select('*')
      .eq('user_id', userId);

    let userCourses: Course[] = [];

    if (coursesRows && coursesRows.length > 0) {
      userCourses = coursesRows.map(cRow => {
        const matchingSchedules = (scheduleRows || []).filter(s => s.course_id === cRow.id);
        const days = matchingSchedules.map(s => s.day as DayOfWeek);
        const firstSched = matchingSchedules[0];

        return {
          id: cRow.id,
          courseCode: cRow.course_code,
          courseName: cRow.course_name,
          instructor: cRow.instructor || '',
          room: cRow.room || 'TBA',
          units: Number(cRow.units) || 3,
          color: cRow.color || '#2563EB',
          days: days.length > 0 ? days : ['Mon', 'Thu'],
          startTime: firstSched?.start_time || '08:00',
          endTime: firstSched?.end_time || '09:30'
        };
      });
      saveCourses(userCourses, userId);
    } else {
      // New user with no courses in cloud -> empty timetable
      userCourses = [];
      saveCourses([], userId);
    }

    return {
      courses: userCourses,
      profile: userProfile,
      settings: userSettings
    };
  } catch (err) {
    console.error('Error during pullCloudData:', err);
    return {
      courses: getStoredCourses(userId),
      profile: getStoredStudentProfile(userId, defaultFullName),
      settings: getStoredSettings(userId)
    };
  }
}

/**
 * Push local Profile to Supabase
 */
export async function pushProfileToCloud(userId: string, profile: StudentProfile): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: profile.fullName,
      student_number: profile.studentNumber,
      program: profile.program,
      year_level: profile.yearLevel,
      section: profile.section,
      school_name: profile.schoolName,
      academic_year: profile.academicYear,
      profile_photo_url: profile.profilePhoto,
      school_logo_url: profile.schoolLogo,
      selected_theme: profile.selectedTheme,
      accent_color: profile.accentColor,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_phone: profile.emergencyContactPhone,
      blood_type: profile.bloodType,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to push profile to cloud:', err);
  }
}

/**
 * Push local Settings to Supabase
 */
export async function pushSettingsToCloud(userId: string, settings: NotificationSettings): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      reminders_enabled: settings.remindersEnabled,
      reminder_minutes: settings.reminderMinutes,
      sound_enabled: settings.soundEnabled,
      appearance_mode: settings.appearanceMode,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to push settings to cloud:', err);
  }
}

/**
 * Push local Courses and Schedules to Supabase
 */
export async function pushCoursesToCloud(userId: string, courses: Course[]): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    // 1. Fetch current cloud courses to detect deleted courses
    const { data: existingCloudCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', userId);

    const localIds = new Set(courses.map(c => c.id));
    const toDeleteIds = (existingCloudCourses || [])
      .map(c => c.id)
      .filter(id => !localIds.has(id));

    if (toDeleteIds.length > 0) {
      await supabase
        .from('courses')
        .delete()
        .eq('user_id', userId)
        .in('id', toDeleteIds);
    }

    if (courses.length === 0) return;

    // 2. Upsert courses
    const coursePayloads = courses.map(c => ({
      id: c.id,
      user_id: userId,
      course_code: c.courseCode,
      course_name: c.courseName,
      instructor: c.instructor,
      room: c.room,
      units: c.units || 3,
      color: c.color || '#2563EB',
      updated_at: new Date().toISOString()
    }));

    await supabase.from('courses').upsert(coursePayloads);

    // 3. Rebuild schedules
    const courseIds = courses.map(c => c.id);
    await supabase
      .from('course_schedules')
      .delete()
      .eq('user_id', userId)
      .in('course_id', courseIds);

    const schedulePayloads = courses.flatMap(c => 
      c.days.map(day => ({
        course_id: c.id,
        user_id: userId,
        day: day,
        start_time: c.startTime,
        end_time: c.endTime,
        updated_at: new Date().toISOString()
      }))
    );

    if (schedulePayloads.length > 0) {
      await supabase.from('course_schedules').insert(schedulePayloads);
    }
  } catch (err) {
    console.error('Failed to push courses to cloud:', err);
  }
}

/**
 * Upload Avatar to Supabase Storage bucket 'avatars'
 */
export async function uploadAvatarToStorage(userId: string, base64Data: string): Promise<string | null> {
  if (!isNetworkOnline()) return null;

  try {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const filePath = `${userId}/profile.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.warn('Storage upload error (fallback to local base64):', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
  } catch (err) {
    console.warn('Avatar upload exception:', err);
    return null;
  }
}
