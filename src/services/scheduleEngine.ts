import {
  Course,
  DayOfWeek,
  ScheduleConflict,
  FreeTimeGap,
  DayScheduleInfo,
  ActiveClassState
} from '../types';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

export function formatTime12H(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Detects schedule overlaps on any day
 */
export function detectScheduleConflicts(courses: Course[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  DAYS_OF_WEEK.forEach(day => {
    const dayCourses = courses.filter(c => c.days.includes(day));
    for (let i = 0; i < dayCourses.length; i++) {
      for (let j = i + 1; j < dayCourses.length; j++) {
        const c1 = dayCourses[i];
        const c2 = dayCourses[j];

        const start1 = timeToMinutes(c1.startTime);
        const end1 = timeToMinutes(c1.endTime);
        const start2 = timeToMinutes(c2.startTime);
        const end2 = timeToMinutes(c2.endTime);

        // Check overlap
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
          const overlapMins = overlapEnd - overlapStart;
          conflicts.push({
            id: `conflict_${c1.id}_${c2.id}_${day}`,
            course1: c1,
            course2: c2,
            day,
            overlapMinutes: overlapMins,
            message: `${c1.courseCode} and ${c2.courseCode} overlap by ${formatDuration(overlapMins)} on ${day}.`
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Calculates free time gaps between classes for a specific day
 */
export function calculateFreeTimeGaps(courses: Course[], day: DayOfWeek): FreeTimeGap[] {
  const dayCourses = courses
    .filter(c => c.days.includes(day))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (dayCourses.length <= 1) return [];

  const gaps: FreeTimeGap[] = [];
  for (let i = 0; i < dayCourses.length - 1; i++) {
    const curr = dayCourses[i];
    const next = dayCourses[i + 1];

    const currEnd = timeToMinutes(curr.endTime);
    const nextStart = timeToMinutes(next.startTime);

    if (nextStart > currEnd) {
      const durationMins = nextStart - currEnd;
      gaps.push({
        id: `gap_${curr.id}_${next.id}_${day}`,
        day,
        startTime: curr.endTime,
        endTime: next.startTime,
        durationMinutes: durationMins,
        formattedDuration: formatDuration(durationMins),
        prevCourseCode: curr.courseCode,
        nextCourseCode: next.courseCode
      });
    }
  }

  return gaps;
}

/**
 * Gets aggregated schedule information for a given day
 */
export function getDayScheduleInfo(courses: Course[], day: DayOfWeek): DayScheduleInfo {
  const dayCourses = courses
    .filter(c => c.days.includes(day))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const gaps = calculateFreeTimeGaps(courses, day);
  const totalFreeTimeMinutes = gaps.reduce((acc, g) => acc + g.durationMinutes, 0);

  return {
    day,
    courses: dayCourses,
    freeTimeGaps: gaps,
    totalFreeTimeMinutes,
    firstClassStart: dayCourses.length > 0 ? dayCourses[0].startTime : undefined,
    lastClassEnd: dayCourses.length > 0 ? dayCourses[dayCourses.length - 1].endTime : undefined
  };
}

/**
 * Computes current or next class based on reference time
 */
export function getActiveClassState(courses: Course[], refDate = new Date()): ActiveClassState {
  const dayIndex = refDate.getDay(); // 0 = Sun, 1 = Mon ...
  const dayNames: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[dayIndex];

  const currentMinutes = refDate.getHours() * 60 + refDate.getMinutes();

  const todayCourses = courses
    .filter(c => c.days.includes(currentDay))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Check CURRENT class
  const activeCurrent = todayCourses.find(c => {
    const s = timeToMinutes(c.startTime);
    const e = timeToMinutes(c.endTime);
    return currentMinutes >= s && currentMinutes < e;
  });

  if (activeCurrent) {
    const endMins = timeToMinutes(activeCurrent.endTime);
    const minsRemaining = Math.max(0, endMins - currentMinutes);
    return {
      type: 'CURRENT',
      course: activeCurrent,
      minutesRemaining: minsRemaining,
      formattedCountdown: formatDuration(minsRemaining),
      statusText: `Ends in ${formatDuration(minsRemaining)}`
    };
  }

  // Check NEXT class today
  const activeNext = todayCourses.find(c => {
    const s = timeToMinutes(c.startTime);
    return currentMinutes < s;
  });

  if (activeNext) {
    const startMins = timeToMinutes(activeNext.startTime);
    const minsRemaining = Math.max(0, startMins - currentMinutes);
    return {
      type: 'NEXT',
      course: activeNext,
      minutesRemaining: minsRemaining,
      formattedCountdown: formatDuration(minsRemaining),
      statusText: `Starts in ${formatDuration(minsRemaining)}`
    };
  }

  // If no more classes today, do not show tomorrow's class as UP NEXT
  // so the Home screen can celebrate finishing all classes for the day
  return {
    type: 'NONE',
    course: null,
    minutesRemaining: 0,
    formattedCountdown: '',
    statusText: todayCourses.length > 0 ? 'All classes completed today' : 'No scheduled classes today'
  };
}

/**
 * Returns a cohesive background gradient for subject cards based on the selected theme
 */
export function getSubjectCardGradient(
  index: number,
  total: number = 5,
  theme: 'blue-cascade' | 'dual-tone' | 'rainbow' = 'blue-cascade'
): string {
  if (theme === 'dual-tone') {
    // 2-Tone Alternating: Schedly Electric Blue & Deep Midnight Slate
    return index % 2 === 0
      ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' // Vibrant Electric Royal Blue
      : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'; // Deep Midnight Slate
  }

  if (theme === 'rainbow') {
    const rainbowPalettes = [
      'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', // Electric Indigo
      'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Ocean Blue
      'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald Green
      'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', // Sunset Rose
      'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Royal Purple
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber Gold
      'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', // Cyber Teal
      'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'  // Neon Pink
    ];
    return rainbowPalettes[index % rainbowPalettes.length];
  }

  // 'blue-cascade' (Default - Tonal Monochromatic Blue Cascade matching attached design)
  const cascadeGradients = [
    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', // Light/Medium Royal Blue (Top of stack)
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Royal Blue
    'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)', // Cobalt Blue
    'linear-gradient(135deg, #1E40AF 0%, #172554 100%)', // Deep Navy
    'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)', // Midnight Indigo
    'linear-gradient(135deg, #0F172A 0%, #090D16 100%)'  // Obsidian Navy (Bottom of stack)
  ];

  if (total <= 1) return cascadeGradients[1];
  const step = Math.min(index, cascadeGradients.length - 1);
  return cascadeGradients[step];
}
