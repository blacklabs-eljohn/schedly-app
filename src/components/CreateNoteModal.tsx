import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Highlighter, 
  BookOpen, 
  Sparkles,
  X
} from 'lucide-react';
import { Course, SubjectNote } from '../types';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  preselectedCourseId?: string;
  initialNote?: SubjectNote | null;
  onSaveNote: (note: SubjectNote) => void;
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: '#FEF08A', text: '#854D0E', border: '#EAB308' },
  { id: 'green', label: 'Green', bg: '#BBF7D0', text: '#166534', border: '#22C55E' },
  { id: 'cyan', label: 'Cyan', bg: '#BAE6FD', text: '#075985', border: '#0EA5E9' },
  { id: 'pink', label: 'Pink', bg: '#FBCFE8', text: '#9D174D', border: '#EC4899' },
  { id: 'orange', label: 'Orange', bg: '#FED7AA', text: '#9A3412', border: '#F97316' },
  { id: 'purple', label: 'Purple', bg: '#E9D5FF', text: '#6B21A8', border: '#A855F7' }
];

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  courses,
  preselectedCourseId,
  initialNote,
  onSaveNote
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState('');
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('yellow');
  const noteEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setSelectedCourseId(initialNote.subjectId || preselectedCourseId || (courses[0]?.id || ''));
        setNoteTitle(initialNote.title || '');
        setTimeout(() => {
          if (noteEditorRef.current) {
            noteEditorRef.current.innerHTML = initialNote.content || '';
          }
        }, 50);
      } else {
        const defaultCourseId = preselectedCourseId || (courses[0]?.id || '');
        setSelectedCourseId(defaultCourseId);
        setNoteTitle('');
        setTimeout(() => {
          if (noteEditorRef.current) {
            noteEditorRef.current.innerHTML = '';
          }
        }, 50);
      }
    }
  }, [isOpen, initialNote, preselectedCourseId, courses]);

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const themeColor = activeCourse?.color || '#2563EB';

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    noteEditorRef.current?.focus();
  };

  const handleApplyHighlight = (colorId: string) => {
    const colorObj = HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      document.execCommand('hiliteColor', false, colorObj.bg);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = colorObj.bg;
    span.style.color = colorObj.text;
    span.style.borderRadius = '4px';
    span.style.padding = '1px 4px';
    span.style.fontWeight = '600';
    span.setAttribute('data-highlight', colorId);

    try {
      range.surroundContents(span);
    } catch {
      document.execCommand('hiliteColor', false, colorObj.bg);
    }
    noteEditorRef.current?.focus();
  };

  const handleInsertChecklistItem = () => {
    const checkHtml = `<div><span contenteditable="false" style="cursor:pointer;user-select:none;margin-right:6px;font-size:14px;">◻️</span><span>&nbsp;</span></div>`;
    document.execCommand('insertHTML', false, checkHtml);
    noteEditorRef.current?.focus();
  };

  const handleSave = () => {
    const currentHtml = noteEditorRef.current?.innerHTML || '';
    if (!noteTitle.trim() && !currentHtml.trim()) {
      alert('Please enter a note title or content.');
      return;
    }

    const targetSubjectId = selectedCourseId || (courses[0]?.id || 'general');
    const now = new Date().toISOString();

    const noteToSave: SubjectNote = {
      id: initialNote?.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      subjectId: targetSubjectId,
      title: noteTitle.trim() || 'Untitled Note',
      content: currentHtml.trim(),
      isPinned: initialNote?.isPinned || false,
      createdAt: initialNote?.createdAt || now,
      updatedAt: now
    };

    triggerSuccessHaptic();
    onSaveNote(noteToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="ios-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1200 }}
    >
      <div 
        className="ios-modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--ios-card-bg)',
          borderRadius: 24,
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Modal Top Bar */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--ios-card-border)',
            background: 'var(--ios-card-bg)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ios-text-muted)',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
              {initialNote ? 'Edit Study Note' : 'New Study Note'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 16px',
              borderRadius: 20,
              border: 'none',
              background: themeColor,
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 4px 12px -2px ${themeColor}66`
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Save</span>
          </button>
        </div>

        {/* Course Selector Dropdown */}
        {courses.length > 0 && (
          <div style={{ padding: '12px 20px 0 20px', background: 'var(--ios-card-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BookOpen size={13} color={themeColor} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                Target Subject / Course
              </span>
            </div>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="ios-input"
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                borderColor: themeColor,
                padding: '8px 12px',
                borderRadius: 10
              }}
            >
              <option value="general">📝 General / Campus Note (No Subject)</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  📖 {c.courseCode} – {c.courseName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Note Title Input */}
        <div style={{ padding: '12px 20px 8px 20px', background: 'var(--ios-card-bg)' }}>
          <input 
            type="text" 
            className="ios-input" 
            placeholder="Note Title (e.g. Midterm Coverage, Key Formulas)..." 
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
            padding: '8px 20px',
            background: 'var(--ios-card-bg)',
            borderBottom: '1px solid var(--ios-card-border)',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {/* Highlighter Tool */}
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
                >
                  <Highlighter size={13} strokeWidth={2.5} />
                  <span>Highlight</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        setSelectedHighlightColor(c.id);
                        handleApplyHighlight(c.id);
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: c.bg,
                        border: selectedHighlightColor === c.id ? `2px solid ${c.border}` : '1px solid var(--ios-card-border)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Standard Formatting Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 8, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', flexShrink: 0 }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('bold'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Bold"
            >
              <Bold size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('italic'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Italic"
            >
              <Italic size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('underline'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Underline"
            >
              <Underline size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 8, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', flexShrink: 0 }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Bullet List"
            >
              <List size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('insertOrderedList'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Numbered List"
            >
              <ListOrdered size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleInsertChecklistItem(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Insert Checklist Item"
            >
              <CheckSquare size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Editable Rich Note Body */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            background: 'var(--ios-card-bg)',
            minHeight: 240
          }}
        >
          <div
            ref={noteEditorRef}
            contentEditable
            suppressContentEditableWarning
            className="wysiwyg-note-editor"
            style={{
              minHeight: '100%',
              outline: 'none',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--ios-text-primary)',
              fontFamily: 'inherit'
            }}
            data-placeholder="Write lecture pointers, review topics, exam formulas, or checklist..."
          />
        </div>
      </div>
    </div>
  );
};

export default CreateNoteModal;
