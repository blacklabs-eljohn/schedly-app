import React, { useState } from 'react';
import { 
  CustomEvent, 
  EventCategory,
  Course
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
  Bell, 
  CheckCircle, 
  Circle, 
  MoreVertical,
  BookOpen
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

type TabFilter = 'holidays' | 'month';
type FeedFilter = 'all' | 'my_events' | 'holidays';

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
  const [activeTab, setActiveTab] = useState<TabFilter>('holidays');
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

  // Calendar Grid generation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Selected date holiday & events
  const selectedHoliday = getHolidayForDate(selectedDate);
  const isSelectedToday = selectedDate.toDateString() === new Date().toDateString();

  const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
  const selectedDayEvents = events.filter(e => e.date === selectedDateStr);

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
      else if (diffDays > 7 && diffDays <= 30) countdownText = `In ${Math.ceil(diffDays / 7)} weeks`;
      else if (diffDays < 0) countdownText = 'Past';
      else countdownText = `In ${Math.ceil(diffDays / 30)} months`;

      return {
        ...ev,
        itemType: 'custom_event' as const,
        diffDays,
        formattedDate,
        countdownText
      };
    })
    .filter(ev => ev.diffDays >= 0);

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
      filteredCustom = customEventItems.filter(item => {
        return item.itemType === 'custom_event' && item.data.subjectId === selectedSubjectFilter;
      });
    }

    if (feedFilter === 'my_events') {
      return [...filteredCustom].sort((a, b) => a.timestamp - b.timestamp);
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
      case 'reporting': return '🎤 Oral Reporting';
      case 'project': return '💻 Project / Output';
      case 'meeting': return '👥 Meeting / Defense';
      case 'activity': return '🏆 Campus Life';
      case 'personal':
      default: return '🎯 Personal Task';
    }
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 88, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Top Header Bar: Title "Calendar", Right Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 className="subjects-title" style={{ margin: 0 }}>Calendar</h1>
          <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
            Events, Exams & Philippine Holidays
          </div>
        </div>

        <div className="top-utility-right">
          {/* Add Event Header Button */}
          <button 
            type="button"
            className="home-logo-circle"
            onClick={() => {
              triggerLightHaptic();
              setEditingEvent(null);
              setModalDefaultDate(undefined);
              setIsAddModalOpen(true);
            }}
            title="Create Custom Event"
            style={{ 
              cursor: 'pointer',
              background: 'var(--ios-blue)',
              border: 'none',
              color: '#FFFFFF',
              boxShadow: '0 3px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Sleek 2-Option Pill Switcher Matching Bottom Dock Navbar Style */}
      <div 
        style={{
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto 16px auto',
          background: 'var(--ios-glass-pill-bg)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          border: '1px solid var(--ios-glass-pill-border)',
          borderRadius: '999px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)'
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerSelectionHaptic();
            setActiveTab('holidays');
          }}
          style={{
            flex: 1,
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: '999px',
            border: 'none',
            background: activeTab === 'holidays' ? 'var(--ios-blue)' : 'transparent',
            color: activeTab === 'holidays' ? '#FFFFFF' : 'var(--ios-text-secondary)',
            fontSize: '13px',
            fontWeight: activeTab === 'holidays' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'holidays' ? '0 3px 12px rgba(37, 99, 235, 0.28)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <Sparkles size={15} color={activeTab === 'holidays' ? '#FFFFFF' : 'currentColor'} />
          <span>Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerSelectionHaptic();
            setActiveTab('month');
          }}
          style={{
            flex: 1,
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: '999px',
            border: 'none',
            background: activeTab === 'month' ? 'var(--ios-blue)' : 'transparent',
            color: activeTab === 'month' ? '#FFFFFF' : 'var(--ios-text-secondary)',
            fontSize: '13px',
            fontWeight: activeTab === 'month' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'month' ? '0 3px 12px rgba(37, 99, 235, 0.28)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <CalendarIcon size={15} color={activeTab === 'month' ? '#FFFFFF' : 'currentColor'} />
          <span>Month Grid</span>
        </button>
      </div>

      {/* VIEW 1: COMBINED TIMELINE & EVENTS FEED */}
      {activeTab === 'holidays' && (
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
                padding: '5px 12px',
                borderRadius: '999px',
                border: feedFilter === 'all' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'all' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                fontSize: 11.5,
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
                setFeedFilter('my_events');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                border: feedFilter === 'my_events' ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'my_events' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'my_events' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                fontSize: 11.5,
                fontWeight: feedFilter === 'my_events' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              My Events ({events.length})
            </button>

            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setFeedFilter('holidays');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                border: feedFilter === 'holidays' ? '1px solid var(--ios-green)' : '1px solid var(--ios-card-border)',
                background: feedFilter === 'holidays' ? 'var(--ios-green-light)' : 'var(--ios-card-bg)',
                color: feedFilter === 'holidays' ? 'var(--ios-green)' : 'var(--ios-text-secondary)',
                fontSize: 11.5,
                fontWeight: feedFilter === 'holidays' ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🇵🇭 Holidays ({upcomingHolidays.length})
            </button>
          </div>

          {/* Subject Filter Pills (if enrolled courses exist) */}
          {courses.length > 0 && feedFilter !== 'holidays' && (
            <div 
              style={{ 
                display: 'flex', 
                gap: 6, 
                overflowX: 'auto', 
                paddingBottom: 4, 
                marginBottom: 12,
                scrollbarWidth: 'none'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerSelectionHaptic();
                  setSelectedSubjectFilter('all');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: selectedSubjectFilter === 'all' ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
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
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: isSelected ? `1.5px solid ${course.color || 'var(--ios-blue)'}` : '1px solid var(--ios-card-border)',
                      background: isSelected ? `${course.color || '#2563EB'}18` : 'var(--ios-card-bg)',
                      color: isSelected ? (course.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                      fontSize: 11,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>📖</span>
                    <span>{course.courseCode}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timeline Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedItems.length === 0 ? (
              <div className="ios-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ios-text-muted)' }}>
                No events found for this filter.
                <div style={{ marginTop: 12 }}>
                  <button 
                    type="button" 
                    className="ios-btn-secondary" 
                    onClick={handleOpenAddForSelectedDay}
                    style={{ margin: '0 auto', fontSize: 12, padding: '8px 16px' }}
                  >
                    <Plus size={14} /> Add First Event
                  </button>
                </div>
              </div>
            ) : (
              feedItems.map((item, idx) => {
                if (item.itemType === 'holiday') {
                  const holiday = item.data;
                  const isRegular = holiday.type === 'regular';

                  return (
                    <div 
                      key={`h_${holiday.id}_${idx}`}
                      className="ios-card"
                      style={{
                        padding: '14px 16px',
                        borderLeft: isRegular ? '4px solid var(--ios-green)' : '4px solid var(--ios-orange)',
                        background: holiday.isToday 
                          ? 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)' 
                          : 'var(--ios-card-bg)'
                      }}
                    >
                      {/* Top Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ios-blue)' }}>
                          {holiday.formattedDate} • {holiday.dayOfWeekName}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {holiday.isLongWeekend && (
                            <span 
                              className="ios-tag-pill" 
                              style={{ 
                                background: 'rgba(37, 99, 235, 0.1)', 
                                color: 'var(--ios-blue)', 
                                fontSize: 9.5,
                                padding: '2px 6px'
                              }}
                            >
                              🏖️ Long Weekend
                            </span>
                          )}
                          <span 
                            className="ios-tag-pill"
                            style={{
                              background: holiday.isToday ? 'var(--ios-green-light)' : 'var(--ios-divider)',
                              color: holiday.isToday ? 'var(--ios-green)' : 'var(--ios-text-secondary)',
                              fontSize: 10,
                              fontWeight: 800
                            }}
                          >
                            {holiday.countdownText}
                          </span>
                        </div>
                      </div>

                      {/* Holiday Title */}
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                        {holiday.name}
                      </div>
                      {holiday.nameFilipino && (
                        <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', fontStyle: 'italic', marginTop: 1 }}>
                          {holiday.nameFilipino}
                        </div>
                      )}

                      {/* Description */}
                      <p style={{ fontSize: 11.5, color: 'var(--ios-text-secondary)', margin: '6px 0 8px 0', lineHeight: 1.45 }}>
                        {holiday.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ios-divider)', paddingTop: 8 }}>
                        <span 
                          style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            color: isRegular ? 'var(--ios-green)' : 'var(--ios-orange)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Flag size={11} /> {holiday.typeLabel}
                        </span>

                        <span style={{ fontSize: 11, color: 'var(--ios-text-muted)', fontWeight: 600 }}>
                          Campus Classes Suspended
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  // Custom User Event Card
                  const customEv = item.data;
                  const eventColor = customEv.color || '#2563EB';

                  return (
                    <div 
                      key={`evt_${customEv.id}_${idx}`}
                      className="ios-card"
                      onClick={() => handleEditEvent(customEv)}
                      style={{
                        padding: '14px 16px',
                        borderLeft: `4px solid ${eventColor}`,
                        cursor: 'pointer',
                        background: customEv.isCompleted 
                          ? 'var(--ios-bg-secondary)' 
                          : 'var(--ios-card-bg)',
                        opacity: customEv.isCompleted ? 0.75 : 1
                      }}
                    >
                      {/* Top Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: eventColor }}>
                          {customEv.formattedDate}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {customEv.subjectCode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                if (onOpenSubject) {
                                  e.stopPropagation();
                                  const matched = courses.find(c => c.id === customEv.subjectId || c.courseCode === customEv.subjectCode);
                                  if (matched) onOpenSubject(matched);
                                }
                              }}
                              className="ios-tag-pill"
                              style={{
                                background: 'var(--ios-blue-light)',
                                color: 'var(--ios-blue)',
                                fontSize: 9.5,
                                fontWeight: 800,
                                border: 'none',
                                cursor: onOpenSubject ? 'pointer' : 'default',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                              title={onOpenSubject ? `View ${customEv.subjectCode} Course Hub` : undefined}
                            >
                              <BookOpen size={10} />
                              {customEv.subjectCode}
                            </button>
                          )}
                          <span 
                            className="ios-tag-pill"
                            style={{
                              background: `${eventColor}15`,
                              color: eventColor,
                              fontSize: 10,
                              fontWeight: 800
                            }}
                          >
                            {getCategoryLabel(customEv.category)}
                          </span>
                          <span 
                            className="ios-tag-pill"
                            style={{
                              background: 'var(--ios-divider)',
                              color: 'var(--ios-text-secondary)',
                              fontSize: 10,
                              fontWeight: 800
                            }}
                          >
                            {customEv.countdownText}
                          </span>
                        </div>
                      </div>

                      {/* Event Title with Completion Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ 
                          fontSize: 15, 
                          fontWeight: 800, 
                          color: 'var(--ios-text-primary)',
                          textDecoration: customEv.isCompleted ? 'line-through' : 'none'
                        }}>
                          {customEv.title}
                        </div>

                        {onToggleEventComplete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerLightHaptic();
                              onToggleEventComplete(customEv.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: customEv.isCompleted ? 'var(--ios-green)' : 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              padding: 2
                            }}
                            title={customEv.isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                          >
                            {customEv.isCompleted ? <CheckCircle size={18} /> : <Circle size={18} />}
                          </button>
                        )}
                      </div>

                      {/* Time & Location Meta Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--ios-text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          {customEv.isAllDay 
                            ? 'All Day' 
                            : `${customEv.startTime ? formatTime12H(customEv.startTime) : ''}${customEv.endTime ? ` – ${formatTime12H(customEv.endTime)}` : ''}`}
                        </span>

                        {customEv.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> {customEv.location}
                          </span>
                        )}
                      </div>

                      {/* Notes snippet if present */}
                      {customEv.notes && (
                        <p style={{ fontSize: 11.5, color: 'var(--ios-text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                          {customEv.notes}
                        </p>
                      )}

                      {/* Notification reminder footer */}
                      {customEv.reminderMinutes >= 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--ios-divider)', fontSize: 10.5, color: 'var(--ios-blue)', fontWeight: 600 }}>
                          <Bell size={11} /> Reminder scheduled {customEv.reminderMinutes === 0 ? 'at event time' : customEv.reminderMinutes === 1440 ? '1 day before' : `${customEv.reminderMinutes} mins before`}
                        </div>
                      )}
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MONTH CALENDAR MATRIX VIEW */}
      {activeTab === 'month' && (
        <div>
          <div className="ios-card" style={{ padding: '16px 14px', marginBottom: 14 }}>
            {/* Month Switcher Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: 14
            }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'var(--ios-bg-secondary)',
                  border: '1px solid var(--ios-card-border)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ios-text-primary)'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                {monthName}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'var(--ios-bg-secondary)',
                  border: '1px solid var(--ios-card-border)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ios-text-primary)'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day Headers (Su, Mo, Tu, We, Th, Fr, Sa) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: 8,
              fontWeight: 800,
              fontSize: 10.5,
              color: 'var(--ios-text-muted)',
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

            {/* Month Grid Cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4
            }}>
              {/* Previous month filler days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                return (
                  <div 
                    key={`prev_${i}`} 
                    style={{ 
                      height: 44, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--ios-text-muted)',
                      fontSize: 12,
                      opacity: 0.3
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const thisDate = new Date(currentYear, currentMonth, dayNum);
                const holiday = getHolidayForDate(thisDate);
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                const dayCustomEvents = events.filter(e => e.date === dateStr);

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
                    style={{
                      height: 44,
                      borderRadius: 10,
                      border: isSelected 
                        ? '2px solid var(--ios-blue)' 
                        : isToday 
                          ? '1px solid var(--ios-blue)' 
                          : '1px solid transparent',
                      background: isSelected 
                        ? 'var(--ios-blue-light)' 
                        : holiday 
                          ? 'rgba(16, 185, 129, 0.08)' 
                          : dayCustomEvents.length > 0 
                            ? 'rgba(37, 99, 235, 0.05)'
                            : 'transparent',
                      color: isSelected 
                        ? 'var(--ios-blue)' 
                        : holiday 
                          ? 'var(--ios-green)' 
                          : 'var(--ios-text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      fontWeight: isToday || holiday || dayCustomEvents.length > 0 ? 800 : 600,
                      fontSize: 13,
                      padding: 0
                    }}
                  >
                    <span>{dayNum}</span>
                    
                    {/* Multi-dot indicator for holidays & events */}
                    <div style={{ display: 'flex', gap: 2, marginTop: 1, alignItems: 'center' }}>
                      {holiday && (
                        <span 
                          style={{
                            width: 4.5,
                            height: 4.5,
                            borderRadius: '50%',
                            background: holiday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)'
                          }}
                          title={holiday.name}
                        />
                      )}
                      {dayCustomEvents.slice(0, 2).map((ev, evIdx) => (
                        <span 
                          key={evIdx}
                          style={{
                            width: 4.5,
                            height: 4.5,
                            borderRadius: '50%',
                            background: ev.color || 'var(--ios-blue)'
                          }}
                          title={ev.title}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Card */}
          <div className="ios-card" style={{ padding: '16px 18px', background: 'var(--ios-card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                {isSelectedToday && (
                  <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10, marginTop: 2, display: 'inline-block' }}>● TODAY</span>
                )}
              </div>

              {/* Quick Add Event on This Selected Day */}
              <button
                type="button"
                onClick={handleOpenAddForSelectedDay}
                className="ios-btn-secondary"
                style={{ fontSize: 11.5, padding: '5px 10px', margin: 0 }}
              >
                <Plus size={13} /> Add Event
              </button>
            </div>

            {/* Selected Day National Holiday */}
            {selectedHoliday && (
              <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, marginBottom: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 9.5 }}>
                    {selectedHoliday.typeLabel}
                  </span>
                  {selectedHoliday.isLongWeekend && (
                    <span className="ios-tag-pill" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--ios-blue)', fontSize: 9.5 }}>
                      🏖️ Long Weekend
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ios-green)' }}>
                  🌴 {selectedHoliday.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 2 }}>
                  {selectedHoliday.description} • Campus classes suspended
                </div>
              </div>
            )}

            {/* Selected Day Custom Events */}
            {selectedDayEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-muted)', letterSpacing: '0.04em' }}>
                  Scheduled Events ({selectedDayEvents.length})
                </div>
                {selectedDayEvents.map(ev => {
                  const evColor = ev.color || 'var(--ios-blue)';
                  return (
                    <div 
                      key={ev.id}
                      onClick={() => handleEditEvent(ev)}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--ios-bg-secondary)',
                        borderRadius: 10,
                        borderLeft: `3px solid ${evColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)', textDecoration: ev.isCompleted ? 'line-through' : 'none' }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{ev.isAllDay ? 'All Day' : `${ev.startTime ? formatTime12H(ev.startTime) : ''}`}</span>
                          {ev.location && <span>• {ev.location}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {ev.subjectCode && (
                          <span 
                            className="ios-tag-pill" 
                            style={{ 
                              background: 'var(--ios-blue-light)', 
                              color: 'var(--ios-blue)', 
                              fontSize: 9.5,
                              fontWeight: 800
                            }}
                          >
                            📖 {ev.subjectCode}
                          </span>
                        )}
                        <span className="ios-tag-pill" style={{ background: `${evColor}15`, color: evColor, fontSize: 9.5 }}>
                          {getCategoryLabel(ev.category)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !selectedHoliday ? (
              <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', padding: '6px 0' }}>
                No events or national holidays on this day. Tap "+ Add Event" to schedule.
              </div>
            ) : null}
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

