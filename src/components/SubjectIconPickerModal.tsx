import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, Check } from 'lucide-react';
import { SUBJECT_ICONS, ICON_CATEGORIES, detectSubjectIcon } from '../services/iconService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface SubjectIconPickerModalProps {
  isOpen: boolean;
  selectedIconId?: string;
  courseCode?: string;
  courseName?: string;
  courseColor?: string;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
}

export const SubjectIconPickerModal: React.FC<SubjectIconPickerModalProps> = ({
  isOpen,
  selectedIconId,
  courseCode = '',
  courseName = '',
  courseColor = '#2563EB',
  onSelectIcon,
  onClose
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveSelectedId = useMemo(() => {
    return selectedIconId || detectSubjectIcon(courseCode, courseName);
  }, [selectedIconId, courseCode, courseName]);

  const filteredIcons = useMemo(() => {
    return SUBJECT_ICONS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const handlePickIcon = (iconId: string) => {
    triggerSuccessHaptic();
    onSelectIcon(iconId);
    onClose();
  };

  const handleAutoDetect = () => {
    triggerLightHaptic();
    const detected = detectSubjectIcon(courseCode, courseName);
    onSelectIcon(detected);
    onClose();
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="ios-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 20px 28px 20px'
        }}
      >
        <div className="ios-modal-handle" />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 19 }}>
              Subject Icon
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              Pick an icon to identify {courseCode || 'this course'} at a glance
            </div>
          </div>
          <button
            type="button"
            className="ios-modal-close-btn"
            onClick={() => {
              triggerLightHaptic();
              onClose();
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Quick Auto-Detect Row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ios-text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              className="ios-input"
              placeholder="Search icons (e.g. math, code, lab, pe)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
            />
          </div>

          <button
            type="button"
            className="ios-btn-secondary"
            onClick={handleAutoDetect}
            style={{
              padding: '0 12px',
              height: 38,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              color: 'var(--ios-blue)',
              borderColor: 'var(--ios-blue)'
            }}
            title="Auto-detect icon based on subject name"
          >
            <Sparkles size={13} /> Auto
          </button>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 8,
            marginBottom: 10,
            scrollbarWidth: 'none'
          }}
        >
          {ICON_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setActiveCategory(cat.id);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1.5px solid ${isActive ? 'var(--ios-blue)' : 'var(--ios-card-border)'}`,
                  background: isActive ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                  color: isActive ? '#FFFFFF' : 'var(--ios-text-secondary)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Icons Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))',
            gap: 8,
            paddingRight: 2,
            paddingBottom: 8
          }}
        >
          {filteredIcons.map((item) => {
            const isSelected = effectiveSelectedId === item.id;
            const IconComponent = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => handlePickIcon(item.id)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 4px',
                  borderRadius: 14,
                  border: `1.5px solid ${isSelected ? 'var(--ios-blue)' : 'var(--ios-card-border)'}`,
                  background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSelected ? 'scale(1.03)' : 'scale(1)'
                }}
              >
                {/* Active Checkmark Pin */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--ios-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF'
                    }}
                  >
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}

                {/* Icon Container with Theme Tint */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isSelected ? courseColor : 'var(--ios-bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#FFFFFF' : 'var(--ios-text-primary)',
                    marginBottom: 5,
                    boxShadow: isSelected ? '0 3px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <IconComponent size={20} color={isSelected ? '#FFFFFF' : 'currentColor'} />
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: 76,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
              </div>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ios-text-muted)', fontSize: 13 }}>
            No icons found for "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectIconPickerModal;
