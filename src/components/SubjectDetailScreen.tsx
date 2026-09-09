import React, { useState, useRef } from 'react';
import { Course, CustomEvent, SubjectNote, ScheduleConflict, DayOfWeek, CourseLink, CourseTopic, AcademicTerm } from '../types';
import { formatTime12H, timeToMinutes, formatDuration } from '../services/scheduleEngine';
import { getSubjectIconComponent } from '../services/iconService';
import { triggerTaskConfetti } from '../services/confettiService';
import { 
  ChevronLeft, 
  MapPin, 
  User, 
  Clock, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  CheckCircle,
  Circle,
  CalendarDays, 
  Copy, 
  Edit3, 
  Palette, 
  Check, 
  FileText, 
  AlertTriangle,
  Pin, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  List,
  ListOrdered,
  BookOpen,
  ExternalLink,
  Flame,
  GraduationCap,
  Highlighter,
  Bold,
  Italic,
  Maximize2,
  Sparkles,
  X
} from 'lucide-react';
import { showSystemToast } from '../services/notificationService';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { EditSubjectModal } from './EditSubjectModal';
import { AddEventModal } from './AddEventModal';
import { CourseLinksModal } from './CourseLinksModal';
import { CourseTopicModal } from './CourseTopicModal';
import { ConfirmationModal } from './ConfirmationModal';

interface SubjectDetailScreenProps {
  course: Course;
  allCourses: Course[];
  events: CustomEvent[];
  notes: SubjectNote[];
  conflicts: ScheduleConflict[];
  links?: CourseLink[];
  topics?: CourseTopic[];
  onBack: () => void;
  onSelectInstructor: (instructorName: string) => void;
  onViewInTimetable?: (day: string) => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onSaveEvent: (event: CustomEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onToggleEventComplete: (eventId: string) => void;
  onSaveNote: (note: SubjectNote) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePinNote?: (noteId: string) => void;
  onSaveLink?: (link: CourseLink) => void;
  onDeleteLink?: (linkId: string) => void;
  onSaveTopic?: (topic: CourseTopic) => void;
  onDeleteTopic?: (topicId: string) => void;
  onToggleTopicComplete?: (topicId: string) => void;
}

type TabSegment = 'tasks' | 'syllabus' | 'notes' | 'info';
type TaskFilter = 'pending' | 'all' | 'completed';
type TaskDisplayMode = 'stack' | 'list';

export interface SchedlyThemeItem {
  id: string;
  name: string;
  badge: string;
  emoji: string;
  primaryColor: string;
  swatches: string[];
}

export const SCHEDLY_COURSE_THEMES: SchedlyThemeItem[] = [
  {
    id: 'bluebook',
    name: 'Bluebook',
    badge: 'Classic',
    emoji: '🔵',
    primaryColor: '#2563EB',
    swatches: ['#60A5FA', '#2563EB', '#1E3A8A', '#0F172A']
  },
  {
    id: 'crimson',
    name: 'Crimson',
    badge: 'Bold',
    emoji: '🔴',
    primaryColor: '#EF4444',
    swatches: ['#F87171', '#EF4444', '#DC2626', '#991B1B']
  },
  {
    id: 'bini',
    name: 'Bini',
    badge: 'Playful',
    emoji: '🌸',
    primaryColor: '#EC4899',
    swatches: ['#F472B6', '#EC4899', '#DB2777', '#BE185D']
  },
  {
    id: 'ube',
    name: 'Ube',
    badge: 'Distinctive',
    emoji: '🟣',
    primaryColor: '#7C3AED',
    swatches: ['#C4B5FD', '#A78BFA', '#7C3AED', '#5B21B6']
  },
  {
    id: 'coffee',
    name: 'Coffee',
    badge: 'Cozy',
    emoji: '☕',
    primaryColor: '#92400E',
    swatches: ['#FDE68A', '#D97706', '#92400E', '#78350F']
  },
  {
    id: 'matcha',
    name: 'Matcha',
    badge: 'Fresh',
    emoji: '🍵',
    primaryColor: '#16A34A',
    swatches: ['#86EFAC', '#4ADE80', '#16A34A', '#14532D']
  },
  {
    id: 'duos',
    name: 'Duos',
    badge: 'Two-Tone',
    emoji: '🎨',
    primaryColor: '#4F46E5',
    swatches: ['#4F46E5', '#0284C7', '#4F46E5', '#0F172A']
  },
  {
    id: 'highlighter',
    name: 'Highlighter',
    badge: 'Spectrum',
    emoji: '🌈',
    primaryColor: '#0284C7',
    swatches: ['#6366F1', '#10B981', '#F43F5E', '#F59E0B']
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    badge: 'Mono',
    emoji: '🖤',
    primaryColor: '#1E293B',
    swatches: ['#94A3B8', '#475569', '#1E293B', '#0F172A']
  }
];

// Helper to reliably resolve any color string or theme ID to a valid hex
function resolveHexColor(col?: string): string {
  if (!col) return '#2563EB';
  if (col.startsWith('#')) return col;
  if (col.includes('#')) {
    const match = col.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/);
    if (match) return match[0];
  }
  const map: Record<string, string> = {
    'bluebook': '#2563EB',
    'blue-cascade': '#2563EB',
    'blue': '#2563EB',
    'crimson': '#EF4444',
    'red': '#EF4444',
    'bini': '#EC4899',
    'pink': '#EC4899',
    'ube': '#7C3AED',
    'purple': '#7C3AED',
    'violet': '#7C3AED',
    'coffee': '#92400E',
    'amber': '#D97706',
    'orange': '#D97706',
    'matcha': '#16A34A',
    'green': '#16A34A',
    'emerald': '#10B981',
    'duos': '#4F46E5',
    'dual-tone': '#4F46E5',
    'indigo': '#4F46E5',
    'highlighter': '#0284C7',
    'rainbow': '#0284C7',
    'cyan': '#0284C7',
    'teal': '#0284C7',
    'obsidian': '#1E293B',
    'monochrome': '#1E293B',
    'slate': '#334155'
  };
  return map[col.toLowerCase()] || '#2563EB';
}

