import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Settings as SettingsIcon, 
  Home, 
  Moon, 
  Sun, 
  Camera, 
  ArrowRight,
  Command
} from 'lucide-react';
import { Course, CustomEvent } from '../types';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  events: CustomEvent[];
  onSelectTab: (tab: 'home' | 'subjects' | 'schedule' | 'calendar' | 'settings') => void;
  onSelectCourse: (course: Course) => void;
  onOpenAddTask: () => void;
  onOpenAddCourse: () => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  onOpenScanner?: () => void;
}

interface CommandItem {
  id: string;
  type: 'action' | 'navigation' | 'course' | 'task';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  courses,
  events,
  onSelectTab,
  onSelectCourse,
  onOpenAddTask,
  onOpenAddCourse,
  onToggleTheme,
  theme = 'light',
  onOpenScanner
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build items list based on query
  const q = query.trim().toLowerCase();

  const navigationItems: CommandItem[] = [
    {
      id: 'nav_home',
      type: 'navigation',
      title: 'Home Dashboard',
      subtitle: 'View course cards, today live schedule & pending tasks',
      icon: <Home size={16} color="var(--ios-blue)" />,
      badge: 'Tab',
      action: () => {
        onSelectTab('home');
        onClose();
      }
    },
    {
      id: 'nav_subjects',
      type: 'navigation',
      title: 'Course Hub',
      subtitle: 'Browse enrolled courses, syllabus & notes',
      icon: <BookOpen size={16} color="#8B5CF6" />,
      badge: 'Tab',
      action: () => {
        onSelectTab('subjects');
        onClose();
      }
    },
    {
      id: 'nav_schedule',
      type: 'navigation',
      title: 'Class Schedule',
      subtitle: 'Weekly timetable and class hours',
      icon: <Clock size={16} color="#F59E0B" />,
      badge: 'Tab',
      action: () => {
        onSelectTab('schedule');
        onClose();
      }
    },
    {
      id: 'nav_calendar',
      type: 'navigation',
      title: 'Calendar & Holidays',
      subtitle: 'Month view, Philippine holidays & academic deadlines',
      icon: <CalendarIcon size={16} color="#10B981" />,
      badge: 'Tab',
      action: () => {
        onSelectTab('calendar');
        onClose();
      }
    },
    {
      id: 'nav_settings',
      type: 'navigation',
      title: 'Settings & Appearance',
      subtitle: 'Theme customization, notification rules & sync',
      icon: <SettingsIcon size={16} color="var(--ios-text-secondary)" />,
      badge: 'Tab',
      action: () => {
        onSelectTab('settings');
        onClose();
      }
    }
  ];

  const quickActionItems: CommandItem[] = [
    {
      id: 'act_add_task',
      type: 'action',
      title: 'New Task or Deadline',
      subtitle: 'Add exam, quiz, assignment, or project deadline',
      icon: <Plus size={16} color="var(--ios-blue)" />,
      badge: 'Action',
      action: () => {
        onClose();
        setTimeout(() => onOpenAddTask(), 50);
      }
    },
    {
      id: 'act_add_course',
      type: 'action',
      title: 'Add New Course / Subject',
      subtitle: 'Manually add an enrolled subject and schedule',
      icon: <BookOpen size={16} color="#10B981" />,
      badge: 'Action',
      action: () => {
        onClose();
        setTimeout(() => onOpenAddCourse(), 50);
      }
    }
  ];

  if (onOpenScanner) {
    quickActionItems.push({
      id: 'act_scan_cor',
      type: 'action',
      title: 'Scan COR / Schedule Image (OCR)',
      subtitle: 'Auto-import subjects from Certificate of Registration',
      icon: <Camera size={16} color="#EC4899" />,
      badge: 'Action',
      action: () => {
        onClose();
        setTimeout(() => onOpenScanner(), 50);
      }
    });
  }

