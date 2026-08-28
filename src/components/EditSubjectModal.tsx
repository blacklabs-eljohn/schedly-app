import React, { useState, useEffect } from 'react';
import { Course, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../services/scheduleEngine';
import { X, Palette, Trash2, Check, ChevronRight } from 'lucide-react';
import { SubjectIconPickerModal } from './SubjectIconPickerModal';
import { getSubjectIconComponent, detectSubjectIcon, SUBJECT_ICONS } from '../services/iconService';
import { triggerLightHaptic } from '../services/hapticsService';

interface EditSubjectModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCourse: Course) => void;
  onDelete?: (courseId: string) => void;
}

// Curated Rich Vibrant Gradients matching the Subject Stack Cards exactly
export const VIBRANT_COLOR_PALETTES = [
  { id: 'indigo', color: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', hex: '#4F46E5', name: 'Electric Indigo' },
  { id: 'blue', color: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', hex: '#0284C7', name: 'Ocean Blue' },
  { id: 'emerald', color: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', hex: '#10B981', name: 'Emerald Green' },
  { id: 'rose', color: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', hex: '#F43F5E', name: 'Sunset Rose' },
  { id: 'purple', color: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', hex: '#8B5CF6', name: 'Royal Purple' },
  { id: 'amber', color: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', hex: '#F59E0B', name: 'Amber Gold' },
  { id: 'teal', color: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', hex: '#0D9488', name: 'Cyber Teal' },
  { id: 'pink', color: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', hex: '#EC4899', name: 'Neon Pink' }
];

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  course: initialCourse,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [course, setCourse] = useState<Course | null>(initialCourse);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  useEffect(() => {
    if (initialCourse) {
      setCourse({ ...initialCourse });
    }
  }, [initialCourse]);

  if (!isOpen || !course) return null;

  const handleUpdate = (field: keyof Course, val: any) => {
    setCourse(prev => prev ? { ...prev, [field]: val } : null);
  };

  const handleToggleDay = (day: DayOfWeek) => {
    if (!course) return;
    const exists = course.days.includes(day);
    const nextDays = exists 
      ? course.days.filter(d => d !== day)
      : [...course.days, day];
    handleUpdate('days', nextDays);
  };

  const handleDelete = () => {
    if (!course) return;
    if (window.confirm(`Are you sure you want to delete ${course.courseCode}?`)) {
      onDelete?.(course.id);
      onClose();
    }
  };

  const activeIconId = course.icon || detectSubjectIcon(course.courseCode, course.courseName);
  const activeIconDef = SUBJECT_ICONS.find(i => i.id === activeIconId);

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0 }}>Edit Subject</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              Customize subject icon, vibrant color tag, venue & schedule
            </div>
          </div>
          <button 
            onClick={onClose}
            className="ios-modal-close-btn"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subject Icon Selector Row */}
        <div style={{ marginBottom: 14 }}>
          <div 
            onClick={() => {
              triggerLightHaptic();
              setIsIconPickerOpen(true);
            }}
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 14,
              border: '1.5px solid var(--ios-card-border)',
              background: 'var(--ios-bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: course.color || 'var(--ios-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}
              >
                {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 20, '#FFFFFF')}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{activeIconDef?.name || 'Subject Icon'}</span>
                  {course.icon ? (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--ios-blue-light)', color: 'var(--ios-blue)', fontWeight: 700 }}>Custom</span>
                  ) : (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--ios-bg-primary)', color: 'var(--ios-text-muted)', fontWeight: 700 }}>Auto-matched</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                  Tap to choose from 35+ academic icons
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--ios-blue)', fontSize: 12, fontWeight: 700 }}>
              Change <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Vibrant Color Swatches Matching Card Deck */}
        <div style={{ marginBottom: 14 }}>
          <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Palette size={13} color="var(--ios-blue)" /> Vibrant Card Color
          </label>
          <div className="color-swatch-grid">
            {VIBRANT_COLOR_PALETTES.map(p => {
              const isSelected = course.color === p.color || course.color === p.hex;
              return (
                <div 
                  key={p.id}
                  className={`color-swatch-item ${isSelected ? 'active' : ''}`}
                  style={{ 
                    background: p.color,
                    boxShadow: isSelected ? '0 0 0 3px #FFFFFF, 0 0 0 5px var(--ios-blue)' : 'none',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleUpdate('color', p.color)}
                  title={p.name}
                >
                  {isSelected && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Course Code</label>
            <input 
              className="ios-input"
              value={course.courseCode}
              onChange={e => handleUpdate('courseCode', e.target.value)}
              placeholder="e.g. CS 101"
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Units</label>
            <input 
              type="number"
              className="ios-input"
              value={course.units || 3}
              onChange={e => handleUpdate('units', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="ios-input-group">
          <label className="ios-input-label">Subject Title</label>
          <input 
            className="ios-input"
            value={course.courseName}
            onChange={e => handleUpdate('courseName', e.target.value)}
            placeholder="e.g. Introduction to Computing"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Classroom / Room</label>
            <input 
              className="ios-input"
              value={course.room}
              onChange={e => handleUpdate('room', e.target.value)}
              placeholder="e.g. Room 204"
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Instructor</label>
            <input 
              className="ios-input"
              value={course.instructor}
              onChange={e => handleUpdate('instructor', e.target.value)}
              placeholder="e.g. Dr. Maria Santos"
            />
          </div>
        </div>

        {/* Schedule Days Multi-Select */}
        <div className="ios-input-group">
          <label className="ios-input-label">Schedule Days</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {DAYS_OF_WEEK.map(d => {
              const active = course.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleToggleDay(d)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: active ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                    background: active ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                    color: active ? '#FFFFFF' : 'var(--ios-text-secondary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start and End Times */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Start Time</label>
            <input 
              type="time"
              className="ios-input"
              value={course.startTime}
              onChange={e => handleUpdate('startTime', e.target.value)}
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">End Time</label>
            <input 
              type="time"
              className="ios-input"
              value={course.endTime}
              onChange={e => handleUpdate('endTime', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            type="button"
            className="ios-btn-primary"
            onClick={() => {
              if (course) {
                onSave(course);
                onClose();
              }
            }}
          >
            Save Subject
          </button>

          {onDelete && (
            <button 
              type="button"
              className="ios-btn-secondary"
              style={{ color: 'var(--ios-red)', borderColor: 'var(--ios-red-light)', margin: 0 }}
              onClick={handleDelete}
            >
              <Trash2 size={15} color="var(--ios-red)" /> Delete Subject
            </button>
          )}
        </div>

        {/* Interactive Subject Icon Picker Modal */}
        <SubjectIconPickerModal 
          isOpen={isIconPickerOpen}
          selectedIconId={course.icon}
          courseCode={course.courseCode}
          courseName={course.courseName}
          courseColor={course.color}
          onSelectIcon={(iconId) => handleUpdate('icon', iconId)}
          onClose={() => setIsIconPickerOpen(false)}
        />
      </div>
    </div>
  );
};

export default EditSubjectModal;
