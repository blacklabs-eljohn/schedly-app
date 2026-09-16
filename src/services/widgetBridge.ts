import { registerPlugin, Capacitor } from '@capacitor/core';
import { Course, StudentProfile, DayOfWeek, CustomEvent } from '../types';
import { getActiveClassState, timeToMinutes } from './scheduleEngine';

interface WidgetBridgePlugin {
  updateWidgets(options: {
    upNext?: string;
    todaySchedule?: string;
    dayName?: string;
    profile?: string;
    calendarEvents?: string;
    reminders?: string;
    themeMode?: string;
    colorTheme?: string;
  }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * Convert 24h "HH:MM" string to 12h formatted e.g. "8:00 AM"
 */
function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

/**
 * Format minutes into clean human readable string (e.g., "2h 15m" or "45m")
 */
function formatMinutesHuman(mins: number): string {
  if (mins <= 0) return 'NOW';
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMinutes}m`;
}

/**
 * Client-side avatar compressor using offscreen canvas to prevent Android IPC transaction limits
 */
async function compressAvatarForWidget(photoUrl?: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  if (!photoUrl.startsWith('data:image') && !photoUrl.startsWith('http') && !photoUrl.startsWith('blob:') && !photoUrl.startsWith('file:') && !photoUrl.startsWith('capacitor:')) {
    return photoUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Canvas error fallback
        }
        resolve(photoUrl.length < 60000 ? photoUrl : null);
      };
      img.onerror = () => resolve(photoUrl.length < 60000 ? photoUrl : null);
      img.src = photoUrl;
    } catch {
      resolve(photoUrl.length < 60000 ? photoUrl : null);
    }
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  exam: '#EF4444',
  long_quiz: '#F59E0B',
  short_quiz: '#F59E0B',
  quiz: '#F59E0B',
  assignment: '#3B82F6',
  reporting: '#8B5CF6',
  project: '#10B981',
  meeting: '#06B6D4',
  task: '#EC4899',
  reminder: '#6366F1'
};

const DEADLINE_CATEGORIES = new Set([
  'exam', 'long_quiz', 'short_quiz', 'quiz', 'assignment', 'reporting', 'project', 'task'
]);

/**
 * Sync current schedule, up next/in progress, profile, calendar events, and reminders with active theme to Android Native Widgets
 */
export async function syncWidgetsData(
  courses: Course[],
  profile: StudentProfile,
  todayDay: DayOfWeek = 'Mon',
  activeTheme: string = 'bluebook',
  themeMode: 'light' | 'dark' = 'light',
  customEvents: CustomEvent[] = []
): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayIso = now.toISOString().split('T')[0];

    // 1. Calculate today's classes sorted by start time
    const todayClasses = (courses || [])
      .filter(c => c.days && c.days.includes(todayDay))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
      .map(c => {
        const s = timeToMinutes(c.startTime);
        const e = timeToMinutes(c.endTime);
        const isOngoing = currentMinutes >= s && currentMinutes < e;
        return {
          title: `${c.courseCode} - ${c.courseName}`,
          room: c.room || 'Room TBD',
          time: `${formatTime12h(c.startTime)} - ${formatTime12h(c.endTime)}`,
          isOngoing
        };
      });

    // 2. Real-time active / upcoming class state with rich Bento info
    const activeState = getActiveClassState(courses || []);
    let upNextData: any = null;

    // Calculate remaining classes today
    const remainingClassesCount = (courses || []).filter(c => {
      if (!c.days || !c.days.includes(todayDay)) return false;
      return timeToMinutes(c.endTime) > currentMinutes;
    }).length;

    if (activeState.type === 'CURRENT' && activeState.course) {
      const c = activeState.course;
      const startMins = timeToMinutes(c.startTime);
      const endMins = timeToMinutes(c.endTime);
      const totalDuration = Math.max(1, endMins - startMins);
      const elapsed = Math.max(0, currentMinutes - startMins);
      const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      const remainingMins = Math.max(0, endMins - currentMinutes);
      const countdownStr = `Ends in ${formatMinutesHuman(remainingMins)}`;

      upNextData = {
        type: 'CURRENT',
        statusBadge: 'IN PROGRESS',
        countdownBadge: countdownStr,
        title: c.courseName || c.courseCode,
        courseCode: c.courseCode || 'CLASS',
        courseName: c.courseName || 'Lecture Session',
        room: c.room ? `Room ${c.room}` : 'Room TBD',
        instructor: c.instructor ? `Prof. ${c.instructor}` : 'Instructor TBD',
        timeSpan: `${formatTime12h(c.startTime)} – ${formatTime12h(c.endTime)}`,
        startTime: formatTime12h(c.startTime),
        endTime: formatTime12h(c.endTime),
        progress,
        primaryGaugeText: `${progress}%`,
        secondaryGaugeText: 'IN PROGRESS',
        bottomText: countdownStr,
        countdown: countdownStr,
        remainingClassesCount
      };
    } else if (activeState.type === 'NEXT' && activeState.course) {
      const c = activeState.course;
      const startMins = timeToMinutes(c.startTime);
      const minutesUntil = Math.max(0, startMins - currentMinutes);
      const countdownStr = minutesUntil > 0 ? `Starts in ${formatMinutesHuman(minutesUntil)}` : `Starts ${formatTime12h(c.startTime)}`;

      upNextData = {
        type: 'NEXT',
        statusBadge: 'UP NEXT',
        countdownBadge: countdownStr,
        title: c.courseName || c.courseCode,
        courseCode: c.courseCode || 'CLASS',
        courseName: c.courseName || 'Upcoming Session',
        room: c.room ? `Room ${c.room}` : 'Room TBD',
        instructor: c.instructor ? `Prof. ${c.instructor}` : 'Instructor TBD',
        timeSpan: `${formatTime12h(c.startTime)} – ${formatTime12h(c.endTime)}`,
        startTime: formatTime12h(c.startTime),
        endTime: formatTime12h(c.endTime),
        progress: 15,
        primaryGaugeText: formatTime12h(c.startTime),
        secondaryGaugeText: 'UP NEXT',
        bottomText: countdownStr,
        countdown: countdownStr,
        remainingClassesCount
      };
    } else {
      // Type is NONE - Celebration / Rest day
      if (todayClasses.length > 0) {
        upNextData = {
          type: 'NONE',
          statusBadge: 'ALL DONE',
          countdownBadge: 'Done for Day',
          courseCode: 'ALL DONE 🎉',
          courseName: 'All classes completed for today',
          room: 'Great Job Today!',
          instructor: 'See you tomorrow ✨',
          timeSpan: `${todayClasses.length} Classes Completed`,
          progress: 100,
          primaryGaugeText: '100%',
          secondaryGaugeText: 'ALL DONE',
          bottomText: 'CLASSES COMPLETED 🎉',
          emptyTitle: '🎉 All Done for Today!',
          emptySubtitle: 'All classes completed. Enjoy your evening!',
          remainingClassesCount: 0
        };
      } else {
        upNextData = {
          type: 'NONE',
          statusBadge: 'REST DAY',
          countdownBadge: 'Free Day',
          courseCode: 'REST DAY 🌴',
          courseName: 'No classes scheduled today',
          room: 'Time to Recharge ✨',
          instructor: 'Enjoy your free time',
          timeSpan: 'Free Schedule',
          progress: 100,
          primaryGaugeText: 'REST',
          secondaryGaugeText: 'FREE DAY',
          bottomText: 'NO CLASSES TODAY 🌴',
          emptyTitle: '🌴 Rest Day',
          emptySubtitle: 'No classes scheduled today. Time to recharge!',
          remainingClassesCount: 0
        };
      }
    }

    // 3. Compress profile photo safely to prevent IPC drop
    const compressedPhoto = await compressAvatarForWidget(profile.profilePhoto);

    // 4. Profile Data matching exact card layout & active theme
    const profileData = {
      schoolName: profile.schoolName || 'NEMSU',
      fullName: profile.fullName || 'Vanessa Cacabelos',
      program: profile.program || 'BS TOURISM MANAGEMENT',
      yearLevel: profile.yearLevel || '3RD YEAR',
      section: profile.section || 'TM-3B',
      academicYear: profile.academicYear || '2026–2027',
      studentId: profile.studentNumber || '2026-10492',
      profilePhoto: compressedPhoto,
      themeId: activeTheme || 'bluebook'
    };

    // 5. Process Calendar Events & Deadlines for Bento + Square Calendar Widgets
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const sortedEvents = [...(customEvents || [])]
      .filter(e => !e.isCompleted)
      .sort((a, b) => {
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      });

    const formatEventTime = (e: CustomEvent): string => {
      if (e.date === todayIso) {
        return `Today · ${formatTime12h(e.startTime) || 'All Day'}`;
      }
      const eventDate = new Date(e.date);
      const diffDays = Math.round((eventDate.getTime() - new Date(todayIso).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return `Tomorrow · ${formatTime12h(e.startTime) || 'All Day'}`;
      if (diffDays > 1 && diffDays < 7) {
        return `${DAY_NAMES[eventDate.getDay()]} · ${formatTime12h(e.startTime) || 'All Day'}`;
      }
      return `${e.date} · ${formatTime12h(e.startTime) || 'All Day'}`;
    };

    const nextEventObj = sortedEvents[0] ? {
      title: sortedEvents[0].title,
      subjectCode: sortedEvents[0].subjectCode || '',
      subjectName: sortedEvents[0].subjectName || sortedEvents[0].subjectCode || 'Academic Task',
      category: sortedEvents[0].category || 'Task',
      categoryColor: CATEGORY_COLORS[sortedEvents[0].category] || '#EC4899',
      time: formatEventTime(sortedEvents[0])
    } : null;

    const upcomingList = sortedEvents.slice(0, 3).map(e => ({
      title: e.title,
      category: e.category,
      categoryColor: CATEGORY_COLORS[e.category] || '#EC4899',
      time: formatEventTime(e),
      isCompleted: !!e.isCompleted
    }));

    // Smart calculation of Deliverables (Due) vs Campus/Department Events
    const dueCount = sortedEvents.filter(e => DEADLINE_CATEGORIES.has(e.category)).length;
    const eventCount = sortedEvents.filter(e => !DEADLINE_CATEGORIES.has(e.category)).length;

    let badgeText = '0 Due';
    if (dueCount > 0 && eventCount === 0) {
      badgeText = `${dueCount} ${dueCount === 1 ? 'Due' : 'Due'}`;
    } else if (dueCount === 0 && eventCount > 0) {
      badgeText = `${eventCount} ${eventCount === 1 ? 'Event' : 'Events'}`;
    } else if (dueCount > 0 && eventCount > 0) {
      badgeText = `${dueCount} Due · ${eventCount} ${eventCount === 1 ? 'Event' : 'Events'}`;
    } else {
      badgeText = 'All Clear';
    }

    const calendarData = {
      monthName: MONTH_NAMES[now.getMonth()],
      dayOfMonth: `${now.getDate()}`,
      dayOfWeek: DAY_NAMES[now.getDay()],
      totalDue: sortedEvents.length,
      dueCount,
      eventCount,
      badgeText,
      nextEvent: nextEventObj,
      upcomingList,
      secondaryEventText: sortedEvents[1] ? `Next: ${sortedEvents[1].title} (${formatEventTime(sortedEvents[1])})` : ''
    };

    // 6. Process Academic Reminders / Checklist Widget
    const allReminders = [...(customEvents || [])].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return (a.date || '').localeCompare(b.date || '');
    });

    const completedCount = allReminders.filter(e => e.isCompleted).length;
    const totalCount = allReminders.length;

    const remindersData = {
      totalCount,
      completedCount,
      progressText: totalCount > 0 ? `${completedCount} of ${totalCount} Done` : '0 Tasks Due',
      items: allReminders.slice(0, 3).map(e => ({
        id: e.id,
        title: e.title,
        subjectCode: e.subjectCode || '',
        dueTime: formatEventTime(e),
        category: e.category,
        categoryColor: CATEGORY_COLORS[e.category] || '#EC4899',
        isCompleted: !!e.isCompleted
      }))
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
      upNext: JSON.stringify(upNextData),
      todaySchedule: JSON.stringify(todayClasses),
      dayName: dayNameMap[todayDay] || 'Today',
      profile: JSON.stringify(profileData),
      calendarEvents: JSON.stringify(calendarData),
      reminders: JSON.stringify(remindersData),
      themeMode: themeMode,
      colorTheme: activeTheme
    });
  } catch (err) {
    console.warn('[WidgetBridge] Failed to update Android widgets:', err);
  }
}
