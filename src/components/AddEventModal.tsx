import React, { useState, useEffect } from 'react';
import { CustomEvent, EventCategory } from '../types';
import { 
  X, 
  Clock, 
  MapPin, 
  Bell, 
  FileText, 
  Trash2, 
  Check
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEvent: (event: CustomEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  initialEvent?: CustomEvent | null;
  defaultDate?: string; // 'YYYY-MM-DD'
}

const CATEGORIES: { id: EventCategory; label: string; icon: string; defaultColor: string }[] = [
  { id: 'exam', label: 'Exam / Quiz', icon: '📝', defaultColor: '#EF4444' },
  { id: 'assignment', label: 'Deadline', icon: '📌', defaultColor: '#F59E0B' },
  { id: 'meeting', label: 'Meeting', icon: '👥', defaultColor: '#2563EB' },
  { id: 'activity', label: 'Campus Life', icon: '🏆', defaultColor: '#8B5CF6' },
  { id: 'personal', label: 'Personal', icon: '🎯', defaultColor: '#10B981' }
];

const COLOR_PALETTES = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#2563EB', // Electric Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#EC4899', // Rose Pink
  '#0D9488', // Teal
  '#6366F1'  // Indigo
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onSaveEvent,
  onDeleteEvent,
  initialEvent,
  defaultDate
}) => {
  const getInitialDate = () => {
    if (initialEvent?.date) return initialEvent.date;
    if (defaultDate) return defaultDate;
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('exam');
  const [date, setDate] = useState(getInitialDate);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [selectedColor, setSelectedColor] = useState('#EF4444');

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setTitle(initialEvent.title);
        setCategory(initialEvent.category);
        setDate(initialEvent.date);
        setIsAllDay(initialEvent.isAllDay);
        setStartTime(initialEvent.startTime || '09:00');
        setEndTime(initialEvent.endTime || '10:30');
        setLocation(initialEvent.location || '');
        setReminderMinutes(initialEvent.reminderMinutes !== undefined ? initialEvent.reminderMinutes : 30);
        setNotes(initialEvent.notes || '');
        setSelectedColor(initialEvent.color || '#2563EB');
      } else {
        setTitle('');
        setCategory('exam');
        setDate(getInitialDate());
        setIsAllDay(false);
        setStartTime('09:00');
        setEndTime('10:30');
        setLocation('');
        setReminderMinutes(30);
        setNotes('');
        setSelectedColor('#EF4444');
      }
    }
  }, [isOpen, initialEvent, defaultDate]);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: EventCategory) => {
    triggerSelectionHaptic();
    setCategory(cat);
    const catConfig = CATEGORIES.find(c => c.id === cat);
    if (catConfig) setSelectedColor(catConfig.defaultColor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an event title.');
      return;
    }

    const newEvent: CustomEvent = {
      id: initialEvent ? initialEvent.id : `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      category,
      date,
      isAllDay,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      location: location.trim() || undefined,
      reminderMinutes,
      notes: notes.trim() || undefined,
      color: selectedColor,
      isCompleted: initialEvent?.isCompleted || false,
      createdAt: initialEvent?.createdAt || new Date().toISOString()
    };

    triggerSuccessHaptic();
    onSaveEvent(newEvent);
    onClose();
  };

  const handleDelete = () => {
    if (initialEvent && onDeleteEvent) {
      if (window.confirm('Are you sure you want to delete this event?')) {
        triggerLightHaptic();
        onDeleteEvent(initialEvent.id);
        onClose();
      }
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="ios-modal-sheet" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxHeight: '88vh', 
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        {/* iOS Drag Handle */}
        <div className="ios-modal-handle" />

        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 19 }}>
              {initialEvent ? 'Edit Event' : 'New Custom Event'}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
              Schedule exams, deadlines & campus reminders
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          
          {/* Event Title */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Event Title *</label>
            <input 
              type="text" 
              className="ios-input" 
              placeholder="e.g. Calculus 2 Midterm Exam"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Category Chips */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: isSelected ? `2px solid ${cat.defaultColor}` : '1px solid var(--ios-card-border)',
                      background: isSelected ? `${cat.defaultColor}15` : 'var(--ios-card-bg)',
                      color: isSelected ? cat.defaultColor : 'var(--ios-text-secondary)',
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Inset Group */}
          <div className="detail-grouped-list" style={{ padding: '12px 14px', marginBottom: 14 }}>
            <div className="ios-input-group" style={{ marginBottom: 10 }}>
              <label className="ios-input-label">Event Date</label>
              <input 
                type="date" 
                className="ios-input" 
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            {/* All Day Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--ios-divider)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ios-text-primary)' }}>All-Day Event</div>
                <div style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>No specific lecture hours</div>
              </div>
              <label className="ios-toggle-switch">
                <input 
                  type="checkbox"
                  checked={isAllDay}
                  onChange={e => setIsAllDay(e.target.checked)}
                />
                <span className="ios-toggle-slider" />
              </label>
            </div>

            {/* Start & End Time if not all day */}
            {!isAllDay && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--ios-divider)' }}>
                <div style={{ flex: 1 }}>
                  <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> Start Time
                  </label>
                  <input 
                    type="time" 
                    className="ios-input"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> End Time
                  </label>
                  <input 
                    type="time" 
                    className="ios-input"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location & Room */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> Location / Room / Link (Optional)
            </label>
            <input 
              type="text" 
              className="ios-input" 
              placeholder="e.g. Science Bldg 302, Gym, or Zoom Link"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          {/* Reminder Alarm Selector */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Bell size={12} /> Notification Alert Reminder
            </label>
            <select 
              className="ios-input"
              value={reminderMinutes}
              onChange={e => setReminderMinutes(Number(e.target.value))}
            >
              <option value={-1}>No Reminder Notification</option>
              <option value={0}>At time of event</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before (Recommended)</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before (Great for Exams & Deadlines)</option>
            </select>
          </div>

          {/* Color Palette Selector */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Event Color Badge</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {COLOR_PALETTES.map(col => {
                const isSelected = selectedColor === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setSelectedColor(col);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: col,
                      border: isSelected ? '3px solid var(--ios-card-bg)' : 'none',
                      outline: isSelected ? `2px solid ${col}` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Checklists */}
          <div className="ios-input-group" style={{ marginBottom: 20 }}>
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> Notes & Details (Optional)
            </label>
            <textarea 
              className="ios-input" 
              rows={3}
              placeholder="e.g. Bring scientific calculator, 2B pencil, and permit..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'none', lineHeight: 1.4 }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button 
              type="submit" 
              className="ios-btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 800 }}
            >
              {initialEvent ? 'Save Changes' : 'Create Event'}
            </button>

            {initialEvent && (
              <button 
                type="button" 
                onClick={handleDelete}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 12,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--ios-red)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Trash2 size={15} /> Delete Event
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddEventModal;
