import React, { useState } from 'react';
import { Course, ScheduleConflict, SubjectCardTheme, CustomEvent, SubjectNote } from '../types';
import { formatTime12H, timeToMinutes, formatDuration, getSubjectCardGradient } from '../services/scheduleEngine';
import { 
  MapPin, 
  User, 
  Clock, 
  Search, 
  AlertTriangle, 
  X, 
  Plus, 
  Layers, 
  LayoutGrid, 
  CalendarDays, 
  Edit3, 
  ChevronUp,
  BookOpen,
  Pin,
  FileText,
  Folder,
  CheckCircle2
} from 'lucide-react';
import { triggerSelectionHaptic } from '../services/hapticsService';
import { EditSubjectModal } from './EditSubjectModal';

interface SubjectsListProps {
  courses: Course[];
  conflicts: ScheduleConflict[];
  events?: CustomEvent[];
  notes?: SubjectNote[];
  onSelectCourse: (course: Course) => void;
  onUpdateCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onAddCourse?: (newCourse: Course) => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  subjectCardTheme?: SubjectCardTheme;
}

type FilterType = 'all' | 'lecture' | 'lab' | 'conflicts';
type DisplayMode = 'stack' | 'grid';

// Helper to format days cleanly without repeating strings
const formatCleanDays = (days: any[]): string => {
  if (!days || days.length === 0) return 'TBA';
  const rawList = Array.isArray(days) ? days : [days];
  const uniqueNames = Array.from(
    new Set(
      rawList.map(d => {
        const s = String(d).trim().toLowerCase();
        if (s.includes('mon')) return 'M';
        if (s.includes('tue')) return 'T';
        if (s.includes('wed')) return 'W';
        if (s.includes('thu')) return 'TH';
        if (s.includes('fri')) return 'F';
        if (s.includes('sat')) return 'S';
        if (s.includes('sun')) return 'SU';
        return s.slice(0, 2).toUpperCase();
      })
    )
  );

  const joined = uniqueNames.join('');
  if (joined === 'MWF') return 'MWF';
  if (joined === 'MTH') return 'MTH';
  if (joined === 'TTH') return 'TTH';
  if (joined === 'TF') return 'TF';
  if (joined === 'WS') return 'WS';
  if (joined === 'F') return 'FRI';
  if (joined === 'S') return 'SAT';
  if (joined === 'M') return 'MON';
  if (joined === 'T') return 'TUE';
  if (joined === 'W') return 'WED';
  if (joined === 'TH') return 'THU';
  return uniqueNames.join('·');
};

import { getSubjectIconComponent } from '../services/iconService';

// Curated Rich Clean Vibrant Gradients matching the original stack palette
const STACK_VIBRANT_PALETTES = [
  'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', // Electric Indigo
  'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Ocean Blue
  'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald Green
  'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', // Sunset Rose
  'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Royal Purple
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber Gold
  'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', // Cyber Teal
  'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'  // Neon Pink
];

