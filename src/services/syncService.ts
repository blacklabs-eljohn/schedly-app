import { supabase } from './supabaseClient';
import { Course, StudentProfile, NotificationSettings, DayOfWeek, CustomEvent } from '../types';
import { 
  getStoredCourses, 
  saveCourses, 
  getStoredStudentProfile, 
  saveStudentProfile, 
  getStoredSettings, 
  saveSettings,
  getStoredEvents,
  saveEvents,
  getSubjectIconsMap
} from './storageService';
import { 
  getPendingSyncMutations, 
  removeSyncMutation, 
  updateSyncMutation
} from './indexedDbService';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_ERROR';

let currentSyncState: SyncState = typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ONLINE';
const syncListeners = new Set<(state: SyncState) => void>();

/**
 * Notify all subscribers of sync state change
 */
function setSyncState(newState: SyncState) {
  if (currentSyncState !== newState) {
    currentSyncState = newState;
    syncListeners.forEach(fn => fn(newState));
  }
}

/**
 * Check if the device currently has network connectivity
 */
export function isNetworkOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
    ? navigator.onLine 
    : true;
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return currentSyncState;
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  syncListeners.add(listener);
  listener(currentSyncState);
  return () => {
    syncListeners.delete(listener);
  };
}

// Global network event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setSyncState('ONLINE');
  });
  window.addEventListener('offline', () => {
    setSyncState('OFFLINE');
  });
}

/**
 * Process pending offline sync mutations for a user
 */
export async function flushSyncQueue(userId: string): Promise<{ success: boolean; processed: number; errors: number }> {
  if (!isNetworkOnline() || !userId || userId === 'guest') {
    return { success: false, processed: 0, errors: 0 };
  }

  const mutations = await getPendingSyncMutations(userId);
  if (!mutations || mutations.length === 0) {
    setSyncState('ONLINE');
    return { success: true, processed: 0, errors: 0 };
  }

  setSyncState('SYNCING');
  let processed = 0;
  let errors = 0;

  for (const item of mutations) {
    try {
      if (item.table === 'profiles') {
        await pushProfileToCloud(userId, item.payload);
      } else if (item.table === 'user_settings') {
        await pushSettingsToCloud(userId, item.payload);
      } else if (item.table === 'courses') {
        await pushCoursesToCloud(userId, item.payload);
      } else if (item.table === 'custom_events') {
        await pushEventsToCloud(userId, item.payload);
      }

      await removeSyncMutation(item.id, userId);
      processed++;
    } catch (err: any) {
      console.warn(`[SyncQueue] Failed to process mutation ${item.id}:`, err);
      errors++;
      await updateSyncMutation({
        ...item,
        retryCount: item.retryCount + 1,
        syncStatus: 'error',
        lastError: err?.message || 'Sync failed'
      });
    }
  }

  if (errors > 0) {
    setSyncState('SYNC_ERROR');
  } else {
    setSyncState('ONLINE');
  }

  return { success: errors === 0, processed, errors };
}

/**
 * Pull cloud data for the authenticated user and merge with local storage
 * Protects pending un-synced offline edits and custom icons from being overwritten
 */