// Helper to adjust color brightness for monochromatic subject gradients
function adjustColorBrightness(hex: string, percent: number): string {
  const cleanBase = resolveHexColor(hex);
  const cleanHex = cleanBase.replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  if (isNaN(num)) return cleanBase;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export const SubjectDetailScreen: React.FC<SubjectDetailScreenProps> = ({
  course,
  allCourses,
  events,
  notes,
  conflicts,
  links = [],
  topics = [],
  onBack,
  onSelectInstructor,
  onViewInTimetable,
  onUpdateCourse,
  onDeleteCourse,
  onSaveEvent,
  onDeleteEvent,
  onToggleEventComplete,
  onSaveNote,
  onDeleteNote,
  onTogglePinNote,
  onSaveLink,
  onDeleteLink,
  onSaveTopic,
  onDeleteTopic,
  onToggleTopicComplete
}) => {
  const [activeTab, setActiveTab] = useState<TabSegment>('tasks');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('pending');
  const [taskDisplayMode, setTaskDisplayMode] = useState<TaskDisplayMode>('stack');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showCompletedDrawer, setShowCompletedDrawer] = useState(false);
  
  // Modals
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomEvent | null>(null);

  // Resource Links Modal & State
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [editingLink, setEditingLink] = useState<CourseLink | null>(null);

  // Syllabus Topics Modal & State
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [syllabusTerm, setSyllabusTerm] = useState<AcademicTerm | 'all'>('prelim');
  const [filterKeyExamsOnly, setFilterKeyExamsOnly] = useState(false);

  // New Note Inline State & Rich Text
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [readingNote, setReadingNote] = useState<SubjectNote | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Helper to insert markdown formatting in note editor
  const handleInsertFormat = (prefix: string, suffix: string = '', placeholder: string = 'text') => {
    triggerLightHaptic();
    const textarea = noteTextareaRef.current;
    if (!textarea) {
      setNoteContent(prev => prev + `${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = noteContent.substring(start, end);
    const textToInsert = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`;

    const newContent = noteContent.substring(0, start) + textToInsert + noteContent.substring(end);
    setNoteContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected ? start + textToInsert.length : start + prefix.length + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Helper for reading stats
  const getNoteStats = (content: string) => {
    const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));
    return { wordCount, readTimeMinutes };
  };

  // Parse inline markdown tokens: ==highlight==, **bold**, *italic*, `code`
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const regex = /(==.*?==|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
        return (
          <mark
            key={index}
            style={{
              background: 'rgba(245, 158, 11, 0.28)',
              color: 'inherit',
              padding: '1px 5px',
              borderRadius: 4,
              fontWeight: 700
            }}
          >
            {part.slice(2, -2)}
          </mark>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} style={{ fontWeight: 800 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} style={{ fontStyle: 'italic' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            style={{
              background: 'var(--ios-bg-secondary)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: '0.9em',
              fontFamily: 'monospace'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Render formatted note blocks (headers, lists, inline markdown)
  const renderFormattedNoteContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.6 }}>
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={lineIdx} style={{ height: 4 }} />;
          }

          if (line.startsWith('### ')) {
            return (
              <h4 key={lineIdx} style={{ fontSize: 14.5, fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--ios-text-primary)' }}>
                {parseInlineMarkdown(line.slice(4))}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={lineIdx} style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 3px 0', color: 'var(--ios-text-primary)' }}>
                {parseInlineMarkdown(line.slice(3))}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={lineIdx} style={{ fontSize: 17.5, fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--ios-text-primary)' }}>
                {parseInlineMarkdown(line.slice(2))}
              </h2>
            );
          }

          if (/^[-*]\s/.test(line)) {
            return (
              <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 4 }}>
                <span style={{ color: themeColor, fontWeight: 800, lineHeight: 1.5 }}>•</span>
                <span style={{ flex: 1 }}>{parseInlineMarkdown(line.replace(/^[-*]\s/, ''))}</span>
              </div>
            );
          }

          const numMatch = line.match(/^(\d+)\.\s(.*)$/);
          if (numMatch) {
            return (
              <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, paddingLeft: 4 }}>
                <span style={{ color: themeColor, fontWeight: 800, fontSize: 12 }}>{numMatch[1]}.</span>
                <span style={{ flex: 1 }}>{parseInlineMarkdown(numMatch[2])}</span>
              </div>
            );
          }

          return (
            <div key={lineIdx}>
              {parseInlineMarkdown(line)}
            </div>
          );
        })}
      </div>
    );
  };

  // Quick Color Swatches Popover
  const [showColorPicker, setShowColorPicker] = useState(false);

  // In-App Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: () => {}
  });

  // Clean deduplicated days formatting
  const formatDaysClean = (daysList: any[]) => {
    if (!daysList || daysList.length === 0) return { short: 'TBA', full: 'No Schedule Assigned' };
    const raw = Array.isArray(daysList) ? daysList : [daysList];
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const unique = Array.from(new Set(raw.map(d => String(d).trim())));
    unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    const short = unique.map(d => {
      if (d === 'Mon') return 'M';
      if (d === 'Tue') return 'T';
      if (d === 'Wed') return 'W';
      if (d === 'Thu') return 'TH';
      if (d === 'Fri') return 'F';
      if (d === 'Sat') return 'S';
      if (d === 'Sun') return 'SU';
      return d.slice(0, 2);
    }).join('');

    return {
      short: short === 'MWF' ? 'MWF' : short === 'MTH' ? 'MTH' : short === 'TTH' ? 'TTH' : unique.join('·'),
      full: unique.join(', ')
    };
  };

  const daysInfo = formatDaysClean(course.days);
  const themeColor = resolveHexColor(course.color);

  // Today & Live status calculation
  const todayDayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]) as DayOfWeek;
  const isScheduledToday = course.days?.includes(todayDayName);
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const startMins = timeToMinutes(course.startTime);
  const endMins = timeToMinutes(course.endTime);
  const isClassLive = isScheduledToday && nowMins >= startMins && nowMins < endMins;

  // Filter linked events & notes
  const linkedEvents = events.filter(e => e.subjectId === course.id);
  const linkedNotes = notes.filter(n => n.subjectId === course.id);
  
  const completedTasks = linkedEvents.filter(e => e.isCompleted);
  const pendingTasks = linkedEvents.filter(e => !e.isCompleted);
  const completedTasksCount = completedTasks.length;
  const pendingTasksCount = pendingTasks.length;
  const totalTasksCount = linkedEvents.length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const filteredEvents = linkedEvents.filter(e => {
    if (taskFilter === 'pending') return !e.isCompleted;
    if (taskFilter === 'completed') return e.isCompleted;
    return true;
  });

  // Sort: pending first, then by date ascending
  filteredEvents.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return (a.date || '').localeCompare(b.date || '');
  });

  // Sort notes: pinned first, then by updatedAt/createdAt descending
  const sortedNotes = [...linkedNotes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const timeB = (b.updatedAt || b.createdAt || '');
    const timeA = (a.updatedAt || a.createdAt || '');
    return timeB.localeCompare(timeA);
  });

  // Filter linked Course Links & Topics
  const linkedCourseLinks = (links || []).filter(l => l.courseId === course.id);
  const linkedCourseTopics = (topics || []).filter(t => t.courseId === course.id);

  // Topics breakdown by term
  const activeTermTopics = syllabusTerm === 'all' 
    ? linkedCourseTopics 
    : linkedCourseTopics.filter(t => t.term === syllabusTerm);

  const displayedTopics = filterKeyExamsOnly 
    ? activeTermTopics.filter(t => t.isKeyExamTopic)
    : activeTermTopics;

  // Sort topics by order or createdAt
  displayedTopics.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));

  const completedTopicsCount = activeTermTopics.filter(t => t.isCompleted).length;
  const totalActiveTopicsCount = activeTermTopics.length;
  const termProgressPercent = totalActiveTopicsCount > 0 ? Math.round((completedTopicsCount / totalActiveTopicsCount) * 100) : 0;
  
  const remainingTotalTopics = linkedCourseTopics.filter(t => !t.isCompleted).length;
  const totalKeyExamTopics = linkedCourseTopics.filter(t => t.isKeyExamTopic).length;
  const activeTermKeyExamCount = activeTermTopics.filter(t => t.isKeyExamTopic).length;

  const getLinkMeta = (type: string) => {
    switch (type) {
      case 'drive': return { label: 'Google Drive', icon: '📁', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'chat': return { label: 'Group Chat', icon: '💬', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
      case 'lms': return { label: 'LMS / Canvas', icon: '🎓', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'meet': return { label: 'Meet / Zoom', icon: '📹', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' };
      case 'docs': return { label: 'Readings / Docs', icon: '📄', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
      default: return { label: 'Link', icon: '🌐', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' };
    }
  };

  const handleTopicToggle = (topic: CourseTopic, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!topic.isCompleted) {
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight * 0.45;
      
      const cardEl = (e?.currentTarget as HTMLElement)?.closest('.wallet-card-item, .syllabus-topic-card, div[style*="borderRadius"]') || (e?.currentTarget as HTMLElement);
      if (cardEl && typeof cardEl.getBoundingClientRect === 'function') {
        const rect = cardEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else if (e?.clientX && e?.clientY) {
        targetX = e.clientX;
        targetY = e.clientY;
      }

      triggerTaskConfetti(targetX, targetY);
      triggerSuccessHaptic();
      showSystemToast('Lesson Mastered! 🎓', `"${topic.title}" marked as covered.`);
    } else {
      triggerSelectionHaptic();
      showSystemToast('Topic Reopened', `"${topic.title}" marked for review.`);
    }
    if (onToggleTopicComplete) {
      onToggleTopicComplete(topic.id);
    }
  };

  const isConflicting = conflicts.some(c => c.course1.id === course.id || c.course2.id === course.id);
  const isLab = course.courseCode?.toLowerCase().includes('lab') || course.courseName?.toLowerCase().includes('lab');
  const durationMins = timeToMinutes(course.endTime) - timeToMinutes(course.startTime);
  const formattedDuration = formatDuration(Math.max(durationMins, 0));

  const cleanInstructor = course.instructor 
    ? (course.instructor.startsWith('Prof.') ? course.instructor : `Prof. ${course.instructor}`)
    : 'No Instructor Assigned';

  const handleCopyDetails = () => {
    triggerLightHaptic();
    const text = `${course.courseCode}: ${course.courseName}\nSchedule: ${daysInfo.full} (${formatTime12H(course.startTime)} - ${formatTime12H(course.endTime)})\nRoom: ${course.room || 'TBA'}\nInstructor: ${cleanInstructor}`;
    navigator.clipboard?.writeText(text);
    showSystemToast('Copied to Clipboard', 'Course details copied.');
  };

  const handleQuickColorChange = (newColor: string) => {
    triggerSelectionHaptic();
    onUpdateCourse({ ...course, color: newColor });
    setShowColorPicker(false);
    showSystemToast('Course Theme Updated', `${course.courseCode} theme updated.`);
  };

  const handleTaskToggle = (evt: CustomEvent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!evt.isCompleted) {
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight * 0.45;
      
      const cardEl = (e?.currentTarget as HTMLElement)?.closest('.wallet-card-item, div[style*="borderRadius"]') || (e?.currentTarget as HTMLElement);
      if (cardEl && typeof cardEl.getBoundingClientRect === 'function') {
        const rect = cardEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else if (e?.clientX && e?.clientY) {
        targetX = e.clientX;
        targetY = e.clientY;
      }

      // Complete action -> confetti + celebration haptic!
      triggerTaskConfetti(targetX, targetY);
      triggerSuccessHaptic();
      showSystemToast('🎉 Task Completed!', `${evt.title} marked as done.`);
    } else {
      triggerSelectionHaptic();
      showSystemToast('Task Reopened', `${evt.title} moved back to pending.`);
    }
    onToggleEventComplete(evt.id);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;

    triggerSuccessHaptic();
    const now = new Date().toISOString();
    
    if (editingNoteId) {
      const existing = linkedNotes.find(n => n.id === editingNoteId);
      onSaveNote({
        id: editingNoteId,
        subjectId: course.id,
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        isPinned: existing?.isPinned || false,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      });
      showSystemToast('Note Updated', 'Course note saved.');
    } else {
      const newNote: SubjectNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subjectId: course.id,
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        isPinned: false,
        createdAt: now,
        updatedAt: now
      };
      onSaveNote(newNote);
      showSystemToast('Note Added', 'New course note created.');
    }

    setNoteTitle('');
    setNoteContent('');
    setEditingNoteId(null);
    setIsCreatingNote(false);
  };

  const handleStartEditNote = (note: SubjectNote) => {
    triggerLightHaptic();
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsCreatingNote(true);
  };

  const getRelativeDateLabel = (dateStr?: string): { label: string; isAlert: boolean } => {
    if (!dateStr) return { label: 'NO DUE DATE', isAlert: false };
    const today = new Date();
    const cleanDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const target = new Date(cleanDateStr);
    if (isNaN(target.getTime())) return { label: dateStr.toUpperCase(), isAlert: false };

    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const targetZero = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const diffDays = Math.round((targetZero - todayZero) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'DUE TODAY', isAlert: true };
    if (diffDays === 1) return { label: 'DUE TOMORROW', isAlert: true };
    if (diffDays === -1) return { label: 'OVERDUE (YESTERDAY)', isAlert: true };
    if (diffDays < -1) return { label: `OVERDUE (${Math.abs(diffDays)}D)`, isAlert: true };
    if (diffDays > 1 && diffDays <= 7) return { label: `IN ${diffDays} DAYS`, isAlert: false };
    
    return {
      label: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      isAlert: false
    };
  };

  // Monochromatic Task Card Background Generator anchored to Course Theme Color
  const getSubjectMonochromaticCardGradient = (index: number, isCompleted: boolean): string => {
    const base = themeColor;
    if (isCompleted) {
      return 'linear-gradient(135deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.9) 100%)';
    }
    // Sophisticated stepped gradients following the Course Theme
    const variants = [
      `linear-gradient(135deg, ${adjustColorBrightness(base, 25)} 0%, ${base} 100%)`,
      `linear-gradient(135deg, ${base} 0%, ${adjustColorBrightness(base, -20)} 100%)`,
      `linear-gradient(135deg, ${adjustColorBrightness(base, -10)} 0%, ${adjustColorBrightness(base, -35)} 100%)`,
      `linear-gradient(135deg, ${adjustColorBrightness(base, 15)} 0%, ${adjustColorBrightness(base, -15)} 100%)`
    ];
    return variants[index % variants.length];
  };

  return (
    <div className="subject-detail-container" style={{ paddingBottom: 88, paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))' }}>
      
      {/* ================= 🔝 MINIMAL TOP NAV BAR ================= */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'var(--ios-bg-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          borderBottom: '1px solid var(--ios-divider)'
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => {
            triggerLightHaptic();
            onBack();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            color: 'var(--ios-blue)',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 8px 4px 0',
            borderRadius: 8,
            transition: 'opacity 0.15s ease'
          }}
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span>Courses</span>
        </button>

        {/* Right Action Buttons Cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          
          {/* Quick Color Swatch Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                triggerLightHaptic();
                setShowColorPicker(!showColorPicker);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                boxShadow: 'var(--ios-shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease'
              }}
              title="Change Course Theme"
            >
              <div 
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: themeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              >
                <Palette size={10} color="#FFFFFF" />
              </div>
            </button>

            {showColorPicker && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }} 
                  onClick={() => setShowColorPicker(false)} 
                />
                <div 
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 44,
                    background: 'var(--ios-card-bg)',
                    border: '1px solid var(--ios-card-border)',
                    borderRadius: 18,
                    padding: '12px 14px',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    zIndex: 50,
                    animation: 'fadeIn 0.15s ease',
                    width: 250,
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: '70vh',
                    overflowY: 'auto'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--ios-divider)', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ios-text-primary)' }}>
                      Course Color Theme
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                      9 Themes
                    </span>
                  </div>

                  {SCHEDLY_COURSE_THEMES.map(themeItem => {
                    const currentHex = resolveHexColor(course.color);
                    const isSelected = course.color === themeItem.primaryColor || 
                                       course.color === themeItem.id || 
                                       currentHex === themeItem.primaryColor;

                    return (
                      <div
                        key={themeItem.id}
                        onClick={() => handleQuickColorChange(themeItem.primaryColor)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 9px',
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? themeItem.primaryColor : 'transparent'}`,
                          background: isSelected ? `${themeItem.primaryColor}15` : 'var(--ios-bg-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={themeItem.name}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ fontSize: 15 }}>{themeItem.emoji}</span>
                          <span style={{ fontSize: 12.5, fontWeight: isSelected ? 800 : 600, color: isSelected ? themeItem.primaryColor : 'var(--ios-text-primary)' }}>
                            {themeItem.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 2.5 }}>
                            {themeItem.swatches.map((colorHex, idx) => (
                              <span
                                key={idx}
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 2.5,
                                  background: colorHex,
                                  display: 'inline-block'
                                }}
                              />
                            ))}
                          </div>
                          {isSelected && <Check size={13} color={themeItem.primaryColor} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => {
              triggerLightHaptic();
              setIsEditingCourse(true);
            }}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 18,
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              color: 'var(--ios-text-primary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: 'var(--ios-shadow-sm)'
            }}
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyDetails}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              color: 'var(--ios-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--ios-shadow-sm)'
            }}
            title="Copy Schedule Details"
          >
            <Copy size={15} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0 16px', maxWidth: 640, margin: '0 auto' }}>
        
        {/* Schedule Overlap Alert (if conflicting) */}
        {isConflicting && (
          <div className="ios-conflict-alert" style={{ marginBottom: 14 }}>
            <AlertTriangle className="ios-conflict-icon" size={16} />
            <div>
              <div className="ios-conflict-title">Timetable Conflict</div>
              <div className="ios-conflict-desc">This course overlaps with another class on your schedule.</div>
            </div>
          </div>
        )}

        {/* ================= 🪪 SOLID HIGH-CONTRAST DIGITAL ID HEADER CARD ================= */}
        <div 
          style={{
            background: `linear-gradient(145deg, ${themeColor} 0%, ${adjustColorBrightness(themeColor, -25)} 55%, ${adjustColorBrightness(themeColor, -48)} 100%)`,
            borderRadius: 24,
            padding: '22px',
            boxShadow: `0 16px 36px -4px ${themeColor}66, 0 6px 16px rgba(0,0,0,0.22)`,
            border: '1px solid rgba(255, 255, 255, 0.28)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 18,
            color: '#FFFFFF'
          }}
        >
          {/* Top Row: Course Code Pill + Lecture/Lab & Units Badges + Live Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span 
                style={{ 
                  fontSize: 13, 
                  fontWeight: 900, 
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255, 0.24)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.38)',
                  padding: '3px 10px',
                  borderRadius: 8,
                  letterSpacing: '0.04em'
                }}
              >
                {course.courseCode}
              </span>

              <span 
                className="wallet-pill-tag"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: '#FFFFFF'
                }}
              >
                {isLab ? 'LABORATORY' : 'LECTURE'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {course.units && (
                <span 
                  className="wallet-pill-tag"
                  style={{
                    background: 'rgba(16, 185, 129, 0.45)',
                    border: '1px solid rgba(16, 185, 129, 0.65)',
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: '#FFFFFF'
                  }}
                >
                  {course.units} {course.units === 1 ? 'Unit' : 'Units'}
                </span>
              )}

              {isClassLive && (
                <span 
                  className="wallet-pill-tag"
                  style={{
                    background: '#10B981',
                    border: 'none',
                    fontSize: 10,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 1.5s infinite' }} />
                  LIVE NOW
                </span>
              )}
            </div>
          </div>

          {/* Identity Row: Squircle Icon + Course Title */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <div 
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255, 255, 255, 0.38)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)'
              }}
            >
              {getSubjectIconComponent(course.icon, course.courseCode, course.courseName, 28, '#FFFFFF')}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 
                style={{ 
                  fontSize: 20, 
                  fontWeight: 800, 
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  margin: 0,
                  whiteSpace: 'normal',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.35)'
                }}
              >
                {course.courseName}
              </h2>
            </div>
          </div>

          {/* Full-Width Metadata Bento Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '10px 14px',
              paddingTop: 12,
              borderTop: '1px solid rgba(255, 255, 255, 0.22)'
            }}
          >
            {/* Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                SCHEDULE
              </label>
              <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                {daysInfo.full} • {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
              </span>
            </div>

            {/* Room */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ROOM
              </label>
              <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                {course.room || 'TBA'}
              </span>
            </div>

            {/* Instructor */}
            <div 
              style={{ gridColumn: 'span 2', cursor: course.instructor ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }}
              onClick={() => course.instructor && onSelectInstructor(course.instructor)}
            >
              <label style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                INSTRUCTOR
              </label>
              <span style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span>{cleanInstructor}</span>
                {course.instructor && <ChevronRight size={14} style={{ opacity: 0.9 }} />}
              </span>
            </div>
          </div>

          {/* Card Footer with Digital Barcode */}
          <div 
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div 
                style={{ 
                  fontFamily: 'var(--ios-font-mono)', 
                  fontSize: 11, 
                  fontWeight: 800, 
                  color: 'rgba(255, 255, 255, 0.95)',
                  letterSpacing: '0.06em'
                }}
              >
                PASS REF: {course.courseCode}-{daysInfo.short}
              </div>
              <div style={{ fontSize: 9.5, color: 'rgba(255, 255, 255, 0.8)', marginTop: 1 }}>
                {formattedDuration} per class session
              </div>
            </div>

            {/* Authentic Barcode Lines */}
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: 18 }}>
              {[4, 2, 5, 2, 6, 3, 2, 4, 3, 5, 2, 4, 3, 2, 6, 2, 4].map((w, i) => (
                <div key={i} style={{ width: `${w}px`, height: 18, background: '#FFFFFF', opacity: 0.9, borderRadius: 1 }} />
              ))}
            </div>
          </div>

          {/* Tasks Progress Bar (if tasks exist) */}
          {totalTasksCount > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.22)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.92)' }}>
                  Deadlines Completed
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#FFFFFF' }}>
                  {completedTasksCount} / {totalTasksCount} ({taskProgressPercent}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'rgba(255, 255, 255, 0.28)', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${taskProgressPercent}%`, 
                    background: '#10B981',
                    borderRadius: 999,
                    transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= 🔗 CLASS LINKS & RESOURCE HUB STRIP ================= */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ios-text-secondary)' }}>
                Class Links & Resources
              </span>
              {linkedCourseLinks.length > 0 && (
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 800, 
                  background: 'var(--ios-card-border)', 
                  color: 'var(--ios-text-primary)', 
                  padding: '1px 6px', 
                  borderRadius: 999 
                }}>
                  {linkedCourseLinks.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                setEditingLink(null);
                setIsAddingLink(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: themeColor,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 4px'
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Link</span>
            </button>
          </div>

          {linkedCourseLinks.length === 0 ? (
            /* Empty prompt pill */
            <div
              onClick={() => {
                triggerLightHaptic();
                setEditingLink(null);
                setIsAddingLink(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 14,
                background: 'var(--ios-card-bg)',
                border: '1px dashed var(--ios-card-border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--ios-shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 18 }}>📁</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Add Class Google Drive, GC, or Canvas LMS
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ios-text-muted)' }}>
                    1-tap quick access to lecture slides, zoom rooms & chats
                  </div>
                </div>
              </div>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `${themeColor}15`,
                color: themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Plus size={14} strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            /* Horizontal scrolling list of resource chips */
            <div 
              style={{ 
                display: 'flex', 
                gap: 8, 
                overflowX: 'auto', 
                paddingBottom: 4,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {linkedCourseLinks.map(link => {
                const meta = getLinkMeta(link.type);
                return (
                  <div
                    key={link.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'var(--ios-card-bg)',
                      border: '1px solid var(--ios-card-border)',
                      borderRadius: 12,
                      padding: '6px 8px 6px 10px',
                      gap: 8,
                      flexShrink: 0,
                      boxShadow: 'var(--ios-shadow-sm)',
                      maxWidth: 220,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Launch Link Button */}
                    <div
                      onClick={() => {
                        triggerLightHaptic();
                        window.open(link.url, '_blank', 'noopener,noreferrer');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        cursor: 'pointer',
                        minWidth: 0,
                        flex: 1
                      }}
                      title={`Open ${link.url}`}
                    >
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 700, 
                          color: 'var(--ios-text-primary)', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {link.title}
                        </div>
                        <div style={{ 
                          fontSize: 9.5, 
                          fontWeight: 600, 
                          color: meta.color, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}>
                          {meta.label}
                        </div>
                      </div>
                      <ExternalLink size={12} style={{ color: 'var(--ios-text-muted)', flexShrink: 0, marginLeft: 2 }} />
                    </div>

                    {/* Edit/Delete Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerLightHaptic();
                        setEditingLink(link);
                        setIsAddingLink(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 3,
                        color: 'var(--ios-text-muted)',
                        cursor: 'pointer',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Edit Link"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                );
              })}

              {/* Add Link Plus Pill */}
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setEditingLink(null);
                  setIsAddingLink(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--ios-bg-secondary)',
                  border: '1px dashed var(--ios-card-border)',
                  borderRadius: 12,
                  padding: '6px 12px',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= TAB 1: DEADLINES & TASKS ================= */}
        {activeTab === 'tasks' && (
          <div>
            {/* UNIFIED SINGLE-ROW TOP CONTROLS BAR (Directly below Header Card) */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16,
                gap: 8
              }}
            >
              {/* Left: Filter Pills */}
              <div 
                style={{ 
                  display: 'inline-flex', 
                  background: 'var(--ios-card-bg)', 
                  padding: 3, 
                  borderRadius: 12,
                  border: '1px solid var(--ios-card-border)',
                  boxShadow: 'var(--ios-shadow-sm)'
                }}
              >
                {(['pending', 'all', 'completed'] as TaskFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      triggerSelectionHaptic();
                      setTaskFilter(f);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 9,
                      border: 'none',
                      background: taskFilter === f ? 'var(--ios-text-primary)' : 'transparent',
                      color: taskFilter === f ? 'var(--ios-card-bg)' : 'var(--ios-text-secondary)',
                      fontSize: 12,
                      fontWeight: taskFilter === f ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {f === 'pending' ? `Pending (${pendingTasksCount})` : f === 'completed' ? `Done (${completedTasksCount})` : 'All'}
                  </button>
                ))}
              </div>

              {/* Right: Stack/List Toggle + Add Task Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Mode Toggle Pill */}
                <div 
                  style={{
                    display: 'inline-flex',
                    background: 'var(--ios-card-bg)',
                    padding: 3,
                    borderRadius: 11,
                    border: '1px solid var(--ios-card-border)',
                    boxShadow: 'var(--ios-shadow-sm)'
                  }}
                >
                  <button
                    onClick={() => {
                      triggerSelectionHaptic();
                      setTaskDisplayMode('stack');
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 8,
                      border: 'none',
                      background: taskDisplayMode === 'stack' ? 'var(--ios-text-primary)' : 'transparent',
                      color: taskDisplayMode === 'stack' ? 'var(--ios-card-bg)' : 'var(--ios-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    title="Card Stack Deck"
                  >
                    <Layers size={15} />
                  </button>
                  <button
                    onClick={() => {
                      triggerSelectionHaptic();
                      setTaskDisplayMode('list');
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 8,
                      border: 'none',
                      background: taskDisplayMode === 'list' ? 'var(--ios-text-primary)' : 'transparent',
                      color: taskDisplayMode === 'list' ? 'var(--ios-card-bg)' : 'var(--ios-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    title="Compact List"
                  >
                    <List size={15} />
                  </button>
                </div>

                {/* Add Task CTA Button */}
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setEditingTask(null);
                    setIsAddingTask(true);
                  }}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 17,
                    border: 'none',
                    background: themeColor,
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px -2px ${themeColor}66`,
                    flexShrink: 0
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 ? (
              <div 
                style={{ 
                  background: 'var(--ios-card-bg)',
                  borderRadius: 20,
                  border: '1px solid var(--ios-card-border)',
                  textAlign: 'center', 
                  padding: '40px 24px', 
                  boxShadow: 'var(--ios-shadow-sm)'
                }}
              >
                <div 
                  style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 16, 
                    background: `${themeColor}15`, 
                    color: themeColor,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 12px auto' 
                  }}
                >
                  <CheckCircle2 size={26} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 4 }}>
                  {taskFilter === 'completed' ? 'No completed tasks yet' : 'No upcoming deadlines'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginBottom: 20, lineHeight: 1.45, maxWidth: 300, margin: '0 auto 20px auto' }}>
                  {taskFilter === 'completed' 
                    ? 'Check off tasks above to see them in your completed archive.'
                    : `Track exams, quizzes, problem sets, and project deadlines for ${course.courseCode}.`}
                </div>
                {taskFilter !== 'completed' && (
                  <button
                    onClick={() => {
                      triggerLightHaptic();
                      setEditingTask(null);
                      setIsAddingTask(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '9px 18px',
                      borderRadius: 20,
                      background: themeColor,
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: `0 4px 14px -2px ${themeColor}66`
                    }}
                  >
                    <Plus size={16} /> Add First Deadline
                  </button>
                )}
              </div>
            ) : taskDisplayMode === 'stack' ? (
              /* ================= 🗂️ APPLE WALLET CARD STACK DECK ================= */
              <div className="wallet-card-stack" style={{ position: 'relative', marginTop: 10, paddingBottom: 20 }}>
                {filteredEvents.map((evt, idx) => {
                  const isExpanded = expandedTaskId === evt.id;
                  const dateInfo = getRelativeDateLabel(evt.date);
                  const cardBg = getSubjectMonochromaticCardGradient(idx, Boolean(evt.isCompleted));

                  return (
                    <div
                      key={evt.id}
                      className={`wallet-card-item ${isExpanded ? 'is-expanded' : 'is-stacked'}`}
                      style={{
                        background: cardBg,
                        zIndex: isExpanded ? 99 : idx + 1,
                        cursor: 'pointer',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)'
                      }}
                      onClick={() => {
                        triggerLightHaptic();
                        setExpandedTaskId(isExpanded ? null : evt.id);
                      }}
                    >
                      {/* Card Header (Visible in Stack) */}
                      <div className="wallet-card-header">
                        <div className="wallet-card-header-left">
                          {/* Tactile Checkbox Button */}
                          <div 
                            onClick={(e) => handleTaskToggle(evt, e)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: evt.isCompleted ? '#10B981' : 'rgba(255, 255, 255, 0.22)',
                              backdropFilter: 'blur(8px)',
                              border: evt.isCompleted ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                              transition: 'transform 0.15s ease'
                            }}
                            title={evt.isCompleted ? 'Uncheck Task' : 'Mark as Done'}
                          >
                            {evt.isCompleted ? (
                              <Check size={19} color="#FFFFFF" strokeWidth={3} />
                            ) : (
                              <Circle size={17} color="#FFFFFF" strokeWidth={2} />
                            )}
                          </div>

                          <div className="wallet-card-text-group">
                            <div className="wallet-card-category" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{evt.category.toUpperCase()}</span>
                              {evt.startTime && (
                                <>
                                  <span>•</span>
                                  <span>{formatTime12H(evt.startTime)}</span>
                                </>
                              )}
                            </div>

                            <div 
                              className="wallet-card-code" 
                              style={{ 
                                textDecoration: evt.isCompleted ? 'line-through' : 'none',
                                opacity: evt.isCompleted ? 0.75 : 1
                              }}
                            >
                              {evt.title}
                            </div>
                          </div>
                        </div>

                        <div className="wallet-card-header-right">
                          <span 
                            className="wallet-pill-tag"
                            style={{
                              background: evt.isCompleted 
                                ? 'rgba(16, 185, 129, 0.35)' 
                                : dateInfo.isAlert 
                                ? 'rgba(239, 68, 68, 0.45)' 
                                : 'rgba(255, 255, 255, 0.25)',
                              border: dateInfo.isAlert ? '1px solid rgba(239, 68, 68, 0.6)' : undefined
                            }}
                          >
                            {evt.isCompleted ? '✓ Done' : dateInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Card Details Body */}
                      {isExpanded && (
                        <div className="wallet-card-expanded-body" onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div className="wallet-detail-cell">
                              <label>DUE DATE</label>
                              <span>
                                <CalendarDays size={13} style={{ flexShrink: 0 }} />
                                <span>{new Date(evt.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </span>
                            </div>

                            <div className="wallet-detail-cell">
                              <label>TIME</label>
                              <span>
                                <Clock size={13} style={{ flexShrink: 0 }} />
                                <span>{evt.startTime ? formatTime12H(evt.startTime) : 'All Day'}</span>
                              </span>
                            </div>
                          </div>

                          {evt.notes && (
                            <div className="wallet-detail-cell">
                              <label>NOTES / INSTRUCTIONS</label>
                              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 1.4, whiteSpace: 'pre-wrap', marginTop: 3 }}>
                                {evt.notes}
                              </div>
                            </div>
                          )}

                          <div className="wallet-card-actions" style={{ marginTop: 12 }}>
                            {/* Mark Done / Reopen Button */}
                            <button
                              type="button"
                              className="wallet-action-btn"
                              style={{ 
                                background: evt.isCompleted ? 'rgba(255, 255, 255, 0.2)' : '#10B981', 
                                color: '#FFFFFF',
                                border: 'none'
                              }}
                              onClick={(e) => handleTaskToggle(evt, e)}
                            >
                              {evt.isCompleted ? <Circle size={14} /> : <CheckCircle size={14} />}
                              <span>{evt.isCompleted ? 'Reopen Task' : 'Mark as Completed'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              className="wallet-action-btn wallet-action-btn-secondary"
                              onClick={() => {
                                triggerLightHaptic();
                                setEditingTask(evt);
                                setIsAddingTask(true);
                              }}
                            >
                              <Edit3 size={14} /> Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              className="wallet-action-btn wallet-action-btn-secondary"
                              style={{ maxWidth: 40, padding: 0 }}
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete Task?',
                                  message: `Are you sure you want to delete "${evt.title}"?`,
                                  confirmText: 'Delete Task',
                                  onConfirm: () => {
                                    triggerLightHaptic();
                                    onDeleteEvent(evt.id);
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>

                            {/* Collapse Button */}
                            <button
                              type="button"
                              className="wallet-action-btn wallet-action-btn-secondary"
                              style={{ maxWidth: 40, padding: 0 }}
                              onClick={() => setExpandedTaskId(null)}
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
              /* ================= 📋 COMPACT LIST VIEW ================= */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredEvents.map(evt => {
                  const dateInfo = getRelativeDateLabel(evt.date);
                  const itemColor = themeColor;

                  return (
                    <div
                      key={evt.id}
                      style={{
                        background: 'var(--ios-card-bg)',
                        borderRadius: 16,
                        border: '1px solid var(--ios-card-border)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        opacity: evt.isCompleted ? 0.65 : 1,
                        boxShadow: 'var(--ios-shadow-sm)',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      {/* Tactile Checkbox Button */}
                      <button
                        onClick={(e) => handleTaskToggle(evt, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          marginTop: 2,
                          color: evt.isCompleted ? 'var(--ios-green)' : 'var(--ios-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {evt.isCompleted ? (
                          <CheckCircle2 size={22} color="var(--ios-green)" />
                        ) : (
                          <Circle size={22} />
                        )}
                      </button>

                      {/* Content (Click to Edit) */}
                      <div 
                        style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                        onClick={() => {
                          triggerLightHaptic();
                          setEditingTask(evt);
                          setIsAddingTask(true);
                        }}
                      >
                        {/* Tags Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span 
                            style={{ 
                              fontSize: 10, 
                              fontWeight: 800, 
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: `${itemColor}15`,
                              color: itemColor
                            }}
                          >
                            {evt.category}
                          </span>

                          <span 
                            style={{ 
                              fontSize: 11, 
                              fontWeight: 800, 
                              color: dateInfo.isAlert ? '#EF4444' : 'var(--ios-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            {dateInfo.label}
                          </span>

                          {evt.startTime && (
                            <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                              • {formatTime12H(evt.startTime)}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div 
                          style={{ 
                            fontSize: 14.5, 
                            fontWeight: 700, 
                            color: 'var(--ios-text-primary)',
                            textDecoration: evt.isCompleted ? 'line-through' : 'none',
                            lineHeight: 1.35
                          }}
                        >
                          {evt.title}
                        </div>

                        {/* Notes Snippet */}
                        {evt.notes && (
                          <div style={{ fontSize: 12, color: 'var(--ios-text-secondary)', marginTop: 4, lineHeight: 1.35 }}>
                            {evt.notes}
                          </div>
                        )}
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Delete Task?',
                            message: `Are you sure you want to delete "${evt.title}"?`,
                            confirmText: 'Delete Task',
                            onConfirm: () => {
                              triggerLightHaptic();
                              onDeleteEvent(evt.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ios-text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 6
                        }}
                        title="Delete Task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ================= 📦 COMPLETED & ARCHIVED ACCORDION DRAWER ================= */}
            {taskFilter === 'pending' && completedTasksCount > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--ios-divider)' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    setShowCompletedDrawer(!showCompletedDrawer);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 16px',
                    borderRadius: 14,
                    background: 'var(--ios-card-bg)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-secondary)',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: 'var(--ios-shadow-sm)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="var(--ios-green)" />
                    <span>Completed Tasks ({completedTasksCount})</span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    style={{ 
                      transform: showCompletedDrawer ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </button>

                {showCompletedDrawer && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, animation: 'fadeIn 0.2s ease' }}>
                    {completedTasks.map(evt => (
                      <div
                        key={evt.id}
                        style={{
                          background: 'var(--ios-card-bg)',
                          borderRadius: 14,
                          border: '1px solid var(--ios-card-border)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          opacity: 0.8
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <button
                            onClick={(e) => handleTaskToggle(evt, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: 'var(--ios-green)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Restore Task to Pending"
                          >
                            <CheckCircle2 size={18} color="var(--ios-green)" />
                          </button>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ios-text-primary)', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {evt.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                              Due {evt.date} {evt.startTime && `• ${formatTime12H(evt.startTime)}`}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Delete Completed Task?',
                              message: `Are you sure you want to delete "${evt.title}"?`,
                              confirmText: 'Delete',
                              onConfirm: () => {
                                triggerLightHaptic();
                                onDeleteEvent(evt.id);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ios-text-muted)',
                            cursor: 'pointer',
                            padding: 4
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SYLLABUS & TOPIC ROADMAP ================= */}
        {activeTab === 'syllabus' && (
          <div>
            {/* Grading Period / Term Segment Filter */}
            <div 
              style={{ 
                display: 'flex', 
                gap: 6, 
                overflowX: 'auto', 
                paddingBottom: 4, 
                marginBottom: 14, 
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {[
                { id: 'prelim' as const, label: 'Prelims', icon: '📘' },
                { id: 'midterm' as const, label: 'Midterms', icon: '📙' },
                { id: 'semifinal' as const, label: 'Semi-Finals', icon: '📕' },
                { id: 'final' as const, label: 'Finals', icon: '🎓' },
                { id: 'all' as const, label: 'All Terms', icon: '🗺️' }
              ].map(t => {
                const isSelected = syllabusTerm === t.id;
                const termCount = t.id === 'all' 
                  ? linkedCourseTopics.length 
                  : linkedCourseTopics.filter(topic => topic.term === t.id).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setSyllabusTerm(t.id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 12,
                      border: isSelected ? `1.5px solid ${themeColor}` : '1px solid var(--ios-card-border)',
                      background: isSelected ? `${themeColor}18` : 'var(--ios-card-bg)',
                      color: isSelected ? themeColor : 'var(--ios-text-secondary)',
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: 'var(--ios-shadow-sm)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 999,
                      background: isSelected ? themeColor : 'var(--ios-card-border)',
                      color: isSelected ? '#FFFFFF' : 'var(--ios-text-muted)'
                    }}>
                      {termCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Term Progress & Exam Review Hero */}
            <div 
              style={{ 
                background: 'var(--ios-card-bg)',
                borderRadius: 18,
                border: '1px solid var(--ios-card-border)',
                padding: '14px 16px',
                boxShadow: 'var(--ios-shadow-sm)',
                marginBottom: 14
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GraduationCap size={16} color={themeColor} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {syllabusTerm === 'all' ? 'Overall Syllabus Progress' : `${syllabusTerm.toUpperCase()} Progress`}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 900, color: termProgressPercent === 100 && totalActiveTopicsCount > 0 ? '#10B981' : themeColor }}>
                  {completedTopicsCount} / {totalActiveTopicsCount} ({termProgressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--ios-card-border)', overflow: 'hidden', marginBottom: 10 }}>
                <div 
                  style={{
                    height: '100%',
                    width: `${termProgressPercent}%`,
                    background: termProgressPercent === 100 && totalActiveTopicsCount > 0 ? '#10B981' : themeColor,
                    borderRadius: 999,
                    transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              </div>

              {/* Sub controls: Exam Highlight Filter + Add Lesson CTA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    setFilterKeyExamsOnly(!filterKeyExamsOnly);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 10,
                    border: filterKeyExamsOnly ? '1.5px solid #EF4444' : '1px solid var(--ios-card-border)',
                    background: filterKeyExamsOnly ? 'rgba(239, 68, 68, 0.12)' : 'var(--ios-bg-secondary)',
                    color: filterKeyExamsOnly ? '#EF4444' : 'var(--ios-text-secondary)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Flame size={13} color={filterKeyExamsOnly ? '#EF4444' : '#F59E0B'} fill={filterKeyExamsOnly ? '#EF4444' : 'none'} />
                  <span>{filterKeyExamsOnly ? 'Showing Key Topics' : `Key Exam Topics (${activeTermKeyExamCount})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    setEditingTopic(null);
                    setIsAddingTopic(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 14px',
                    borderRadius: 16,
                    border: 'none',
                    background: themeColor,
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: `0 3px 10px -1px ${themeColor}66`
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Lesson</span>
                </button>
              </div>
            </div>

            {/* Topics List or Empty State */}
            {displayedTopics.length === 0 ? (
              <div
                style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: 18,
                  border: '1px solid var(--ios-card-border)',
                  textAlign: 'center',
                  padding: '36px 20px',
                  boxShadow: 'var(--ios-shadow-sm)'
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `${themeColor}15`,
                    color: themeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto'
                  }}
                >
                  <BookOpen size={24} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 4 }}>
                  {filterKeyExamsOnly ? 'No Key Exam Topics in this term' : 'No syllabus lessons yet'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginBottom: 16, lineHeight: 1.45, maxWidth: 280, margin: '0 auto 16px auto' }}>
                  {filterKeyExamsOnly 
                    ? 'Tag important chapters as Key Exam Topics to see them highlighted here.'
                    : `Map out chapters, lecture concepts, and exam pointers for ${course.courseCode}.`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    setEditingTopic(null);
                    setIsAddingTopic(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: '8px 16px',
                    borderRadius: 18,
                    background: themeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px -2px ${themeColor}66`
                  }}
                >
                  <Plus size={15} /> Add First Lesson
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayedTopics.map(topic => {
                  const isDone = Boolean(topic.isCompleted);
                  return (
                    <div
                      key={topic.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        background: 'var(--ios-card-bg)',
                        borderRadius: 16,
                        border: topic.isKeyExamTopic 
                          ? '1.5px solid rgba(239, 68, 68, 0.35)' 
                          : '1px solid var(--ios-card-border)',
                        padding: '12px 14px',
                        boxShadow: 'var(--ios-shadow-sm)',
                        transition: 'all 0.15s ease',
                        opacity: isDone ? 0.72 : 1
                      }}
                    >
                      {/* iOS Circular Toggle Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleTopicToggle(topic, e)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          border: isDone ? `2px solid #10B981` : `2px solid var(--ios-card-border)`,
                          background: isDone ? '#10B981' : 'transparent',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          marginTop: 1,
                          padding: 0,
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {isDone && <Check size={14} strokeWidth={3.5} />}
                      </button>

                      {/* Topic Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 }}>
                          {topic.isKeyExamTopic && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '1.5px 6px',
                              borderRadius: 6,
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#EF4444',
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em'
                            }}>
                              <Flame size={10} fill="#EF4444" />
                              <span>On Exam</span>
                            </span>
                          )}

                          {syllabusTerm === 'all' && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 6,
                              background: 'var(--ios-bg-secondary)',
                              color: 'var(--ios-text-secondary)',
                              textTransform: 'uppercase'
                            }}>
                              {topic.term}
                            </span>
                          )}

                          <span style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: isDone ? 'var(--ios-text-muted)' : 'var(--ios-text-primary)',
                            textDecoration: isDone ? 'line-through' : 'none',
                            lineHeight: 1.35
                          }}>
                            {topic.title}
                          </span>
                        </div>

                        {topic.description && (
                          <div style={{
                            fontSize: 12,
                            color: 'var(--ios-text-secondary)',
                            lineHeight: 1.4,
                            marginTop: 2,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {topic.description}
                          </div>
                        )}
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setEditingTopic(topic);
                            setIsAddingTopic(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ios-text-muted)',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Edit Lesson"
                        >
                          <Edit3 size={14} />
                        </button>

                        {onDeleteTopic && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Delete Lesson?',
                                message: `Are you sure you want to delete "${topic.title}" from the syllabus?`,
                                confirmText: 'Delete Lesson',
                                onConfirm: () => {
                                  triggerLightHaptic();
                                  onDeleteTopic(topic.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Lesson"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: NOTES & REMINDERS ================= */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                {linkedNotes.length} {linkedNotes.length === 1 ? 'Study Note' : 'Study Notes'}
              </span>

              {!isCreatingNote && (
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setEditingNoteId(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setIsCreatingNote(true);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: 'none',
                    background: themeColor,
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px -2px ${themeColor}66`
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>New Note</span>
                </button>
              )}
            </div>

            {/* Note Editor Card */}
            {isCreatingNote && (
              <form 
                onSubmit={handleSaveNoteSubmit} 
                style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: 18,
                  border: `1.5px solid ${themeColor}`,
                  padding: 16,
                  boxShadow: 'var(--ios-shadow-md)',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: themeColor }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: themeColor }}>
                      {editingNoteId ? 'Edit Study Note' : 'New Note for ' + course.courseCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setIsCreatingNote(false);
                      setEditingNoteId(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-text-muted)', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                </div>

                <input 
                  type="text" 
                  className="ios-input" 
                  placeholder="Note Title (e.g. Midterm Formulas, Project Checklist)" 
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  style={{ marginBottom: 10, fontWeight: 700 }}
                  autoFocus
                />

                {/* Formatting Toolbar */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 8px',
                    background: 'var(--ios-bg-secondary)',
                    borderRadius: '10px 10px 0 0',
                    border: '1px solid var(--ios-card-border)',
                    borderBottom: 'none',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-muted)', marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Format:
                  </span>
                  
                  {/* Bold */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('**', '**', 'bold text')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-card-bg)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Bold (**text**)"
                  >
                    <Bold size={13} strokeWidth={2.5} />
                    <span>B</span>
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('*', '*', 'italic text')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-card-bg)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 11.5,
                      fontStyle: 'italic',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Italic (*text*)"
                  >
                    <Italic size={13} strokeWidth={2.5} />
                    <span>I</span>
                  </button>

                  {/* Highlight */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('==', '==', 'highlighted key point')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      borderRadius: 6,
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#D97706',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Neon Highlighter (==text==)"
                  >
                    <Highlighter size={13} strokeWidth={2.5} />
                    <span>Highlight</span>
                  </button>

                  {/* Heading */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('### ', '', 'Heading Topic')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-card-bg)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Heading (### Header)"
                  >
                    <span>H3</span>
                  </button>

                  {/* Bullet list */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('- ', '', 'Bullet item')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-card-bg)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Bullet List (- item)"
                  >
                    <List size={13} strokeWidth={2.5} />
                    <span>List</span>
                  </button>

                  {/* Numbered list */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('1. ', '', 'Numbered item')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-card-bg)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Numbered List (1. item)"
                  >
                    <ListOrdered size={13} strokeWidth={2.5} />
                    <span>1. 2.</span>
                  </button>
                </div>

                <textarea 
                  ref={noteTextareaRef}
                  className="ios-input" 
                  rows={6}
                  placeholder="Write study pointers, formulas, summaries, and professor pointers here... Use formatting buttons above for rich notes!"
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  style={{ 
                    borderRadius: '0 0 12px 12px',
                    marginBottom: 10, 
                    resize: 'vertical', 
                    lineHeight: 1.5,
                    fontFamily: 'inherit'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 11, color: 'var(--ios-text-muted)' }}>
                  <span>Tip: Select text then tap <b>Highlight</b>, <b>B</b>, or <b>I</b></span>
                  <span>{noteContent.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <button 
                  type="submit" 
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 12,
                    border: 'none',
                    background: themeColor,
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px -2px ${themeColor}66`
                  }}
                >
                  {editingNoteId ? 'Save Study Note' : 'Add Study Note'}
                </button>
              </form>
            )}

            {/* Notes List */}
            {sortedNotes.length === 0 && !isCreatingNote ? (
              <div 
                style={{ 
                  background: 'var(--ios-card-bg)',
                  borderRadius: 20,
                  border: '1px solid var(--ios-card-border)',
                  textAlign: 'center', 
                  padding: '40px 24px', 
                  boxShadow: 'var(--ios-shadow-sm)'
                }}
              >
                <div 
                  style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 16, 
                    background: `${themeColor}15`, 
                    color: themeColor,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 12px auto' 
                  }}
                >
                  <FileText size={26} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 4 }}>
                  No study notes yet
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginBottom: 20, lineHeight: 1.45, maxWidth: 300, margin: '0 auto 20px auto' }}>
                  Jot down lecture pointers, exam cheat sheets, professor announcements, and group projects.
                </div>
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setIsCreatingNote(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '9px 18px',
                    borderRadius: 20,
                    background: themeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: `0 4px 14px -2px ${themeColor}66`
                  }}
                >
                  <Plus size={16} /> Write First Note
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedNotes.map(note => {
                  const isExpanded = expandedNoteId === note.id;
                  const stats = getNoteStats(note.content);
                  const isLongNote = (note.content || '').length > 160 || (note.content || '').split('\n').length > 3;

                  return (
                    <div
                      key={note.id}
                      style={{
                        background: 'var(--ios-card-bg)',
                        borderRadius: 16,
                        border: note.isPinned ? '1.5px solid #F59E0B' : '1px solid var(--ios-card-border)',
                        padding: '14px 16px',
                        boxShadow: note.isPinned ? '0 4px 14px -3px rgba(245, 158, 11, 0.2)' : 'var(--ios-shadow-sm)',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Note Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {note.isPinned && (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: 3, 
                                  padding: '2px 7px', 
                                  borderRadius: 6, 
                                  background: 'rgba(245, 158, 11, 0.15)', 
                                  color: '#D97706', 
                                  fontSize: 10.5, 
                                  fontWeight: 800 
                                }}
                              >
                                <Pin size={10} fill="#D97706" /> PINNED
                              </span>
                            )}
                            <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ios-text-primary)', margin: 0 }}>
                              {note.title || 'Untitled Note'}
                            </h3>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--ios-text-muted)' }}>
                            <span>Updated {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span>{stats.wordCount} words</span>
                            <span>•</span>
                            <span>{stats.readTimeMinutes} min read</span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {/* Full Screen Reader Button */}
                          <button
                            onClick={() => {
                              triggerSelectionHaptic();
                              setReadingNote(note);
                            }}
                            style={{
                              background: 'var(--ios-bg-secondary)',
                              border: 'none',
                              color: themeColor,
                              cursor: 'pointer',
                              padding: '5px 7px',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700
                            }}
                            title="Open Full Screen Study View"
                          >
                            <Maximize2 size={12} strokeWidth={2.5} />
                            <span>Read</span>
                          </button>

                          {onTogglePinNote && (
                            <button
                              onClick={() => {
                                triggerSelectionHaptic();
                                onTogglePinNote(note.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: note.isPinned ? '#F59E0B' : 'var(--ios-text-muted)',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 6
                              }}
                              title={note.isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                            >
                              <Pin size={14} fill={note.isPinned ? '#F59E0B' : 'none'} />
                            </button>
                          )}

                          <button
                            onClick={() => handleStartEditNote(note)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 6
                            }}
                            title="Edit Note"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Delete Note?',
                                message: `Are you sure you want to delete "${note.title || 'this note'}"?`,
                                confirmText: 'Delete Note',
                                onConfirm: () => {
                                  triggerLightHaptic();
                                  onDeleteNote(note.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 6
                            }}
                            title="Delete Note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Note Body (Collapsible preview or full formatted view) */}
                      <div 
                        style={{ 
                          position: 'relative',
                          maxHeight: isExpanded || !isLongNote ? 'none' : '90px',
                          overflow: isExpanded || !isLongNote ? 'visible' : 'hidden',
                          fontSize: 13,
                          color: 'var(--ios-text-secondary)',
                          lineHeight: 1.5,
                          transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {renderFormattedNoteContent(note.content)}

                        {/* Fade gradient overlay when collapsed */}
                        {!isExpanded && isLongNote && (
                          <div 
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 44,
                              background: 'linear-gradient(to bottom, transparent, var(--ios-card-bg))',
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                      </div>

                      {/* Collapsible Toggle Bar */}
                      {isLongNote && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--ios-card-border)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              setExpandedNoteId(isExpanded ? null : note.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: themeColor,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: 0
                            }}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={14} strokeWidth={2.5} />
                                <span>Collapse note</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} strokeWidth={2.5} />
                                <span>Expand full note</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              setReadingNote(note);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ios-text-muted)',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <BookOpen size={12} />
                            <span>Study View</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SCHEDULE & INFO ================= */}
        {activeTab === 'info' && (
          <div>
            <div className="detail-grouped-list" style={{ marginBottom: 16 }}>
              {/* Meeting Days */}
              <div className="detail-row-item">
                <div className="detail-icon-squircle" style={{ background: `${themeColor}15`, color: themeColor }}>
                  <Calendar size={18} />
                </div>
                <div className="detail-row-content">
                  <div className="detail-row-label">Meeting Days</div>
                  <div className="detail-row-value">{daysInfo.full}</div>
                </div>
              </div>

              {/* Time & Duration */}
              <div className="detail-row-item">
                <div className="detail-icon-squircle" style={{ background: 'var(--ios-purple-light)', color: 'var(--ios-purple)' }}>
                  <Clock size={18} />
                </div>
                <div className="detail-row-content">
                  <div className="detail-row-label">Class Hours & Duration</div>
                  <div className="detail-row-value">
                    {formatTime12H(course.startTime)} – {formatTime12H(course.endTime)}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ios-text-muted)', marginLeft: 6 }}>
                      ({formattedDuration})
                    </span>
                  </div>
                </div>
              </div>

              {/* Classroom Location */}
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
                    onSelectInstructor(course.instructor);
                  }
                }}
              >
                <div className="detail-icon-squircle" style={{ background: 'var(--ios-orange-light)', color: 'var(--ios-orange)' }}>
                  <User size={18} />
                </div>
                <div className="detail-row-content">
                  <div className="detail-row-label">Instructor Profile</div>
                  <div className="detail-row-value" style={{ color: course.instructor ? 'var(--ios-blue)' : 'var(--ios-text-primary)' }}>
                    {cleanInstructor}
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

            {/* Jump to Timetable Action Button */}
            {onViewInTimetable && course.days.length > 0 && (
              <button 
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  onViewInTimetable(course.days[0]);
                }}
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  borderRadius: 14,
                  border: 'none',
                  background: themeColor,
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: `0 4px 16px -2px ${themeColor}66`
                }}
              >
                <CalendarDays size={17} />
                <span>View in Timetable Schedule</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* ================= 📱 AUTHENTIC FLOATING BOTTOM DOCK NAVBAR ================= */}
      <div className="ios-tab-bar-container" style={{ zIndex: 250 }}>
        <nav className="ios-tab-bar-dock" aria-label="Course Hub Navigation">
          {/* Deadlines Tab */}
          <button
            className={`ios-tab-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setActiveTab('tasks');
            }}
            type="button"
            aria-selected={activeTab === 'tasks'}
            style={{
              color: activeTab === 'tasks' ? themeColor : undefined
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={19} />
              {pendingTasksCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    background: activeTab === 'tasks' ? themeColor : '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '1px 4.5px',
                    borderRadius: 999,
                    border: '1.5px solid var(--ios-card-bg)',
                    lineHeight: 1
                  }}
                >
                  {pendingTasksCount}
                </span>
              )}
            </div>
            <span>Deadlines</span>
          </button>

          {/* Syllabus Tab */}
          <button
            className={`ios-tab-item ${activeTab === 'syllabus' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setActiveTab('syllabus');
            }}
            type="button"
            aria-selected={activeTab === 'syllabus'}
            style={{
              color: activeTab === 'syllabus' ? themeColor : undefined
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={19} />
              {remainingTotalTopics > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    background: activeTab === 'syllabus' ? themeColor : 'var(--ios-blue)',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '1px 4.5px',
                    borderRadius: 999,
                    border: '1.5px solid var(--ios-card-bg)',
                    lineHeight: 1
                  }}
                >
                  {remainingTotalTopics}
                </span>
              )}
            </div>
            <span>Syllabus</span>
          </button>

          {/* Notes Tab */}
          <button
            className={`ios-tab-item ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setActiveTab('notes');
            }}
            type="button"
            aria-selected={activeTab === 'notes'}
            style={{
              color: activeTab === 'notes' ? themeColor : undefined
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={19} />
              {linkedNotes.length > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    background: activeTab === 'notes' ? themeColor : 'var(--ios-text-muted)',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '1px 4.5px',
                    borderRadius: 999,
                    border: '1.5px solid var(--ios-card-bg)',
                    lineHeight: 1
                  }}
                >
                  {linkedNotes.length}
                </span>
              )}
            </div>
            <span>Notes</span>
          </button>

          {/* Schedule Tab */}
          <button
            className={`ios-tab-item ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setActiveTab('info');
            }}
            type="button"
            aria-selected={activeTab === 'info'}
            style={{
              color: activeTab === 'info' ? themeColor : undefined
            }}
          >
            <Calendar size={19} />
            <span>Schedule</span>
          </button>
        </nav>
      </div>

      {/* Edit Subject Modal */}
      <EditSubjectModal 
        course={course}
        isOpen={isEditingCourse}
        onClose={() => setIsEditingCourse(false)}
        onSave={(updated) => {
          onUpdateCourse(updated);
          setIsEditingCourse(false);
        }}
        onDelete={(id) => {
          onDeleteCourse(id);
          setIsEditingCourse(false);
          onBack();
        }}
      />

      {/* Add / Edit Task Modal */}
      <AddEventModal 
        isOpen={isAddingTask}
        onClose={() => {
          setIsAddingTask(false);
          setEditingTask(null);
        }}
        onSaveEvent={(evt) => {
          onSaveEvent(evt);
          setIsAddingTask(false);
          setEditingTask(null);
        }}
        onDeleteEvent={(id) => {
          onDeleteEvent(id);
          setIsAddingTask(false);
          setEditingTask(null);
        }}
        initialEvent={editingTask}
        courses={allCourses}
        preselectedSubjectId={course.id}
      />

      {/* Course Resource Link Modal */}
      <CourseLinksModal
        isOpen={isAddingLink}
        courseId={course.id}
        courseCode={course.courseCode}
        linkToEdit={editingLink}
        onClose={() => {
          setIsAddingLink(false);
          setEditingLink(null);
        }}
        onSaveLink={(link) => {
          if (onSaveLink) onSaveLink(link);
          setIsAddingLink(false);
          setEditingLink(null);
        }}
        onDeleteLink={(linkId) => {
          if (onDeleteLink) onDeleteLink(linkId);
          setIsAddingLink(false);
          setEditingLink(null);
        }}
      />

      {/* Course Syllabus Topic Modal */}
      <CourseTopicModal
        isOpen={isAddingTopic}
        courseId={course.id}
        courseCode={course.courseCode}
        defaultTerm={syllabusTerm === 'all' ? 'prelim' : syllabusTerm}
        topicToEdit={editingTopic}
        onClose={() => {
          setIsAddingTopic(false);
          setEditingTopic(null);
        }}
        onSaveTopic={(topic) => {
          if (onSaveTopic) onSaveTopic(topic);
          setIsAddingTopic(false);
          setEditingTopic(null);
        }}
        onDeleteTopic={(topicId) => {
          if (onDeleteTopic) onDeleteTopic(topicId);
          setIsAddingTopic(false);
          setEditingTopic(null);
        }}
      />

      {/* Full Screen Study Reader Modal */}
      {readingNote && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setReadingNote(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: 680,
              height: '92vh',
              maxHeight: '92vh',
              background: 'var(--ios-card-bg)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid var(--ios-card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4.5, borderRadius: 3, background: 'var(--ios-text-muted)', opacity: 0.4 }} />
            </div>

            {/* Reader Header */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid var(--ios-card-border)',
                background: 'var(--ios-card-bg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 12 }}>
                <span 
                  style={{
                    padding: '3px 9px',
                    borderRadius: 8,
                    background: `${themeColor}20`,
                    color: themeColor,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.3
                  }}
                >
                  {course.courseCode}
                </span>

                <h2 
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--ios-text-primary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {readingNote.title || 'Untitled Note'}
                </h2>
              </div>

              {/* Reader Action Icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Pin toggle */}
                {onTogglePinNote && (
                  <button
                    onClick={() => {
                      triggerSelectionHaptic();
                      onTogglePinNote(readingNote.id);
                      setReadingNote(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid var(--ios-card-border)',
                      background: readingNote.isPinned ? 'rgba(245, 158, 11, 0.15)' : 'var(--ios-bg-secondary)',
                      color: readingNote.isPinned ? '#D97706' : 'var(--ios-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={readingNote.isPinned ? 'Unpin Note' : 'Pin Note'}
                  >
                    <Pin size={15} fill={readingNote.isPinned ? '#D97706' : 'none'} />
                  </button>
                )}

                {/* Copy Text */}
                <button
                  onClick={() => {
                    triggerSuccessHaptic();
                    navigator.clipboard.writeText(`${readingNote.title}\n\n${readingNote.content}`);
                    showSystemToast('Note copied to clipboard!', 'success');
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--ios-card-border)',
                    background: 'var(--ios-bg-secondary)',
                    color: 'var(--ios-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Copy Full Note Text"
                >
                  <Copy size={15} />
                </button>

                {/* Quick Edit */}
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    const noteToEdit = readingNote;
                    setReadingNote(null);
                    setActiveTab('notes');
                    handleStartEditNote(noteToEdit);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--ios-card-border)',
                    background: 'var(--ios-bg-secondary)',
                    color: 'var(--ios-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Edit Note"
                >
                  <Edit3 size={15} />
                </button>

                {/* Close */}
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setReadingNote(null);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--ios-bg-secondary)',
                    color: 'var(--ios-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close Reader"
                >
                  <X size={17} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Reading Stats Sub-bar */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 20px',
                background: 'var(--ios-bg-secondary)',
                borderBottom: '1px solid var(--ios-card-border)',
                fontSize: 11.5,
                color: 'var(--ios-text-muted)',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>{getNoteStats(readingNote.content).readTimeMinutes} min read</span>
              </div>
              <span>•</span>
              <div>
                <span>{getNoteStats(readingNote.content).wordCount} words</span>
              </div>
              <span>•</span>
              <div>
                <span>Last updated {new Date(readingNote.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Scrollable Reader Content */}
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 22px 60px 22px',
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--ios-text-primary)',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--ios-text-primary)', marginBottom: 16, marginTop: 0 }}>
                {readingNote.title || 'Untitled Note'}
              </h1>

              <div style={{ fontSize: 14.5 }}>
                {renderFormattedNoteContent(readingNote.content)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable In-App Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Cancel"
        isDestructive={true}
        icon="trash"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default SubjectDetailScreen;
