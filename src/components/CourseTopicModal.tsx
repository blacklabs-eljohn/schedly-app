import React, { useState, useEffect } from 'react';
import { CourseTopic, AcademicTerm } from '../types';
import { X, Trash2, Flame } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface CourseTopicModalProps {
  isOpen: boolean;
  courseId: string;
  courseCode: string;
  defaultTerm?: AcademicTerm;
  topicToEdit?: CourseTopic | null;
  onClose: () => void;
  onSaveTopic: (topic: CourseTopic) => void;
  onDeleteTopic?: (topicId: string) => void;
}

const ACADEMIC_TERMS: { id: AcademicTerm; label: string; badge: string; emoji: string }[] = [
  { id: 'prelim', label: 'Prelims', badge: 'Term 1', emoji: '📘' },
  { id: 'midterm', label: 'Midterms', badge: 'Term 2', emoji: '📙' },
  { id: 'semifinal', label: 'Semi-Finals', badge: 'Term 3', emoji: '📕' },
  { id: 'final', label: 'Finals', badge: 'Term 4', emoji: '🎓' }
];

export const CourseTopicModal: React.FC<CourseTopicModalProps> = ({
  isOpen,
  courseId,
  courseCode,
  defaultTerm = 'prelim',
  topicToEdit,
  onClose,
  onSaveTopic,
  onDeleteTopic
}) => {
  const [term, setTerm] = useState<AcademicTerm>(defaultTerm);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isKeyExamTopic, setIsKeyExamTopic] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (topicToEdit) {
      setTerm(topicToEdit.term);
      setTitle(topicToEdit.title);
      setDescription(topicToEdit.description || '');
      setIsKeyExamTopic(!!topicToEdit.isKeyExamTopic);
    } else {
      setTerm(defaultTerm);
      setTitle('');
      setDescription('');
      setIsKeyExamTopic(false);
    }
  }, [topicToEdit, defaultTerm, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    triggerSuccessHaptic();

    const topicData: CourseTopic = {
      id: topicToEdit?.id || `topic_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      courseId,
      term,
      title: title.trim(),
      description: description.trim() || undefined,
      isCompleted: topicToEdit?.isCompleted || false,
      isKeyExamTopic,
      order: topicToEdit?.order || Date.now(),
      createdAt: topicToEdit?.createdAt || new Date().toISOString()
    };

    onSaveTopic(topicData);
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
              {topicToEdit ? 'Edit Syllabus Lesson' : 'Add Syllabus Lesson'}
            </h2>
            <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 2 }}>
              Topic roadmap for {courseCode}
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
          {/* Term Segment Selector */}
          <div style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Academic Grading Period</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {ACADEMIC_TERMS.map(t => {
                const isSelected = term === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setTerm(t.id);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 2px',
                      borderRadius: 10,
                      border: isSelected ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                      background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                      color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{t.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: isSelected ? 800 : 600, marginTop: 2 }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic Title */}
          <div className="ios-input-group" style={{ marginBottom: 12 }}>
            <label className="ios-input-label">Topic / Chapter Title</label>
            <input
              type="text"
              className="ios-input"
              placeholder="e.g. Chapter 4: Normalized Relational Schemas"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Key Points / Coverage Notes */}
          <div className="ios-input-group" style={{ marginBottom: 14 }}>
            <label className="ios-input-label">Key Points / Subtopics (Optional)</label>
            <textarea
              className="ios-input"
              rows={2}
              placeholder="e.g. 1NF, 2NF, 3NF, BCNF, Functional Dependencies..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          {/* High-Yield Exam Toggle */}
          <div 
            onClick={() => {
              triggerLightHaptic();
              setIsKeyExamTopic(!isKeyExamTopic);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 12,
              border: `1.5px solid ${isKeyExamTopic ? 'rgba(239, 68, 68, 0.4)' : 'var(--ios-card-border)'}`,
              background: isKeyExamTopic ? 'rgba(239, 68, 68, 0.08)' : 'var(--ios-bg-secondary)',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: isKeyExamTopic ? 'rgba(239, 68, 68, 0.18)' : 'var(--ios-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isKeyExamTopic ? '#EF4444' : 'var(--ios-text-muted)'
              }}>
                <Flame size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isKeyExamTopic ? '#EF4444' : 'var(--ios-text-primary)' }}>
                  High-Yield / Key Exam Topic
                </div>
                <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                  Highlight for quick review before the exam
                </div>
              </div>
            </div>

            <input 
              type="checkbox" 
              checked={isKeyExamTopic} 
              onChange={() => {}} // Handled by container onClick
              style={{ accentColor: '#EF4444', width: 16, height: 16 }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="submit"
              className="ios-btn-primary"
              disabled={!title.trim()}
            >
              {topicToEdit ? 'Save Changes' : 'Add Topic to Syllabus'}
            </button>

            {topicToEdit && onDeleteTopic && (
              <button
                type="button"
                className="ios-btn-secondary"
                style={{ color: 'var(--ios-red)', borderColor: 'var(--ios-red-light)', margin: 0 }}
                onClick={() => setIsConfirmDeleteOpen(true)}
              >
                <Trash2 size={15} color="var(--ios-red)" /> Remove Topic
              </button>
            )}
          </div>
        </form>

        <ConfirmationModal
          isOpen={isConfirmDeleteOpen}
          title="Remove Syllabus Lesson?"
          message={`Are you sure you want to remove "${topicToEdit?.title || 'this topic'}" from ${courseCode}'s syllabus?`}
          confirmText="Remove Lesson"
          cancelText="Cancel"
          isDestructive={true}
          icon="trash"
          onConfirm={() => {
            if (topicToEdit && onDeleteTopic) {
              onDeleteTopic(topicToEdit.id);
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