export async function pullCloudData(userId: string, defaultFullName?: string): Promise<{
  courses: Course[];
  profile: StudentProfile;
  settings: NotificationSettings;
  customEvents: CustomEvent[];
}> {
  // 1. If offline, return local data instantly
  if (!isNetworkOnline()) {
    setSyncState('OFFLINE');
    return {
      courses: getStoredCourses(userId),
      profile: getStoredStudentProfile(userId, defaultFullName),
      settings: getStoredSettings(userId),
      customEvents: getStoredEvents(userId)
    };
  }

  setSyncState('SYNCING');

  try {
    // Check pending mutations before pulling to avoid clobbering uncommitted local changes
    const pending = await getPendingSyncMutations(userId);
    const hasPendingCourses = pending.some(p => p.table === 'courses');
    const hasPendingProfile = pending.some(p => p.table === 'profiles');
    const hasPendingSettings = pending.some(p => p.table === 'user_settings');
    const hasPendingEvents = pending.some(p => p.table === 'custom_events');

    // First flush pending changes if any exist
    if (pending.length > 0) {
      await flushSyncQueue(userId);
    }

    // 1. Profile Sync
    let userProfile = getStoredStudentProfile(userId, defaultFullName);
    if (!hasPendingProfile) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const isCorruptedName = (name?: string) => {
        if (!name) return true;
        const upper = name.toUpperCase().trim();
        return upper.includes('MIDDLE NAME') || upper.includes('SEX FIRST') || upper.includes('FIRST NAME') || upper === 'STUDENT NAME';
      };

      if (profileRow) {
        const resolvedName = (profileRow.full_name && !isCorruptedName(profileRow.full_name))
          ? profileRow.full_name
          : (defaultFullName && !isCorruptedName(defaultFullName))
          ? defaultFullName
          : (!isCorruptedName(userProfile.fullName))
          ? userProfile.fullName
          : defaultFullName || 'Student';

        userProfile = {
          id: profileRow.id,
          fullName: resolvedName,
          studentNumber: profileRow.student_number || userProfile.studentNumber || '',
          program: profileRow.program || userProfile.program || '',
          yearLevel: profileRow.year_level || userProfile.yearLevel || '1ST YEAR',
          section: profileRow.section || userProfile.section || '',
          schoolName: profileRow.school_name || userProfile.schoolName || 'NEMSU',
          academicYear: profileRow.academic_year || userProfile.academicYear || '2026–2027',
          profilePhoto: profileRow.profile_photo_url || userProfile.profilePhoto,
          schoolLogo: profileRow.school_logo_url || userProfile.schoolLogo || 'nemsu_star',
          selectedTheme: (profileRow.selected_theme as any) || userProfile.selectedTheme || 'app-dynamic',
          accentColor: profileRow.accent_color || userProfile.accentColor || '#2563EB',
          useAppTheme: (profileRow as any)?.use_app_theme ?? userProfile.useAppTheme ?? true,
          emergencyContactName: profileRow.emergency_contact_name || userProfile.emergencyContactName || '',
          emergencyContactPhone: profileRow.emergency_contact_phone || userProfile.emergencyContactPhone || '',
          bloodType: profileRow.blood_type || userProfile.bloodType || 'O+'
        };
        saveStudentProfile(userProfile, userId, false);
      } else {
        const cleanDefaultName = defaultFullName && !isCorruptedName(defaultFullName) ? defaultFullName : 'Student';
        const newBlankProfile = { ...userProfile, fullName: userProfile.fullName && !isCorruptedName(userProfile.fullName) ? userProfile.fullName : cleanDefaultName };
        await pushProfileToCloud(userId, newBlankProfile);
        userProfile = newBlankProfile;
        saveStudentProfile(userProfile, userId, false);
      }
    }

    // 2. Settings Sync
    let userSettings = getStoredSettings(userId);
    if (!hasPendingSettings) {
      const { data: settingsRow } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsRow) {
        userSettings = {
          remindersEnabled: settingsRow.reminders_enabled ?? userSettings.remindersEnabled,
          reminderMinutes: settingsRow.reminder_minutes ?? userSettings.reminderMinutes,
          soundEnabled: settingsRow.sound_enabled ?? userSettings.soundEnabled,
          appearanceMode: settingsRow.appearance_mode ?? userSettings.appearanceMode,
          colorTheme: (settingsRow as any).color_theme ?? userSettings.colorTheme ?? 'bluebook',
          subjectCardTheme: (settingsRow as any).color_theme ?? userSettings.subjectCardTheme ?? 'bluebook'
        };
        saveSettings(userSettings, userId, false);
      } else {
        await pushSettingsToCloud(userId, userSettings);
      }
    }

    // 3. Courses & Schedules Sync (with custom icons & color retention)
    let userCourses = getStoredCourses(userId);
    const iconMap = getSubjectIconsMap(userId);

    if (!hasPendingCourses) {
      const { data: coursesRows } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', userId);

      const { data: scheduleRows } = await supabase
        .from('course_schedules')
        .select('*')
        .eq('user_id', userId);

      if (coursesRows && coursesRows.length > 0) {
        userCourses = coursesRows.map(cRow => {
          const matchingSchedules = (scheduleRows || []).filter(s => s.course_id === cRow.id);
          const days = matchingSchedules.map(s => s.day as DayOfWeek);
          const firstSched = matchingSchedules[0];

          // Preserve local customizations (custom icon, color, etc.) if cloud returns null/default
          const localMatch = userCourses.find(lc => lc.id === cRow.id || (lc.courseCode && lc.courseCode === cRow.course_code));
          const resolvedIcon = (cRow as any).icon || localMatch?.icon || iconMap[cRow.id] || (cRow.course_code ? iconMap[cRow.course_code] : undefined) || undefined;
          const resolvedColor = cRow.color || localMatch?.color || '#2563EB';

          return {
            id: cRow.id,
            courseCode: cRow.course_code,
            courseName: cRow.course_name,
            instructor: cRow.instructor || '',
            room: cRow.room || 'TBA',
            units: Number(cRow.units) || 3,
            color: resolvedColor,
            icon: resolvedIcon,
            days: days.length > 0 ? days : ['Mon', 'Thu'],
            startTime: firstSched?.start_time || '08:00',
            endTime: firstSched?.end_time || '09:30'
          };
        });
        saveCourses(userCourses, userId, false);
      } else if (userCourses.length > 0) {
        // If cloud is empty but local has courses, push local courses to cloud backup
        await pushCoursesToCloud(userId, userCourses);
      }
    }

    // 4. Custom Events & Tasks Sync (Graceful)
    let userEvents = getStoredEvents(userId);
    if (!hasPendingEvents) {
      try {
        const { data: eventRows, error: eventErr } = await supabase
          .from('custom_events')
          .select('*')
          .eq('user_id', userId);

        if (!eventErr && eventRows && eventRows.length > 0) {
          userEvents = eventRows.map((r: any) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            date: r.date,
            startTime: r.start_time || undefined,
            endTime: r.end_time || undefined,
            isAllDay: Boolean(r.is_all_day),
            location: r.location || '',
            reminderMinutes: r.reminder_minutes ?? 30,
            notes: r.notes || '',
            color: r.color || undefined,
            isCompleted: Boolean(r.is_completed),
            createdAt: r.created_at || new Date().toISOString()
          }));
          saveEvents(userEvents, userId, false);
        } else if (!eventErr && userEvents.length > 0) {
          await pushEventsToCloud(userId, userEvents);
        }
      } catch {
        // custom_events table is optional in older schemas
      }
    }

    setSyncState('ONLINE');

    return {
      courses: userCourses,
      profile: userProfile,
      settings: userSettings,
      customEvents: userEvents
    };
  } catch (err) {
    console.error('Error during pullCloudData:', err);
    setSyncState(isNetworkOnline() ? 'SYNC_ERROR' : 'OFFLINE');
    return {
      courses: getStoredCourses(userId),
      profile: getStoredStudentProfile(userId, defaultFullName),
      settings: getStoredSettings(userId),
      customEvents: getStoredEvents(userId)
    };
  }
}

