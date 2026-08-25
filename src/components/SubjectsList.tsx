import React, { useState } from 'react';
import { Course, ScheduleConflict, SubjectCardTheme } from '../types';
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
  LayoutList, 
  CalendarDays, 
  Edit3, 
  ChevronUp,
  BookOpen,
  Code2,
  Atom,
  Cpu,
  GraduationCap
} from 'lucide-react';
import { triggerSelectionHaptic, triggerLightHaptic } from '../services/hapticsService';
import { EditSubjectModal } from './EditSubjectModal';

interface SubjectsListProps {
  courses: Course[];
  conflicts: ScheduleConflict[];
  onSelectCourse: (course: Course) => void;
  onUpdateCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onAddCourse?: (newCourse: Course) => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  subjectCardTheme?: SubjectCardTheme;
}

type FilterType = 'all' | 'lecture' | 'lab' | 'conflicts';
type DisplayMode = 'stack' | 'list';

// Curated Rich Vibrant Gradients matching the Edit Color picker exactly
const VIBRANT_PALETTES = [
  'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', // Electric Indigo
  'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Ocean Blue
  'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald Green
  'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', // Sunset Rose
  'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Royal Purple
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber Gold
  'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', // Cyber Teal
  'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'  // Neon Pink
];

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

const getSubjectIcon = (code: string, name: string) => {
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('cs') || text.includes('it') || text.includes('comp') || text.includes('prog') || text.includes('struct')) {
    return <Code2 size={17} color="#FFFFFF" />;
  }
  if (text.includes('phys') || text.includes('chem') || text.includes('sci') || text.includes('bio')) {
    return <Atom size={17} color="#FFFFFF" />;
  }
  if (text.includes('eng') || text.includes('tech') || text.includes('circ')) {
    return <Cpu size={17} color="#FFFFFF" />;
  }
  if (text.includes('math') || text.includes('calc') || text.includes('stat') || text.includes('alg')) {
    return <BookOpen size={17} color="#FFFFFF" />;
  }
  return <GraduationCap size={17} color="#FFFFFF" />;
};

export const SubjectsList: React.FC<SubjectsListProps> = ({
  courses,
  conflicts,
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
          <h1 className="subjects-title" style={{ textAlign: 'left', margin: 0, padding: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Subjects
          </h1>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ios-text-secondary)', marginTop: 3, textAlign: 'left', letterSpacing: '-0.01em' }}>
            {courses.length} {courses.length === 1 ? 'Subject' : 'Subjects'} • {totalUnits} {totalUnits === 1 ? 'Unit' : 'Total Units'}
          </div>
        </div>

        <button 
          type="button"
          className="subjects-add-btn"
          onClick={() => setIsAddingSubject(true)}
          aria-label="Add Subject"
          title="Add Subject Manually"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Full-Width Search Pill */}
      <div className="subjects-search-pill" style={{ marginBottom: 12 }}>
        <Search className="search-icon-left" size={16} />
        <input 
          placeholder="Search subjects, codes, instructors..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
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
                padding: '5px 12px',
                borderRadius: 999,
                border: activeFilter === f.id ? '1px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                background: activeFilter === f.id ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                color: activeFilter === f.id ? '#FFFFFF' : 'var(--ios-text-secondary)',
                fontSize: 12,
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

        {/* View Switcher: Stack vs List */}
        <div className="schedule-view-switcher" style={{ flexShrink: 0, margin: 0 }}>
          <button 
            className={`schedule-view-btn ${displayMode === 'stack' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setDisplayMode('stack');
              setExpandedCourseId(null);
            }}
            title="Pastel Stack View"
          >
            <Layers size={13} /> Stack
          </button>
          <button 
            className={`schedule-view-btn ${displayMode === 'list' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setDisplayMode('list');
            }}
            title="List View"
          >
            <LayoutList size={13} /> List
          </button>
        </div>
      </div>

      {/* Card Content Area */}
      {filteredCourses.length === 0 ? (
        <div className="ios-card" style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--ios-text-muted)', fontSize: 13.5 }}>
          No matching subjects found.
        </div>
      ) : displayMode === 'stack' ? (
        /* FULL-WIDTH PASTEL CARD DECK (LEVIS / OPEN BANKING STYLE) */
        <div className="wallet-stack-container" style={{ marginTop: 2 }}>
          {filteredCourses.map((course, idx) => {
            const isExpanded = expandedCourseId === course.id;
            const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
            const isConflicting = conflicts.some(c => c.course1.id === course.id || c.course2.id === course.id);
            const durationMins = timeToMinutes(course.endTime) - timeToMinutes(course.startTime);
            const formattedDuration = formatDuration(Math.max(durationMins, 0));
            const customBg = getSubjectCardGradient(idx, filteredCourses.length, subjectCardTheme || 'blue-cascade');
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
                      {getSubjectIcon(course.courseCode, course.courseName)}
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
                        <CalendarDays size={13} /> View Details
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
        /* STANDARD BENTO LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {filteredCourses.map(course => {
            const isConflicting = conflicts.some(c => c.course1.id === course.id || c.course2.id === course.id);
            const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
            const cleanDays = formatCleanDays(course.days);
            const cleanInstructor = course.instructor 
              ? course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`
              : 'No Instructor';

            return (
              <div 
                key={course.id}
                className="bento-card"
                onClick={() => onSelectCourse(course)}
                style={{ marginBottom: 0 }}
              >
                <div className="bento-top-row">
                  <div className="bento-badges-left">
                    <span 
                      className="bento-code-tag"
                      style={{
                        background: course.color ? `${course.color}18` : 'var(--ios-blue-light)',
                        color: course.color || 'var(--ios-blue)'
                      }}
                    >
                      {course.courseCode}
                    </span>
                    {isLab ? (
                      <span className="ios-tag-pill ios-tag-pill-purple">LAB</span>
                    ) : (
                      <span className="ios-tag-pill">LEC</span>
                    )}
                    {isConflicting && (
                      <span title="Schedule conflict detected" style={{ background: 'var(--ios-red-light)', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                        <AlertTriangle size={12} color="var(--ios-red)" />
                      </span>
                    )}
                  </div>

                  <span className="bento-time-text">
                    {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
                  </span>
                </div>

                <div className="bento-course-name">
                  {course.courseName}
                </div>

                <div className="bento-footer-row">
                  <div className="bento-meta-items">
                    <span className="bento-pill-chip">
                      <Clock size={12} color="var(--ios-blue)" /> {cleanDays}
                    </span>
                    {course.room && (
                      <span className="bento-pill-chip">
                        <MapPin size={12} color="var(--ios-green)" /> {course.room}
                      </span>
                    )}
                    {course.instructor && (
                      <span className="bento-pill-chip">
                        <User size={12} color="var(--ios-orange)" /> {cleanInstructor}
                      </span>
                    )}
                  </div>

                  {course.units && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                      {course.units} {course.units === 1 ? 'Unit' : 'Units'}
                    </span>
                  )}
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
