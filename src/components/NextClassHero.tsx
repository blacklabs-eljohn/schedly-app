import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { getActiveClassState, formatTime12H, timeToMinutes } from '../services/scheduleEngine';
import { triggerLightHaptic } from '../services/hapticsService';
import { DayOfWeek } from '../types';
import { Sparkles, CheckCircle2, Code2, Atom, Cpu, BookOpen, GraduationCap } from 'lucide-react';

interface NextClassHeroProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenScanner: () => void;
}

const getSubjectIcon = (code: string, name: string) => {
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('cs') || text.includes('it') || text.includes('comp') || text.includes('prog') || text.includes('struct')) {
    return <Code2 size={18} />;
  }
  if (text.includes('phys') || text.includes('chem') || text.includes('sci') || text.includes('bio')) {
    return <Atom size={18} />;
  }
  if (text.includes('eng') || text.includes('tech') || text.includes('circ')) {
    return <Cpu size={18} />;
  }
  if (text.includes('math') || text.includes('calc') || text.includes('stat') || text.includes('alg')) {
    return <BookOpen size={18} />;
  }
  return <GraduationCap size={18} />;
};

export const NextClassHero: React.FC<NextClassHeroProps> = ({
  courses,
  onSelectCourse
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

  if (activeState.type === 'NONE' || !activeState.course) {
    const isDayCompleted = todayCourses.length > 0;

    return (
      <div 
        className="ios-notification-banner" 
        style={{ 
          cursor: 'default',
          border: isDayCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : undefined,
          background: isDayCompleted 
            ? 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)' 
            : 'var(--ios-card-bg)'
        }}
      >
        <div className="ios-notification-main">
          <div 
            className="ios-notification-icon" 
            style={{ 
              background: isDayCompleted ? 'var(--ios-green-light)' : 'var(--ios-blue-light)', 
              color: isDayCompleted ? 'var(--ios-green)' : 'var(--ios-blue)' 
            }}
          >
            {isDayCompleted ? <CheckCircle2 size={19} /> : <Sparkles size={19} />}
          </div>
          <div className="ios-notification-content">
            <div className="ios-notification-title">
              {isDayCompleted ? 'All Classes Done for Today! 🎉' : `No Classes Scheduled Today`}
            </div>
            <div className="ios-notification-subtitle">
              {isDayCompleted 
                ? "Congrats! You've finished all your lectures & labs." 
                : `Enjoy your free ${todayDayName} and take time to recharge!`}
            </div>
          </div>
          <div className="ios-notification-right">
            <span 
              className="ios-tag-pill"
              style={{
                background: isDayCompleted ? 'var(--ios-green-light)' : 'var(--ios-blue-light)',
                color: isDayCompleted ? 'var(--ios-green)' : 'var(--ios-blue)',
                fontWeight: 800,
                fontSize: 10,
                padding: '3px 7px'
              }}
            >
              {isDayCompleted ? 'ALL DONE' : 'FREE DAY'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { course, type } = activeState;
  const isLive = type === 'CURRENT';

  // Clean instructor name
  const cleanInstructor = course.instructor 
    ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
    : 'Instructor TBA';

  const startTimeStr = formatTime12H(course.startTime);

  // Live countdown calculation
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(course.startTime);
  const endMins = timeToMinutes(course.endTime);
  const diffMins = startMins - nowMins;

  // Determine smart badge & timing
  let badgeLabel = 'UP NEXT';
  let badgeColor = 'var(--ios-blue)';
  let isImminent = false;

  if (isLive) {
    const remainingMins = Math.max(endMins - nowMins, 0);
    badgeLabel = remainingMins > 0 ? `● LIVE (${remainingMins}m left)` : '● LIVE';
    badgeColor = 'var(--ios-green)';
  } else if (diffMins > 0 && diffMins <= 60) {
    badgeLabel = `Starts in ${diffMins}m`;
    badgeColor = '#D97706'; // Warm Amber
    isImminent = true;
  }

  const handleClick = () => {
    triggerLightHaptic();
    onSelectCourse(course);
  };

  return (
    <div 
      className="ios-notification-banner"
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
        {/* Left App/Subject Icon Tile */}
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
          {getSubjectIcon(course.courseCode, course.courseName)}
        </div>

        {/* Content: Subject Title + Room & Prof Flush Left */}
        <div className="ios-notification-content">
          <div className="ios-notification-title">
            {course.courseCode}
          </div>
          <div className="ios-notification-subtitle">
            {course.room ? `${course.room}` : 'Room TBA'} • {cleanInstructor}
          </div>
        </div>

        {/* Right: Time & Smart Live / Countdown Badge */}
        <div className="ios-notification-right">
          <span className="ios-notification-time">
            {startTimeStr}
          </span>
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
  );
};

export default NextClassHero;
