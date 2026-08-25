import React from 'react';
import { Announcement } from '../types';
import { 
  AlertTriangle, 
  Info, 
  Sparkles, 
  AlertCircle, 
  X, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { triggerLightHaptic } from '../services/hapticsService';

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ 
  announcement, 
  onDismiss 
}) => {
  const getIcon = () => {
    switch (announcement.variant) {
      case 'warning':
        return <AlertTriangle size={16} color="#D97706" />;
      case 'alert':
        return <AlertCircle size={16} color="#E11D48" />;
      case 'update':
        return <Sparkles size={16} color="#6366F1" />;
      case 'info':
      default:
        return <Info size={16} color="#2563EB" />;
    }
  };

  const getBannerStyle = (): { bg: string; border: string; textColor: string } => {
    switch (announcement.variant) {
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
          textColor: 'var(--ios-text-primary)'
        };
      case 'alert':
        return {
          bg: 'rgba(225, 29, 72, 0.12)',
          border: 'rgba(225, 29, 72, 0.35)',
          textColor: 'var(--ios-text-primary)'
        };
      case 'update':
        return {
          bg: 'rgba(99, 102, 241, 0.12)',
          border: 'rgba(99, 102, 241, 0.35)',
          textColor: 'var(--ios-text-primary)'
        };
      case 'info':
      default:
        return {
          bg: 'rgba(37, 99, 235, 0.10)',
          border: 'rgba(37, 99, 235, 0.28)',
          textColor: 'var(--ios-text-primary)'
        };
    }
  };

  const styles = getBannerStyle();

  const handleActionClick = () => {
    triggerLightHaptic();
    if (announcement.actionUrl) {
      window.open(announcement.actionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="announcement-banner-card"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 14,
        padding: '10px 14px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'relative',
        animation: 'ios-fade-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        {getIcon()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {announcement.title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: styles.textColor, marginBottom: 2, letterSpacing: '-0.01em' }}>
            {announcement.title}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--ios-text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {announcement.message}
        </div>

        {announcement.actionText && (
          <button
            type="button"
            onClick={handleActionClick}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0 0 0',
              color: 'var(--ios-blue)',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <span>{announcement.actionText}</span>
            {announcement.actionUrl ? <ExternalLink size={11} /> : <ChevronRight size={12} />}
          </button>
        )}
      </div>

      {announcement.dismissible && (
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onDismiss(announcement.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ios-text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            flexShrink: 0
          }}
          aria-label="Dismiss announcement"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
