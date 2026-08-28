import React, { useState } from 'react';
import { 
  getUpcomingHolidays, 
  getHolidayForDate 
} from '../services/phHolidaysService';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sun, 
  Palmtree, 
  Sparkles, 
  Flag,
  CheckCircle2
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabFilter = 'upcoming' | 'month' | 'long_weekends' | 'regular';

export const HolidayCalendarModal: React.FC<HolidayCalendarModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  if (!isOpen) return null;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  const upcomingHolidays = getUpcomingHolidays(new Date(), 25);

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

  // Selected date holiday details
  const selectedHoliday = getHolidayForDate(selectedDate);
  const isSelectedToday = selectedDate.toDateString() === new Date().toDateString();

  // Filtered Holidays for list views
  const longWeekendHolidays = upcomingHolidays.filter(h => h.isLongWeekend);
  const regularHolidays = upcomingHolidays.filter(h => h.type === 'regular');

  const displayHolidays = 
    activeTab === 'long_weekends' 
      ? longWeekendHolidays 
      : activeTab === 'regular' 
        ? regularHolidays 
        : upcomingHolidays;

  return (
    <div className="ios-modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="ios-modal-card" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxHeight: '88vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 18px 12px 18px',
          borderBottom: '1px solid var(--ios-divider)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--ios-card-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--ios-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Palmtree size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ios-text-primary)' }}>
                Campus & PH Holidays
              </h2>
              <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                Official Philippine Holidays & Long Weekends
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="ios-modal-close-btn"
            onClick={() => {
              triggerLightHaptic();
              onClose();
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Segmented Control */}
        <div style={{ padding: '10px 16px 6px 16px', background: 'var(--ios-card-bg)' }}>
          <div className="schedule-view-switcher" style={{ margin: 0, width: '100%', display: 'flex' }}>
            <button
              type="button"
              className={`schedule-view-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              style={{ flex: 1, fontSize: 11.5, padding: '7px 4px' }}
              onClick={() => {
                triggerSelectionHaptic();
                setActiveTab('upcoming');
              }}
            >
              <Sparkles size={12} /> Upcoming
            </button>
            <button
              type="button"
              className={`schedule-view-btn ${activeTab === 'month' ? 'active' : ''}`}
              style={{ flex: 1, fontSize: 11.5, padding: '7px 4px' }}
              onClick={() => {
                triggerSelectionHaptic();
                setActiveTab('month');
              }}
            >
              <CalendarIcon size={12} /> Month
            </button>
            <button
              type="button"
              className={`schedule-view-btn ${activeTab === 'long_weekends' ? 'active' : ''}`}
              style={{ flex: 1, fontSize: 11.5, padding: '7px 4px' }}
              onClick={() => {
                triggerSelectionHaptic();
                setActiveTab('long_weekends');
              }}
            >
              <Sun size={12} /> Long Weekends
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px 16px' }}>
          
          {/* TAB 1: MONTH CALENDAR MATRIX VIEW */}
          {activeTab === 'month' && (
            <div>
              {/* Month Switcher Row */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 12,
                padding: '4px 6px'
              }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    background: 'var(--ios-card-bg)',
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
                    background: 'var(--ios-card-bg)',
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
                marginBottom: 6,
                fontWeight: 700,
                fontSize: 11,
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
                gap: 4,
                marginBottom: 16
              }}>
                {/* Previous month filler days */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                  const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                  return (
                    <div 
                      key={`prev_${i}`} 
                      style={{ 
                        height: 42, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--ios-divider)',
                        fontSize: 12,
                        opacity: 0.4
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
                        height: 42,
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
                        fontWeight: isToday || holiday ? 800 : 600,
                        fontSize: 13,
                        padding: 0
                      }}
                    >
                      <span>{dayNum}</span>
                      {holiday && (
                        <span 
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: holiday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)',
                            marginTop: 1
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Details Card */}
              <div className="ios-card" style={{ padding: '14px 16px', background: 'var(--ios-bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  {isSelectedToday && (
                    <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 10 }}>● TODAY</span>
                  )}
                </div>

                {selectedHoliday ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span 
                        className="ios-tag-pill"
                        style={{
                          background: selectedHoliday.type === 'regular' ? 'var(--ios-green-light)' : 'var(--ios-orange-light)',
                          color: selectedHoliday.type === 'regular' ? 'var(--ios-green)' : 'var(--ios-orange)',
                          fontSize: 10,
                          fontWeight: 800
                        }}
                      >
                        {selectedHoliday.typeLabel}
                      </span>
                      {selectedHoliday.isLongWeekend && (
                        <span className="ios-tag-pill" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--ios-blue)', fontSize: 10 }}>
                          🏖️ Long Weekend
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ios-text-primary)', marginTop: 4 }}>
                      {selectedHoliday.name}
                    </div>
                    {selectedHoliday.nameFilipino && (
                      <div style={{ fontSize: 12, color: 'var(--ios-text-secondary)', fontStyle: 'italic', marginTop: 1 }}>
                        {selectedHoliday.nameFilipino}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--ios-text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                      {selectedHoliday.description}
                    </p>
                    <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} /> Official Holiday • No regular campus classes
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', padding: '6px 0' }}>
                    Regular academic & lecture schedule (No national holiday declared).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2 & 3: UPCOMING / LONG WEEKENDS / REGULAR HOLIDAYS LIST */}
          {activeTab !== 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayHolidays.length === 0 ? (
                <div className="ios-card" style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ios-text-muted)' }}>
                  No upcoming holidays matching this filter.
                </div>
              ) : (
                displayHolidays.map(holiday => {
                  const isRegular = holiday.type === 'regular';

                  return (
                    <div 
                      key={holiday.id}
                      className="ios-card"
                      style={{
                        padding: '14px 16px',
                        borderLeft: isRegular ? '4px solid var(--ios-green)' : '4px solid var(--ios-orange)',
                        background: holiday.isToday 
                          ? 'linear-gradient(135deg, var(--ios-card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)' 
                          : 'var(--ios-card-bg)'
                      }}
                    >
                      {/* Top Row: Date & Countdown Tag */}
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

                      {/* Description & Badge */}
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
                })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HolidayCalendarModal;
