import React, { useState } from 'react';
import { Course, DayOfWeek, StudentProfile } from '../types';
import { DAYS_OF_WEEK } from '../services/scheduleEngine';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap
} from 'lucide-react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface CorrectionScreenProps {
  courses: Course[];
  profile?: Partial<StudentProfile>;
  onSaveSchedule: (courses: Course[], updatedProfile?: Partial<StudentProfile>) => void;
  onCancel: () => void;
}

export const CorrectionScreen: React.FC<CorrectionScreenProps> = ({
  courses: initialCourses,
  profile: initialProfile,
  onSaveSchedule,
  onCancel
}) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [studentProfile, setStudentProfile] = useState<Partial<StudentProfile>>(initialProfile || {});

  const totalUnits = courses.reduce((sum, c) => sum + (c.units || 3), 0);

  const handleUpdateProfileField = (field: keyof StudentProfile, value: string) => {
    setStudentProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateField = (id: string, field: keyof Course, value: any) => {
    setCourses(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleToggleDay = (courseId: string, day: DayOfWeek) => {
    triggerLightHaptic();
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
    triggerLightHaptic();
    const newCourse: Course = {
      id: `course_manual_${Date.now()}`,
      courseCode: `SUBJ 10${courses.length + 1}`,
      courseName: 'New Subject Name',
      instructor: 'Prof. Instructor',
      room: 'TBA',
      days: ['Mon', 'Thu'],
      startTime: '08:00',
      endTime: '09:30',
      units: 3,
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
    triggerLightHaptic();
    setCourses(courses.filter(c => c.id !== id));
  };

  const handleSave = () => {
    triggerSuccessHaptic();
    onSaveSchedule(courses, studentProfile);
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 110, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Review Extracted COR
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginTop: 2, margin: 0 }}>
            Verify detected courses & student details before saving
          </p>
        </div>
      </div>

      {/* Extracted Student Summary Card */}
      <div className="ios-card" style={{ background: 'var(--ios-blue-light)', border: '1px solid var(--ios-blue)', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <GraduationCap size={18} color="var(--ios-blue)" />
          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ios-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Student Identity Details
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ios-input-group" style={{ margin: 0 }}>
            <label className="ios-input-label" style={{ fontSize: 11 }}>Full Name</label>
            <input
              className="ios-input"
              style={{ fontSize: 12.5, padding: '7px 10px', background: 'var(--ios-card-bg)' }}
              value={studentProfile.fullName || ''}
              onChange={e => handleUpdateProfileField('fullName', e.target.value)}
              placeholder="e.g. ELJOHN SIENES CRISOSTOMO"
            />
          </div>

          <div className="ios-input-group" style={{ margin: 0 }}>
            <label className="ios-input-label" style={{ fontSize: 11 }}>Student ID</label>
            <input
              className="ios-input"
              style={{ fontSize: 12.5, padding: '7px 10px', background: 'var(--ios-card-bg)' }}
              value={studentProfile.studentNumber || ''}
              onChange={e => handleUpdateProfileField('studentNumber', e.target.value)}
              placeholder="e.g. 2026-01537"
            />
          </div>

          <div className="ios-input-group" style={{ margin: 0 }}>
            <label className="ios-input-label" style={{ fontSize: 11 }}>Program / Course</label>
            <input
              className="ios-input"
              style={{ fontSize: 12.5, padding: '7px 10px', background: 'var(--ios-card-bg)' }}
              value={studentProfile.program || ''}
              onChange={e => handleUpdateProfileField('program', e.target.value)}
              placeholder="e.g. BS Computer Science"
            />
          </div>

          <div className="ios-input-group" style={{ margin: 0 }}>
            <label className="ios-input-label" style={{ fontSize: 11 }}>Campus</label>
            <input
              className="ios-input"
              style={{ fontSize: 12.5, padding: '7px 10px', background: 'var(--ios-card-bg)' }}
              value={studentProfile.schoolName || ''}
              onChange={e => handleUpdateProfileField('schoolName', e.target.value)}
              placeholder="e.g. NEMSU CANTILAN"
            />
          </div>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--ios-bg-secondary)',
        padding: '10px 14px',
        borderRadius: 12,
        marginBottom: 14,
        fontSize: 12.5,
        fontWeight: 700
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={15} color="var(--ios-blue)" />
          <span>{courses.length} Subjects Extracted</span>
        </div>
        <div style={{ color: 'var(--ios-blue)', background: 'var(--ios-blue-light)', padding: '2px 8px', borderRadius: 6 }}>
          {totalUnits} Total Academic Units
        </div>
      </div>

      {/* Courses List */}
      {courses.map((course, idx) => {
        const isMissingRoom = !course.room || course.room === 'TBA';
        const isMissingInstructor = !course.instructor;

        return (
          <div key={course.id} className="ios-card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: course.color || 'var(--ios-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {course.courseCode}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                  {course.units || 3} Units
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
            </div>

            {/* Warning pills if needed */}
            {(isMissingInstructor) && (
              <div 
                style={{ 
                  background: 'var(--ios-orange-light)', 
                  border: '1px solid var(--ios-orange)', 
                  borderRadius: 8, 
                  padding: '6px 10px', 
                  marginBottom: 10, 
                  fontSize: 11.5, 
                  color: 'var(--ios-orange)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={14} />
                <span>Instructor not specified in COR (optional).</span>
              </div>
            )}

            {/* Course Code & Name */}
            <div className="ios-input-group">
              <label className="ios-input-label">Course Code & Units</label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <input 
                  className="ios-input"
                  value={course.courseCode}
                  onChange={e => handleUpdateField(course.id, 'courseCode', e.target.value)}
                  placeholder="e.g. CS 111"
                />
                <input 
                  type="number"
                  step="0.5"
                  className="ios-input"
                  value={course.units || 3}
                  onChange={e => handleUpdateField(course.id, 'units', parseFloat(e.target.value) || 3)}
                  placeholder="Units"
                />
              </div>
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
                  placeholder="e.g. Cantila, Brieg"
                />
              </div>

              <div className="ios-input-group">
                <label className="ios-input-label">Room / Venue</label>
                <input 
                  className="ios-input"
                  value={course.room}
                  onChange={e => handleUpdateField(course.id, 'room', e.target.value)}
                  placeholder="e.g. TBA / Lab 1"
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
                        background: active ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
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
        <Plus size={16} /> Add Another Subject
      </button>

      <button 
        type="button"
        className="ios-btn-primary"
        onClick={handleSave}
      >
        <CheckCircle2 size={16} /> Confirm & Save to Timetable ({courses.length} Subjects)
      </button>
    </div>
  );
};

export default CorrectionScreen;
