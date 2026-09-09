import React, { useState } from 'react';
import { CustomEvent, Course, EventCategory } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Calendar, 
  Sparkles, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  ChevronDown, 
  ChevronUp, 
  Flame,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { formatTime12H } from '../services/scheduleEngine';
import { getSubjectIconComponent } from '../services/iconService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { triggerTaskConfetti } from '../services/confettiService';
import { ConfirmationModal } from './ConfirmationModal';

interface HomeTodoListProps {
  events: CustomEvent[];
  courses: Course[];
  onToggleEventComplete: (eventId: string) => void;
  onEditEvent: (event: CustomEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenAddTask: () => void;
  onSelectCourse?: (course: Course) => void;
}

type FilterCategory = 'all' | 'urgent' | 'exam' | 'assignment' | 'meeting';

export const HomeTodoList: React.FC<HomeTodoListProps> = ({
  events,
  courses,
  onToggleEventComplete,
  onEditEvent,
  onDeleteEvent,
  onOpenAddTask,
  onSelectCourse
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CustomEvent | null>(null);

  // Helper to get today's date string 'YYYY-MM-DD'
  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getTodayDateStr();

  // Helper to calculate days diff from today
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0;
    const today = new Date(todayStr);
    const target = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(target.getTime())) return 0;
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format friendly relative due date label
  const getDueBadge = (event: CustomEvent) => {
    const timeStr = event.startTime ? ` • ${formatTime12H(event.startTime)}` : '';

    if (!event.date) {
      return {
        label: `No Due Date${timeStr}`,
        isOverdue: false,
        isToday: false,
        isSoon: false,
        color: 'var(--ios-text-secondary)',
        bg: 'var(--ios-bg-secondary)'
      };
    }

    const diff = getDaysDiff(event.date);

    if (diff < 0) {
      const daysAgo = Math.abs(diff);
      return {
        label: `Overdue (${daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`})${timeStr}`,
        isOverdue: true,
        isToday: false,
        isSoon: true,
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)'
      };
    } else if (diff === 0) {
      return {
        label: `Due Today${timeStr}`,
        isOverdue: false,
        isToday: true,
        isSoon: true,
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)'
      };
    } else if (diff === 1) {
      return {
        label: `Due Tomorrow${timeStr}`,
        isOverdue: false,
        isToday: false,
        isSoon: true,
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)'
      };
    } else if (diff <= 7 && diff > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const targetDate = new Date(event.date.includes('T') ? event.date : `${event.date}T00:00:00`);
      const targetDay = isNaN(targetDate.getTime()) ? 'Soon' : dayNames[targetDate.getDay()];
      return {
        label: `Due ${targetDay} (${diff}d)${timeStr}`,
        isOverdue: false,
        isToday: false,
        isSoon: false,
        color: 'var(--ios-blue)',
        bg: 'var(--ios-blue-light)'
      };
    } else {
      return {
        label: `Due ${event.date}${timeStr}`,
        isOverdue: false,
        isToday: false,
        isSoon: false,
        color: 'var(--ios-text-secondary)',
        bg: 'var(--ios-bg-secondary)'
      };
    }
  };

  // Category Icon & Label mapping
  const getCategoryMeta = (cat?: EventCategory) => {
    switch (cat) {
      case 'exam':
        return { label: 'Exam / Quiz', emoji: '📝', color: '#EF4444' };
      case 'assignment':
        return { label: 'Assignment / Project', emoji: '📌', color: '#F59E0B' };
      case 'meeting':
        return { label: 'Meeting / Defense', emoji: '👥', color: '#2563EB' };
      case 'activity':
        return { label: 'Campus Activity', emoji: '🏆', color: '#8B5CF6' };
      case 'personal':
      default:
        return { label: 'Personal Task', emoji: '🎯', color: '#10B981' };
    }
  };

  // Separate completed and pending
  const pendingEvents = events.filter(e => !e.isCompleted);
  const completedEvents = events.filter(e => e.isCompleted);

  // Apply Category / Urgency Filters to Pending
  const filteredPending = pendingEvents.filter(e => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'urgent') {
      const diff = getDaysDiff(e.date);
      return diff <= 2 || e.category === 'exam';
    }
    return e.category === activeFilter;
  });

  // Group filtered pending into buckets:
  // 1. Urgent & Today (diff <= 0)
  // 2. This Week (1 <= diff <= 7)
  // 3. Later (diff > 7)
  const urgentSection = filteredPending
    .filter(e => getDaysDiff(e.date) <= 0)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.startTime || '').localeCompare(b.startTime || ''));

  const thisWeekSection = filteredPending
    .filter(e => {
      const diff = getDaysDiff(e.date);
      return diff >= 1 && diff <= 7;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.startTime || '').localeCompare(b.startTime || ''));

  const laterSection = filteredPending
    .filter(e => getDaysDiff(e.date) > 7)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Find linked course helper
  const getLinkedCourse = (event: CustomEvent): Course | undefined => {
    if (event.subjectId) {
      return courses.find(c => c.id === event.subjectId);
    }
    if (event.subjectCode) {
      const norm = event.subjectCode.toUpperCase().replace(/\s+/g, '');
      return courses.find(c => (c.courseCode || '').toUpperCase().replace(/\s+/g, '') === norm);
    }
    return undefined;
  };

  const handleToggle = (evt: CustomEvent, e?: React.MouseEvent) => {
    if (!evt.isCompleted) {
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight * 0.45;
      
      const cardEl = (e?.currentTarget as HTMLElement)?.closest('.ios-card-todo, [style*="borderRadius"]') || (e?.currentTarget as HTMLElement);
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
    } else {
      triggerLightHaptic();
    }
    onToggleEventComplete(evt.id);
  };

  const renderTaskCard = (event: CustomEvent) => {
    const linkedCourse = getLinkedCourse(event);
    const dueInfo = getDueBadge(event);
    const catMeta = getCategoryMeta(event.category);
    const isCompleted = !!event.isCompleted;

    const courseColor = linkedCourse?.color || event.color || 'var(--ios-blue)';

    return (
      <div
        key={event.id}
        style={{
          background: 'var(--ios-card-bg)',
          borderRadius: 16,
          padding: '14px 14px 12px 14px',
          border: dueInfo.isOverdue 
            ? '1.5px solid rgba(239, 68, 68, 0.4)' 
            : dueInfo.isToday 
            ? '1.5px solid rgba(239, 68, 68, 0.25)' 
            : '1px solid var(--ios-card-border)',
          boxShadow: 'var(--ios-shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          position: 'relative',
          transition: 'all 0.2s ease',
          opacity: isCompleted ? 0.7 : 1
        }}
      >
        {/* Top Meta Line: Course Tag, Category & Due Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {linkedCourse ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerLightHaptic();
                  if (onSelectCourse) onSelectCourse(linkedCourse);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: `${courseColor}18`,
                  color: courseColor,
                  border: `1px solid ${courseColor}30`,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em'
                }}
                title="View in Course Hub"
              >
                {getSubjectIconComponent(linkedCourse?.icon, linkedCourse?.courseCode, linkedCourse?.courseName, 12, courseColor)}
                <span>{linkedCourse.courseCode}</span>
              </button>
            ) : event.subjectCode ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 11,
                  fontWeight: 800
                }}
              >
                <BookOpen size={11} />
                <span>{event.subjectCode}</span>
              </span>
            ) : null}

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <span>{catMeta.emoji}</span>
              <span>{catMeta.label}</span>
            </span>
          </div>

          {/* Due Badge */}
          <div
            style={{
              padding: '3px 8px',
              borderRadius: 8,
              background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : dueInfo.bg,
              color: isCompleted ? '#10B981' : dueInfo.color,
              fontSize: 10.5,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {dueInfo.isOverdue && <AlertTriangle size={11} />}
            {dueInfo.isToday && !isCompleted && <Flame size={11} />}
            <span>{isCompleted ? 'Completed 🏆' : dueInfo.label}</span>
          </div>
        </div>

        {/* Main Content Line: Checkbox + Title + Actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div 
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, cursor: 'pointer' }}
            onClick={(e) => handleToggle(event, e)}
          >
            <div 
              style={{ 
                marginTop: 2, 
                color: isCompleted ? '#10B981' : 'var(--ios-text-muted)',
                flexShrink: 0,
                transition: 'transform 0.15s ease'
              }}
            >
              {isCompleted ? (
                <CheckCircle2 size={20} fill="#10B981" color="#FFFFFF" />
              ) : (
                <Circle size={20} strokeWidth={2} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div 
                style={{ 
                  fontSize: 14.5, 
                  fontWeight: 700, 
                  color: isCompleted ? 'var(--ios-text-muted)' : 'var(--ios-text-primary)',
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  lineHeight: 1.35
                }}
              >
                {event.title}
              </div>

              {event.notes && (
                <div 
                  style={{ 
                    fontSize: 12, 
                    color: 'var(--ios-text-secondary)', 
                    marginTop: 3, 
                    lineHeight: 1.35,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {event.notes}
                </div>
              )}
            </div>
          </div>

          {/* Edit / Delete Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerLightHaptic();
                onEditEvent(event);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-text-muted)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Edit Task"
            >
              <Edit3 size={14} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmEvent(event);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-text-muted)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Delete Task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Top Header Controls: Filter Chips + Add Task Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ios-text-primary)', letterSpacing: '-0.01em' }}>
            Deadlines & To-Do
          </span>
          <span className="ios-tag-pill ios-tag-pill-blue" style={{ fontSize: 11, padding: '2px 7px' }}>
            {pendingEvents.length} Pending
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onOpenAddTask();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 12,
            background: 'var(--ios-blue)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Chips Horizontal Bar */}
      <div 
        style={{ 
          display: 'flex', 
          gap: 6, 
          overflowX: 'auto', 
          paddingBottom: 8,
          marginBottom: 10,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveFilter('all');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: activeFilter === 'all' ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
            background: activeFilter === 'all' ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
            color: activeFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
            fontSize: 11.5,
            fontWeight: activeFilter === 'all' ? 800 : 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          All ({pendingEvents.length})
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveFilter('urgent');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: activeFilter === 'urgent' ? '1.5px solid #EF4444' : '1px solid var(--ios-card-border)',
            background: activeFilter === 'urgent' ? 'rgba(239, 68, 68, 0.12)' : 'var(--ios-card-bg)',
            color: activeFilter === 'urgent' ? '#EF4444' : 'var(--ios-text-secondary)',
            fontSize: 11.5,
            fontWeight: activeFilter === 'urgent' ? 800 : 600,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>🚨 Due Soon / Urgent</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveFilter('exam');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: activeFilter === 'exam' ? '1.5px solid #EF4444' : '1px solid var(--ios-card-border)',
            background: activeFilter === 'exam' ? 'rgba(239, 68, 68, 0.12)' : 'var(--ios-card-bg)',
            color: activeFilter === 'exam' ? '#EF4444' : 'var(--ios-text-secondary)',
            fontSize: 11.5,
            fontWeight: activeFilter === 'exam' ? 800 : 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          📝 Quizzes & Exams
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveFilter('assignment');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: activeFilter === 'assignment' ? '1.5px solid #F59E0B' : '1px solid var(--ios-card-border)',
            background: activeFilter === 'assignment' ? 'rgba(245, 158, 11, 0.12)' : 'var(--ios-card-bg)',
            color: activeFilter === 'assignment' ? '#F59E0B' : 'var(--ios-text-secondary)',
            fontSize: 11.5,
            fontWeight: activeFilter === 'assignment' ? 800 : 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          📌 Assignments
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveFilter('meeting');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: activeFilter === 'meeting' ? '1.5px solid #2563EB' : '1px solid var(--ios-card-border)',
            background: activeFilter === 'meeting' ? 'rgba(37, 99, 235, 0.12)' : 'var(--ios-card-bg)',
            color: activeFilter === 'meeting' ? '#2563EB' : 'var(--ios-text-secondary)',
            fontSize: 11.5,
            fontWeight: activeFilter === 'meeting' ? 800 : 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          👥 Group Work
        </button>
      </div>

      {/* Main Task List Sections */}
      {filteredPending.length === 0 && completedEvents.length === 0 ? (
        <div 
          className="ios-card" 
          style={{ 
            padding: '32px 20px', 
            textAlign: 'center', 
            borderRadius: 18, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 10
          }}
        >
          <div 
            style={{ 
              width: 50, 
              height: 50, 
              borderRadius: 16, 
              background: 'var(--ios-blue-light)', 
              color: 'var(--ios-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
            You're All Caught Up! ✨
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', maxWidth: 280, lineHeight: 1.4 }}>
            No pending tasks or deadlines scheduled. Tap below to create your first assignment or exam tracker.
          </div>
          <button
            type="button"
            className="ios-btn-primary"
            onClick={onOpenAddTask}
            style={{ marginTop: 6, maxWidth: 200 }}
          >
            <Plus size={15} /> Add First Deadline
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section 1: Urgent & Due Today */}
          {urgentSection.length > 0 && (
            <div>
              <div 
                style={{ 
                  fontSize: 12, 
                  fontWeight: 800, 
                  color: '#EF4444', 
                  letterSpacing: '0.04em', 
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Flame size={13} />
                <span>Urgent & Due Today ({urgentSection.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {urgentSection.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Section 2: This Week (Next 2-7 Days) */}
          {thisWeekSection.length > 0 && (
            <div>
              <div 
                style={{ 
                  fontSize: 12, 
                  fontWeight: 800, 
                  color: 'var(--ios-text-secondary)', 
                  letterSpacing: '0.04em', 
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Calendar size={13} />
                <span>Upcoming This Week ({thisWeekSection.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thisWeekSection.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Section 3: Later / Long Term */}
          {laterSection.length > 0 && (
            <div>
              <div 
                style={{ 
                  fontSize: 12, 
                  fontWeight: 800, 
                  color: 'var(--ios-text-secondary)', 
                  letterSpacing: '0.04em', 
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Clock size={13} />
                <span>Later Deadlines ({laterSection.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {laterSection.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Empty Filter State if pending tasks exist but none match active filter */}
          {filteredPending.length === 0 && (
            <div className="ios-card" style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ios-text-muted)' }}>
              No tasks found under this category filter.
            </div>
          )}

          {/* Section 4: Completed Tasks (Collapsible Drawer) */}
          {completedEvents.length > 0 && (
            <div style={{ marginTop: 6, borderTop: '1px solid var(--ios-card-border)', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setShowCompleted(!showCompleted);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span>Completed Tasks ({completedEvents.length})</span>
                </div>
                {showCompleted ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {completedEvents.map(renderTaskCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmEvent}
        title="Delete Task?"
        message={`Are you sure you want to delete "${deleteConfirmEvent?.title || 'this task'}"?`}
        confirmText="Delete Task"
        cancelText="Cancel"
        isDestructive={true}
        icon="trash"
        onConfirm={() => {
          if (deleteConfirmEvent) {
            triggerLightHaptic();
            onDeleteEvent(deleteConfirmEvent.id);
            setDeleteConfirmEvent(null);
          }
        }}
        onCancel={() => setDeleteConfirmEvent(null)}
      />
    </div>
  );
};

export default HomeTodoList;
