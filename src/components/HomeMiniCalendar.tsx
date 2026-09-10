import React, { useState } from 'react';
import { Course, DayOfWeek } from '../types';
import { getHolidayForDate } from '../services/phHolidaysService';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { triggerSelectionHaptic, triggerLightHaptic } from '../services/hapticsService';

interface HomeMiniCalendarProps {
  courses: Course[];
  onSelectDate?: (date: Date) => void;
  onOpenCalendarTab?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_ABBRS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_OF_WEEK_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HomeMiniCalendar: React.FC<HomeMiniCalendarProps> = ({
  courses,
  onSelectDate,
  onOpenCalendarTab
}) => {
  // Current anchor date (defaults to today)
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const today = new Date();

  // Calculate the 7 days of the week for the current anchor
  const getWeekDays = (anchorDate: Date) => {
    const anchor = new Date(anchorDate);
    const dayOfWeek = anchor.getDay(); // 0 is Sunday
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekAnchor);
  const anchorMonth = currentWeekAnchor.getMonth();
  const anchorYear = currentWeekAnchor.getFullYear();

  const handlePrevWeek = () => {
    triggerLightHaptic();
    const prev = new Date(currentWeekAnchor);
    prev.setDate(currentWeekAnchor.getDate() - 7);
    setCurrentWeekAnchor(prev);
  };

  const handleNextWeek = () => {
    triggerLightHaptic();
    const next = new Date(currentWeekAnchor);
    next.setDate(currentWeekAnchor.getDate() + 7);
    setCurrentWeekAnchor(next);
  };

  return (
    <div className="home-mini-cal-card home-weekly-strip-card">
      {/* Header: Month / Year & Week Navigation */}
      <div className="home-mini-cal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarIcon size={14} color="var(--ios-blue)" />
          <span className="home-mini-cal-title">
            {MONTH_NAMES[anchorMonth]} {anchorYear}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onOpenCalendarTab && (
            <button
              type="button"
              className="home-mini-cal-nav-btn"
              onClick={() => {
                triggerLightHaptic();
                onOpenCalendarTab();
              }}
              title="Open Full Academic Calendar"
              style={{ fontSize: 11, padding: '2px 8px', width: 'auto', borderRadius: 8, fontWeight: 700, color: 'var(--ios-blue)' }}
            >
              Full View
            </button>
          )}
          <button
            type="button"
            className="home-mini-cal-nav-btn"
            onClick={handlePrevWeek}
            title="Previous Week"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="home-mini-cal-nav-btn"
            onClick={handleNextWeek}
            title="Next Week"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 7-Day Horizontal Week Strip */}
      <div className="home-weekly-strip-row">
        {weekDays.map((date, idx) => {
          const dayName = DAY_OF_WEEK_NAMES[date.getDay()];
          const hasClasses = courses.some(c => c.days.includes(dayName));
          const holiday = getHolidayForDate(date);
          const isToday = 
            today.getFullYear() === date.getFullYear() &&
            today.getMonth() === date.getMonth() &&
            today.getDate() === date.getDate();
          const isSelected = 
            selectedDate.getFullYear() === date.getFullYear() &&
            selectedDate.getMonth() === date.getMonth() &&
            selectedDate.getDate() === date.getDate();

          return (
            <button
              key={idx}
              type="button"
              className={`home-week-pill-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setSelectedDate(date);
                onSelectDate?.(date);
              }}
              title={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}${holiday ? ` • ${holiday.name}` : ''}${hasClasses ? ' • Scheduled Classes' : ''}`}
            >
              <span className="home-week-pill-abbr">{DAY_ABBRS[date.getDay()]}</span>
              <span className="home-week-pill-num">{date.getDate()}</span>
              
              {/* Dot Indicators */}
              <div className="home-week-pill-dots">
                {holiday ? (
                  <span className="home-week-dot holiday-dot" title={holiday.name} />
                ) : hasClasses ? (
                  <span className="home-week-dot class-dot" title="Classes scheduled" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomeMiniCalendar;