  if (onToggleTheme) {
    quickActionItems.push({
      id: 'act_toggle_theme',
      type: 'action',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle interface appearance mode',
      icon: theme === 'dark' ? <Sun size={16} color="#F59E0B" /> : <Moon size={16} color="#6366F1" />,
      badge: 'Theme',
      action: () => {
        onToggleTheme();
        onClose();
      }
    });
  }

  const courseItems: CommandItem[] = courses.map(course => ({
    id: `course_${course.id}`,
    type: 'course',
    title: `${course.courseCode} – ${course.courseName}`,
    subtitle: `${course.room || 'TBA'} • ${course.instructor || 'No Instructor'} • ${(course.days || []).join(', ')}`,
    icon: (
      <div 
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: course.color || 'var(--ios-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 800
        }}
      >
        {course.courseCode.slice(0, 2).toUpperCase()}
      </div>
    ),
    badge: 'Course',
    action: () => {
      onSelectCourse(course);
      onClose();
    }
  }));

  const taskItems: CommandItem[] = events
    .filter(e => !e.isCompleted)
    .slice(0, 15)
    .map(event => ({
      id: `task_${event.id}`,
      type: 'task',
      title: event.title,
      subtitle: `${event.date} • ${event.subjectCode || 'General'} • ${event.category.toUpperCase()}`,
      icon: <CheckCircle2 size={16} color={event.color || 'var(--ios-blue)'} />,
      badge: 'Task',
      action: () => {
        onSelectTab('home');
        onClose();
      }
    }));

  const allItems = [
    ...quickActionItems,
    ...navigationItems,
    ...courseItems,
    ...taskItems
  ];

  const filteredItems = q
    ? allItems.filter(item => 
        item.title.toLowerCase().includes(q) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      triggerLightHaptic();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      triggerLightHaptic();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        triggerSelectionHaptic();
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="ios-modal-overlay" 
      onClick={onClose}
      style={{
        zIndex: 1500,
        alignItems: 'flex-start',
        paddingTop: '10vh'
      }}
    >
      <div 
        className="ios-modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
          background: 'var(--ios-glass-bg)',
          backdropFilter: 'blur(36px) saturate(200%)',
          WebkitBackdropFilter: 'blur(36px) saturate(200%)',
          border: '1px solid var(--ios-card-border)',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.4), 0 8px 24px -4px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Spotlight Search Header Input */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--ios-divider)',
            background: 'var(--ios-card-bg)'
          }}
        >
          <Search size={20} color="var(--ios-blue)" />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, course name, or search tasks..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ios-text-primary)',
              letterSpacing: '-0.01em'
            }}
          />
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 7px',
              borderRadius: 6,
              background: 'var(--ios-bg-primary)',
              border: '1px solid var(--ios-card-border)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--ios-text-muted)'
            }}
          >
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ios-text-muted)' }}>
              <Command size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 8 }} />
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>No matching results found</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>Try searching for a subject code, task title, or tab name.</div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => {
                    triggerSelectionHaptic();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: 'none',
                    background: isSelected ? 'var(--ios-blue)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--ios-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                    marginBottom: 2
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isSelected ? '#FFFFFF' : undefined
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div 
                        style={{ 
                          fontSize: 13.5, 
                          fontWeight: 700, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div 
                          style={{ 
                            fontSize: 11, 
                            fontWeight: 500, 
                            color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--ios-text-muted)', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            marginTop: 1
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    {item.badge && (
                      <span 
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'var(--ios-bg-primary)',
                          color: isSelected ? '#FFFFFF' : 'var(--ios-text-muted)',
                          border: isSelected ? 'none' : '1px solid var(--ios-card-border)'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight size={14} color="#FFFFFF" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderTop: '1px solid var(--ios-divider)',
            background: 'var(--ios-card-bg)',
            fontSize: 11,
            color: 'var(--ios-text-muted)',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Schedly Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteModal;
