import React, { useState, useEffect } from 'react';
import { Course, DayOfWeek } from '../types';
import { getActiveClassState, formatTime12H, timeToMinutes } from '../services/scheduleEngine';
import { triggerLightHaptic } from '../services/hapticsService';
import { getTodayHoliday } from '../services/phHolidaysService';
import { Sparkles, CheckCircle2, Palmtree, ArrowRight, Clock, MapPin, User } from 'lucide-react';
import { getSubjectIconComponent } from '../services/iconService';

interface NextClassHeroProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenScanner?: () => void;
  onOpenTasksTab?: () => void;
  onOpenCalendarTab?: () => void;
}

export const NextClassHero: React.FC<NextClassHeroProps> = ({
  courses,
  onSelectCourse,
  onOpenTasksTab,
  onOpenCalendarTab
}) => {
  const [activeState, setActiveState] = useState(() => getActiveClassState(courses));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveState(getActiveClassState(courses));
    }, 1000);
    return () => clearInterval(timer);
  }, [courses]);

  if (courses.length === 0) {
    return null;
  }

  const todayDayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]) as DayOfWeek;
  const todayCourses = courses.filter(c => c.days.includes(todayDayName));
  const todayHoliday = getTodayHoliday();

  // 1. If today is an official Philippine National Holiday
  if (todayHoliday) {
    return (
      <>
        {/* Mobile View: Classic Compact Apple Banner */}
        <div 
          className="ios-notification-banner next-hero-mobile-only"
          style={{
            cursor: 'default',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.06) 100%)'
          }}
        >
          <div className="ios-notification-main">
            <div className="ios-notification-icon" style={{ background: 'var(--ios-green-light)', color: 'var(--ios-green)' }}>
              <Palmtree size={19} />
            </div>
            <div className="ios-notification-content">
              <div className="ios-notification-title">🌴 {todayHoliday.name}</div>
              <div className="ios-notification-subtitle">{todayHoliday.typeLabel} • Classes suspended today.</div>
            </div>
            <div className="ios-notification-right">
              <span className="ios-tag-pill" style={{ background: 'var(--ios-green-light)', color: 'var(--ios-green)', fontWeight: 800, fontSize: 10, padding: '3px 7px' }}>
                HOLIDAY
              </span>
            </div>
          </div>
        </div>

        {/* Desktop View: Friendly Interactive Hero Card */}
        <div className="home-friendly-hero-card holiday-hero next-hero-desktop-only">
          <div className="friendly-hero-top">
            <div className="friendly-hero-icon-box holiday-icon">
              <Palmtree size={22} />
            </div>
            <div className="friendly-hero-meta">
              <span className="friendly-hero-badge holiday-badge">
                🌴 CAMPUS HOLIDAY
              </span>
              <div className="friendly-hero-title">
                {todayHoliday.name}
              </div>
            </div>
          </div>

          <p className="friendly-hero-desc">
            {todayHoliday.typeLabel} • Regular campus classes and laboratory sessions are suspended today. Enjoy your holiday!
          </p>

          {onOpenCalendarTab && (
            <button 
              type="button" 
              className="friendly-hero-action-btn"
              onClick={() => {
                triggerLightHaptic();
                onOpenCalendarTab();
              }}
            >
              <span>View Holiday Calendar</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </>
    );
  }

  // 2. If all classes for today are completed or no classes
  if (activeState.type === 'NONE' || !activeState.course) {
    const isDayCompleted = todayCourses.length > 0;

    if (isDayCompleted) {
      return (
        <>
          {/* Mobile View: Classic Compact Apple Banner */}
          <div 
            className="ios-notification-banner next-hero-mobile-only"
            style={{
              cursor: 'default',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)'
            }}
          >
            <div className="ios-notification-main">
              <div className="ios-notification-icon" style={{ background: 'var(--ios-green-light)', color: 'var(--ios-green)' }}>
                <CheckCircle2 size={19} />
              </div>
              <div className="ios-notification-content">
                <div className="ios-notification-title">All Classes Done for Today! 🎉</div>
                <div className="ios-notification-subtitle">You've finished all lectures & labs for today.</div>
              </div>
              <div className="ios-notification-right">
                <span className="ios-tag-pill" style={{ background: 'var(--ios-green-light)', color: 'var(--ios-green)', fontWeight: 800, fontSize: 10, padding: '3px 7px' }}>
                  ALL DONE
                </span>
              </div>
            </div>
          </div>

          {/* Desktop View: Friendly Interactive Hero Card */}
          <div className="home-friendly-hero-card completed-hero next-hero-desktop-only">
            <div className="friendly-hero-top">
              <div className="friendly-hero-icon-box completed-icon">
                <CheckCircle2 size={22} />
              </div>
              <div className="friendly-hero-meta">
                <span className="friendly-hero-badge completed-badge">
                  ✓ ALL DONE
                </span>
                <div className="friendly-hero-title">
                  All Classes Done Today! 🎉
                </div>
              </div>
            </div>

            <p className="friendly-hero-desc">
              You've completed all scheduled lectures & laboratory periods for today. Take time to relax, recharge, or review your notes!
            </p>

            {onOpenTasksTab && (
              <button 
                type="button" 
                className="friendly-hero-action-btn completed-btn"
                onClick={() => {
                  triggerLightHaptic();
                  onOpenTasksTab();
                }}
              >
                <span>Check Tasks & Deadlines</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {/* Mobile View: Classic Compact Apple Banner */}
        <div 
          className="ios-notification-banner next-hero-mobile-only"
          style={{ cursor: 'default', background: 'var(--ios-card-bg)' }}
        >
          <div className="ios-notification-main">
            <div className="ios-notification-icon" style={{ background: 'var(--ios-blue-light)', color: 'var(--ios-blue)' }}>
              <Sparkles size={19} />
            </div>
            <div className="ios-notification-content">
              <div className="ios-notification-title">No Classes Scheduled Today</div>
              <div className="ios-notification-subtitle">Enjoy your free {todayDayName} and take time to recharge!</div>
            </div>
            <div className="ios-notification-right">
              <span className="ios-tag-pill" style={{ background: 'var(--ios-blue-light)', color: 'var(--ios-blue)', fontWeight: 800, fontSize: 10, padding: '3px 7px' }}>
                FREE DAY
              </span>
            </div>
          </div>
        </div>

        {/* Desktop View: Friendly Interactive Hero Card */}
        <div className="home-friendly-hero-card freeday-hero next-hero-desktop-only">
          <div className="friendly-hero-top">
            <div className="friendly-hero-icon-box freeday-icon">
              <Sparkles size={22} />
            </div>
            <div className="friendly-hero-meta">
              <span className="friendly-hero-badge freeday-badge">
                RELAX & STUDY
              </span>
              <div className="friendly-hero-title">
                Free Day Today
              </div>
            </div>
          </div>

          <p className="friendly-hero-desc">
            No classes scheduled for {todayDayName}. Great day to catch up on assignments, prepare for upcoming projects, or take a well-deserved break!
          </p>

          {onOpenCalendarTab && (
            <button 
              type="button" 
              className="friendly-hero-action-btn freeday-btn"
              onClick={() => {
                triggerLightHaptic();
                onOpenCalendarTab();
              }}
            >
              <span>Explore Academic Calendar</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </>
    );
  }

  // 3. Active / Upcoming Class Card
  const { course, type } = activeState;
  const isLive = type === 'CURRENT';

  const cleanInstructor = course.instructor 
    ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
    : 'Instructor TBA';

  const startTimeStr = formatTime12H(course.startTime);
  const endTimeStr = formatTime12H(course.endTime);

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(course.startTime);
  const endMins = timeToMinutes(course.endTime);
  const diffMins = startMins - nowMins;

  let badgeLabel = 'UP NEXT';
  let badgeColor = 'var(--ios-blue)';
  let isImminent = false;

  if (isLive) {
    const remainingMins = Math.max(endMins - nowMins, 0);
    badgeLabel = remainingMins > 0 ? `● LIVE (${remainingMins}m left)` : '● LIVE';
    badgeColor = 'var(--ios-green)';
  } else if (diffMins > 0 && diffMins <= 60) {
    badgeLabel = `Starts in ${diffMins}m`;
    badgeColor = '#D97706';
    isImminent = true;
  }

  const handleClick = () => {
    triggerLightHaptic();
    onSelectCourse(course);
  };

  return (
    <>
      {/* Mobile View: Classic Compact Apple Banner */}
      <div 
        className="ios-notification-banner next-hero-mobile-only"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title="Tap to view subject details"
        style={{
          borderColor: isImminent ? 'rgba(217, 119, 6, 0.4)' : undefined,
          boxShadow: isImminent ? '0 4px 16px rgba(217, 119, 6, 0.08)' : undefined
        }}
      >
        <div className="ios-notification-main">
          <div 
            className="ios-notification-icon"
            style={{
              background: isLive 
                ? 'var(--ios-green-light)' 
                : (isImminent ? 'rgba(217, 119, 6, 0.12)' : 'var(--ios-blue-light)'),
              color: isLive 
                ? 'var(--ios-green)' 
                : (isImminent ? '#D97706' : 'var(--ios-blue)')
            }}
          >
            {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 18, 'currentColor')}
          </div>

          <div className="ios-notification-content">
            <div className="ios-notification-title">{course.courseCode}</div>
            <div className="ios-notification-subtitle">
              {course.room ? `${course.room}` : 'Room TBA'} • {cleanInstructor}
            </div>
          </div>

          <div className="ios-notification-right">
            <span className="ios-notification-time">{startTimeStr}</span>
            <span 
              className="ios-notification-badge"
              style={{ 
                color: badgeColor,
                fontWeight: isImminent || isLive ? 800 : 700
              }}
            >
              {badgeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop View: Friendly Interactive Hero Card */}
      <div 
        className={`home-friendly-hero-card class-hero next-hero-desktop-only ${isLive ? 'is-live-class' : ''} ${isImminent ? 'is-imminent-class' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title="Tap to open subject details"
      >
        <div className="friendly-hero-top">
          <div 
            className="friendly-hero-icon-box"
            style={{
              background: isLive ? 'var(--ios-green-light)' : (course.color ? `${course.color}18` : 'var(--ios-blue-light)'),
              color: isLive ? 'var(--ios-green)' : (course.color || 'var(--ios-blue)')
            }}
          >
            {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 20, 'currentColor')}
          </div>

          <div className="friendly-hero-meta">
            <span 
              className="friendly-hero-badge"
              style={{
                background: isLive ? 'var(--ios-green-light)' : (isImminent ? 'rgba(217, 119, 6, 0.14)' : 'var(--ios-blue-light)'),
                color: isLive ? 'var(--ios-green)' : (isImminent ? '#D97706' : 'var(--ios-blue)')
              }}
            >
              {badgeLabel}
            </span>
            <div className="friendly-hero-title">
              {course.courseCode}
            </div>
          </div>
        </div>

        <div className="friendly-hero-subtitle">
          {course.courseName}
        </div>

        {/* Class Meta Row */}
        <div className="friendly-hero-info-grid">
          <div className="friendly-info-pill">
            <Clock size={12} />
            <span>{startTimeStr} – {endTimeStr}</span>
          </div>
          {course.room && (
            <div className="friendly-info-pill">
              <MapPin size={12} />
              <span>{course.room}</span>
            </div>
          )}
          {course.instructor && (
            <div className="friendly-info-pill">
              <User size={12} />
              <span>{cleanInstructor}</span>
            </div>
          )}
        </div>

        <div className="friendly-hero-footer-link">
          <span>Open Course Hub</span>
          <ArrowRight size={13} />
        </div>
      </div>
    </>
  );
};

export default NextClassHero;
