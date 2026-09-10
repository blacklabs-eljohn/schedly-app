import React, { useState, useRef, useEffect } from 'react';
import { Course, CustomEvent, SubjectNote, ScheduleConflict, DayOfWeek, CourseLink, CourseTopic, AcademicTerm, AppStoredFile } from '../types';
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
  RotateCcw,
  Mail,
  X,
  FolderOpen,
  Folder,
  UploadCloud,
  Presentation,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Eye,
  Search,
  HardDrive
} from 'lucide-react';
import { showSystemToast } from '../services/notificationService';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { 
  saveLocalFile, 
  getFilesByCourse, 
  deleteStoredFile, 
  renameStoredFile, 
  downloadStoredFile, 
  getFileBlob, 
  formatFileSize, 
  getFileCategory, 
  FileCategory 
} from '../services/localFileStorageService';
import { EditSubjectModal } from './EditSubjectModal';
import { AddEventModal } from './AddEventModal';
import { CourseLinksModal } from './CourseLinksModal';
import { CourseTopicModal } from './CourseTopicModal';
import { ConfirmationModal } from './ConfirmationModal';

interface SubjectDetailScreenProps {
  course: Course;
  allCourses: Course[];
  events: CustomEvent[];
  notes?: SubjectNote[];
  conflicts?: ScheduleConflict[];
  links?: CourseLink[];
  topics?: CourseTopic[];
  theme?: 'light' | 'dark';
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

type TabSegment = 'tasks' | 'syllabus' | 'notes' | 'files' | 'info';
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
  notes = [],
  conflicts = [],
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

  // Highlighter Color Palette
  const HIGHLIGHT_COLORS = [
    { id: 'yellow', label: 'Yellow', bg: 'rgba(245, 158, 11, 0.35)', border: '#F59E0B', text: '#B45309', dot: '#FBBF24' },
    { id: 'green', label: 'Mint', bg: 'rgba(34, 197, 94, 0.32)', border: '#22C55E', text: '#15803D', dot: '#4ADE80' },
    { id: 'blue', label: 'Blue', bg: 'rgba(59, 130, 246, 0.30)', border: '#3B82F6', text: '#1D4ED8', dot: '#60A5FA' },
    { id: 'purple', label: 'Lavender', bg: 'rgba(168, 85, 247, 0.30)', border: '#A855F7', text: '#7E22CE', dot: '#C084FC' },
    { id: 'pink', label: 'Rose', bg: 'rgba(244, 63, 94, 0.30)', border: '#F43F5E', text: '#BE123C', dot: '#FB7185' },
    { id: 'orange', label: 'Peach', bg: 'rgba(249, 115, 22, 0.32)', border: '#F97316', text: '#C2410C', dot: '#FB923C' }
  ];

  // New Note Modal & WYSIWYG Editor State
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('yellow');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [readingNote, setReadingNote] = useState<SubjectNote | null>(null);
  const noteEditorRef = useRef<HTMLDivElement | null>(null);

  // ================= 📂 COURSE LOCAL OFFLINE FILES STATE =================
  const [courseFiles, setCourseFiles] = useState<AppStoredFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [activeFileCategory, setActiveFileCategory] = useState<FileCategory | 'all'>('all');
  const courseFileInputRef = useRef<HTMLInputElement>(null);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<AppStoredFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Rename File Modal State
  const [renameFileTarget, setRenameFileTarget] = useState<AppStoredFile | null>(null);
  const [renameFileName, setRenameFileName] = useState('');

  const loadCourseFiles = async () => {
    try {
      const files = await getFilesByCourse(course.id);
      setCourseFiles(files);
    } catch (err) {
      console.error('Failed to load course files:', err);
    }
  };

