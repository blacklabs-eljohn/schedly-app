import React, { useState, useEffect } from 'react';
import { Course, DayOfWeek, FreeTimeGap, isLaboratoryCourse } from '../types';
import { 
  DAYS_OF_WEEK, 
  timeToMinutes, 
  getDayScheduleInfo, 
  formatTime12H, 
  detectScheduleConflicts 
} from '../services/scheduleEngine';
import { getHolidayForDayInCurrentWeek } from '../services/phHolidaysService';
import { 
  MapPin, 
  User, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  Utensils, 
  Sparkles, 
  List, 
  Layers, 
  CheckCircle2,
  Palmtree,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { triggerSelectionHaptic, triggerLightHaptic } from '../services/hapticsService';

interface TimelineScheduleProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenScanner?: () => void;
  initialDay?: DayOfWeek;
  onSelectDay?: (day: DayOfWeek) => void;
  onOpenHolidays?: () => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
}

type ViewMode = 'agenda' | 'timeline';

interface PositionedEvent {
  course: Course;
  top: number;
  height: number;
  colIndex: number;
  numCols: number;
}

export const TimelineSchedule: React.FC<TimelineScheduleProps> = ({ 
  courses, 
  onSelectCourse, 
  initialDay,
  onSelectDay,
  onOpenHolidays
}) => {
  const todayDayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]) as DayOfWeek;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    initialDay || (DAYS_OF_WEEK.includes(todayDayName) ? todayDayName : 'Mon')
  );
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [currentTimeMins, setCurrentTimeMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (initialDay && DAYS_OF_WEEK.includes(initialDay)) {
      setSelectedDay(initialDay);
    }
  }, [initialDay]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const dayInfo = getDayScheduleInfo(courses, selectedDay);
  const conflicts = detectScheduleConflicts(courses).filter(c => c.day === selectedDay);
  const isToday = selectedDay === todayDayName;

  // Smart dynamic timeline hours auto-bounded by scheduled classes
  const minClassHour = dayInfo.courses.length > 0
    ? Math.min(...dayInfo.courses.map(c => Math.floor(timeToMinutes(c.startTime) / 60)))
    : 8;
  const maxClassHour = dayInfo.courses.length > 0
    ? Math.max(...dayInfo.courses.map(c => Math.ceil(timeToMinutes(c.endTime) / 60)))
    : 17;

  // 1-hour breathing margin before earliest class (min 6 AM) and after latest class (max 10 PM / 22)
  const START_HOUR = dayInfo.courses.length > 0
    ? Math.max(6, minClassHour > 6 ? minClassHour - 1 : minClassHour)
    : 8;
  const END_HOUR = dayInfo.courses.length > 0
    ? Math.min(22, Math.max(17, maxClassHour + 1))
    : 17;
  const HOUR_HEIGHT = 62;
  const GRID_TOP_OFFSET = 16;

  const hoursList = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hoursList.push(h);
  }

  // Calculate top px for live time line
  const liveLineTop = GRID_TOP_OFFSET + ((currentTimeMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const isLiveLineVisible = isToday && currentTimeMins >= START_HOUR * 60 && currentTimeMins <= (END_HOUR + 1) * 60;

  // Smart Concurrent Event Layout Engine (Google Calendar / Apple Calendar style)
  const computeEventLayout = (coursesList: Course[]): PositionedEvent[] => {
    if (coursesList.length === 0) return [];

    // Sort by start time ascending, then longer duration first
    const sorted = [...coursesList].sort((a, b) => {
      const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (diff !== 0) return diff;
      return (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) - (timeToMinutes(a.endTime) - timeToMinutes(a.startTime));
    });

    const events = sorted.map(c => {
      const startMins = timeToMinutes(c.startTime);
      const endMins = timeToMinutes(c.endTime);
      const startOffsetMins = Math.max(0, startMins - START_HOUR * 60);
      const durationMins = Math.max(35, endMins - startMins);
      const top = GRID_TOP_OFFSET + (startOffsetMins / 60) * HOUR_HEIGHT;
      const height = (durationMins / 60) * HOUR_HEIGHT;
      return {
        course: c,
        startMins,
        endMins,
        top,
        height,
        colIndex: 0,
        numCols: 1
      };
    });

    // Group overlapping events into clusters
    const clusters: typeof events[] = [];
    let currentCluster: typeof events = [];
    let clusterEnd = -1;

    for (const ev of events) {
      if (currentCluster.length === 0 || ev.startMins < clusterEnd) {
        currentCluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.endMins);
      } else {
        clusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = ev.endMins;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Assign column indices per cluster
    for (const cluster of clusters) {
      const colEndTimes: number[] = [];

      for (const ev of cluster) {
        let placed = false;
        for (let c = 0; c < colEndTimes.length; c++) {
          if (ev.startMins >= colEndTimes[c]) {
            ev.colIndex = c;
            colEndTimes[c] = ev.endMins;
            placed = true;
            break;
          }
        }
        if (!placed) {
          ev.colIndex = colEndTimes.length;
          colEndTimes.push(ev.endMins);
        }
      }

      const totalCols = Math.max(colEndTimes.length, 1);
      for (const ev of cluster) {
        ev.numCols = totalCols;
      }
    }

    return events.map(({ course, top, height, colIndex, numCols }) => ({
      course,
      top,
      height,
      colIndex,
      numCols
    }));
  };

  const positionedEvents = computeEventLayout(dayInfo.courses);

  // Build combined chronological agenda flow (Courses + Free Time Gaps)
  type AgendaItem = 
    | { type: 'course'; data: Course }
    | { type: 'break'; data: FreeTimeGap };

  const agendaItems: AgendaItem[] = [];
  const dayCourses = dayInfo.courses;

  for (let i = 0; i < dayCourses.length; i++) {
    agendaItems.push({ type: 'course', data: dayCourses[i] });

    if (i < dayCourses.length - 1) {
      const curr = dayCourses[i];
      const next = dayCourses[i + 1];
      const gap = dayInfo.freeTimeGaps.find(
        g => g.prevCourseCode === curr.courseCode && g.nextCourseCode === next.courseCode
      );
      if (gap) {
        agendaItems.push({ type: 'break', data: gap });
      }
    }
  }

  // Break suggestion generator
  const getBreakSuggestion = (durationMins: number, startTimeStr: string) => {
    const startH = Number(startTimeStr.split(':')[0]);
    if (startH >= 11 && startH <= 13) {
      return { icon: <Utensils size={13} color="var(--ios-orange)" />, label: 'Lunch Break & Relax' };
    }
    if (durationMins <= 45) {
      return { icon: <Coffee size={13} color="var(--ios-teal)" />, label: 'Quick Coffee & Study Break' };
    }
    return { icon: <Sparkles size={13} color="var(--ios-blue)" />, label: 'Study Time & Campus Walk' };
  };

  const totalDayClassMinutes = dayInfo.courses.reduce((acc, c) => acc + Math.max(0, timeToMinutes(c.endTime) - timeToMinutes(c.startTime)), 0);
  const totalDayClassHours = (totalDayClassMinutes / 60).toFixed(1);
  const totalFreeTimeMinutes = dayInfo.freeTimeGaps.reduce((acc, g) => acc + g.durationMinutes, 0);
  const totalFreeTimeHours = (totalFreeTimeMinutes / 60).toFixed(1);

  const selectedDayHoliday = getHolidayForDayInCurrentWeek(selectedDay);

  return (
    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* App Bar Header: Left Title "Schedule", Right Toggle Switch [List | Grid] & Calendar Button */}
      <div className="schedule-top-bar">
        <h1 className="schedule-title-left">
          Schedule
        </h1>

        <div className="schedule-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onOpenHolidays && (
            <button
              type="button"
              className="schedule-view-btn"
              onClick={() => {
                triggerLightHaptic();
                onOpenHolidays();
              }}
              style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ios-green)' }}
              title="Philippine Holidays & Long Weekends"
            >
              <Palmtree size={13} /> Holidays
            </button>
          )}

          {/* View Switcher: List vs Grid */}
          <div className="schedule-view-switcher" style={{ margin: 0 }}>
            <button 
              className={`schedule-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setViewMode('agenda');
              }}
              title="List View"
            >
              <List size={13} /> List
            </button>
            <button 
              className={`schedule-view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setViewMode('timeline');
              }}
              title="Grid View"
            >
              <Layers size={13} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* Week Selector: Vertical Pills */}
      <div className="schedule-days-vertical-strip">
        {DAYS_OF_WEEK.map(day => {
          const isSelected = selectedDay === day;
          const isCurrentToday = todayDayName === day;
          const dayHoliday = getHolidayForDayInCurrentWeek(day);
          const dayCount = courses.filter(c => c.days.includes(day)).length;

          return (
            <button
              key={day}
              type="button"
              className={`schedule-vertical-pill ${isSelected ? 'active' : ''} ${isCurrentToday ? 'is-today' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setSelectedDay(day);
                onSelectDay?.(day);
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span className="pill-day-name">{day}</span>
                {isCurrentToday ? (
                  <span 
                    style={{
                      fontSize: 8,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '1px 4px',
                      borderRadius: 4,
                      lineHeight: 1.1,
                      background: isSelected ? 'rgba(255, 255, 255, 0.28)' : 'var(--ios-blue-light)',
                      color: isSelected ? '#FFFFFF' : 'var(--ios-blue)'
                    }}
                  >
                    TODAY
                  </span>
                ) : dayHoliday ? (
                  <span 
                    style={{
                      fontSize: 8,
                      fontWeight: 900,
                      padding: '1px 3px',
                      borderRadius: 4,
                      lineHeight: 1.1,
                      background: isSelected ? 'rgba(255, 255, 255, 0.28)' : 'var(--ios-green-light)',
                      color: isSelected ? '#FFFFFF' : 'var(--ios-green)'
                    }}
                    title={dayHoliday.name}
                  >
                    🌴 HOLIDAY
                  </span>
                ) : null}
              </div>
              <div className="pill-count-bubble">
                {dayCount}
              </div>
            </button>
          );
        })}
      </div>

      {/* Holiday Announcement Banner for Selected Day (if holiday) */}
      {selectedDayHoliday && (
        <div 
          className="ios-card" 
          onClick={() => {
            triggerLightHaptic();
            onOpenHolidays?.();
          }}
          style={{
            padding: '12px 14px',
            marginBottom: 14,
            background: 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--ios-green-light)',
              color: 'var(--ios-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Palmtree size={17} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                🌴 {selectedDayHoliday.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                {selectedDayHoliday.typeLabel} • Regular campus classes suspended
              </div>
            </div>
          </div>
          <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10, padding: '2px 7px' }}>
            NO CLASSES
          </span>
        </div>
      )}

      {/* Split Responsive Container on Desktop */}
      <div className="schedule-desktop-split">
        {/* Main Schedule stream */}
        <div className="schedule-main-stream">
          {viewMode === 'agenda' ? (
            /* AGENDA LIST VIEW */
            <div className="agenda-flow-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div className="ios-section-header" style={{ margin: 0 }}>
                  {selectedDay} Agenda Flow ({dayCourses.length} {dayCourses.length === 1 ? 'Class' : 'Classes'})
                </div>
                {isToday && (
                  <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10 }}>
                    ● TODAY
                  </span>
                )}
              </div>

              {dayCourses.length === 0 && (
                <div className="ios-card" style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--ios-text-muted)', fontSize: 13.5 }}>
                  No classes scheduled for {selectedDay}. Enjoy your free day! 🎉
                </div>
              )}

              {agendaItems.map((item, idx) => {
                if (item.type === 'course') {
                  const course = item.data;
                  const startMins = timeToMinutes(course.startTime);
                  const endMins = timeToMinutes(course.endTime);
                  const isLive = isToday && currentTimeMins >= startMins && currentTimeMins <= endMins;
                  const isCompleted = isToday && currentTimeMins > endMins;
                  const isConflicting = conflicts.some(
                    c => c.course1.id === course.id || c.course2.id === course.id
                  );
                  const isLab = isLaboratoryCourse(course);
                  const cleanInstructor = course.instructor 
                    ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
                    : 'No Instructor';

                  return (
                    <div 
                      key={`course_${course.id}_${idx}`} 
                      className="bento-card"
                      onClick={() => onSelectCourse(course)}
                      style={{
                        borderLeft: isConflicting ? '4px solid var(--ios-red)' : `4px solid ${course.color || 'var(--ios-blue)'}`,
                        marginBottom: 0
                      }}
                    >
                      <div className="bento-top-row">
                        <div className="bento-badges-left">
                          <span 
                            className="bento-code-tag"
                            style={{
                              background: course.color ? `${course.color}15` : 'var(--ios-blue-light)',
                              color: course.color || 'var(--ios-blue)'
                            }}
                          >
                            {course.courseCode}
                          </span>
                          {isLab ? (
                            <span className="ios-tag-pill ios-tag-pill-purple">LAB</span>
                          ) : (
                            <span className="ios-tag-pill">LEC</span>
                          )}
                          {isLive && (
                            <span className="ios-tag-pill ios-tag-pill-green">● LIVE</span>
                          )}
                          {isCompleted && (
                            <span className="ios-tag-pill ios-tag-pill-muted">
                              <CheckCircle2 size={10} /> DONE
                            </span>
                          )}
                          {isConflicting && (
                            <span title="Schedule conflict" style={{ background: 'var(--ios-red-light)', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                              <AlertTriangle size={12} color="var(--ios-red)" />
                            </span>
                          )}
                        </div>

                        <span className="bento-time-text">
                          {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
                        </span>
                      </div>

                      <div className="bento-course-name">
                        {course.courseName}
                      </div>

                      <div className="bento-footer-row">
                        <div className="bento-meta-items">
                          {course.room && (
                            <span className="bento-pill-chip">
                              <MapPin size={12} color="var(--ios-green)" /> {course.room}
                            </span>
                          )}
                          {course.instructor && (
                            <span className="bento-pill-chip">
                              <User size={12} color="var(--ios-blue)" /> {cleanInstructor}
                            </span>
                          )}
                        </div>

                        {course.units && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                            {course.units} {course.units === 1 ? 'Unit' : 'Units'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const gap = item.data;
                  const suggestion = getBreakSuggestion(gap.durationMinutes, gap.startTime);

                  return (
                    <div key={`gap_${gap.id}_${idx}`} className="agenda-break-pill">
                      <div className="agenda-break-left">
                        {suggestion.icon}
                        <span style={{ fontWeight: 700 }}>{suggestion.label}</span>
                        <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10, padding: '1px 6px', flexShrink: 0 }}>
                          {gap.formattedDuration}
                        </span>
                      </div>

                      <span className="agenda-break-time" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatTime12H(gap.startTime)} – {formatTime12H(gap.endTime)}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            /* TIMELINE GRID MATRIX (Non-Overlapping Multi-Column Calendar Layout) */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="ios-section-header" style={{ margin: 0 }}>
                    {selectedDay} Timeline Grid ({dayCourses.length} {dayCourses.length === 1 ? 'Class' : 'Classes'})
                  </div>
                  {isToday && (
                    <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10 }}>
                      ● TODAY
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarIcon size={12} /> {START_HOUR === 12 ? '12 PM' : START_HOUR > 12 ? `${START_HOUR - 12}:00 PM` : `${START_HOUR}:00 AM`} – {END_HOUR === 12 ? '12 PM' : END_HOUR > 12 ? `${END_HOUR - 12}:00 PM` : `${END_HOUR}:00 AM`}
                </span>
              </div>

              <div className="timeline-grid-wrapper" style={{ height: `${GRID_TOP_OFFSET + (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + 20}px` }}>
                {/* Live Current Time Line */}
                {isLiveLineVisible && (
                  <div className="timeline-now-line" style={{ top: `${liveLineTop}px` }}>
                    <div className="timeline-now-dot" />
                  </div>
                )}

                {/* Hour Slot Markers */}
                {hoursList.map((h, idx) => {
                  const timeLabel = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
                  return (
                    <div key={h} className="timeline-hour-slot" style={{ top: `${GRID_TOP_OFFSET + idx * HOUR_HEIGHT}px` }}>
                      <span className="timeline-hour-text">{timeLabel}</span>
                    </div>
                  );
                })}

                {/* Free Time / Break Period Indicators in Timeline Grid */}
                {dayInfo.freeTimeGaps.map((gap, gIdx) => {
                  const gStartMins = timeToMinutes(gap.startTime);
                  const gEndMins = timeToMinutes(gap.endTime);
                  if (gEndMins <= START_HOUR * 60 || gStartMins >= (END_HOUR + 1) * 60) return null;
                  const startOffsetMins = Math.max(0, gStartMins - START_HOUR * 60);
                  const durationMins = gEndMins - gStartMins;
                  const top = GRID_TOP_OFFSET + (startOffsetMins / 60) * HOUR_HEIGHT;
                  const height = (durationMins / 60) * HOUR_HEIGHT;
                  const suggestion = getBreakSuggestion(gap.durationMinutes, gap.startTime);

                  if (height < 24) return null;

                  const LEFT_GUTTER = 60;
                  const RIGHT_MARGIN = 12;

                  return (
                    <div
                      key={`timeline_gap_${gap.id || gIdx}`}
                      className="timeline-break-block"
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height - 4, 26)}px`,
                        left: `${LEFT_GUTTER}px`,
                        width: `calc(100% - ${LEFT_GUTTER + RIGHT_MARGIN}px)`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        {suggestion.icon}
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {suggestion.label}
                        </span>
                        <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 9.5, padding: '1px 5px', flexShrink: 0 }}>
                          {gap.formattedDuration}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--ios-font-mono)', color: 'var(--ios-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatTime12H(gap.startTime)} – {formatTime12H(gap.endTime)}
                      </span>
                    </div>
                  );
                })}

                {/* Course Blocks Positioned with Multi-Column Logic to NEVER Overlap */}
                {positionedEvents.map((ev, idx) => {
                  const { course, top, height, colIndex, numCols } = ev;
                  const isConflicting = conflicts.some(
                    c => c.course1.id === course.id || c.course2.id === course.id
                  );
                  const isLab = isLaboratoryCourse(course);
                  const cleanInstructor = course.instructor 
                    ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
                    : '';

                  // Dynamic width and left calculation
                  const LEFT_GUTTER = 60;
                  const RIGHT_MARGIN = 12;
                  const colWidthPercent = 100 / numCols;
                  const leftPercent = colIndex * colWidthPercent;

                  return (
                    <div
                      key={`timeline_block_${course.id}_${idx}`}
                      className="timeline-bento-block"
                      onClick={() => onSelectCourse(course)}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height - 4, 36)}px`,
                        left: `calc(${LEFT_GUTTER}px + (100% - ${LEFT_GUTTER + RIGHT_MARGIN}px) * ${leftPercent / 100})`,
                        width: `calc((100% - ${LEFT_GUTTER + RIGHT_MARGIN}px) * ${colWidthPercent / 100} - 4px)`,
                        borderLeftColor: isConflicting ? 'var(--ios-red)' : (course.color || 'var(--ios-blue)'),
                        background: isConflicting 
                          ? 'rgba(239, 68, 68, 0.04)' 
                          : course.color 
                            ? `${course.color}0D` 
                            : 'var(--ios-card-bg)',
                        zIndex: 2
                      }}
                      title={`${course.courseCode}: ${course.courseName} (${formatTime12H(course.startTime)} - ${formatTime12H(course.endTime)})`}
                    >
                      {/* Top: Code Tag + Time */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                          <span 
                            style={{ 
                              fontSize: numCols > 2 ? 10.5 : 12, 
                              fontWeight: 800, 
                              color: course.color || 'var(--ios-blue)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {course.courseCode}
                          </span>
                          {isLab && numCols <= 2 && (
                            <span className="ios-tag-pill ios-tag-pill-purple" style={{ fontSize: 8, padding: '1px 3px' }}>LAB</span>
                          )}
                          {isConflicting && (
                            <AlertTriangle size={11} color="var(--ios-red)" style={{ flexShrink: 0 }} />
                          )}
                        </div>

                        <span style={{ fontSize: numCols > 2 ? 9 : 10.5, fontWeight: 700, color: 'var(--ios-text-muted)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--ios-font-mono)' }}>
                          {formatTime12H(course.startTime)}
                        </span>
                      </div>

                      {/* Middle: Course Name */}
                      <div style={{ 
                        fontSize: numCols > 2 ? 10.5 : 12, 
                        fontWeight: 600, 
                        color: 'var(--ios-text-primary)', 
                        margin: '2px 0', 
                        lineHeight: 1.15,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: height > 75 ? 2 : 1,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {course.courseName}
                      </div>

                      {/* Bottom: Room & Instructor */}
                      {(course.room || cleanInstructor) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: numCols > 2 ? 9.5 : 11, color: 'var(--ios-text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {course.room && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <MapPin size={10} color="var(--ios-green)" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.room}</span>
                            </span>
                          )}
                          {cleanInstructor && numCols <= 2 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <User size={10} color="var(--ios-orange)" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanInstructor}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Schedule Insights Sidebar (Desktop & Tablet only) */}
        <div className="schedule-insights-sidebar">
          {/* Day Intelligence Bento Card */}
          <div className="schedule-intel-card">
            <div className="schedule-intel-header">
              <div>
                <div className="schedule-intel-title">{selectedDay} Summary</div>
                <div className="schedule-intel-sub">{dayInfo.courses.length} {dayInfo.courses.length === 1 ? 'class' : 'classes'} on schedule</div>
              </div>
              {isToday && (
                <span className="ios-tag-pill ios-tag-pill-green">TODAY</span>
              )}
            </div>

            <div className="schedule-intel-stats-grid">
              <div className="schedule-intel-stat-box">
                <div className="schedule-intel-stat-val">{totalDayClassHours}h</div>
                <div className="schedule-intel-stat-lbl">Class Time</div>
              </div>
              <div className="schedule-intel-stat-box">
                <div className="schedule-intel-stat-val">{totalFreeTimeHours}h</div>
                <div className="schedule-intel-stat-lbl">Free Time</div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="schedule-intel-status-row">
              {conflicts.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ios-red)', fontSize: 12, fontWeight: 700 }}>
                  <AlertTriangle size={14} />
                  <span>{conflicts.length} Overlapping Conflict Detected</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ios-green)', fontSize: 12, fontWeight: 700 }}>
                  <ShieldCheck size={14} />
                  <span>Schedule Clear • No Conflicts</span>
                </div>
              )}
            </div>
          </div>

          {/* Free Time Gaps List */}
          {dayInfo.freeTimeGaps.length > 0 && (
            <div className="schedule-breaks-bento">
              <div className="schedule-breaks-title">Free Breaks & Study Periods</div>
              <div className="schedule-breaks-list">
                {dayInfo.freeTimeGaps.map((gap, i) => {
                  const suggestion = getBreakSuggestion(gap.durationMinutes, gap.startTime);
                  return (
                    <div key={i} className="schedule-break-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {suggestion.icon}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ios-text-primary)' }}>{suggestion.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', fontFamily: 'var(--ios-font-mono)' }}>
                            {formatTime12H(gap.startTime)} – {formatTime12H(gap.endTime)}
                          </div>
                        </div>
                      </div>
                      <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10 }}>{gap.formattedDuration}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Subject Access List */}
          {dayCourses.length > 0 && (
            <div className="schedule-day-courses-bento">
              <div className="schedule-breaks-title">Classes for {selectedDay} ({dayCourses.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayCourses.map((c, i) => (
                  <div 
                    key={i} 
                    className="schedule-quick-course-pill"
                    onClick={() => {
                      triggerLightHaptic();
                      onSelectCourse(c);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span 
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: c.color || 'var(--ios-blue)',
                          flexShrink: 0 
                        }} 
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ios-text-primary)' }}>{c.courseCode}</span>
                      <span style={{ fontSize: 11, color: 'var(--ios-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.courseName}
                      </span>
                    </div>
                    <ChevronRight size={13} color="var(--ios-text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineSchedule;
