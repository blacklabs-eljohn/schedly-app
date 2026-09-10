import React, { useState } from 'react';
import { 
  CustomEvent, 
  EventCategory,
  Course,
  DayOfWeek
} from '../types';
import { 
  getUpcomingHolidays, 
  getHolidayForDate 
} from '../services/phHolidaysService';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Flag,
  CheckCircle2, 
  Plus, 
  Clock, 
  MapPin, 
  CheckCircle, 
  Circle, 
  BookOpen,
  GraduationCap,
  CalendarDays,
  Flame,
  LayoutGrid,
  Columns3
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';
import { AddEventModal } from './AddEventModal';
import { formatTime12H } from '../services/scheduleEngine';

interface CalendarViewProps {
  events: CustomEvent[];
  courses?: Course[];
  onOpenSubject?: (course: Course) => void;
  onSaveEvent: (event: CustomEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onToggleEventComplete?: (eventId: string) => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
}

type MainTab = 'calendar' | 'timeline';
type CalendarSubView = 'month' | 'week';
type FeedFilter = 'all' | 'academic' | 'campus' | 'holidays';

export const CalendarView: React.FC<CalendarViewProps> = ({
  events = [],
  courses = [],
  onOpenSubject,
  onSaveEvent,
  onDeleteEvent,
  onToggleEventComplete,
  onToggleTheme,
  theme
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('calendar');
  const [calendarSubView, setCalendarSubView] = useState<CalendarSubView>('month');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  const upcomingHolidays = getUpcomingHolidays(new Date(), 30);

  // Month navigation
  const handlePrevMonth = () => {
    triggerLightHaptic();
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    triggerLightHaptic();
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Week navigation
  const handlePrevWeek = () => {
    triggerLightHaptic();
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    triggerLightHaptic();
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  // Calendar Grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Weekly Dates calculation
  const getWeekDates = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay(); // 0 is Sunday
    const diffToSunday = current.getDate() - day;
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(current);
      d.setDate(diffToSunday + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentDate);
  const weekRangeLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Selected date holiday & events
  const selectedHoliday = getHolidayForDate(selectedDate);
  const isSelectedToday = selectedDate.toDateString() === new Date().toDateString();

  const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
  const selectedDayEvents = events.filter(e => e.date === selectedDateStr);

  // Scheduled regular classes on selected date
  const dayNames: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDayName = dayNames[selectedDate.getDay()];
  const scheduledClassesForDay = courses.filter(c => c.days && c.days.includes(selectedDayName));
  scheduledClassesForDay.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const handleOpenAddForSelectedDay = () => {
    triggerLightHaptic();
    setEditingEvent(null);
    setModalDefaultDate(selectedDateStr);
    setIsAddModalOpen(true);
  };

  const handleEditEvent = (ev: CustomEvent) => {
    triggerLightHaptic();
    setEditingEvent(ev);
    setModalDefaultDate(ev.date);
    setIsAddModalOpen(true);
  };

  // Combine and sort upcoming feed
  const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

  // Upcoming Custom Events
  const upcomingCustomEvents = events
    .map(ev => {
      const [y, m, d] = ev.date.split('-').map(Number);
      const evDate = new Date(y, m - 1, d).getTime();
      const diffDays = Math.round((evDate - todayMidnight) / (1000 * 60 * 60 * 24));
      const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });

      let countdownText = '';
      if (diffDays === 0) countdownText = 'Today';
      else if (diffDays === 1) countdownText = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) countdownText = `In ${diffDays} days`;
      else if (diffDays > 7 && diffDays <= 30) countdownText = `In ${Math.ceil(diffDays / 7)} wks`;
      else if (diffDays < 0) countdownText = 'Past';
      else countdownText = `In ${Math.ceil(diffDays / 30)} mos`;

      return {
        ...ev,
        itemType: 'custom_event' as const,
        diffDays,
        formattedDate,
        countdownText
      };
    })
    .filter(ev => ev.diffDays >= 0)
    .sort((a, b) => a.diffDays - b.diffDays);

  // Combined timeline items
  type TimelineItem = 
    | { itemType: 'holiday'; data: typeof upcomingHolidays[0]; timestamp: number }
    | { itemType: 'custom_event'; data: typeof upcomingCustomEvents[0]; timestamp: number };

  const holidayItems: TimelineItem[] = upcomingHolidays.map(h => ({
    itemType: 'holiday',
    data: h,
    timestamp: new Date(h.year, h.month - 1, h.day).getTime()
  }));

  const customEventItems: TimelineItem[] = upcomingCustomEvents.map(ev => {
    if (!ev.date) {
      return {
        itemType: 'custom_event',
        data: ev,
        timestamp: 0
      };
    }
    const [y, m, d] = ev.date.split('-').map(Number);
    const valid = y && m && d && !isNaN(y) && !isNaN(m) && !isNaN(d);
    return {
      itemType: 'custom_event',
      data: ev,
      timestamp: valid ? new Date(y, m - 1, d).getTime() : 0
    };
  });

  const getFilteredFeedItems = (): TimelineItem[] => {
    let filteredCustom = customEventItems;
    if (selectedSubjectFilter !== 'all') {
      const activeCourse = courses.find(c => c.id === selectedSubjectFilter);
      filteredCustom = customEventItems.filter(item => {
        if (item.itemType !== 'custom_event') return false;
        return item.data.subjectId === selectedSubjectFilter || 
          (Boolean(activeCourse?.courseCode && item.data.subjectCode) && (item.data.subjectCode || '').trim().toUpperCase() === (activeCourse?.courseCode || '').trim().toUpperCase());
      });
    }

    if (feedFilter === 'academic') {
      return [...filteredCustom.filter(i => i.itemType === 'custom_event' && ['exam', 'long_quiz', 'short_quiz', 'assignment', 'reporting', 'project'].includes(i.data.category))].sort((a, b) => a.timestamp - b.timestamp);
    }
    if (feedFilter === 'campus') {
      return [...filteredCustom.filter(i => i.itemType === 'custom_event' && ['campus_event', 'department_event', 'org_event', 'seminar_workshop', 'sports', 'activity', 'meeting', 'personal'].includes(i.data.category))].sort((a, b) => a.timestamp - b.timestamp);
    }
    if (feedFilter === 'holidays') {
      return [...holidayItems].sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // When a specific subject filter is active, only show that subject's events
    if (selectedSubjectFilter !== 'all') {
      return [...filteredCustom].sort((a, b) => a.timestamp - b.timestamp);
    }

    return [...holidayItems, ...filteredCustom].sort((a, b) => a.timestamp - b.timestamp);
  };

  const feedItems = getFilteredFeedItems();

  const getCategoryLabel = (cat: EventCategory) => {
    switch (cat) {
      case 'exam': return '📝 Major Exam';
      case 'long_quiz': return '📋 Long Quiz';
      case 'short_quiz': return '⚡ Short Quiz';
      case 'assignment': return '📌 Assignment';
      case 'reporting': return '🎤 Reporting';
      case 'project': return '💻 Project';
      case 'campus_event': return '🏫 Campus Event';
      case 'department_event': return '🏛️ Dept Event';
      case 'org_event': return '👥 Org / Club';
      case 'seminar_workshop': return '💡 Seminar';
      case 'sports': return '⚽ Sports & Intrams';
      case 'meeting': return '🤝 Meeting';
      case 'activity': return '🏆 Campus Life';
      case 'personal':
      default: return '🎯 Personal Task';
    }
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 88, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Top Header Bar with Title on Left & Main Toggle Switch on Right */}
      <div className="calendar-top-header-bar">
        <div className="calendar-header-left">
          <h1 className="subjects-title" style={{ margin: 0 }}>Academic Calendar</h1>
          <div className="calendar-header-subtitle">
            Schedules, Exams, Campus Events & Philippine Holidays
          </div>
        </div>

        <div className="calendar-header-right">
          {/* Main View Switcher [ Calendar | Timeline & Holidays ] */}
          <div className="calendar-main-view-toggle">
            <button
              type="button"
              className={`calendar-toggle-btn ${activeMainTab === 'calendar' ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setActiveMainTab('calendar');
              }}
            >
              <CalendarIcon size={14} color={activeMainTab === 'calendar' ? '#FFFFFF' : 'currentColor'} />
              <span>Calendar</span>
            </button>

            <button
              type="button"
              className={`calendar-toggle-btn ${activeMainTab === 'timeline' ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                setActiveMainTab('timeline');
              }}
            >
              <Sparkles size={14} color={activeMainTab === 'timeline' ? '#FFFFFF' : 'currentColor'} />
              <span>Timeline & Holidays</span>
            </button>
          </div>

          {/* Quick Add Custom Event Button */}
          <button 
            type="button"
            className="calendar-top-add-btn"
            onClick={() => {
              triggerLightHaptic();
              setEditingEvent(null);
              setModalDefaultDate(undefined);
              setIsAddModalOpen(true);
            }}
            title="Create Custom Event"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="calendar-add-btn-label">Add Event</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: CALENDAR (BIG CALENDAR ON LEFT + DAY ACTIVITY PANEL ON RIGHT) ================= */}
      {activeMainTab === 'calendar' && (
        <div className="calendar-desktop-split" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
          {/* LEFT: Bigger Calendar Canvas with Month & Weekly View toggle */}
          <div className="calendar-split-col">
            <div className="ios-card" style={{ padding: '20px 22px', background: 'var(--ios-card-bg)', boxShadow: 'var(--ios-shadow-sm)' }}>
              {/* Calendar Controls & Sub-View Switcher (Month Grid vs Weekly View) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                {/* Prev / Next & Month Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button 
                    type="button" 
                    onClick={calendarSubView === 'month' ? handlePrevMonth : handlePrevWeek}
                    style={{ 
                      background: 'var(--ios-bg-secondary)', 
                      border: '1px solid var(--ios-card-border)', 
                      borderRadius: 8, 
                      padding: '6px 10px', 
                      cursor: 'pointer',
                      color: 'var(--ios-text-primary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Previous"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--ios-text-primary)', letterSpacing: '-0.02em' }}>
                    {calendarSubView === 'month' ? monthName : weekRangeLabel}
                  </span>

                  <button 
                    type="button" 
                    onClick={calendarSubView === 'month' ? handleNextMonth : handleNextWeek}
                    style={{ 
                      background: 'var(--ios-bg-secondary)', 
                      border: '1px solid var(--ios-card-border)', 
                      borderRadius: 8, 
                      padding: '6px 10px', 
                      cursor: 'pointer',
                      color: 'var(--ios-text-primary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Next"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      const now = new Date();
                      setCurrentDate(now);
                      setSelectedDate(now);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'var(--ios-blue-light)',
                      color: 'var(--ios-blue)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    TODAY
                  </button>
                </div>

                {/* Sub-View Switcher: Month vs Week (Desktop / Tablet only) */}
                <div 
                  className="cal-subview-switcher"
                  style={{
                    background: 'var(--ios-bg-secondary)',
                    border: '1px solid var(--ios-card-border)',
                    borderRadius: 10,
                    padding: 3,
                    gap: 3
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setCalendarSubView('month');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: calendarSubView === 'month' ? 'var(--ios-card-bg)' : 'transparent',
                      color: calendarSubView === 'month' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                      fontSize: 12,
                      fontWeight: calendarSubView === 'month' ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: calendarSubView === 'month' ? 'var(--ios-shadow-sm)' : 'none'
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span>Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setCalendarSubView('week');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: calendarSubView === 'week' ? 'var(--ios-card-bg)' : 'transparent',
                      color: calendarSubView === 'week' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                      fontSize: 12,
                      fontWeight: calendarSubView === 'week' ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: calendarSubView === 'week' ? 'var(--ios-shadow-sm)' : 'none'
                    }}
                  >
                    <Columns3 size={13} />
                    <span>Week</span>
                  </button>
                </div>
              </div>

              {/* MODE A: MONTH GRID (COMPACT MOBILE DOTS / BIG DESKTOP PILLS) */}
              {calendarSubView === 'month' && (
                <>
                  {/* Weekday Labels Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--ios-text-muted)',
                    marginBottom: 8,
                    letterSpacing: '0.04em'
                  }}>
                    <span>SUN</span>
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                  </div>

                  {/* Month Cells Grid */}
                  <div className="cal-month-grid">
                    {/* Previous Month Filler */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                      const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                      return (
                        <div 
                          key={`prev_${i}`} 
                          className="cal-prev-filler-cell"
                        >
                          <span style={{ fontWeight: 600 }}>{dayNum}</span>
                        </div>
                      );
                    })}

                    {/* Current Month Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const thisDate = new Date(currentYear, currentMonth, dayNum);
                      const holiday = getHolidayForDate(thisDate);
                      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                      const dayCustomEvents = events.filter(e => e.date === dateStr);

                      const thisDayName = dayNames[thisDate.getDay()];
                      const dayClasses = courses.filter(c => c.days && c.days.includes(thisDayName));

                      const isToday = thisDate.toDateString() === new Date().toDateString();
                      const isSelected = thisDate.toDateString() === selectedDate.toDateString();

                      return (
                        <button
                          key={`day_${dayNum}`}
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setSelectedDate(thisDate);
                          }}
                          className="cal-month-cell"
                          style={{
                            border: isSelected 
                              ? '2px solid var(--ios-blue)' 
                              : isToday 
                                ? '1.5px solid var(--ios-blue)' 
                                : '1px solid var(--ios-card-border)',
                            background: isSelected 
                              ? 'var(--ios-blue-light)' 
                              : holiday 
                                ? 'rgba(16, 185, 129, 0.06)' 
                                : dayCustomEvents.length > 0 
                                  ? 'rgba(37, 99, 235, 0.04)'
                                  : 'var(--ios-bg-primary)',
                            color: isSelected 
                              ? 'var(--ios-blue)' 
                              : holiday 
                                ? 'var(--ios-green)' 
                                : 'var(--ios-text-primary)',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {/* Day Number Header */}
                          <div className="cal-cell-header">
                            <span className="cal-cell-number" style={{ 
                              fontWeight: isToday || isSelected ? 900 : 700,
                              color: isSelected ? 'var(--ios-blue)' : undefined
                            }}>
                              {dayNum}
                            </span>

                            {isToday && (
                              <span className="cal-cell-today-indicator" />
                            )}
                          </div>

                          {/* MOBILE VIEW MULTI-DOT INDICATOR (Clean classic phone UI) */}
                          <div className="cal-cell-dots">
                            {holiday && (
                              <span 
                                className="cal-dot-indicator"
                                style={{
                                  background: holiday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)'
                                }}
                                title={holiday.name}
                              />
                            )}
                            {dayCustomEvents.slice(0, 3).map((ev, idx) => (
                              <span 
                                key={idx}
                                className="cal-dot-indicator"
                                style={{
                                  background: ev.color || 'var(--ios-blue)'
                                }}
                                title={ev.title}
                              />
                            ))}
                          </div>

                          {/* DESKTOP VIEW FULL TEXT PILLS (Desktop/Tablet wide canvas only) */}
                          <div className="cal-cell-text-pills">
                            {holiday && (
                              <div 
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: holiday.type === 'regular' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: holiday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%'
                                }}
                                title={holiday.name}
                              >
                                🇵🇭 {holiday.name}
                              </div>
                            )}

