import React, { useState, useEffect } from 'react';
import { Course, DayOfWeek, FreeTimeGap } from '../types';
import { 
  DAYS_OF_WEEK, 
  timeToMinutes, 
  getDayScheduleInfo, 
  formatTime12H, 
  detectScheduleConflicts 
} from '../services/scheduleEngine';
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
  CheckCircle2
} from 'lucide-react';
import { triggerSelectionHaptic, triggerLightHaptic } from '../services/hapticsService';

interface TimelineScheduleProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenScanner?: () => void;
  initialDay?: DayOfWeek;
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
  initialDay
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

  // Timeline hours from 06:00 to 20:00 (Starts at 6 AM so 7 AM & 7:30 AM classes are never clipped or placed on 8 AM)
  const minClassHour = dayInfo.courses.length > 0
    ? Math.min(...dayInfo.courses.map(c => Math.floor(timeToMinutes(c.startTime) / 60)))
    : 7;
  const START_HOUR = Math.min(6, Math.max(5, minClassHour - 1));
  const maxClassHour = dayInfo.courses.length > 0
    ? Math.max(...dayInfo.courses.map(c => Math.ceil(timeToMinutes(c.endTime) / 60)))
    : 20;
  const END_HOUR = Math.max(20, maxClassHour);
  const HOUR_HEIGHT = 68;
  const GRID_TOP_OFFSET = 20; // Breathing room so top hour labels are never truncated

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

  return (
    <div className="ios-section" style={{ paddingBottom: 90, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* App Bar Header: Left Title "Schedule", Right Toggle Switch [List | Grid] */}
      <div className="schedule-top-bar">
        <h1 className="schedule-title-left">
          Schedule
        </h1>

        <div className="schedule-top-actions">
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
          const dayCount = courses.filter(c => c.days.includes(day)).length;

          return (
            <button
              key={day}
              type="button"
              className={`schedule-vertical-pill ${isSelected ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setSelectedDay(day);
              }}
            >
              <span className="pill-day-name">{day}</span>
              <div className="pill-count-bubble">
                {dayCount}
              </div>
            </button>
          );
        })}
      </div>

      {/* View Content */}
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
              const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
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
            <div className="ios-section-header" style={{ margin: 0 }}>
              Timeline Grid ({dayCourses.length} {dayCourses.length === 1 ? 'Class' : 'Classes'})
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

            {/* Course Blocks Positioned with Multi-Column Logic to NEVER Overlap */}
            {positionedEvents.map((ev, idx) => {
              const { course, top, height, colIndex, numCols } = ev;
              const isConflicting = conflicts.some(
                c => c.course1.id === course.id || c.course2.id === course.id
              );
              const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
              const cleanInstructor = course.instructor 
                ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
                : '';

              // Calculate non-colliding column position
              const leftCalc = `calc(60px + (100% - 72px) * (${colIndex} / ${numCols}))`;
              const widthCalc = `calc((100% - 72px) / ${numCols} - 4px)`;

              const accentColor = isConflicting ? '#EF4444' : (course.color && course.color.startsWith('#') ? course.color : '#2563EB');

              return (
                <div
                  key={`event_${course.id}_${idx}`}
                  className="timeline-bento-block"
                  onClick={() => onSelectCourse(course)}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: leftCalc,
                    width: widthCalc,
                    borderLeftColor: accentColor,
                    background: isConflicting ? 'rgba(239, 68, 68, 0.08)' : 'var(--ios-card-bg)'
                  }}
                  title={`${course.courseCode}: ${course.courseName} (${formatTime12H(course.startTime)} – ${formatTime12H(course.endTime)})`}
                >
                  {/* Top Bar: Code + Conflict + Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 800, fontSize: numCols > 2 ? 11.5 : 13, color: accentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
  );
};

export default TimelineSchedule;
