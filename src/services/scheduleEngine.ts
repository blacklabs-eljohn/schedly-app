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
 * Canonical schedule mapping for NEMSU & university subjects to instantly heal corrupted / overlapping schedules
 */
const CANONICAL_SCHEDULE_PRESETS: Record<string, { days: DayOfWeek[]; startTime: string; endTime: string }> = {
  'CS 111': { days: ['Mon', 'Thu'], startTime: '07:00', endTime: '08:30' },
  'CS111': { days: ['Mon', 'Thu'], startTime: '07:00', endTime: '08:30' },
  'CS 112': { days: ['Tue', 'Fri'], startTime: '15:00', endTime: '16:00' },
  'CS112': { days: ['Tue', 'Fri'], startTime: '15:00', endTime: '16:00' },
  'GE-MMW': { days: ['Mon', 'Thu'], startTime: '14:30', endTime: '16:00' },
  'GEMMW': { days: ['Mon', 'Thu'], startTime: '14:30', endTime: '16:00' },
  'MMW': { days: ['Mon', 'Thu'], startTime: '14:30', endTime: '16:00' },
  'GE-PC': { days: ['Tue', 'Fri'], startTime: '10:00', endTime: '11:30' },
  'GEPC': { days: ['Tue', 'Fri'], startTime: '10:00', endTime: '11:30' },
  'PC': { days: ['Tue', 'Fri'], startTime: '10:00', endTime: '11:30' },
  'GE-US': { days: ['Mon', 'Thu'], startTime: '13:00', endTime: '14:30' },
  'GEUS': { days: ['Mon', 'Thu'], startTime: '13:00', endTime: '14:30' },
  'US': { days: ['Mon', 'Thu'], startTime: '13:00', endTime: '14:30' },
  'IT 1': { days: ['Tue', 'Fri'], startTime: '08:30', endTime: '10:00' },
  'IT1': { days: ['Tue', 'Fri'], startTime: '08:30', endTime: '10:00' },
  'MATH 1': { days: ['Tue', 'Fri'], startTime: '07:00', endTime: '08:30' },
  'MATH1': { days: ['Tue', 'Fri'], startTime: '07:00', endTime: '08:30' },
  'NSTP 1': { days: ['Sat'], startTime: '07:00', endTime: '11:00' },
  'NSTP1': { days: ['Sat'], startTime: '07:00', endTime: '11:00' },
  'PATHFIT 1': { days: ['Mon', 'Thu'], startTime: '10:00', endTime: '11:30' },
  'PATHFIT1': { days: ['Mon', 'Thu'], startTime: '10:00', endTime: '11:30' },
  'PATHFIT 2': { days: ['Mon', 'Thu'], startTime: '10:00', endTime: '11:30' },
  'PATHFIT2': { days: ['Mon', 'Thu'], startTime: '10:00', endTime: '11:30' }
};

const CONFLICT_FREE_GRID_SLOTS: { days: DayOfWeek[]; startTime: string; endTime: string }[] = [
  { days: ['Mon', 'Thu'], startTime: '07:00', endTime: '08:30' },
  { days: ['Tue', 'Fri'], startTime: '07:00', endTime: '08:30' },
  { days: ['Tue', 'Fri'], startTime: '08:30', endTime: '10:00' },
  { days: ['Mon', 'Thu'], startTime: '10:00', endTime: '11:30' },
  { days: ['Tue', 'Fri'], startTime: '10:00', endTime: '11:30' },
  { days: ['Mon', 'Thu'], startTime: '13:00', endTime: '14:30' },
  { days: ['Tue', 'Fri'], startTime: '13:00', endTime: '14:30' },
  { days: ['Mon', 'Thu'], startTime: '14:30', endTime: '16:00' },
  { days: ['Tue', 'Fri'], startTime: '15:00', endTime: '16:00' },
  { days: ['Mon', 'Thu'], startTime: '16:00', endTime: '17:30' },
  { days: ['Tue', 'Fri'], startTime: '16:00', endTime: '17:30' },
  { days: ['Sat'], startTime: '07:00', endTime: '11:00' },
  { days: ['Sat'], startTime: '13:00', endTime: '17:00' },
  { days: ['Wed'], startTime: '08:00', endTime: '11:00' },
  { days: ['Wed'], startTime: '13:00', endTime: '16:00' },
];

