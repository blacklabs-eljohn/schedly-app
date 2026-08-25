import React from 'react';
import { Announcement } from '../types';
import { 
  Sparkles, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  X, 
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Download,
  ShieldAlert,
  Rocket
} from 'lucide-react';
import { triggerSuccessHaptic, triggerLightHaptic } from '../services/hapticsService';

const DEFAULT_UPDATE_URL = 'https://ethan.stoodioph.com/schedly';

interface AnnouncementModalProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ 
  announcement, 
  onDismiss 
}) => {
  const isForced = !announcement.dismissible;
  const isUpdate = announcement.variant === 'update';

  const getHeaderIcon = () => {
    switch (announcement.variant) {
      case 'warning':
        return <AlertTriangle size={24} color="#FFFFFF" />;
      case 'alert':
        return <AlertCircle size={24} color="#FFFFFF" />;
      case 'info':
        return <Info size={24} color="#FFFFFF" />;
      case 'update':
      default:
        return <Rocket size={24} color="#FFFFFF" />;
    }
  };

  const getGradient = () => {
    switch (announcement.variant) {
      case 'warning':
        return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
      case 'alert':
        return 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)';
      case 'info':
        return 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
      case 'update':
      default:
        return 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
    }
  };

  const getTargetUrl = () => {
    if (announcement.actionUrl) return announcement.actionUrl;
    if (isUpdate) return DEFAULT_UPDATE_URL;
    return null;
  };

  const targetUrl = getTargetUrl();

  const handlePrimaryAction = () => {
    triggerSuccessHaptic();
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    if (!isForced) {
      onDismiss(announcement.id);
    }
  };

  const handleDismissLater = () => {
    triggerLightHaptic();
    onDismiss(announcement.id);
  };

  // Support newline-separated bullet points in message
  const lines = announcement.message.split('\n').filter(l => l.trim().length > 0);

  const primaryButtonText = announcement.actionText 
    ? announcement.actionText 
    : isUpdate 
    ? 'Update Now' 
    : 'Got It';

  return (
    <div 
      className="ios-modal-overlay" 
      onClick={!isForced ? handleDismissLater : undefined}
      style={{ zIndex: 999 }}
    >
      <div 
        className="ios-modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
          background: 'var(--ios-card-bg)',
          borderTop: '1px solid var(--ios-glass-pill-border)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* iOS Pull Handle */}
        <div className="ios-modal-handle" />

        {/* Top Bar with Dismiss (✕) Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {/* Badge */}
          {isForced ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#DC2626',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <ShieldAlert size={12} />
              <span>Update Required</span>
            </span>
          ) : isUpdate ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'var(--ios-blue-light, rgba(37, 99, 235, 0.12))',
              color: 'var(--ios-blue)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <Sparkles size={12} />
              <span>What's New</span>
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <Info size={12} />
              <span>Notice</span>
            </span>
          )}

          {!isForced && (
            <button
              type="button"
              onClick={handleDismissLater}
              style={{
                background: 'var(--ios-card-bg-subtle, rgba(0, 0, 0, 0.05))',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ios-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Hero Header Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: getGradient(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.28)'
            }}
          >
            {getHeaderIcon()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ 
              fontSize: 20, 
              fontWeight: 800, 
              margin: 0, 
              letterSpacing: '-0.02em', 
              color: 'var(--ios-text-primary)',
              lineHeight: 1.2
            }}>
              {announcement.title || (isUpdate ? 'New Update Available' : 'Announcement')}
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', marginTop: 2 }}>
              {isUpdate ? 'Install the latest version to enjoy new features' : 'Important information for your classes'}
            </div>
          </div>
        </div>

        {/* Features / Changelog Inset Card */}
        <div 
          style={{
            background: 'var(--ios-bg-primary)',
            border: '1px solid var(--ios-card-border)',
            borderRadius: 18,
            padding: '14px 16px',
            marginBottom: 20
          }}
        >
          {lines.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map((line, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--ios-text-primary)', lineHeight: 1.45 }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    <CheckCircle2 size={13} color="#10B981" />
                  </div>
                  <span style={{ fontWeight: 500 }}>{line.replace(/^[-*•]\s*/, '')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13.5, color: 'var(--ios-text-primary)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              {announcement.message}
            </p>
          )}
        </div>

        {/* Action Button Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {/* Primary Action Button */}
          <button
            type="button"
            className="ios-btn-primary"
            onClick={handlePrimaryAction}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.28)'
            }}
          >
            {isUpdate ? <Download size={17} /> : null}
            <span>{primaryButtonText}</span>
            {!isUpdate && (targetUrl ? <ExternalLink size={16} /> : <ArrowRight size={16} />)}
          </button>

          {/* Secondary Action Button */}
          {!isForced && (
            <button
              type="button"
              onClick={handleDismissLater}
              style={{
                width: '100%',
                height: 40,
                background: 'transparent',
                border: 'none',
                color: 'var(--ios-text-secondary)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'all 0.15s ease'
              }}
            >
              {isUpdate ? 'Update Later' : 'Dismiss'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