export const SubjectsList: React.FC<SubjectsListProps> = ({
  courses,
  conflicts,
  events = [],
  notes = [],
  onSelectCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddCourse,
  onToggleTheme,
  theme,
  subjectCardTheme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stack');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const filteredCourses = courses.filter(c => {
    const matchesSearch = 
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.room.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isLab = c.courseCode?.toLowerCase().includes('lab') || c.courseName?.toLowerCase().includes('lab');
    const isConflicting = conflicts.some(conf => conf.course1.id === c.id || conf.course2.id === c.id);

    if (activeFilter === 'lecture') return !isLab;
    if (activeFilter === 'lab') return isLab;
    if (activeFilter === 'conflicts') return isConflicting;
    return true;
  });

  // Summary Metrics
  const totalUnits = courses.reduce((sum, c) => sum + (c.units || 3), 0);
  const totalWeeklyHours = Math.round(
    courses.reduce((sum, c) => {
      const durMins = timeToMinutes(c.endTime) - timeToMinutes(c.startTime);
      return sum + (durMins * (c.days?.length || 1)) / 60;
    }, 0)
  );

  const defaultNewCourse: Course = {
    id: `course_manual_${Date.now()}`,
    courseCode: '',
    courseName: '',
    instructor: '',
    room: '',
    days: ['Mon', 'Thu'],
    startTime: '08:00',
    endTime: '09:30',
    units: 3,
    color: '#4F46E5'
  };

  const handleCardClick = (course: Course) => {
    triggerSelectionHaptic();
    if (expandedCourseId === course.id) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(course.id);
    }
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Minimal Top Header Bar: "Subjects" + Subtitle + Circular [+] Button */}
      <div className="subjects-top-bar" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', minWidth: 0 }}>
          <h1 className="subjects-title">Courses</h1>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ios-text-secondary)', marginTop: 3, textAlign: 'left', letterSpacing: '-0.01em' }}>
            {courses.length} {courses.length === 1 ? 'Course' : 'Courses'} • {totalUnits} {totalUnits === 1 ? 'Unit' : 'Total Units'}
          </div>
        </div>

        <button 
          type="button"
          className="subjects-add-btn"
          onClick={() => {
            triggerSelectionHaptic();
            setIsAddingSubject(true);
          }}
          title="Add New Course"
        >
          <Plus size={18} color="#FFFFFF" />
        </button>
      </div>

      {/* Full-Width Search Pill */}
      <div className="subjects-search-pill" style={{ marginBottom: 14 }}>
        <Search className="search-icon-left" size={16} />
        <input 
          type="text"
          placeholder="Search courses, codes, instructors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            type="button" 
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Integrated Filter & View Switcher Row */}
      <div className="subjects-filter-row">
        {/* Filter Pills */}
        <div className="subjects-filter-scroll">
          {[
            { id: 'all', label: `All (${courses.length})` },
            { id: 'lecture', label: 'Lectures' },
            { id: 'lab', label: 'Labs' },
            { id: 'conflicts', label: `Conflicts (${conflicts.length})` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                triggerSelectionHaptic();
                setActiveFilter(f.id as FilterType);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: activeFilter === f.id ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: activeFilter === f.id ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                color: activeFilter === f.id ? '#FFFFFF' : 'var(--ios-text-secondary)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Stack vs Grid */}
        <div className="schedule-view-switcher" style={{ flexShrink: 0, margin: 0 }}>
          <button
            type="button"
            className={`schedule-view-btn ${displayMode === 'stack' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setDisplayMode('stack');
            }}
            title="Card Deck Stack View"
          >
            <Layers size={13} /> Stack
          </button>
          <button
            type="button"
            className={`schedule-view-btn ${displayMode === 'grid' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setDisplayMode('grid');
            }}
            title="Folder Grid View"
          >
            <LayoutGrid size={13} /> Grid
          </button>
        </div>
      </div>

      {/* Card Content Area */}
      {filteredCourses.length === 0 ? (
        <div className="ios-card" style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--ios-text-muted)', fontSize: 13.5 }}>
          No matching courses found.
        </div>
      ) : displayMode === 'stack' ? (
        /* FULL-WIDTH PASTEL CARD DECK */
        <div className="wallet-stack-container" style={{ marginTop: 2 }}>
          {filteredCourses.map((course, idx) => {
            const isExpanded = expandedCourseId === course.id;
            const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
            const isConflicting = conflicts.some(c => c.course1.id === course.id || c.course2.id === course.id);
            const durationMins = timeToMinutes(course.endTime) - timeToMinutes(course.startTime);
            const formattedDuration = formatDuration(Math.max(durationMins, 0));
            // Match the user selected color theme (e.g. Monochrome / Obsidian black cascade)
            const customBg = getSubjectCardGradient(idx, filteredCourses.length, subjectCardTheme || 'obsidian');
            const cleanDays = formatCleanDays(course.days);
            const cleanInstructor = course.instructor 
              ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
              : 'No Instructor Assigned';

            return (
              <div 
                key={course.id}
                className={`wallet-card-item ${isExpanded ? 'is-expanded' : 'is-stacked'}`}
                style={{ 
                  background: customBg,
                  zIndex: isExpanded ? 99 : idx + 1
                }}
                onClick={() => handleCardClick(course)}
              >
                {/* Header: Left Avatar + Title, Right Tag */}
                <div className="wallet-card-header">
                  <div className="wallet-card-header-left">
                    <div className="wallet-card-avatar-circle">
                      {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 17, '#FFFFFF')}
                    </div>

                    <div className="wallet-card-text-group">
                      <div className="wallet-card-category">
                        {isLab ? 'LABORATORY' : 'LECTURE'} · {course.units || 3} UNITS
                      </div>
                      <div className="wallet-card-code">
                        {course.courseCode}
                      </div>
                      <div className="wallet-card-sub">
                        {course.courseName}
                      </div>
                    </div>
                  </div>

                  <div className="wallet-card-header-right">
                    <div className="wallet-card-right-bold">
                      {cleanDays}
                    </div>
                    <div className="wallet-card-right-sub">
                      {formatTime12H(course.startTime)}
                    </div>
                    {isConflicting && (
                      <span style={{ background: '#EF4444', padding: '2px 5px', borderRadius: 6, marginTop: 3 }}>
                        <AlertTriangle size={10} color="#FFFFFF" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="wallet-card-expanded-body" onClick={e => e.stopPropagation()}>
                    <div className="wallet-detail-grid">
                      <div className="wallet-detail-cell">
                        <label>SCHEDULE & TIME</label>
                        <span>
                          <Clock size={13} style={{ flexShrink: 0 }} /> 
                          <span>{formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}</span>
                        </span>
                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                          {cleanDays} ({formattedDuration})
                        </div>
                      </div>

                      <div className="wallet-detail-cell">
                        <label>CLASSROOM</label>
                        <span>
                          <MapPin size={13} style={{ flexShrink: 0 }} /> 
                          <span>{course.room || 'TBA'}</span>
                        </span>
                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                          {course.units || 3} Academic Units
                        </div>
                      </div>
                    </div>

                    <div className="wallet-detail-cell">
                      <label>INSTRUCTOR</label>
                      <span>
                        <User size={13} style={{ flexShrink: 0 }} /> 
                        <span>{cleanInstructor}</span>
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="wallet-card-actions">
                      <button 
                        type="button"
                        className="wallet-action-btn"
                        onClick={() => onSelectCourse(course)}
                      >
                        <BookOpen size={13} /> Open Course Hub
                      </button>

                      <button 
                        type="button"
                        className="wallet-action-btn wallet-action-btn-secondary"
                        onClick={() => setEditingCourse(course)}
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button 
                        type="button"
                        className="wallet-action-btn wallet-action-btn-secondary"
                        style={{ maxWidth: 46, padding: 0 }}
                        onClick={() => setExpandedCourseId(null)}
                        title="Collapse Card"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FOLDER BENTO GRID VIEW */
        <div className="courses-folder-grid">
          {filteredCourses.map((course, idx) => {
            const isConflicting = conflicts.some(c => c.course1.id === course.id || c.course2.id === course.id);
            const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
            const cleanDays = formatCleanDays(course.days);
            const cleanInstructor = course.instructor 
              ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
              : 'No Instructor';
            
            const cardGradient = getSubjectCardGradient(idx, filteredCourses.length, subjectCardTheme || 'bluebook');
            const courseTasks = events.filter(e => 
              (e.subjectId === course.id || (Boolean(e.subjectCode && course.courseCode) && (e.subjectCode || '').trim().toUpperCase() === (course.courseCode || '').trim().toUpperCase())) && !e.isCompleted
            );
            const courseNotes = notes.filter(n => n.subjectId === course.id || (Boolean(course.courseCode) && n.subjectId === course.courseCode));
            const urgentTask = courseTasks.length > 0 ? courseTasks[0] : null;
            const latestNote = courseNotes.length > 0 ? courseNotes[0] : null;
            const hasMultipleSheets = (courseTasks.length > 0 && courseNotes.length > 0) || (courseTasks.length > 1) || (courseNotes.length > 1);

            return (
              <div 
                key={course.id}
                className="folder-card"
                onClick={() => onSelectCourse(course)}
                role="button"
                tabIndex={0}
              >
                {/* Back Folder Silhouette with Theme Liquid Glass Tint */}
                <div 
                  className="folder-back-shape"
                  style={{
                    background: cardGradient
                  }}
                >
                  <div className="folder-back-tab" />
                  <div className="folder-back-shoulder" />
                </div>

                {/* Layered Peeking Sheet 3 (Background Depth Sheet) */}
                {hasMultipleSheets && (
                  <div className="folder-sheet-layer-back">
                    <div className="folder-sheet-layer-tab">
                      <span className="folder-sheet-layer-text">
                        {courseNotes.length > 1 ? `NOTE #2` : courseTasks.length > 1 ? `TASK #2` : `SYLLABUS`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Layered Peeking Sheet 2 (Middle Depth Sheet) */}
                {(courseTasks.length > 0 && courseNotes.length > 0) && (
                  <div className="folder-sheet-layer-mid">
                    <div className="folder-sheet-layer-tab">
                      <span className="folder-sheet-layer-text">
                        📝 {courseNotes[0].title || 'Lecture Note'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Front Primary Peeking Sheet 1 (Main Actionable Document) */}
                <div className="folder-inner-sheet">
                  <div className="folder-sheet-header">
                    <span 
                      className="folder-sheet-badge"
                      style={{
                        background: urgentTask 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : latestNote 
                            ? 'rgba(37, 99, 235, 0.15)' 
                            : 'var(--ios-blue-light)',
                        color: urgentTask 
                          ? '#DC2626' 
                          : latestNote 
                            ? '#2563EB' 
                            : 'var(--ios-blue)'
                      }}
                    >
                      {urgentTask ? (
                        <>
                          <CheckCircle2 size={10} style={{ color: '#DC2626' }} />
                          <span>DUE {urgentTask.category ? urgentTask.category.toUpperCase().replace('_', ' ') : 'TASK'}</span>
                        </>
                      ) : latestNote ? (
                        <>
                          <FileText size={10} style={{ color: '#2563EB' }} />
                          <span>NOTE</span>
                        </>
                      ) : (
                        <>
                          <BookOpen size={10} />
                          <span>SYLLABUS</span>
                        </>
                      )}
                    </span>

                    <div className="folder-sheet-dots">
                      <span className="folder-sheet-dot" />
                      <span className="folder-sheet-dot" />
                    </div>
                  </div>

                  <div className="folder-sheet-preview">
                    {urgentTask ? (
                      <div className="folder-sheet-task-content">
                        <span className="folder-sheet-task-title">{urgentTask.title}</span>
                        {urgentTask.startTime && (
                          <span className="folder-sheet-task-time">⏰ Due {formatTime12H(urgentTask.startTime)}</span>
                        )}
                      </div>
                    ) : latestNote ? (
                      <div className="folder-sheet-note-content">
                        <span className="folder-sheet-text">"{latestNote.title || 'Untitled Note'}"</span>
                        {latestNote.content && (
                          <div className="folder-sheet-snippet">
                            {latestNote.content.replace(/[#*`_]/g, '').slice(0, 48)}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="folder-sheet-lines">
                        <div className="folder-sheet-line-1" />
                        <div className="folder-sheet-line-2" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Front Pocket Card with Frosted Liquid Glass */}
                <div className="folder-front-pocket">
                  <div>
                    <div className="folder-pocket-top">
                      <div className="folder-badges-left">
                        <span 
                          className="folder-code-tag"
                          style={{
                            background: course.color ? `${course.color}18` : 'var(--ios-blue-light)',
                            color: course.color || 'var(--ios-blue)',
                            borderColor: course.color ? `${course.color}35` : 'rgba(0,122,255,0.2)'
                          }}
                        >
                          {course.courseCode}
                        </span>
                        {isLab ? (
                          <span className="ios-tag-pill ios-tag-pill-purple" style={{ fontSize: 9.5, padding: '2px 6px' }}>LAB</span>
                        ) : (
                          <span className="ios-tag-pill" style={{ fontSize: 9.5, padding: '2px 6px' }}>LEC</span>
                        )}
                        {courseTasks.length > 0 && (
                          <span className="ios-tag-pill" style={{ background: '#F59E0B18', color: '#D97706', fontWeight: 800, fontSize: 9.5, padding: '2px 6px' }}>
                            📌 {courseTasks.length}
                          </span>
                        )}
                      </div>

                      {isConflicting && (
                        <span title="Schedule conflict detected" style={{ background: 'var(--ios-red-light)', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                          <AlertTriangle size={11} color="var(--ios-red)" />
                        </span>
                      )}
                    </div>

                    <div className="folder-course-title" title={course.courseName}>
                      {course.courseName}
                    </div>

                    <div className="folder-meta-row">
                      <span className="folder-notes-count">
                        {courseNotes.length} {courseNotes.length === 1 ? 'note' : 'notes'}
                      </span>
                      <span className="folder-meta-dot">•</span>
                      <span className="folder-units-count">
                        {course.units || 3} Units
                      </span>
                    </div>
                  </div>

                  <div className="folder-footer-row">
                    <div className="folder-footer-item">
                      <Clock size={11} className="folder-footer-icon" />
                      <span>{cleanDays} {formatTime12H(course.startTime)}</span>
                    </div>
                    {course.room && (
                      <div className="folder-footer-item">
                        <MapPin size={11} className="folder-footer-icon" />
                        <span>{course.room}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Subject Modal */}
      <EditSubjectModal 
        course={defaultNewCourse}
        isOpen={isAddingSubject}
        onClose={() => setIsAddingSubject(false)}
        onSave={(newCourse) => {
          onAddCourse?.(newCourse);
          setIsAddingSubject(false);
        }}
      />

      {/* Edit Subject Modal */}
      <EditSubjectModal 
        course={editingCourse}
        isOpen={!!editingCourse}
        onClose={() => setEditingCourse(null)}
        onSave={(updated) => {
          onUpdateCourse?.(updated);
          setEditingCourse(null);
        }}
        onDelete={(id) => {
          onDeleteCourse?.(id);
          setEditingCourse(null);
        }}
      />
    </div>
  );
};

export default SubjectsList;
