import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  FileText, 
  BookOpen, 
  Camera 
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface FloatingActionPillProps {
  onAddTask: () => void;
  onAddEvent: () => void;
  onAddNote: () => void;
  onAddCourse: () => void;
  onOpenScanner: () => void;
}

export const FloatingActionPill: React.FC<FloatingActionPillProps> = ({
  onAddTask,
  onAddEvent,
  onAddNote,
  onAddCourse,
  onOpenScanner
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const handleToggle = () => {
    triggerLightHaptic();
    setIsExpanded(prev => !prev);
  };

  const handleAction = (actionFn: () => void) => {
    triggerSelectionHaptic();
    setIsExpanded(false);
    actionFn();
  };

  return (
    <div 
      ref={pillRef}
      className="desktop-floating-pill-wrap"
      aria-label="Quick Actions"
    >
      <div 
        className={`desktop-floating-pill-body ${isExpanded ? 'expanded' : ''}`}
      >
        {isExpanded && (
          <div className="desktop-floating-pill-actions">
            {/* 1. Add Task / Deadline */}
            <button
              type="button"
              className="desktop-pill-action-btn"
              onClick={() => handleAction(onAddTask)}
              title="Add Task / Deadline"
            >
              <div className="desktop-pill-action-icon" style={{ color: '#2563EB', background: 'rgba(37, 99, 235, 0.12)' }}>
                <CheckSquare size={16} strokeWidth={2.4} />
              </div>
              <span className="desktop-pill-action-label">Task</span>
            </button>

            {/* 2. Add Campus Event */}
            <button
              type="button"
              className="desktop-pill-action-btn"
              onClick={() => handleAction(onAddEvent)}
              title="Add Campus Event / Exam"
            >
              <div className="desktop-pill-action-icon" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.12)' }}>
                <CalendarIcon size={16} strokeWidth={2.4} />
              </div>
              <span className="desktop-pill-action-label">Event</span>
            </button>

            {/* 3. Add Study Note */}
            <button
              type="button"
              className="desktop-pill-action-btn"
              onClick={() => handleAction(onAddNote)}
              title="Write Course Note"
            >
              <div className="desktop-pill-action-icon" style={{ color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.12)' }}>
                <FileText size={16} strokeWidth={2.4} />
              </div>
              <span className="desktop-pill-action-label">Note</span>
            </button>

            {/* 4. Add Enrolled Course */}
            <button
              type="button"
              className="desktop-pill-action-btn"
              onClick={() => handleAction(onAddCourse)}
              title="Add New Subject"
            >
              <div className="desktop-pill-action-icon" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}>
                <BookOpen size={16} strokeWidth={2.4} />
              </div>
              <span className="desktop-pill-action-label">Course</span>
            </button>

            {/* 5. OCR Schedule Scanner */}
            <button
              type="button"
              className="desktop-pill-action-btn"
              onClick={() => handleAction(onOpenScanner)}
              title="Scan COR Schedule Image"
            >
              <div className="desktop-pill-action-icon" style={{ color: '#EC4899', background: 'rgba(236, 72, 153, 0.12)' }}>
                <Camera size={16} strokeWidth={2.4} />
              </div>
              <span className="desktop-pill-action-label">Scan</span>
            </button>

            <div className="desktop-pill-divider" />
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          className="desktop-pill-main-trigger"
          onClick={handleToggle}
          title={isExpanded ? "Close Quick Actions" : "Quick Add (Tasks, Notes, Events, Courses)"}
          aria-expanded={isExpanded}
        >
          <div className={`desktop-pill-plus-icon ${isExpanded ? 'rotated' : ''}`}>
            <Plus size={24} strokeWidth={2.5} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default FloatingActionPill;
