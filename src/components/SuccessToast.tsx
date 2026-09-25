import React, { useEffect } from 'react';
import { LottieAnimation } from './LottieAnimation';
import successAnim from '../assets/Success.json';
import { triggerSuccessHaptic } from '../services/hapticsService';

interface SuccessToastProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onClose?: () => void;
  duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  isOpen,
  title,
  message,
  onClose,
  duration = 2000
}) => {
  useEffect(() => {
    if (isOpen) {
      triggerSuccessHaptic();
      if (duration > 0 && onClose) {
        const timer = setTimeout(() => {
          onClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-area-top, 0px) + 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px 10px 12px',
        borderRadius: 24,
        background: 'rgba(28, 28, 30, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        color: '#FFFFFF',
        maxWidth: '90vw',
        animation: 'toastSlideDown 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pointerEvents: 'auto',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <div style={{ width: 34, height: 34, flexShrink: 0, overflow: 'hidden' }}>
        <LottieAnimation animationData={successAnim} loop={false} width={34} height={34} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2, color: '#FFFFFF', lineHeight: 1.25 }}>
          {title}
        </span>
        {message && (
          <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2, lineHeight: 1.2 }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
};
