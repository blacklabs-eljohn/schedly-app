import React, { useState } from 'react';
import { Course, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../services/scheduleEngine';
import { AlertTriangle, Plus, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';

interface CorrectionScreenProps {
  courses: Course[];
  onSaveSchedule: (courses: Course[]) => void;
  onCancel: () => void;
}

export const CorrectionScreen: React.FC<CorrectionScreenProps> = ({
  courses: initialCourses,
  onSaveSchedule,
  onCancel
}) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  const handleUpdateField = (id: string, field: keyof Course, value: any) => {
    setCourses(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleToggleDay = (courseId: string, day: DayOfWeek) => {
    setCourses(prev =>
      prev.map(c => {
        if (c.id !== courseId) return c;
        const exists = c.days.includes(day);
        const updatedDays = exists
          ? c.days.filter(d => d !== day)
          : [...c.days, day];
        return { ...c, days: updatedDays };
      })
    );
  };

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: `course_manual_${Date.now()}`,
      courseCode: `SUBJ 10${courses.length + 1}`,
      courseName: 'New Subject Name',
      instructor: 'Prof. Instructor',
      room: 'Room 101',
      days: ['Mon', 'Wed', 'Fri'],
      startTime: '08:00',
      endTime: '09:00',
      color: '#2563EB',
      confidence: {
        courseCode: true,
        courseName: true,
        instructor: true,
        room: true,
        days: true,
        times: true
      }
    };
    setCourses([...courses, newCourse]);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 110 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button 
          onClick={onCancel}
          style={{ 
            background: 'var(--ios-card-bg)', 
            border: '1px solid var(--ios-card-border)', 
            borderRadius: '50%', 
            width: 38, 
            height: 38, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            boxShadow: 'var(--ios-shadow-sm)',
            color: 'var(--ios-text-primary)'
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Review Extracted COR</h2>
          <p style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
            Check and adjust detected subjects before adding
          </p>
        </div>
      </div>

      {courses.map((course, idx) => {
        const isMissingRoom = !course.room;
        const isMissingInstructor = !course.instructor;

        return (
          <div key={course.id} className="ios-card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ios-blue)', letterSpacing: '0.04em' }}>
                Course #{idx + 1}
              </span>
              <button 
                type="button"
                onClick={() => handleDeleteCourse(course.id)}
                style={{ background: 'none', border: 'none', color: 'var(--ios-red)', cursor: 'pointer', padding: 4 }}
                title="Remove course"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Warnings */}
            {(isMissingRoom || isMissingInstructor) && (
              <div 
                style={{ 
                  background: 'var(--ios-orange-light)', 
                  border: '1px solid var(--ios-orange)', 
                  borderRadius: 8, 
                  padding: '8px 12px', 
                  marginBottom: 12, 
                  fontSize: 12, 
                  color: 'var(--ios-orange)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={15} />
                <span>
                  {isMissingRoom && isMissingInstructor
                    ? 'Room and Instructor missing — please specify below.'
                    : isMissingRoom
                    ? 'Room not detected — please add room.'
                    : 'Instructor not detected — please add instructor.'}
                </span>
              </div>
            )}

            {/* Course Code & Name */}
            <div className="ios-input-group">
              <label className="ios-input-label">Course Code</label>
              <input 
                className="ios-input"
                value={course.courseCode}
                onChange={e => handleUpdateField(course.id, 'courseCode', e.target.value)}
                placeholder="e.g. CS 101"
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-input-label">Course Title</label>
              <input 
                className="ios-input"
                value={course.courseName}
                onChange={e => handleUpdateField(course.id, 'courseName', e.target.value)}
                placeholder="e.g. Introduction to Computing"
              />
            </div>

            {/* Instructor & Room */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="ios-input-group">
                <label className="ios-input-label">Instructor</label>
                <input 
                  className="ios-input"
                  value={course.instructor}
                  onChange={e => handleUpdateField(course.id, 'instructor', e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>

              <div className="ios-input-group">
                <label className="ios-input-label">Room</label>
                <input 
                  className="ios-input"
                  value={course.room}
                  onChange={e => handleUpdateField(course.id, 'room', e.target.value)}
                  placeholder="e.g. Room 204"
                />
              </div>
            </div>

            {/* Days Toggle */}
            <div className="ios-input-group">
              <label className="ios-input-label">Scheduled Days</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {DAYS_OF_WEEK.map(day => {
                  const active = course.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(course.id, day)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: active ? 'var(--ios-blue)' : 'var(--ios-bg-primary)',
                        color: active ? '#FFFFFF' : 'var(--ios-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="ios-input-group">
                <label className="ios-input-label">Start Time</label>
                <input 
                  type="time" 
                  className="ios-input"
                  value={course.startTime}
                  onChange={e => handleUpdateField(course.id, 'startTime', e.target.value)}
                />
              </div>

              <div className="ios-input-group">
                <label className="ios-input-label">End Time</label>
                <input 
                  type="time" 
                  className="ios-input"
                  value={course.endTime}
                  onChange={e => handleUpdateField(course.id, 'endTime', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button 
        type="button"
        className="ios-btn-secondary"
        onClick={handleAddCourse}
        style={{ marginBottom: 12 }}
      >
        <Plus size={16} /> Add Subject Manually
      </button>

      <button 
        type="button"
        className="ios-btn-primary"
        onClick={() => onSaveSchedule(courses)}
      >
        <CheckCircle2 size={16} /> Save & Commit to Timetable
      </button>
    </div>
  );
};

export default CorrectionScreen;