/**
 * Push local Profile to Supabase
 */
export async function pushProfileToCloud(userId: string, profile: StudentProfile): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    const { error } = await supabase.from('profiles').upsert({
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
      use_app_theme: profile.useAppTheme ?? true,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_phone: profile.emergencyContactPhone,
      blood_type: profile.bloodType,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.warn('[SyncService] Profile upsert warning:', error);
    }
  } catch (err) {
    console.error('Failed to push profile to cloud:', err);
    throw err;
  }
}

/**
 * Push local Settings to Supabase
 */
export async function pushSettingsToCloud(userId: string, settings: NotificationSettings): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      reminders_enabled: settings.remindersEnabled,
      reminder_minutes: settings.reminderMinutes,
      sound_enabled: settings.soundEnabled,
      appearance_mode: settings.appearanceMode,
      color_theme: settings.colorTheme || settings.subjectCardTheme || 'bluebook',
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.warn('[SyncService] Settings upsert warning:', error);
    }
  } catch (err) {
    console.error('Failed to push settings to cloud:', err);
    throw err;
  }
}

/**
 * Push local Courses and Schedules to Supabase (with schema-safe fallback for custom columns)
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

    // 2. Upsert courses with icon
    const coursePayloads = courses.map(c => ({
      id: c.id,
      user_id: userId,
      course_code: c.courseCode,
      course_name: c.courseName,
      instructor: c.instructor,
      room: c.room,
      units: c.units || 3,
      color: c.color || '#2563EB',
      icon: c.icon || null,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertErr } = await supabase.from('courses').upsert(coursePayloads);

    if (upsertErr) {
      // If icon column does not exist in Supabase Postgres schema, retry without icon column
      if (upsertErr.message?.includes('icon') || upsertErr.code === '42703' || upsertErr.code === 'PGRST204') {
        const fallbackPayloads = coursePayloads.map(({ icon, ...rest }) => rest);
        const { error: fallbackErr } = await supabase.from('courses').upsert(fallbackPayloads);
        if (fallbackErr) {
          console.warn('[SyncService] Fallback courses upsert warning:', fallbackErr);
        }
      } else {
        console.warn('[SyncService] Courses upsert warning:', upsertErr);
      }
    }

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
    throw err;
  }
}

/**
 * Push local Custom Events / Tasks to Supabase
 */
export async function pushEventsToCloud(userId: string, events: CustomEvent[]): Promise<void> {
  if (!isNetworkOnline()) return;

  try {
    const { data: existingEvents, error: fetchErr } = await supabase
      .from('custom_events')
      .select('id')
      .eq('user_id', userId);

    if (fetchErr) {
      // Table may not exist yet in Supabase schema
      return;
    }

    const localIds = new Set(events.map(e => e.id));
    const toDeleteIds = (existingEvents || [])
      .map(e => e.id)
      .filter(id => !localIds.has(id));

    if (toDeleteIds.length > 0) {
      await supabase
        .from('custom_events')
        .delete()
        .eq('user_id', userId)
        .in('id', toDeleteIds);
    }

    if (events.length === 0) return;

    const payloads = events.map(e => ({
      id: e.id,
      user_id: userId,
      title: e.title,
      category: e.category,
      date: e.date,
      start_time: e.startTime || null,
      end_time: e.endTime || null,
      is_all_day: e.isAllDay,
      location: e.location || null,
      reminder_minutes: e.reminderMinutes,
      notes: e.notes || null,
      color: e.color || null,
      is_completed: e.isCompleted || false,
      updated_at: new Date().toISOString()
    }));

    await supabase.from('custom_events').upsert(payloads);
  } catch (err) {
    console.warn('[SyncService] Custom events cloud sync skipped:', err);
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
