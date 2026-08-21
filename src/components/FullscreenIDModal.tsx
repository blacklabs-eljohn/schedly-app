import React, { useState } from 'react';
import { StudentProfile } from '../types';
import { DigitalIDCard } from './DigitalIDCard';
import { X, ShieldCheck, Edit3, Download, Loader2 } from 'lucide-react';
import { showSystemToast } from '../services/notificationService';
import { exportIDCardPNG } from '../services/imageExportService';

interface FullscreenIDModalProps {
  profile: StudentProfile | null;
  courses?: any[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const FullscreenIDModal: React.FC<FullscreenIDModalProps> = ({
  profile,
  isOpen,
  onClose,
  onEdit
}) => {
  const [isExportingCard, setIsExportingCard] = useState(false);

  if (!isOpen || !profile) return null;

  const handleExportCard = async () => {
    setIsExportingCard(true);
    try {
      await exportIDCardPNG(profile);
      showSystemToast('ID Card Saved', 'Ultra-HD Digital ID Pass downloaded.');
    } catch (e) {
      console.error(e);
      showSystemToast('Export Error', 'Could not export ID card image.');
    } finally {
      setIsExportingCard(false);
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--ios-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-blue)'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Digital Student Pass</span>
              <div style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>Tap card to flip between Front and Back</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--ios-text-muted)', cursor: 'pointer', padding: 4 }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Digital ID Display with 3D Flip */}
        <div style={{ margin: '8px 0 16px 0' }}>
          <DigitalIDCard 
            profile={profile} 
            onEditClick={onEdit} 
            onCardClick={() => {}} 
          />
        </div>

        {/* Primary Actions: Download HD PNG & Edit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          <button 
            className="ios-btn-primary" 
            onClick={handleExportCard}
            disabled={isExportingCard}
            style={{ padding: '13px 16px', fontSize: 14 }}
          >
            {isExportingCard ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span>Save HD Digital ID Pass (PNG)</span>
          </button>

          <button 
            className="ios-btn-secondary" 
            style={{ margin: 0, fontSize: 13, padding: '11px 12px' }}
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            <Edit3 size={14} /> Edit ID Information
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenIDModal;
