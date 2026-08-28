import React, { useState } from 'react';
import { Course } from '../types';
import { formatTime12H, timeToMinutes, formatDuration } from '../services/scheduleEngine';
import { MapPin, User, Clock, Calendar, X, AlertTriangle, ChevronRight, CalendarDays, Copy, Edit3, Palette, Check } from 'lucide-react';
import { showSystemToast } from '../services/notificationService';
import { EditSubjectModal } from './EditSubjectModal';
import { getSubjectIconComponent } from '../services/iconService';

interface SubjectDetailModalProps {
  course: Course | null;
  onClose: () => void;
  onSelectInstructor: (instructorName: string) => void;
  onViewInTimetable?: (day: string) => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  isConflicting?: boolean;
}

const COLOR_PALETTES = [
  { id: 'blue', color: '#2563EB' },
  { id: 'purple', color: '#8B5CF6' },
  { id: 'green', color: '#10B981' },
  { id: 'amber', color: '#F59E0B' },
  { id: 'red', color: '#EF4444' },
  { id: 'teal', color: '#0D9488' },
  { id: 'pink', color: '#EC4899' }
];

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  course,
  onClose,
  onSelectInstructor,
  onViewInTimetable,
  onUpdateCourse,
  onDeleteCourse,
  isConflicting
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!course) return null;

  const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
  const durationMins = timeToMinutes(course.endTime) - timeToMinutes(course.startTime);
  const formattedDuration = formatDuration(Math.max(durationMins, 0));

  const handleCopyDetails = () => {
    const text = `${course.courseCode}: ${course.courseName}\nSchedule: ${course.days.join(', ')} (${formatTime12H(course.startTime)} - ${formatTime12H(course.endTime)})\nRoom: ${course.room || 'TBA'}\nInstructor: Prof. ${course.instructor || 'TBA'}`;
    navigator.clipboard?.writeText(text);
    showSystemToast('Copied to Clipboard', 'Subject details copied.');
  };

  const handleQuickColorChange = (newColor: string) => {
    if (onUpdateCourse) {
      onUpdateCourse({ ...course, color: newColor });
      showSystemToast('Color Updated', `${course.courseCode} color changed.`);
    }
  };

  return (
    <>
      <div className="ios-modal-overlay" onClick={onClose}>
        <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="ios-modal-handle" />

          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div 
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: course.color || 'var(--ios-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
                  flexShrink: 0,
                  marginTop: 2
                }}
              >
                {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 22, '#FFFFFF')}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 800, 
                    color: course.color || 'var(--ios-blue)',
                    background: course.color ? `${course.color}18` : 'var(--ios-blue-light)',
                    padding: '3px 9px',
                    borderRadius: 8
                  }}>
                    {course.courseCode}
                  </span>
                  {isLab ? (
                    <span className="ios-tag-pill ios-tag-pill-purple">LABORATORY</span>
                  ) : (
                    <span className="ios-tag-pill">LECTURE</span>
                  )}
                  {course.units && (
                    <span className="ios-tag-pill ios-tag-pill-green">
                      {course.units} {course.units === 1 ? 'Unit' : 'Units'}
                    </span>
                  )}
                </div>
                
                <h2 className="ios-modal-title" style={{ marginTop: 2, marginBottom: 0, fontSize: 18 }}>
                  {course.courseName}
                </h2>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button 
                onClick={() => setIsEditing(true)}
                style={{ background: 'var(--ios-bg-primary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-secondary)', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                title="Edit Course"
              >
                <Edit3 size={13} /> Edit
              </button>
              <button 
                onClick={onClose}
                className="ios-modal-close-btn"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Conflict Warning */}
          {isConflicting && (
            <div className="ios-conflict-alert" style={{ marginBottom: 14 }}>
              <AlertTriangle className="ios-conflict-icon" size={16} />
              <div>
                <div className="ios-conflict-title">Schedule Conflict Detected</div>
                <div className="ios-conflict-desc">This course overlaps with another class on your timetable.</div>
              </div>
            </div>
          )}

          {/* Color Customizer Swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: 'var(--ios-bg-primary)', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--ios-card-border)' }}>
            <Palette size={14} color="var(--ios-text-muted)" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>Color Tag:</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {COLOR_PALETTES.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleQuickColorChange(p.color)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: p.color,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: course.color === p.color ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: course.color === p.color ? '0 0 0 2px var(--ios-card-bg), 0 0 0 4px ' + p.color : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {course.color === p.color && <Check size={11} color="#FFFFFF" />}
                </div>
              ))}
            </div>
          </div>

          {/* Inset Grouped Detail List */}
          <div className="detail-grouped-list">
            {/* Days */}
            <div className="detail-row-item">
              <div className="detail-icon-squircle" style={{ background: 'var(--ios-blue-light)', color: 'var(--ios-blue)' }}>
                <Calendar size={18} />
              </div>
              <div className="detail-row-content">
                <div className="detail-row-label">Schedule Days</div>
                <div className="detail-row-value">{course.days.join(' · ')}</div>
              </div>
            </div>

            {/* Time & Duration */}
            <div className="detail-row-item">
              <div className="detail-icon-squircle" style={{ background: 'var(--ios-purple-light)', color: 'var(--ios-purple)' }}>
                <Clock size={18} />
              </div>
              <div className="detail-row-content">
                <div className="detail-row-label">Time & Duration</div>
                <div className="detail-row-value">
                  {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ios-text-muted)', marginLeft: 6 }}>
                    ({formattedDuration})
                  </span>
                </div>
              </div>
            </div>

            {/* Classroom */}
            <div className="detail-row-item">
              <div className="detail-icon-squircle" style={{ background: 'var(--ios-green-light)', color: 'var(--ios-green)' }}>
                <MapPin size={18} />
              </div>
              <div className="detail-row-content">
                <div className="detail-row-label">Classroom Location</div>
                <div className="detail-row-value">{course.room || 'No Room Assigned'}</div>
              </div>
            </div>

            {/* Instructor */}
            <div 
              className={`detail-row-item ${course.instructor ? 'interactive' : ''}`}
              onClick={() => {
                if (course.instructor) {
                  onClose();
                  onSelectInstructor(course.instructor);
                }
              }}
            >
              <div className="detail-icon-squircle" style={{ background: 'var(--ios-orange-light)', color: 'var(--ios-orange)' }}>
                <User size={18} />
              </div>
              <div className="detail-row-content">
                <div className="detail-row-label">Instructor</div>
                <div className="detail-row-value" style={{ color: course.instructor ? 'var(--ios-blue)' : 'var(--ios-text-primary)' }}>
                  {course.instructor ? (course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`) : 'Unassigned'}
                </div>
              </div>
              {course.instructor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--ios-blue)', fontSize: 12, fontWeight: 700 }}>
                  <span>Profile</span>
                  <ChevronRight size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {onViewInTimetable && course.days.length > 0 && (
              <button 
                className="ios-btn-primary" 
                onClick={() => {
                  onClose();
                  onViewInTimetable(course.days[0]);
                }}
              >
                <CalendarDays size={15} /> View Schedule
              </button>
            )}

            <button 
              className="ios-btn-secondary" 
              style={{ margin: 0 }}
              onClick={handleCopyDetails}
            >
              <Copy size={15} /> Copy Details
            </button>
          </div>
        </div>
      </div>

      {/* Edit Subject Modal */}
      <EditSubjectModal 
        course={course}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={(updated) => {
          onUpdateCourse?.(updated);
          setIsEditing(false);
        }}
        onDelete={(id) => {
          onDeleteCourse?.(id);
          setIsEditing(false);
          onClose();
        }}
      />
    </>
  );
};

export default SubjectDetailModal;
