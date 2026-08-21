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

  // Check upcoming days if no classes left today
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayIdx = (dayIndex + offset) % 7;
    const nextDayName = dayNames[nextDayIdx];
    const nextDayCourses = courses
      .filter(c => c.days.includes(nextDayName))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (nextDayCourses.length > 0) {
      const firstUpcoming = nextDayCourses[0];
      const dayLabel = offset === 1 ? 'Tomorrow' : nextDayName;
      return {
        type: 'NEXT',
        course: firstUpcoming,
        minutesRemaining: 1440,
        formattedCountdown: `${dayLabel} at ${formatTime12H(firstUpcoming.startTime)}`,
        statusText: `Next class on ${dayLabel} at ${formatTime12H(firstUpcoming.startTime)}`
      };
    }
  }

  return {
    type: 'NONE',
    course: null,
    minutesRemaining: 0,
    formattedCountdown: '',
    statusText: 'No scheduled classes'
  };
}