  useEffect(() => {
    loadCourseFiles();
  }, [course.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    setIsUploadingFile(true);
    triggerLightHaptic();
    try {
      for (let i = 0; i < uploaded.length; i++) {
        await saveLocalFile(uploaded[i], uploaded[i].name, { courseId: course.id });
      }
      await loadCourseFiles();
      showSystemToast('Files saved locally for offline access', 'update');
    } catch (err) {
      console.error('Error saving file:', err);
      showSystemToast('Could not save file locally', 'alert');
    } finally {
      setIsUploadingFile(false);
      if (courseFileInputRef.current) courseFileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (file: AppStoredFile) => {
    if (!window.confirm(`Delete "${file.name}" from offline storage?`)) return;
    triggerLightHaptic();
    await deleteStoredFile(file.id);
    await loadCourseFiles();
    if (previewFile?.id === file.id) {
      handleCloseFilePreview();
    }
    showSystemToast('File deleted', 'info');
  };

  const handleRenameFile = async () => {
    if (!renameFileTarget || !renameFileName.trim()) return;
    triggerLightHaptic();
    await renameStoredFile(renameFileTarget.id, renameFileName.trim());
    setRenameFileTarget(null);
    setRenameFileName('');
    await loadCourseFiles();
    showSystemToast('File renamed', 'update');
  };

  const handleOpenFilePreview = async (file: AppStoredFile) => {
    triggerSelectionHaptic();
    setPreviewFile(file);
    const blob = await getFileBlob(file.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  };

  const handleCloseFilePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Helper to format and get badge for a file
  const getCourseFileBadge = (file: AppStoredFile) => {
    const category = getFileCategory(file.extension);
    switch (category) {
      case 'slides':
        return {
          icon: <Presentation size={20} color="#EA580C" />,
          bg: '#FFF7ED',
          border: '#FED7AA',
          label: 'PPT / Slides',
          color: '#EA580C'
        };
      case 'pdf':
        return {
          icon: <FileText size={20} color="#DC2626" />,
          bg: '#FEF2F2',
          border: '#FECACA',
          label: 'PDF Document',
          color: '#DC2626'
        };
      case 'docs':
        return {
          icon: <FileText size={20} color="#2563EB" />,
          bg: '#EFF6FF',
          border: '#BFDBFE',
          label: 'Word / Text',
          color: '#2563EB'
        };
      case 'sheets':
        return {
          icon: <FileSpreadsheet size={20} color="#059669" />,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          label: 'Spreadsheet',
          color: '#059669'
        };
      case 'image':
        return {
          icon: <ImageIcon size={20} color="#7C3AED" />,
          bg: '#F5F3FF',
          border: '#DDD6FE',
          label: 'Image',
          color: '#7C3AED'
        };
      default:
        return {
          icon: <FileText size={20} color="#64748B" />,
          bg: '#F8FAFC',
          border: '#E2E8F0',
          label: file.extension ? file.extension.toUpperCase() : 'File',
          color: '#64748B'
        };
    }
  };

  // Sync contentEditable when modal opens
  useEffect(() => {
    if (isCreatingNote && noteEditorRef.current) {
      noteEditorRef.current.innerHTML = noteContent || '';
      setTimeout(() => {
        if (noteEditorRef.current) {
          noteEditorRef.current.focus();
        }
      }, 120);
    }
  }, [isCreatingNote]);

  // Sync contentEditable back to state
  const syncEditorContent = () => {
    if (noteEditorRef.current) {
      setNoteContent(noteEditorRef.current.innerHTML);
    }
  };

  // Convert legacy markdown symbols (==highlight==, **bold**, *italic*, ### headings, lists) to clean visual HTML
  const convertLegacyMarkdownOrTextToHtml = (raw: string): string => {
    if (!raw) return '';
    let text = raw;

    // Convert legacy ==highlight== to <mark>
    text = text.replace(/==([\s\S]+?)==/g, '<mark style="background: rgba(245, 158, 11, 0.35); color: inherit; padding: 1px 5px; border-radius: 4px; font-weight: 700;">$1</mark>');

    // Convert legacy **bold** to <strong>
    text = text.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');

    // Convert legacy *italic* to <em>
    text = text.replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    // Convert legacy `code` to <code>
    text = text.replace(/`([^`]+?)`/g, '<code style="background: var(--ios-bg-secondary); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>');

    // If text already has HTML tags (<p>, <div>, <mark>, <strong>, <em>, <h3>, <ul>, <li>, <br>), return cleaned text
    if (/<(p|div|mark|strong|b|em|i|h1|h2|h3|ul|ol|li|br)[\s>]/i.test(text)) {
      return text;
    }

    // Otherwise split lines for paragraphs, headings and lists
    const lines = text.split('\n');
    const htmlLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<p><br></p>';
      if (trimmed.startsWith('### ')) return `<h3 style="font-size: 15px; font-weight: 800; margin: 8px 0 4px 0;">${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith('## ')) return `<h2 style="font-size: 16.5px; font-weight: 800; margin: 10px 0 4px 0;">${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith('# ')) return `<h1 style="font-size: 18px; font-weight: 800; margin: 12px 0 6px 0;">${trimmed.slice(2)}</h1>`;
      if (/^[-*]\s/.test(trimmed)) return `<li style="margin-left: 18px; margin-bottom: 3px;">${trimmed.replace(/^[-*]\s/, '')}</li>`;
      if (/^\d+\.\s/.test(trimmed)) return `<li style="margin-left: 18px; margin-bottom: 3px;">${trimmed.replace(/^\d+\.\s/, '')}</li>`;
      return `<p style="margin: 4px 0;">${trimmed}</p>`;
    });

    return htmlLines.join('');
  };

  // Helper for reading stats
  const getNoteStats = (content: string) => {
    if (!content) return { wordCount: 0, readTimeMinutes: 1 };
    const plain = content.replace(/<[^>]*>/g, ' ').replace(/[*#=_`~]/g, ' ').trim();
    const words = plain.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));
    return { wordCount, readTimeMinutes };
  };

  // WYSIWYG Formatting Handlers
  const handleApplyHighlight = (colorId?: string) => {
    triggerLightHaptic();
    const activeColorId = colorId || selectedHighlightColor;
    if (colorId && colorId !== selectedHighlightColor) {
      setSelectedHighlightColor(colorId);
    }
    const colorObj = HIGHLIGHT_COLORS.find(c => c.id === activeColorId) || HIGHLIGHT_COLORS[0];

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      showSystemToast(`Selected ${colorObj.label} highlighter. Highlight text to apply.`, 'info');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // Toggle highlight if already inside a mark
    const parentMark = selection.anchorNode?.parentElement?.closest('mark');
    if (parentMark) {
      const currentMarkColor = parentMark.getAttribute('data-highlight-color') || 'yellow';
      if (currentMarkColor === activeColorId) {
        // Toggle off
        const parent = parentMark.parentNode;
        while (parentMark.firstChild) {
          parent?.insertBefore(parentMark.firstChild, parentMark);
        }
        parent?.removeChild(parentMark);
        syncEditorContent();
        return;
      } else {
        // Switch color of existing mark
        parentMark.setAttribute('data-highlight-color', activeColorId);
        parentMark.style.background = colorObj.bg;
        syncEditorContent();
        return;
      }
    }

    const mark = document.createElement('mark');
    mark.setAttribute('data-highlight-color', activeColorId);
    mark.style.background = colorObj.bg;
    mark.style.color = 'inherit';
    mark.style.padding = '1px 5px';
    mark.style.borderRadius = '4px';
    mark.style.fontWeight = '700';

    try {
      range.surroundContents(mark);
    } catch (e) {
      document.execCommand('hiliteColor', false, colorObj.dot);
    }

    syncEditorContent();
  };

  const handleApplyBold = () => {
    triggerLightHaptic();
    document.execCommand('bold', false);
    syncEditorContent();
  };

  const handleApplyItalic = () => {
    triggerLightHaptic();
    document.execCommand('italic', false);
    syncEditorContent();
  };

  const handleApplyHeading = () => {
    triggerLightHaptic();
    document.execCommand('formatBlock', false, '<h3>');
    syncEditorContent();
  };

  const handleApplyBulletList = () => {
    triggerLightHaptic();
    document.execCommand('insertUnorderedList', false);
    syncEditorContent();
  };

  const handleApplyNumberedList = () => {
    triggerLightHaptic();
    document.execCommand('insertOrderedList', false);
    syncEditorContent();
  };

  const handleClearFormatting = () => {
    triggerLightHaptic();
    document.execCommand('removeFormat', false);
    syncEditorContent();
  };

  // Render clean formatted note content for cards & reader modal without showing raw markdown symbols
  const renderFormattedNoteContent = (content: string) => {
    if (!content) return null;
    const cleanHtml = convertLegacyMarkdownOrTextToHtml(content);

    return (
      <div 
        className="study-note-rendered"
        style={{ 
          lineHeight: 1.6, 
          wordBreak: 'break-word',
          fontSize: 'inherit'
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
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
  const linkedEvents = events.filter(e => 
    e.subjectId === course.id || 
    (Boolean(e.subjectCode && course.courseCode) && (e.subjectCode || '').trim().toUpperCase() === (course.courseCode || '').trim().toUpperCase())
  );
  const linkedNotes = notes.filter(n => 
    n.subjectId === course.id || 
    (Boolean(course.courseCode) && n.subjectId === course.courseCode)
  );
  
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

  const handleSaveNoteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentHtml = noteEditorRef.current?.innerHTML || noteContent || '';
    const strippedText = currentHtml.replace(/<[^>]*>/g, '').trim();

    if (!noteTitle.trim() && !strippedText) {
      showSystemToast('Please enter a note title or write some notes.', 'info');
      return;
    }

    triggerSuccessHaptic();
    const now = new Date().toISOString();
    
    if (editingNoteId) {
      const existing = linkedNotes.find(n => n.id === editingNoteId);
      onSaveNote({
        id: editingNoteId,
        subjectId: course.id,
        title: noteTitle.trim() || 'Untitled Note',
        content: currentHtml.trim(),
        isPinned: existing?.isPinned || false,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      });
      showSystemToast('Note Updated', 'Course study note saved.');
    } else {
      const newNote: SubjectNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subjectId: course.id,
        title: noteTitle.trim() || 'Untitled Note',
        content: currentHtml.trim(),
        isPinned: false,
        createdAt: now,
        updatedAt: now
      };
      onSaveNote(newNote);
      showSystemToast('Note Added', 'New course study note created.');
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
    const cleanHtml = convertLegacyMarkdownOrTextToHtml(note.content);
    setNoteContent(cleanHtml);
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

      <div className="subject-detail-content-wrap">
        <div className="subject-desktop-split">
          
          {/* Right Sidebar on Desktop / Top Section on Mobile */}
          <div className="subject-desktop-sidebar">
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

            {/* ================= 📱 MOBILE: PREVIOUS CLASS LINKS STYLE ================= */}
            <div className="subject-mobile-links" style={{ marginTop: 14, marginBottom: 6 }}>
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
                    padding: '11px 14px',
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
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                        Add Drive, GC, or Canvas
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ios-text-muted)' }}>
                        1-tap access to lecture slides & rooms
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: `${themeColor}18`,
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
                          <span style={{ fontSize: 15 }}>{meta.icon}</span>
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
                              fontSize: 9, 
                              fontWeight: 700, 
                              color: meta.color, 
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em'
                            }}>
                              {meta.label}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Direct Launch & Edit */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 3,
                              color: 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Open Link in Browser"
                          >
                            <ExternalLink size={12} />
                          </button>

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
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Edit Link"
                          >
                            <Edit3 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================= 🖥️ DESKTOP & TABLET: CLASS LINKS & RESOURCE HUB CARD ================= */}
            <div 
              className="subject-desktop-links-card"
              style={{
                background: 'var(--ios-card-bg)',
                borderRadius: 20,
                padding: '16px 18px',
                border: '1px solid var(--ios-card-border)',
                boxShadow: 'var(--ios-shadow-sm)',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

              {/* Links list */}
              {linkedCourseLinks.length === 0 ? (
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
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'var(--ios-bg-secondary)',
                    border: '1px dashed var(--ios-card-border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                        Add Drive, GC, or Canvas
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ios-text-muted)' }}>
                        1-tap access to lecture slides & rooms
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: `${themeColor}18`,
                    color: themeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Plus size={14} strokeWidth={2.5} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {linkedCourseLinks.map(link => {
                    const meta = getLinkMeta(link.type);
                    return (
                      <div
                        key={link.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--ios-bg-secondary)',
                          border: '1px solid var(--ios-card-border)',
                          borderRadius: 12,
                          padding: '9px 12px',
                          gap: 8,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div
                          onClick={() => {
                            triggerLightHaptic();
                            window.open(link.url, '_blank', 'noopener,noreferrer');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            cursor: 'pointer',
                            minWidth: 0,
                            flex: 1
                          }}
                          title={`Open ${link.url}`}
                        >
                          <span style={{ fontSize: 17 }}>{meta.icon}</span>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ 
                              fontSize: 12.5, 
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
                              fontWeight: 700, 
                              color: meta.color, 
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em'
                            }}>
                              {meta.label}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 4,
                              color: 'var(--ios-text-muted)',
                              cursor: 'pointer',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Open Link"
                          >
                            <ExternalLink size={13} />
                          </button>

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
                              padding: 4,
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================= 👨‍🏫 DESKTOP & TABLET: INSTRUCTOR & CONSULTATION HUB CARD ================= */}
            <div 
              className="subject-faculty-card"
              style={{
                background: 'var(--ios-card-bg)',
                borderRadius: 20,
                padding: '16px 18px',
                border: '1px solid var(--ios-card-border)',
                boxShadow: 'var(--ios-shadow-sm)',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ios-text-secondary)' }}>
                  Faculty & Consultation
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ios-green)', background: 'var(--ios-green-light)', padding: '2px 7px', borderRadius: 6 }}>
                  Active Semester
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: `${themeColor}18`,
                    color: themeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                    border: `1.5px solid ${themeColor}35`
                  }}
                >
                  {course.instructor ? course.instructor.charAt(0).toUpperCase() : <User size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cleanInstructor}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 2 }}>
                    {course.room ? `Room ${course.room}` : 'Academic Faculty'} • {daysInfo.full}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4, borderTop: '1px solid var(--ios-divider)' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    if (course.instructor) {
                      const emailPrefix = course.instructor.toLowerCase().replace(/[^a-z0-9]/g, '');
                      window.location.href = `mailto:${emailPrefix}@nemsu.edu.ph?subject=[${course.courseCode}] Consultation Inquiry`;
                    } else {
                      showSystemToast('Faculty Contact', 'No instructor assigned for this course');
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: 'var(--ios-bg-secondary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-primary)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Mail size={13} style={{ color: themeColor }} />
                  <span>Send Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    if (course.instructor) {
                      onSelectInstructor(course.instructor);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: 'var(--ios-bg-secondary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-primary)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={13} style={{ color: themeColor }} />
                  <span>Faculty Info</span>
                </button>
              </div>
            </div>
          </div>

          {/* Left / Main Stream on Desktop */}
          <div className="subject-desktop-main">
            {/* Desktop Segmented Tab Switcher (Visible on Desktop / Tablet) */}
            <div className="subject-desktop-tab-switcher">
              <button
                type="button"
                className={`subject-desktop-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => {
                  triggerSelectionHaptic();
                  setActiveTab('tasks');
                }}
                style={{
                  color: activeTab === 'tasks' ? '#FFFFFF' : undefined,
                  background: activeTab === 'tasks' ? themeColor : undefined,
                  boxShadow: activeTab === 'tasks' ? `0 2px 8px ${themeColor}40` : undefined
                }}
              >
                <CheckCircle2 size={15} />
                <span>Deadlines ({pendingTasksCount})</span>
              </button>

              <button
                type="button"
                className={`subject-desktop-tab-btn ${activeTab === 'syllabus' ? 'active' : ''}`}
                onClick={() => {
                  triggerSelectionHaptic();
                  setActiveTab('syllabus');
                }}
                style={{
                  color: activeTab === 'syllabus' ? '#FFFFFF' : undefined,
                  background: activeTab === 'syllabus' ? themeColor : undefined,
                  boxShadow: activeTab === 'syllabus' ? `0 2px 8px ${themeColor}40` : undefined
                }}
              >
                <BookOpen size={15} />
                <span>Syllabus ({remainingTotalTopics})</span>
              </button>

              <button
                type="button"
                className={`subject-desktop-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => {
                  triggerSelectionHaptic();
                  setActiveTab('notes');
                }}
                style={{
                  color: activeTab === 'notes' ? '#FFFFFF' : undefined,
                  background: activeTab === 'notes' ? themeColor : undefined,
                  boxShadow: activeTab === 'notes' ? `0 2px 8px ${themeColor}40` : undefined
                }}
              >
                <FileText size={15} />
                <span>Notes ({linkedNotes.length})</span>
              </button>

              <button
                type="button"
                className={`subject-desktop-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => {
                  triggerSelectionHaptic();
                  setActiveTab('files');
                }}
                style={{
                  color: activeTab === 'files' ? '#FFFFFF' : undefined,
                  background: activeTab === 'files' ? themeColor : undefined,
                  boxShadow: activeTab === 'files' ? `0 2px 8px ${themeColor}40` : undefined
                }}
              >
                <FolderOpen size={15} />
                <span>Files ({courseFiles.length})</span>
              </button>
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

        {/* ================= TAB 3: NOTES PINBOARD ================= */}
        {activeTab === 'notes' && (
          <div className="pinboard-canvas-container">
            {/* Top Bar for Pinboard */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pinboard-badge-tag">
                  📌 PINBOARD
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                  {linkedNotes.length} {linkedNotes.length === 1 ? 'Sticky Note' : 'Sticky Notes'}
                </span>
              </div>

              <button
                onClick={() => {
                  triggerLightHaptic();
                  setEditingNoteId(null);
                  setNoteTitle('');
                  setNoteContent('');
                  setIsCreatingNote(true);
                }}
                style={{
                  padding: '7px 16px',
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
                <span>New Sticky Note</span>
              </button>
            </div>

            {/* Sticky Notes Canvas */}
            {sortedNotes.length === 0 ? (
              <div className="pinboard-empty-state">
                <div 
                  style={{ 
                    width: 54, 
                    height: 54, 
                    borderRadius: 18, 
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
                  No sticky notes pinned yet
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginBottom: 18, lineHeight: 1.45, maxWidth: 320, margin: '0 auto 18px auto' }}>
                  Pin lecture key takeaways, formula cheats, announcements, and study pointers to this corkboard.
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
                  <Plus size={16} /> Pin First Note
                </button>
              </div>
            ) : (
              <div className="sticky-notes-board-grid">
                {sortedNotes.map((note, idx) => {
                  const stats = getNoteStats(note.content);
                  const colorPresets = [
                    { id: 'yellow', bg: '#FEF9C3', border: '#FDE047', text: '#713F12', pin: '#EF4444', darkBg: '#342E16', darkBorder: '#695719', darkText: '#FEF08A' },
                    { id: 'mint', bg: '#DCFCE7', border: '#86EFAC', text: '#14532D', pin: '#10B981', darkBg: '#193021', darkBorder: '#27603B', darkText: '#BBF7D0' },
                    { id: 'peach', bg: '#FFEDD5', border: '#FDBA74', text: '#7C2D12', pin: '#F97316', darkBg: '#342014', darkBorder: '#6D3820', darkText: '#FED7AA' },
                    { id: 'sky', bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E', pin: '#0284C7', darkBg: '#162838', darkBorder: '#1F5374', darkText: '#BAE6FD' },
                    { id: 'lavender', bg: '#F3E8FF', border: '#D8B4FE', text: '#581C87', pin: '#A855F7', darkBg: '#271838', darkBorder: '#513172', darkText: '#E9D5FF' },
                    { id: 'rose', bg: '#FFE4E6', border: '#FDA4AF', text: '#881337', pin: '#F43F5E', darkBg: '#32161F', darkBorder: '#682337', darkText: '#FECDD3' }
                  ];
                  const c = colorPresets[idx % colorPresets.length];
                  const rotationDeg = note.isPinned ? 0 : ((idx % 5) - 2) * 1.3;

                  return (
                    <div
                      key={note.id}
                      className={`sticky-note-card ${note.isPinned ? 'is-pinned-sticky' : ''}`}
                      style={{
                        '--sticky-bg': c.bg,
                        '--sticky-border': c.border,
                        '--sticky-text': c.text,
                        '--sticky-dark-bg': c.darkBg,
                        '--sticky-dark-border': c.darkBorder,
                        '--sticky-dark-text': c.darkText,
                        '--sticky-rot': `${rotationDeg}deg`
                      } as React.CSSProperties}
                    >
                      {/* Realistic 3D Pushpin */}
                      <div className="sticky-pushpin-wrap">
                        <div 
                          className="sticky-pushpin-pin" 
                          style={{ background: note.isPinned ? '#F59E0B' : c.pin }}
                        >
                          <div className="sticky-pushpin-shine" />
                        </div>
                        <div className="sticky-pushpin-shadow" />
                      </div>

                      {/* Sticky Note Content */}
                      <div className="sticky-note-content-box">
                        {/* Header */}
                        <div className="sticky-note-top-row">
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                            {note.isPinned && (
                              <span className="sticky-pin-pill">
                                <Pin size={9} fill="#D97706" /> PINNED
                              </span>
                            )}
                            <h3 className="sticky-note-heading" title={note.title || 'Untitled Note'}>
                              {note.title || 'Untitled Note'}
                            </h3>
                          </div>

                          {/* Quick Action Icons */}
                          <div className="sticky-note-actions">
                            <button
                              type="button"
                              onClick={() => {
                                triggerSelectionHaptic();
                                setReadingNote(note);
                              }}
                              className="sticky-mini-btn"
                              title="Read full note"
                            >
                              <Maximize2 size={11.5} strokeWidth={2.5} />
                            </button>

                            {onTogglePinNote && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerSelectionHaptic();
                                  onTogglePinNote(note.id);
                                }}
                                className={`sticky-mini-btn ${note.isPinned ? 'active-pin' : ''}`}
                                title={note.isPinned ? 'Unpin' : 'Pin to top'}
                              >
                                <Pin size={11.5} fill={note.isPinned ? '#F59E0B' : 'none'} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEditNote(note)}
                              className="sticky-mini-btn"
                              title="Edit note"
                            >
                              <Edit3 size={11.5} />
                            </button>

                            <button
                              type="button"
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
                              className="sticky-mini-btn delete-btn"
                              title="Delete note"
                            >
                              <Trash2 size={11.5} />
                            </button>
                          </div>
                        </div>

                        {/* Note Excerpt / Content */}
                        <div 
                          className="sticky-note-body-preview"
                          onClick={() => {
                            triggerSelectionHaptic();
                            setReadingNote(note);
                          }}
                        >
                          {note.content ? (
                            <p>{note.content}</p>
                          ) : (
                            <p className="sticky-empty-text">Empty note snippet...</p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="sticky-note-bottom-bar">
                          <span>{new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span>{stats.wordCount}w</span>
                          <span>•</span>
                          <span>{stats.readTimeMinutes}m read</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: COURSE OFFLINE FILES & DOCUMENTS ================= */}
        {(activeTab === 'files' || activeTab === 'info') && (
          <div>
            {/* Top Toolbar: Upload Button + Search + Category Pills */}
            <div 
              style={{ 
                padding: '16px 20px', 
                borderRadius: 16, 
                background: 'var(--ios-card-bg)', 
                border: '1px solid var(--ios-card-border)',
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div 
                    style={{ 
                      width: 38, 
                      height: 38, 
                      borderRadius: 10, 
                      background: `${themeColor}15`, 
                      color: themeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ios-text-primary)' }}>
                      Course Study Materials & Files
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
                      {courseFiles.length} {courseFiles.length === 1 ? 'file' : 'files'} • {formatFileSize(courseFiles.reduce((acc, f) => acc + (f.size || 0), 0))} (Saved 100% Offline)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    courseFileInputRef.current?.click();
                  }}
                  disabled={isUploadingFile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    borderRadius: 12,
                    background: themeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                    boxShadow: `0 3px 12px ${themeColor}40`,
                    transition: 'all 0.15s ease',
                    opacity: isUploadingFile ? 0.7 : 1
                  }}
                >
                  <UploadCloud size={16} />
                  <span>{isUploadingFile ? 'Saving Offline...' : 'Upload Slides / Docs'}</span>
                </button>
              </div>

              {/* Search & Filter Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search files in this subject..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: 10,
                      border: '1px solid var(--ios-card-border)',
                      background: 'var(--ios-bg-primary)',
                      color: 'var(--ios-text-primary)',
                      fontSize: 12.5,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setFileSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ios-text-muted)',
                        cursor: 'pointer',
                        padding: 2
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'slides', label: 'Slides (PPT)' },
                    { key: 'docs', label: 'Docs' },
                    { key: 'pdf', label: 'PDFs' },
                    { key: 'sheets', label: 'Sheets' },
                    { key: 'image', label: 'Images' }
                  ].map(cat => {
                    const isSel = activeFileCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          triggerSelectionHaptic();
                          setActiveFileCategory(cat.key as any);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          background: isSel ? themeColor : 'var(--ios-bg-primary)',
                          color: isSel ? '#FFFFFF' : 'var(--ios-text-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Files Grid or Empty State */}
            {(() => {
              let list = courseFiles;
              if (fileSearchQuery.trim()) {
                const q = fileSearchQuery.toLowerCase().trim();
                list = list.filter(f => f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
              }
              if (activeFileCategory !== 'all') {
                list = list.filter(f => getFileCategory(f.extension) === activeFileCategory);
              }

              if (list.length === 0) {
                return (
                  <div 
                    style={{ 
                      padding: '40px 20px', 
                      borderRadius: 16, 
                      background: 'var(--ios-card-bg)', 
                      border: '1px dashed var(--ios-card-border)', 
                      textAlign: 'center',
                      marginBottom: 20
                    }}
                  >
                    <UploadCloud size={32} color="var(--ios-text-muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ios-text-primary)', marginBottom: 4 }}>
                      {fileSearchQuery ? 'No matching files' : 'No materials uploaded yet'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginBottom: 14 }}>
                      Upload lecture slides (.pptx), reviewer PDFs, or document handouts for this course.
                    </div>
                    <button
                      type="button"
                      onClick={() => courseFileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 10,
                        background: themeColor,
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <UploadCloud size={15} />
                      <span>Upload Material</span>
                    </button>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {list.map(f => {
                    const badge = getCourseFileBadge(f);
                    const formattedDate = new Date(f.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <div
                        key={f.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 14,
                          background: 'var(--ios-card-bg)',
                          border: '1px solid var(--ios-card-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 10,
                          position: 'relative'
                        }}
                        className="hover-card-elevation"
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div 
                            style={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: 10, 
                              background: badge.bg, 
                              border: `1px solid ${badge.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {badge.icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div 
                              style={{ 
                                fontSize: 13.5, 
                                fontWeight: 700, 
                                color: 'var(--ios-text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={f.name}
                            >
                              {f.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>
                                {f.extension ? f.extension.toUpperCase() : 'FILE'}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--ios-text-muted)' }}>•</span>
                              <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                                {formatFileSize(f.size)}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--ios-text-muted)' }}>•</span>
                              <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ios-card-border)', paddingTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenFilePreview(f)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: 'var(--ios-bg-primary)',
                                border: '1px solid var(--ios-card-border)',
                                color: 'var(--ios-text-secondary)',
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                triggerLightHaptic();
                                downloadStoredFile(f);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: 'var(--ios-bg-primary)',
                                border: '1px solid var(--ios-card-border)',
                                color: 'var(--ios-text-secondary)',
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title="Download to device"
                            >
                              <Download size={12} />
                              <span>Save</span>
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => {
                                triggerLightHaptic();
                                setRenameFileTarget(f);
                                setRenameFileName(f.name);
                              }}
                              style={{
                                padding: 5,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--ios-text-muted)',
                                cursor: 'pointer'
                              }}
                              title="Rename"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFile(f)}
                              style={{
                                padding: 5,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

          </div>
        </div>
      </div>

      {/* ================= 📱 AUTHENTIC FLOATING BOTTOM DOCK NAVBAR ================= */}
      <div className="subject-detail-tab-bar-container" style={{ zIndex: 250 }}>
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

          {/* Files Tab */}
          <button
            className={`ios-tab-item ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic();
              setActiveTab('files');
            }}
            type="button"
            aria-selected={activeTab === 'files'}
            style={{
              color: activeTab === 'files' ? themeColor : undefined
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={19} />
              {courseFiles.length > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    background: activeTab === 'files' ? themeColor : 'var(--ios-blue)',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '1px 4.5px',
                    borderRadius: 999,
                    border: '1.5px solid var(--ios-card-bg)',
                    lineHeight: 1
                  }}
                >
                  {courseFiles.length}
                </span>
              )}
            </div>
            <span>Files</span>
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

      {/* Full Screen WYSIWYG Study Note Editor Modal */}
      {isCreatingNote && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            triggerLightHaptic();
            setIsCreatingNote(false);
            setEditingNoteId(null);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: 720,
              height: '94vh',
              maxHeight: '94vh',
              background: 'var(--ios-card-bg)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid var(--ios-card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4.5, borderRadius: 3, background: 'var(--ios-text-muted)', opacity: 0.4 }} />
            </div>

            {/* Modal Top Bar */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderBottom: '1px solid var(--ios-card-border)',
                background: 'var(--ios-card-bg)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setIsCreatingNote(false);
                  setEditingNoteId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-muted)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 8px'
                }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span 
                  style={{
                    padding: '3px 8px',
                    borderRadius: 7,
                    background: `${themeColor}20`,
                    color: themeColor,
                    fontSize: 11,
                    fontWeight: 800
                  }}
                >
                  {course.courseCode}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {editingNoteId ? 'Edit Study Note' : 'New Study Note'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSaveNoteSubmit()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 15px',
                  borderRadius: 20,
                  border: 'none',
                  background: themeColor,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px -2px ${themeColor}66`
                }}
              >
                <Check size={15} strokeWidth={2.5} />
                <span>Save</span>
              </button>
            </div>

            {/* Note Title Input */}
            <div style={{ padding: '14px 18px 8px 18px', background: 'var(--ios-card-bg)' }}>
              <input 
                type="text" 
                className="ios-input" 
                placeholder="Note Title (e.g. Midterm Coverage, Formula Sheet)..." 
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                style={{ 
                  fontSize: 16.5, 
                  fontWeight: 800, 
                  padding: '12px 14px', 
                  borderRadius: 12,
                  border: '1.5px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)'
                }}
                autoFocus
              />
            </div>

            {/* Visual Formatting Toolbar */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                background: 'var(--ios-card-bg)',
                borderBottom: '1px solid var(--ios-card-border)',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}
            >
              {/* Highlighter with Aesthetic Color Selector */}
              {(() => {
                const activeHighlightObj = HIGHLIGHT_COLORS.find(c => c.id === selectedHighlightColor) || HIGHLIGHT_COLORS[0];
                return (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 10,
                      background: 'var(--ios-bg-secondary)',
                      border: '1px solid var(--ios-card-border)',
                      flexShrink: 0
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        handleApplyHighlight(selectedHighlightColor);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 9px',
                        borderRadius: 7,
                        border: `1.5px solid ${activeHighlightObj.border}77`,
                        background: activeHighlightObj.bg,
                        color: activeHighlightObj.text,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title={`Highlight with ${activeHighlightObj.label}`}
                    >
                      <Highlighter size={13} strokeWidth={2.5} />
                      <span>Highlight</span>
                    </button>

                    {/* Color Swatch Dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {HIGHLIGHT_COLORS.map(c => {
                        const isSelected = selectedHighlightColor === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              handleApplyHighlight(c.id);
                            }}
                            style={{
                              width: 19,
                              height: 19,
                              borderRadius: '50%',
                              background: c.dot,
                              border: isSelected ? `2.5px solid ${c.border}` : '1.5px solid rgba(0,0,0,0.15)',
                              boxShadow: isSelected ? `0 0 0 2px var(--ios-card-bg), 0 2px 6px ${c.border}88` : 'none',
                              transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                            title={`${c.label} Highlighter`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Bold Button */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleApplyBold();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 11px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
                title="Bold"
              >
                <Bold size={14} strokeWidth={2.5} />
                <span>Bold</span>
              </button>

              {/* Italic Button */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleApplyItalic();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 11px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 12,
                  fontStyle: 'italic',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Italic"
              >
                <Italic size={14} strokeWidth={2.5} />
                <span>Italic</span>
              </button>

              {/* Heading 3 */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleApplyHeading();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Heading"
              >
                <span>H3</span>
              </button>

              {/* Bullet List */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleApplyBulletList();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Bullet List"
              >
                <List size={14} strokeWidth={2.5} />
                <span>List</span>
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleApplyNumberedList();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Numbered List"
              >
                <ListOrdered size={14} strokeWidth={2.5} />
                <span>1. 2.</span>
              </button>

              {/* Clear format */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleClearFormatting();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-muted)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Clear Formatting"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>

            {/* Large Visual Note Canvas (contentEditable) */}
            <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div
                ref={noteEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorContent}
                onBlur={syncEditorContent}
                style={{
                  flex: 1,
                  minHeight: '260px',
                  outline: 'none',
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'var(--ios-text-primary)',
                  wordBreak: 'break-word',
                  paddingBottom: 40
                }}
              />
            </div>

            {/* Bottom Status Bar */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                background: 'var(--ios-bg-secondary)',
                borderTop: '1px solid var(--ios-card-border)',
                fontSize: 11.5,
                color: 'var(--ios-text-muted)',
                fontWeight: 600
              }}
            >
              <span>💡 Select text, then tap <b>Highlight</b> or <b>Bold</b></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{getNoteStats(noteContent).wordCount} words</span>
                <span>•</span>
                <span>{getNoteStats(noteContent).readTimeMinutes} min read</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Course Hub Materials */}
      <input
        type="file"
        ref={courseFileInputRef}
        onChange={handleFileUpload}
        multiple
        style={{ display: 'none' }}
      />

      {/* Course File Rename Modal */}
      {renameFileTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setRenameFileTarget(null)}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--ios-text-primary)' }}>
              Rename Material
            </h3>
            <input
              type="text"
              value={renameFileName}
              onChange={(e) => setRenameFileName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--ios-card-border)',
                background: 'var(--ios-bg-primary)',
                color: 'var(--ios-text-primary)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 20
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRenameFileTarget(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--ios-card-border)',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameFile}
                disabled={!renameFileName.trim()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: themeColor,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course File Preview Modal */}
      {previewFile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 24
          }}
          onClick={handleCloseFilePreview}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 24,
              width: '100%',
              maxWidth: 900,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ios-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {getCourseFileBadge(previewFile).icon}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ios-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500 }}>
                    {previewFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ios-text-muted)' }}>
                    {formatFileSize(previewFile.size)} • Stored offline on this device
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => downloadStoredFile(previewFile)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 10,
                    background: themeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseFilePreview}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: 'var(--ios-bg-primary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, background: 'var(--ios-bg-primary)' }}>
              {previewFile.extension.toLowerCase() === 'pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
                />
              ) : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(previewFile.extension.toLowerCase()) && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }}
                />
              ) : (
                <div style={{ textAlign: 'center', maxWidth: 460, padding: 32 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: getCourseFileBadge(previewFile).bg, border: `1px solid ${getCourseFileBadge(previewFile).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    {getCourseFileBadge(previewFile).icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ios-text-primary)', margin: '0 0 8px' }}>
                    {previewFile.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--ios-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                    This {previewFile.extension.toUpperCase()} document is securely saved locally. You can download and open it directly with Microsoft PowerPoint, Word, Keynote, or Google Docs.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadStoredFile(previewFile)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 22px',
                      borderRadius: 12,
                      background: themeColor,
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${themeColor}40`
                    }}
                  >
                    <Download size={16} />
                    <span>Download & Open in App</span>
                  </button>
                </div>
              )}
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