                            {dayCustomEvents.slice(0, 2).map((ev, idx) => (
                              <div 
                                key={idx}
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: `${ev.color || 'var(--ios-blue)'}18`,
                                  color: ev.color || 'var(--ios-blue)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%'
                                }}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}

                            {dayCustomEvents.length > 2 && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--ios-text-muted)' }}>
                                +{dayCustomEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* MODE B: 7-DAY WEEKLY VIEW */}
              {calendarSubView === 'week' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                  {weekDates.map((d, dIdx) => {
                    const thisDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                    const holiday = getHolidayForDate(d);
                    const dayEvents = events.filter(e => e.date === thisDateStr);
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const dayOfWeek = dayNames[d.getDay()];
                    const dayClasses = courses.filter(c => c.days && c.days.includes(dayOfWeek));

                    return (
                      <div 
                        key={dIdx}
                        onClick={() => {
                          triggerLightHaptic();
                          setSelectedDate(d);
                        }}
                        style={{
                          background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-primary)',
                          border: isSelected ? '2px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                          borderRadius: 14,
                          padding: '10px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 280,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Day Header */}
                        <div style={{ textAlign: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--ios-divider)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ios-text-muted)' }}>{dayOfWeek}</div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isToday ? 'var(--ios-blue)' : 'var(--ios-text-primary)' }}>
                            {d.getDate()}
                          </div>
                        </div>

                        {/* Holiday Tag */}
                        {holiday && (
                          <div 
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '3px 5px',
                              borderRadius: 6,
                              background: holiday.type === 'regular' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: holiday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)',
                              marginBottom: 6,
                              textAlign: 'center'
                            }}
                          >
                            🇵🇭 {holiday.name}
                          </div>
                        )}

                        {/* Scheduled Classes */}
                        {dayClasses.map(c => (
                          <div
                            key={c.id}
                            style={{
                              background: 'var(--ios-card-bg)',
                              borderLeft: `3px solid ${c.color || 'var(--ios-blue)'}`,
                              borderRadius: 6,
                              padding: '4px 6px',
                              marginBottom: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--ios-text-primary)'
                            }}
                          >
                            <div>{c.courseCode}</div>
                            <div style={{ fontSize: 9, color: 'var(--ios-text-muted)' }}>{c.startTime}</div>
                          </div>
                        ))}

                        {/* Custom Events */}
                        {dayEvents.map(ev => (
                          <div
                            key={ev.id}
                            style={{
                              background: `${ev.color || 'var(--ios-blue)'}15`,
                              borderLeft: `3px solid ${ev.color || 'var(--ios-blue)'}`,
                              borderRadius: 6,
                              padding: '4px 6px',
                              marginBottom: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              color: ev.color || 'var(--ios-blue)'
                            }}
                          >
                            <div>{ev.title}</div>
                            {ev.startTime && <div style={{ fontSize: 9 }}>{ev.startTime}</div>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Selected Day Activity & Events Panel */}
          <div className="calendar-split-col">
            <div className="ios-card" style={{ padding: '20px 22px', background: 'var(--ios-card-bg)', boxShadow: 'var(--ios-shadow-sm)' }}>
              {/* Day Header Bar with + Add Event */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--ios-text-primary)', letterSpacing: '-0.02em' }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    {isSelectedToday && (
                      <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10 }}>● TODAY</span>
                    )}
                    <span style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>
                      {scheduledClassesForDay.length} {scheduledClassesForDay.length === 1 ? 'Class' : 'Classes'} • {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Event' : 'Events'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddForSelectedDay}
                  style={{
                    background: 'var(--ios-blue)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '7px 14px',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.28)'
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Event</span>
                </button>
              </div>

              {/* National Holiday Banner */}
              {selectedHoliday && (
                <div 
                  style={{
                    background: selectedHoliday.type === 'regular' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${selectedHoliday.type === 'regular' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10
                  }}
                >
                  <Flag size={18} color={selectedHoliday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)'} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ 
                      fontSize: 13.5, 
                      fontWeight: 800, 
                      color: selectedHoliday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)' 
                    }}>
                      {selectedHoliday.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ios-text-secondary)', marginTop: 2 }}>
                      {selectedHoliday.description || (selectedHoliday.type === 'regular' ? '🇵🇭 Regular National Holiday (No classes)' : '🇵🇭 Special Non-Working Day')}
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Scheduled Classes */}
              {scheduledClassesForDay.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ios-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={13} /> Scheduled University Classes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scheduledClassesForDay.map(course => (
                      <div
                        key={course.id}
                        onClick={() => onOpenSubject && onOpenSubject(course)}
                        style={{
                          background: 'var(--ios-bg-secondary)',
                          border: '1px solid var(--ios-card-border)',
                          borderLeft: `4px solid ${course.color || 'var(--ios-blue)'}`,
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: onOpenSubject ? 'pointer' : 'default'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                              {course.courseCode}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--ios-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {course.courseName}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} /> {course.startTime} - {course.endTime}
                            </span>
                            {course.room && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={11} /> {course.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Deadlines & Scheduled Events */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ios-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays size={13} /> Day Activities & Tasks
                </div>
                {selectedDayEvents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDayEvents.map(ev => {
                      const evColor = ev.color || 'var(--ios-blue)';
                      return (
                        <div 
                          key={ev.id}
                          style={{
                            background: 'var(--ios-bg-secondary)',
                            border: '1px solid var(--ios-card-border)',
                            borderLeft: `4px solid ${evColor}`,
                            borderRadius: 12,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12
                          }}
                        >
                          <div 
                            onClick={() => handleEditEvent(ev)}
                            style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                          >
                            <div style={{ 
                              fontSize: 14, 
                              fontWeight: 800, 
                              color: 'var(--ios-text-primary)',
                              textDecoration: ev.isCompleted ? 'line-through' : 'none'
                            }}>
                              {ev.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} />
                                {ev.isAllDay ? 'All Day' : `${ev.startTime ? formatTime12H(ev.startTime) : ''}${ev.endTime ? ` – ${formatTime12H(ev.endTime)}` : ''}`}
                              </span>
                              {ev.location && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <MapPin size={11} /> {ev.location}
                                </span>
                              )}
                              {ev.notes && (
                                <span style={{ color: 'var(--ios-text-secondary)', fontStyle: 'italic' }}>
                                  • {ev.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {ev.subjectCode && (
                              <span 
                                style={{ 
                                  background: 'var(--ios-blue-light)', 
                                  color: 'var(--ios-blue)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: 10.5,
                                  fontWeight: 800
                                }}
                              >
                                {ev.subjectCode}
                              </span>
                            )}
                            <span className="ios-tag-pill" style={{ background: `${evColor}15`, color: evColor, fontSize: 10.5 }}>
                              {getCategoryLabel(ev.category)}
                            </span>

                            {onToggleEventComplete && (
                              <button
                                type="button"
                                onClick={() => onToggleEventComplete(ev.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: ev.isCompleted ? 'var(--ios-green)' : 'var(--ios-text-muted)',
                                  cursor: 'pointer',
                                  padding: 4
                                }}
                                title={ev.isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                              >
                                {ev.isCompleted ? <CheckCircle size={18} /> : <Circle size={18} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', padding: '8px 0' }}>
                    No events scheduled on this day. Tap <strong>"+ Add Event"</strong> to create one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: TIMELINE & HOLIDAYS (LIST WITH FILTERS) ================= */}
      {activeMainTab === 'timeline' && (
        <div>
          {/* Sub Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setFeedFilter('all');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: feedFilter === 'all' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'all' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                fontSize: 12,
                fontWeight: feedFilter === 'all' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All Schedule ({feedItems.length})
            </button>

            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setFeedFilter('academic');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: feedFilter === 'academic' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'academic' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'academic' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                fontSize: 12,
                fontWeight: feedFilter === 'academic' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📝 Academic Deadlines
            </button>

            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setFeedFilter('campus');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: feedFilter === 'campus' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'campus' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'campus' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                fontSize: 12,
                fontWeight: feedFilter === 'campus' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🏫 Campus & Dept Events
            </button>

            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setFeedFilter('holidays');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: feedFilter === 'holidays' ? '1px solid var(--ios-green)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'holidays' ? 'rgba(16, 185, 129, 0.12)' : 'var(--ios-card-bg)',
                color: feedFilter === 'holidays' ? 'var(--ios-green)' : 'var(--ios-text-secondary)',
                fontSize: 12,
                fontWeight: feedFilter === 'holidays' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🇵🇭 Holidays ({upcomingHolidays.length})
            </button>
          </div>

          {/* Course Subject Filter Pills */}
          {courses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
              <button
                type="button"
                onClick={() => {
                  triggerSelectionHaptic();
                  setSelectedSubjectFilter('all');
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: selectedSubjectFilter === 'all' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                  background: selectedSubjectFilter === 'all' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                  color: selectedSubjectFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                  fontSize: 11,
                  fontWeight: selectedSubjectFilter === 'all' ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                All Courses
              </button>

              {courses.map(course => {
                const isSelected = selectedSubjectFilter === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setSelectedSubjectFilter(isSelected ? 'all' : course.id);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: isSelected ? `1.5px solid ${course.color || 'var(--ios-blue)'}` : '1px solid var(--ios-card-border)',
                      background: isSelected ? `${course.color || 'var(--ios-blue)'}18` : 'var(--ios-card-bg)',
                      color: isSelected ? (course.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                      fontSize: 11,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: course.color || 'var(--ios-blue)' }} />
                    <span>{course.courseCode}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timeline Event Feed Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedItems.length === 0 ? (
              <div className="ios-card" style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--ios-card-bg)' }}>
                <CalendarIcon size={32} color="var(--ios-text-muted)" style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-text-primary)' }}>No matching events</div>
                <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>Try changing your filter above.</div>
              </div>
            ) : (
              feedItems.map((item, idx) => {
                if (item.itemType === 'holiday') {
                  const h = item.data;
                  const isReg = h.type === 'regular';
                  return (
                    <div
                      key={`hol_${idx}`}
                      className="ios-card"
                      style={{
                        padding: '14px 18px',
                        background: 'var(--ios-card-bg)',
                        borderLeft: `4px solid ${isReg ? 'var(--ios-green)' : 'var(--ios-orange)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isReg ? 'var(--ios-green)' : 'var(--ios-orange)' }}>
                          {h.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 2 }}>
                          {new Date(h.year, h.month - 1, h.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <span 
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: isReg ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: isReg ? 'var(--ios-green)' : 'var(--ios-orange)'
                        }}
                      >
                        {isReg ? '🇵🇭 Regular Holiday' : '🇵🇭 Special Non-Working'}
                      </span>
                    </div>
                  );
                }

                const ev = item.data;
                const evColor = ev.color || 'var(--ios-blue)';
                return (
                  <div
                    key={`ev_${ev.id}`}
                    className="ios-card"
                    style={{
                      padding: '14px 18px',
                      background: 'var(--ios-card-bg)',
                      borderLeft: `4px solid ${evColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      cursor: 'pointer'
                    }}
                    onClick={() => handleEditEvent(ev)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14.5, 
                        fontWeight: 800, 
                        color: 'var(--ios-text-primary)',
                        textDecoration: ev.isCompleted ? 'line-through' : 'none'
                      }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{ev.formattedDate}</span>
                        {ev.startTime && (
                          <span>• {formatTime12H(ev.startTime)}{ev.endTime ? ` – ${formatTime12H(ev.endTime)}` : ''}</span>
                        )}
                        {ev.location && <span>• {ev.location}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {ev.subjectCode && (
                        <span 
                          style={{ 
                            background: 'var(--ios-blue-light)', 
                            color: 'var(--ios-blue)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800
                          }}
                        >
                          {ev.subjectCode}
                        </span>
                      )}
                      <span className="ios-tag-pill" style={{ background: `${evColor}15`, color: evColor, fontSize: 10.5 }}>
                        {getCategoryLabel(ev.category)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      <AddEventModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveEvent={onSaveEvent}
        onDeleteEvent={onDeleteEvent}
        initialEvent={editingEvent}
        defaultDate={modalDefaultDate}
        courses={courses}
      />
    </div>
  );
};

export default CalendarView;
