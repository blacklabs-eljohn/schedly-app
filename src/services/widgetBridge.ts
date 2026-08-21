import { registerPlugin, Capacitor } from '@capacitor/core';
import { Course, StudentProfile, DayOfWeek } from '../types';

interface WidgetBridgePlugin {
  updateWidgets(options: {
    upNext?: string;
    todaySchedule?: string;
    dayName?: string;
    profile?: string;
  }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * Convert 24h "HH:MM" string to 12h formatted e.g. "8:00 AM"
 */
function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

/**
 * Sync current schedule and profile state to Android Native Widgets
 */
export async function syncWidgetsData(
  courses: Course[],
  profile: StudentProfile,
  todayDay: DayOfWeek = 'Mon'
): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    // 1. Calculate today's classes
    const todayClasses = courses
      .filter(c => c.days && c.days.includes(todayDay))
      .map(c => ({
        title: `${c.courseCode} - ${c.courseName}`,
        room: c.room || 'Room TBD',
        time: `${formatTime12h(c.startTime)} - ${formatTime12h(c.endTime)}`
      }));

    // 2. Calculate up next class
    let upNextData: any = null;
    if (todayClasses.length > 0) {
      upNextData = {
        title: todayClasses[0].title,
        details: todayClasses[0].room,
        time: todayClasses[0].time,
        countdown: 'Up Next'
      };
    }

    // 3. Profile Data
    const profileData = {
      schoolName: profile.schoolName || 'NEMSU',
      fullName: profile.fullName || 'Student Name',
      program: profile.program || 'College Program',
      studentId: profile.studentNumber || 'ID: ---',
      academicYear: profile.academicYear || '2026-2027'
    };

    const dayNameMap: Record<DayOfWeek, string> = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
      Sun: 'Sunday'
    };

    await WidgetBridge.updateWidgets({
      upNext: upNextData ? JSON.stringify(upNextData) : undefined,
      todaySchedule: JSON.stringify(todayClasses),
      dayName: dayNameMap[todayDay] || 'Today',
      profile: JSON.stringify(profileData)
    });
  } catch (err) {
    console.warn('[WidgetBridge] Failed to update Android widgets:', err);
  }
}
