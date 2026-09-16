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
  Undo,
  Redo,
  RotateCcw,
  X
} from 'lucide-react';
import { Course, SubjectNote } from '../types';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  preselectedCourseId?: string;
  initialNote?: SubjectNote | null;
  onSaveNote: (note: SubjectNote) => void;
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: '#FEF08A', text: '#854D0E', border: '#EAB308', dot: '#FACC15' },
  { id: 'green', label: 'Green', bg: '#BBF7D0', text: '#166534', border: '#22C55E', dot: '#4ADE80' },
  { id: 'cyan', label: 'Cyan', bg: '#BAE6FD', text: '#075985', border: '#0EA5E9', dot: '#38BDF8' },
  { id: 'pink', label: 'Pink', bg: '#FBCFE8', text: '#9D174D', border: '#EC4899', dot: '#F472B6' },
  { id: 'orange', label: 'Orange', bg: '#FED7AA', text: '#9A3412', border: '#F97316', dot: '#FB923C' },
  { id: 'purple', label: 'Purple', bg: '#E9D5FF', text: '#6B21A8', border: '#A855F7', dot: '#C084FC' }
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
    triggerLightHaptic();
    document.execCommand(command, false, value);
    noteEditorRef.current?.focus();
  };

  const handleUndo = () => {
    triggerLightHaptic();
    document.execCommand('undo', false);
  };

  const handleRedo = () => {
    triggerLightHaptic();
    document.execCommand('redo', false);
  };

  // Helper to cleanly unwrap/remove a highlight element
  const unwrapHighlightElement = (el: HTMLElement) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  };

  const handleApplyHighlight = (colorId?: string) => {
    triggerLightHaptic();
    const activeColorId = colorId || selectedHighlightColor;
    if (colorId && colorId !== selectedHighlightColor) {
      setSelectedHighlightColor(colorId);
    }
    const colorObj = HIGHLIGHT_COLORS.find(c => c.id === activeColorId) || HIGHLIGHT_COLORS[0];

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    // 1. Check if cursor or selection is directly inside an existing highlight mark / span
    let container: Node | null = selection.anchorNode;
    if (container?.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }
    const currentHighlightEl = (container as HTMLElement)?.closest('mark, span[data-highlight], span[data-highlight-color], span[style*="background"]') as HTMLElement | null;

    if (currentHighlightEl) {
      const existingColor = currentHighlightEl.getAttribute('data-highlight-color') || currentHighlightEl.getAttribute('data-highlight') || 'yellow';
      if (existingColor === activeColorId) {
        // Toggle OFF / Undo Highlight!
        unwrapHighlightElement(currentHighlightEl);
        return;
      } else {
        // Switch highlight color
        currentHighlightEl.setAttribute('data-highlight-color', activeColorId);
        currentHighlightEl.setAttribute('data-highlight', activeColorId);
        currentHighlightEl.style.background = colorObj.bg;
        currentHighlightEl.style.color = colorObj.text || 'inherit';
        return;
      }
    }

    if (selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // 2. Check if range contains any existing marks
    const commonAncestor = range.commonAncestorContainer;
    const ancestorEl = commonAncestor.nodeType === Node.ELEMENT_NODE ? commonAncestor as HTMLElement : commonAncestor.parentElement;
    if (ancestorEl) {
      const marksInRange = Array.from(ancestorEl.querySelectorAll('mark, span[data-highlight], span[data-highlight-color], span[style*="background"]')).filter(el => {
        try {
          return selection.containsNode(el, true);
        } catch {
          return false;
        }
      }) as HTMLElement[];

      if (marksInRange.length > 0) {
        const allSameColor = marksInRange.every(el => {
          const c = el.getAttribute('data-highlight-color') || el.getAttribute('data-highlight') || 'yellow';
          return c === activeColorId;
        });

        if (allSameColor) {
          // Toggle off all highlights in selection
          marksInRange.forEach(unwrapHighlightElement);
          return;
        }
      }
    }

    // 3. Apply new highlight mark
    const mark = document.createElement('mark');
    mark.setAttribute('data-highlight-color', activeColorId);
    mark.setAttribute('data-highlight', activeColorId);
    mark.style.background = colorObj.bg;
    mark.style.color = 'inherit';
    mark.style.padding = '1px 5px';
    mark.style.borderRadius = '4px';
    mark.style.fontWeight = '700';

    try {
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection.addRange(newRange);
    } catch {
      document.execCommand('hiliteColor', false, colorObj.dot || colorObj.bg);
    }

    noteEditorRef.current?.focus();
  };

  // Apple Notes style interactive checklist bullet insert
  const handleInsertChecklistItem = () => {
    triggerLightHaptic();
    if (!noteEditorRef.current) return;
    noteEditorRef.current.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Check if already in a checklist row -> toggle back to normal paragraph
    let node: Node | null = selection.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const existingRow = (node as HTMLElement)?.closest('.apple-checklist-row') as HTMLElement | null;

    if (existingRow) {
      const textSpan = existingRow.querySelector('.apple-checklist-text');
      const text = textSpan ? textSpan.textContent || '' : existingRow.textContent || '';
      const p = document.createElement('p');
      if (text.trim()) {
        p.textContent = text;
      } else {
        p.innerHTML = '<br>';
      }
      existingRow.parentNode?.replaceChild(p, existingRow);

      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      return;
    }

    const selectedText = range.toString() || '';

    const checklistRow = document.createElement('div');
    checklistRow.className = 'apple-checklist-row';
    checklistRow.setAttribute('data-checked', 'false');

    const bullet = document.createElement('span');
    bullet.className = 'apple-checklist-bullet';
    bullet.setAttribute('contenteditable', 'false');
    bullet.setAttribute('role', 'checkbox');
    bullet.setAttribute('aria-checked', 'false');

    const textSpan = document.createElement('span');
    textSpan.className = 'apple-checklist-text';
    textSpan.innerHTML = selectedText.trim() ? selectedText : '<br>';

    checklistRow.appendChild(bullet);
    checklistRow.appendChild(textSpan);

    const parentBlock = (node as HTMLElement)?.closest('p, div, h1, h2, h3, li');
    if (parentBlock && parentBlock !== noteEditorRef.current && (!parentBlock.textContent || parentBlock.textContent.trim() === '')) {
      parentBlock.parentNode?.replaceChild(checklistRow, parentBlock);
    } else {
      range.deleteContents();
      range.insertNode(checklistRow);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(textSpan);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Keyboard navigation for Apple Notes Checklist
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      let node: Node | null = selection.anchorNode;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const checklistRow = (node as HTMLElement)?.closest('.apple-checklist-row') as HTMLElement | null;

      if (checklistRow) {
        const textSpan = checklistRow.querySelector('.apple-checklist-text');
        const text = textSpan?.textContent?.trim() || '';

        if (text === '') {
          // Empty checklist row -> exit checklist mode back to regular paragraph
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          checklistRow.parentNode?.replaceChild(p, checklistRow);

          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }

        // Create new unchecked checklist row below
        e.preventDefault();
        const newRow = document.createElement('div');
        newRow.className = 'apple-checklist-row';
        newRow.setAttribute('data-checked', 'false');

        const bullet = document.createElement('span');
        bullet.className = 'apple-checklist-bullet';
        bullet.setAttribute('contenteditable', 'false');
        bullet.setAttribute('role', 'checkbox');
        bullet.setAttribute('aria-checked', 'false');

        const newText = document.createElement('span');
        newText.className = 'apple-checklist-text';
        newText.innerHTML = '<br>';

        newRow.appendChild(bullet);
        newRow.appendChild(newText);

        checklistRow.after(newRow);

        const newRange = document.createRange();
        newRange.selectNodeContents(newText);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
      }
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      let node: Node | null = selection.anchorNode;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const checklistRow = (node as HTMLElement)?.closest('.apple-checklist-row') as HTMLElement | null;

      if (checklistRow) {
        const textSpan = checklistRow.querySelector('.apple-checklist-text');
        const text = textSpan?.textContent?.trim() || '';

        if (text === '') {
          // Remove empty checklist bullet and convert to normal paragraph
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          checklistRow.parentNode?.replaceChild(p, checklistRow);

          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
      }
    }
  };

  // Click on checklist bullet inside editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const bullet = target.closest('.apple-checklist-bullet') as HTMLElement | null;
    if (bullet) {
      e.preventDefault();
      e.stopPropagation();
      const row = bullet.closest('.apple-checklist-row') as HTMLElement | null;
      if (row) {
        triggerSelectionHaptic();
        const isChecked = row.getAttribute('data-checked') === 'true';
        row.setAttribute('data-checked', isChecked ? 'false' : 'true');
        bullet.setAttribute('aria-checked', isChecked ? 'false' : 'true');
      }
    }
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
          {/* Undo / Redo Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 5px', borderRadius: 8, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', flexShrink: 0 }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleUndo(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: '5px 7px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
              title="Undo (Ctrl+Z / ⌘Z)"
            >
              <Undo size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleRedo(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: '5px 7px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
              title="Redo (Ctrl+Y / ⌘Shift+Z)"
            >
              <Redo size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Highlighter Tool with Smart Toggle / Undo */}
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
                  title={`Highlight / Toggle Off (${activeHighlightObj.label})`}
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
                        width: 17,
                        height: 17,
                        borderRadius: '50%',
                        background: c.dot,
                        border: selectedHighlightColor === c.id ? `2px solid ${c.border}` : '1px solid rgba(0,0,0,0.15)',
                        boxShadow: selectedHighlightColor === c.id ? `0 0 0 2px var(--ios-card-bg), 0 2px 5px ${c.border}77` : 'none',
                        transform: selectedHighlightColor === c.id ? 'scale(1.15)' : 'scale(1)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.15s ease'
                      }}
                      title={`${c.label} Highlighter (tap again on highlighted text to undo)`}
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
              title="Bold (Ctrl+B / ⌘B)"
            >
              <Bold size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('italic'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Italic (Ctrl+I / ⌘I)"
            >
              <Italic size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); executeCommand('underline'); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6 }}
              title="Underline (Ctrl+U / ⌘U)"
            >
              <Underline size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Apple Notes Checklist & Lists */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 8, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', flexShrink: 0 }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleInsertChecklistItem(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: 'var(--ios-text-primary)',
                cursor: 'pointer',
                padding: '4px 7px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700
              }}
              title="Apple Notes Checklist Bullet"
            >
              <CheckSquare size={14} strokeWidth={2.5} />
              <span>Checklist</span>
            </button>
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
          </div>

          {/* Reset Format */}
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); executeCommand('removeFormat'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '5px 8px',
              borderRadius: 8,
              border: '1px solid var(--ios-card-border)',
              background: 'var(--ios-bg-secondary)',
              color: 'var(--ios-text-muted)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="Clear Formatting"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
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
            onKeyDown={handleEditorKeyDown}
            onClick={handleEditorClick}
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
