import React, { useState, useEffect } from 'react';
import { CourseLink, CourseLinkType } from '../types';
import { X, Trash2, ExternalLink } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface CourseLinksModalProps {
  isOpen: boolean;
  courseId: string;
  courseCode: string;
  linkToEdit?: CourseLink | null;
  onClose: () => void;
  onSaveLink: (link: CourseLink) => void;
  onDeleteLink?: (linkId: string) => void;
}

const PRESET_TYPES: { type: CourseLinkType; label: string; icon: string; defaultTitle: string; color: string }[] = [
  { type: 'drive', label: 'Google Drive', icon: '📁', defaultTitle: 'Class Google Drive', color: '#3B82F6' },
  { type: 'chat', label: 'Messenger / Discord', icon: '💬', defaultTitle: 'Class Group Chat', color: '#8B5CF6' },
  { type: 'lms', label: 'Classroom / LMS', icon: '🎓', defaultTitle: 'Google Classroom / Canvas', color: '#10B981' },
  { type: 'meet', label: 'Zoom / Meet', icon: '📹', defaultTitle: 'Online Class Room', color: '#06B6D4' },
  { type: 'docs', label: 'Syllabus / Readings', icon: '📄', defaultTitle: 'Syllabus & Handouts', color: '#F59E0B' },
  { type: 'custom', label: 'Custom Link', icon: '🌐', defaultTitle: 'Resource Website', color: '#64748B' }
];

export const CourseLinksModal: React.FC<CourseLinksModalProps> = ({
  isOpen,
  courseId,
  courseCode,
  linkToEdit,
  onClose,
  onSaveLink,
  onDeleteLink
}) => {
  const [type, setType] = useState<CourseLinkType>('drive');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (linkToEdit) {
      setType(linkToEdit.type);
      setTitle(linkToEdit.title);
      setUrl(linkToEdit.url);
    } else {
      setType('drive');
      setTitle('Class Google Drive');
      setUrl('');
    }
  }, [linkToEdit, isOpen]);

  if (!isOpen) return null;

  // Smart URL Autodetection
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    const lower = newUrl.toLowerCase();

    if (!linkToEdit) {
      if (lower.includes('drive.google.com')) {
        setType('drive');
        if (!title || title === 'Resource Website') setTitle('Class Google Drive');
      } else if (lower.includes('messenger.com') || lower.includes('m.me') || lower.includes('discord') || lower.includes('t.me')) {
        setType('chat');
        if (!title || title === 'Class Google Drive' || title === 'Resource Website') setTitle('Class Group Chat');
      } else if (lower.includes('classroom.google.com') || lower.includes('canvas') || lower.includes('moodle') || lower.includes('instructure')) {
        setType('lms');
        if (!title || title === 'Class Google Drive' || title === 'Resource Website') setTitle('Google Classroom / LMS');
      } else if (lower.includes('zoom.us') || lower.includes('meet.google.com') || lower.includes('teams.microsoft.com')) {
        setType('meet');
        if (!title || title === 'Class Google Drive' || title === 'Resource Website') setTitle('Online Class Room');
      } else if (lower.includes('docs.google.com') || lower.includes('notion.so')) {
        setType('docs');
        if (!title || title === 'Class Google Drive' || title === 'Resource Website') setTitle('Syllabus & Handouts');
      }
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_TYPES[0]) => {
    triggerLightHaptic();
    setType(preset.type);
    if (!title || PRESET_TYPES.some(p => p.defaultTitle === title)) {
      setTitle(preset.defaultTitle);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    triggerSuccessHaptic();

    const linkData: CourseLink = {
      id: linkToEdit?.id || `link_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      courseId,
      type,
      title: title.trim() || PRESET_TYPES.find(p => p.type === type)?.defaultTitle || 'Course Resource',
      url: cleanUrl,
      createdAt: linkToEdit?.createdAt || new Date().toISOString()
    };

    onSaveLink(linkData);
    onClose();
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="ios-modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 18 }}>
              {linkToEdit ? 'Edit Resource Link' : 'Add Class Resource Link'}
            </h2>
            <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 2 }}>
              Quick access link for {courseCode}
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="ios-modal-close-btn"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Quick Preset Selector */}
          <div style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Resource Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {PRESET_TYPES.map(preset => {
                const isSelected = type === preset.type;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 4px',
                      borderRadius: 12,
                      border: isSelected ? `1.5px solid ${preset.color}` : '1px solid var(--ios-card-border)',
                      background: isSelected ? `${preset.color}15` : 'var(--ios-bg-secondary)',
                      color: isSelected ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: 3
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{preset.icon}</span>
                    <span style={{ fontSize: 10.5, fontWeight: isSelected ? 800 : 600, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link Title */}
          <div className="ios-input-group" style={{ marginBottom: 12 }}>
            <label className="ios-input-label">Display Title</label>
            <input
              type="text"
              className="ios-input"
              placeholder="e.g. Lecture Slides Drive"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Link URL */}
          <div className="ios-input-group" style={{ marginBottom: 16 }}>
            <label className="ios-input-label">Destination URL</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="ios-input"
                placeholder="https://drive.google.com/..."
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                style={{ paddingRight: 34 }}
                required
              />
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                <ExternalLink size={14} />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="submit"
              className="ios-btn-primary"
              disabled={!url.trim()}
            >
              {linkToEdit ? 'Save Changes' : 'Add Link to Course Hub'}
            </button>

            {linkToEdit && onDeleteLink && (
              <button
                type="button"
                className="ios-btn-secondary"
                style={{ color: 'var(--ios-red)', borderColor: 'var(--ios-red-light)', margin: 0 }}
                onClick={() => setIsConfirmDeleteOpen(true)}
              >
                <Trash2 size={15} color="var(--ios-red)" /> Remove Link
              </button>
            )}
          </div>
        </form>

        <ConfirmationModal
          isOpen={isConfirmDeleteOpen}
          title="Remove Resource Link?"
          message={`Are you sure you want to remove "${linkToEdit?.title || 'this link'}" from ${courseCode}?`}
          confirmText="Remove Link"
          cancelText="Cancel"
          isDestructive={true}
          icon="trash"
          onConfirm={() => {
            if (linkToEdit && onDeleteLink) {
              onDeleteLink(linkToEdit.id);
              setIsConfirmDeleteOpen(false);
              onClose();
            }
          }}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      </div>
    </div>
  );
};
