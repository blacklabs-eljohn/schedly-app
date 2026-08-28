import React from 'react';
import { Course } from '../types';
import { formatTime12H } from '../services/scheduleEngine';
import { User, BookOpen, MapPin, Clock, X } from 'lucide-react';

interface InstructorDetailModalProps {
  instructorName: string | null;
  allCourses: Course[];
  onClose: () => void;
}

export const InstructorDetailModal: React.FC<InstructorDetailModalProps> = ({
  instructorName,
  allCourses,
  onClose
}) => {
  if (!instructorName) return null;

  const coursesTaught = allCourses.filter(
    c => c.instructor.toLowerCase() === instructorName.toLowerCase()
  );

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div 
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: 'var(--ios-blue-light)', 
                color: 'var(--ios-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 17 }}>Prof. {instructorName}</h2>
              <span style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', fontWeight: 600 }}>Faculty Member</span>
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

        <div className="ios-section-header">Assigned Courses ({coursesTaught.length})</div>

        <div className="detail-grouped-list">
          {coursesTaught.map(course => (
            <div key={course.id} className="detail-row-item">
              <div className="detail-icon-squircle" style={{ background: 'var(--ios-blue-light)', color: 'var(--ios-blue)' }}>
                <BookOpen size={16} />
              </div>
              <div className="detail-row-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5 }}>{course.courseCode}</span>
                  <span style={{ fontSize: 11, color: 'var(--ios-text-muted)', fontWeight: 600 }}>
                    {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', marginTop: 1 }}>
                  {course.courseName}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 4 }}>
                  <span>📅 {course.days.join(', ')}</span>
                  {course.room && <span>📍 {course.room}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="ios-btn-secondary" onClick={onClose} style={{ marginTop: 6 }}>
          Close
        </button>
      </div>
    </div>
  );
};

export default InstructorDetailModal;
