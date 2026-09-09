import React from 'react';
import { Trash2, LogOut, RotateCcw, AlertTriangle } from 'lucide-react';
import { triggerLightHaptic, triggerWarningHaptic } from '../services/hapticsService';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: 'trash' | 'warning' | 'logout' | 'reset';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  icon = 'trash',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case 'logout':
        return <LogOut size={22} color="#EF4444" />;
      case 'reset':
        return <RotateCcw size={22} color="#F59E0B" />;
      case 'warning':
        return <AlertTriangle size={22} color="#F59E0B" />;
      case 'trash':
      default:
        return <Trash2 size={22} color="#EF4444" />;
    }
  };

  return (
    <div 
      className="ios-modal-overlay" 
      style={{ 
        zIndex: 99999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        position: 'fixed',
        inset: 0
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          background: 'var(--ios-card-bg)',
          borderRadius: 22,
          padding: '24px 20px 20px',
          width: '100%',
          maxWidth: 340,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--ios-card-border)',
          textAlign: 'center',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isDestructive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}
        >
          {renderIcon()}
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ios-text-secondary)', lineHeight: 1.45 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="ios-btn-secondary"
            style={{ flex: 1, margin: 0, padding: '11px 0', fontSize: 14, fontWeight: 600 }}
            onClick={() => {
              triggerLightHaptic();
              onCancel();
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              margin: 0,
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 14,
              border: 'none',
              background: isDestructive ? '#EF4444' : 'var(--ios-blue)',
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: isDestructive ? '0 4px 12px rgba(239, 68, 68, 0.35)' : '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}
            onClick={() => {
              if (isDestructive) triggerWarningHaptic();
              else triggerLightHaptic();
              onConfirm();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
