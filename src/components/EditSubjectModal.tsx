import React, { useState, useEffect } from 'react';
import { Course, DayOfWeek, isLaboratoryCourse, CourseType } from '../types';
import { DAYS_OF_WEEK } from '../services/scheduleEngine';
import { X, Palette, Trash2, Check, ChevronRight, BookOpen, FlaskConical } from 'lucide-react';
import { SubjectIconPickerModal } from './SubjectIconPickerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { getSubjectIconComponent, detectSubjectIcon, SUBJECT_ICONS } from '../services/iconService';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface EditSubjectModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCourse: Course) => void;
  onDelete?: (courseId: string) => void;
}

// Curated Rich Vibrant Gradients matching the 9 Schedly Themes in Settings
export const VIBRANT_COLOR_PALETTES = [
  { id: 'bluebook', color: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', hex: '#2563EB', name: 'Bluebook', emoji: '🔵' },
  { id: 'crimson', color: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', hex: '#EF4444', name: 'Crimson', emoji: '🔴' },
  { id: 'bini', color: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)', hex: '#EC4899', name: 'Bini', emoji: '🌸' },
  { id: 'ube', color: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', hex: '#7C3AED', name: 'Ube', emoji: '🟣' },
  { id: 'coffee', color: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)', hex: '#92400E', name: 'Coffee', emoji: '☕' },
  { id: 'matcha', color: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)', hex: '#16A34A', name: 'Matcha', emoji: '🍵' },
  { id: 'duos', color: 'linear-gradient(135deg, #4F46E5 0%, #0284C7 100%)', hex: '#4F46E5', name: 'Duos', emoji: '🎨' },
  { id: 'highlighter', color: 'linear-gradient(135deg, #6366F1 0%, #10B981 50%, #F59E0B 100%)', hex: '#0284C7', name: 'Highlighter', emoji: '🌈' },
  { id: 'obsidian', color: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)', hex: '#1E293B', name: 'Obsidian', emoji: '🖤' }
];

const DEFAULT_NEW_COURSE: Course = {
  id: '',
  courseCode: '',
  courseName: '',
  instructor: '',
  room: '',
  units: 3,
  courseType: 'lecture',
  days: ['Mon', 'Thu'],
  startTime: '09:00',
  endTime: '10:30',
  color: '#2563EB'
};

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  course: initialCourse,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [course, setCourse] = useState<Course | null>(initialCourse || DEFAULT_NEW_COURSE);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialCourse) {
      setCourse({ ...initialCourse });
    } else if (isOpen) {
      setCourse({ ...DEFAULT_NEW_COURSE, id: `course_${Date.now()}` });
    }
  }, [initialCourse, isOpen]);

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
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!course) return;
    setIsConfirmDeleteOpen(false);
    onDelete?.(course.id);
    onClose();
  };

  const activeIconId = course.icon || detectSubjectIcon(course.courseCode, course.courseName);
  const activeIconDef = SUBJECT_ICONS.find(i => i.id === activeIconId);
  const isEditing = Boolean(initialCourse && initialCourse.courseCode);

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0 }}>{isEditing ? 'Edit Course' : 'Add New Course'}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              {isEditing ? 'Customize course icon, color theme, venue & schedule' : 'Enter enrolled subject details and weekly timetable'}
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

        {/* Course Icon Selector Row */}
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
                  <span>{activeIconDef?.name || 'Course Icon'}</span>
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
            <Palette size={13} color="var(--ios-blue)" /> Course Color Theme
          </label>
          <div className="color-swatch-grid">
            {VIBRANT_COLOR_PALETTES.map(p => {
              const isSelected = course.color === p.color || 
                                 course.color === p.hex || 
                                 course.color === p.id || 
                                 (course.color ? course.color.toLowerCase() === p.id : false);
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

        {/* Course Type: Lecture vs Laboratory Segmented Selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 5, margin: 0 }}>
              <BookOpen size={13} color="var(--ios-blue)" /> Course Classification
            </label>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 800, 
              color: (course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) 
                ? '#9333EA' 
                : 'var(--ios-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {(course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) 
                ? '🔬 Laboratory' 
                : '📖 Lecture'}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            background: 'var(--ios-bg-secondary)',
            padding: 4,
            borderRadius: 14,
            border: '1px solid var(--ios-card-border)'
          }}>
            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                handleUpdate('courseType', 'lecture');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                background: (course.courseType === 'lecture' || (!course.courseType && !isLaboratoryCourse(course))) 
                  ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' 
                  : 'transparent',
                color: (course.courseType === 'lecture' || (!course.courseType && !isLaboratoryCourse(course))) 
                  ? '#FFFFFF' 
                  : 'var(--ios-text-secondary)',
                fontWeight: (course.courseType === 'lecture' || (!course.courseType && !isLaboratoryCourse(course))) ? 800 : 600,
                fontSize: 13.5,
                boxShadow: (course.courseType === 'lecture' || (!course.courseType && !isLaboratoryCourse(course))) 
                  ? '0 4px 14px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' 
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span style={{ fontSize: 15 }}>📖</span>
              <span>Lecture</span>
              {(course.courseType === 'lecture' || (!course.courseType && !isLaboratoryCourse(course))) && (
                <Check size={14} strokeWidth={3} style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                handleUpdate('courseType', 'laboratory');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                background: (course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) 
                  ? 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)' 
                  : 'transparent',
                color: (course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) 
                  ? '#FFFFFF' 
                  : 'var(--ios-text-secondary)',
                fontWeight: (course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) ? 800 : 600,
                fontSize: 13.5,
                boxShadow: (course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) 
                  ? '0 4px 14px rgba(147,51,234,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' 
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span style={{ fontSize: 15 }}>🔬</span>
              <span>Laboratory</span>
              {(course.courseType === 'laboratory' || (!course.courseType && isLaboratoryCourse(course))) && (
                <Check size={14} strokeWidth={3} style={{ marginLeft: 2 }} />
              )}
            </button>
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
              min="0"
              max="50"
              step="any"
              className="ios-input"
              value={course.units !== undefined && course.units !== null ? course.units : ''}
              onChange={e => {
                const val = e.target.value;
                handleUpdate('units', val === '' ? '' : parseFloat(val));
              }}
              placeholder="e.g. 3"
            />
          </div>
        </div>

        <div className="ios-input-group">
          <label className="ios-input-label">Course Title</label>
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
                if (!course.courseCode.trim()) {
                  alert('Please enter a course code (e.g. IT 211).');
                  return;
                }
                const sanitizedCourse: Course = {
                  ...course,
                  units: (typeof course.units === 'number' && !isNaN(course.units)) 
                    ? course.units 
                    : (parseFloat(course.units as any) || 3)
                };
                onSave(sanitizedCourse);
                onClose();
              }
            }}
          >
            {isEditing ? 'Save Course' : 'Create Course'}
          </button>

          {isEditing && onDelete && (
            <button 
              type="button"
              className="ios-btn-secondary"
              style={{ color: 'var(--ios-red)', borderColor: 'var(--ios-red-light)', margin: 0 }}
              onClick={handleDelete}
            >
              <Trash2 size={15} color="var(--ios-red)" /> Delete Course
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

        {/* In-App Confirmation Modal */}
        <ConfirmationModal
          isOpen={isConfirmDeleteOpen}
          title={`Delete ${course.courseCode}?`}
          message={`Are you sure you want to delete ${course.courseName || course.courseCode}? This will remove it from your schedule timetable.`}
          confirmText="Delete Course"
          cancelText="Cancel"
          isDestructive={true}
          icon="trash"
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      </div>
    </div>
  );
};

export default EditSubjectModal;