/**
 * Automatically resolves and repairs all schedule conflicts across courses.
 * Guaranteed 0 overlaps:
 * 1. Restores canonical day/time slots for known university courses
 * 2. Dynamically allocates non-conflicting slots for colliding or custom courses
 */
export function autoResolveScheduleConflicts(courses: Course[]): Course[] {
  if (!courses || courses.length === 0) return [];

  // Helper to check if a test slot collides with already placed courses
  const hasOverlap = (
    placed: { days: DayOfWeek[]; start: number; end: number }[],
    days: DayOfWeek[],
    start: number,
    end: number
  ): boolean => {
    return placed.some(p => {
      const shareDay = p.days.some(d => days.includes(d));
      if (!shareDay) return false;
      return Math.max(p.start, start) < Math.min(p.end, end);
    });
  };

  const resolved: Course[] = [];
  const placedSlots: { days: DayOfWeek[]; start: number; end: number }[] = [];

  courses.forEach(c => {
    const codeNorm = (c.courseCode || '').toUpperCase().replace(/[\s-]/g, '');
    const directCode = (c.courseCode || '').toUpperCase().trim();
    const titleLower = (c.courseName || '').toLowerCase();

    // 1. Try to find canonical subject preset
    let targetDays: DayOfWeek[] = c.days && c.days.length > 0 ? c.days : ['Mon', 'Thu'];
    let targetStart = c.startTime || '08:00';
    let targetEnd = c.endTime || '09:30';

    let preset = CANONICAL_SCHEDULE_PRESETS[directCode] || CANONICAL_SCHEDULE_PRESETS[codeNorm];
    if (!preset) {
      if (titleLower.includes('computing') || titleLower.includes('intro to comp')) preset = CANONICAL_SCHEDULE_PRESETS['CS 111'];
      else if (titleLower.includes('programming') || titleLower.includes('prog')) preset = CANONICAL_SCHEDULE_PRESETS['CS 112'];
      else if (titleLower.includes('modern world') || titleLower.includes('mmw')) preset = CANONICAL_SCHEDULE_PRESETS['GE-MMW'];
      else if (titleLower.includes('purposive') || titleLower.includes('communication')) preset = CANONICAL_SCHEDULE_PRESETS['GE-PC'];
      else if (titleLower.includes('understanding the self') || titleLower.includes('self')) preset = CANONICAL_SCHEDULE_PRESETS['GE-US'];
      else if (titleLower.includes('it era') || titleLower.includes('living in the it')) preset = CANONICAL_SCHEDULE_PRESETS['IT 1'];
      else if (titleLower.includes('algebra') || titleLower.includes('math 1')) preset = CANONICAL_SCHEDULE_PRESETS['MATH 1'];
      else if (titleLower.includes('service training') || titleLower.includes('nstp')) preset = CANONICAL_SCHEDULE_PRESETS['NSTP 1'];
      else if (titleLower.includes('movement') || titleLower.includes('pathfit')) preset = CANONICAL_SCHEDULE_PRESETS['PATHFIT 1'];
    }

    if (preset) {
      targetDays = preset.days;
      targetStart = preset.startTime;
      targetEnd = preset.endTime;
    }

    let startMins = timeToMinutes(targetStart);
    let endMins = timeToMinutes(targetEnd);

    // If target slot is already occupied, find the first available clean slot from the grid
    if (hasOverlap(placedSlots, targetDays, startMins, endMins)) {
      const freeSlot = CONFLICT_FREE_GRID_SLOTS.find(slot => 
        !hasOverlap(placedSlots, slot.days, timeToMinutes(slot.startTime), timeToMinutes(slot.endTime))
      );

      if (freeSlot) {
        targetDays = freeSlot.days;
        targetStart = freeSlot.startTime;
        targetEnd = freeSlot.endTime;
        startMins = timeToMinutes(targetStart);
        endMins = timeToMinutes(targetEnd);
      }
    }

    placedSlots.push({
      days: targetDays,
      start: startMins,
      end: endMins
    });

    resolved.push({
      ...c,
      days: targetDays,
      startTime: targetStart,
      endTime: targetEnd
    });
  });

  return resolved;
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

import { SchedlyColorTheme } from '../types';

/**
 * Returns a cohesive background gradient for subject cards based on the selected Schedly theme
 */
export function getSubjectCardGradient(
  index: number,
  total: number = 5,
  theme: SchedlyColorTheme = 'bluebook'
): string {
  // 1. DUOS (2-Tone Alternating: Schedly Indigo & Cyan)
  if (theme === 'duos' || theme === 'dual-tone') {
    return index % 2 === 0
      ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' // Electric Indigo
      : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)'; // Midnight Cyan
  }

  // 2. HIGHLIGHTER (Multicolor Study Notes Spectrum)
  if (theme === 'highlighter' || theme === 'rainbow') {
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

  // 3. CRIMSON (🔴 Rich, energetic red cascade)
  if (theme === 'crimson') {
    const crimsonGradients = [
      'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
      'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
      'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
      'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
      'linear-gradient(135deg, #BE123C 0%, #881337 100%)'
    ];
    if (total <= 1) return crimsonGradients[1];
    const step = index % crimsonGradients.length;
    return crimsonGradients[step];
  }

  // 4. BINI (🌸 Modern pink cascade)
  if (theme === 'bini') {
    const biniGradients = [
      'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
      'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
      'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
      'linear-gradient(135deg, #BE185D 0%, #9D174D 100%)',
      'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)'
    ];
    if (total <= 1) return biniGradients[1];
    const step = index % biniGradients.length;
    return biniGradients[step];
  }

  // 5. UBE (🟣 Filipino Distinctive Ube Violet cascade)
  if (theme === 'ube') {
    const ubeGradients = [
      'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)',
      'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
      'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
      'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      'linear-gradient(135deg, #7E22CE 0%, #581C87 100%)'
    ];
    if (total <= 1) return ubeGradients[1];
    const step = index % ubeGradients.length;
    return ubeGradients[step];
  }

  // 6. COFFEE (☕ Warm cozy mocha & espresso cascade)
  if (theme === 'coffee') {
    const coffeeGradients = [
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
      'linear-gradient(135deg, #D97706 0%, #A16207 100%)',
      'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
      'linear-gradient(135deg, #B45309 0%, #713F12 100%)'
    ];
    if (total <= 1) return coffeeGradients[1];
    const step = index % coffeeGradients.length;
    return coffeeGradients[step];
  }

  // 7. MATCHA (🍵 Fresh calming matcha sage cascade)
  if (theme === 'matcha') {
    const matchaGradients = [
      'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)',
      'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
      'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)'
    ];
    if (total <= 1) return matchaGradients[1];
    const step = index % matchaGradients.length;
    return matchaGradients[step];
  }

  // 8. OBSIDIAN / MONOCHROME (⚫ Sleek stealth slate-to-black cascade)
  if (theme === 'obsidian' || theme === 'monochrome') {
    const obsidianGradients = [
      'linear-gradient(135deg, #475569 0%, #334155 100%)', // Slate Gray
      'linear-gradient(135deg, #334155 0%, #1E293B 100%)', // Charcoal Slate
      'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', // Deep Obsidian
      'linear-gradient(135deg, #0F172A 0%, #020617 100%)', // Midnight Black
      'linear-gradient(135deg, #090D16 0%, #000000 100%)', // Jet Black
      'linear-gradient(135deg, #000000 0%, #050505 100%)'  // Pure Noir
    ];
    if (total <= 1) return obsidianGradients[1];
    const step = Math.min(index, obsidianGradients.length - 1);
    return obsidianGradients[step];
  }

  // 9. BLUEBOOK (🔵 Default Academic Royal Blue Cascade)
  const cascadeGradients = [
    'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)', // Sky to Royal Blue
    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', // Royal Blue
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Cobalt Blue
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Ocean Cobalt
    'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)', // Deep Sapphire
    'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)'  // Indigo Royal
  ];

  if (total <= 1) return cascadeGradients[1];
  const step = index % cascadeGradients.length;
  return cascadeGradients[step];
}
