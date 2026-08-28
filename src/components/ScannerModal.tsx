import React, { useState, useRef } from 'react';
import { scanCORImage } from '../services/ocrService';
import { Course, StudentProfile } from '../types';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { isNetworkOnline } from '../services/syncService';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  Zap,
  Info,
  WifiOff
} from 'lucide-react';
import { ScannerQuotaModal } from './ScannerQuotaModal';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (extractedCourses: Course[], extractedProfile?: Partial<StudentProfile>, totalUnits?: number) => void;
  onAddManually?: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  onAddManually
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessImage = async (imageSrc: string) => {
    if (!isNetworkOnline()) {
      alert('AI Document Scanning requires an active internet connection to extract schedules. You can add your subjects manually while offline.');
      return;
    }

    setPreviewImage(imageSrc);
    setIsScanning(true);
    setCurrentStep(1);
    setStatusMessage('Enhancing document contrast & clarity...');
    setProgressPercent(15);
    triggerLightHaptic();

    try {
      const result = await scanCORImage(
        imageSrc,
        (status, pct) => {
          setStatusMessage(status);
          setProgressPercent(pct);
          if (pct < 35) setCurrentStep(1);
          else if (pct < 70) setCurrentStep(2);
          else if (pct < 90) setCurrentStep(3);
          else setCurrentStep(4);
        }
      );

      triggerSuccessHaptic();
      setIsScanning(false);
      onScanComplete(result.courses, result.profile, result.totalUnits);
    } catch (err: any) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      if (
        err.name === 'QuotaExceededError' || 
        err.message?.includes('QUOTA_EXCEEDED') || 
        err.message?.toLowerCase().includes('quota') || 
        err.message?.toLowerCase().includes('resource_exhausted') ||
        err.message?.includes('429')
      ) {
        setIsQuotaModalOpen(true);
      } else {
        alert(err.message || 'Scanning encountered an issue. Please try again with a clearer photo.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleProcessImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const online = isNetworkOnline();

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div 
        className="ios-modal-sheet" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxHeight: '94vh', 
          overflowY: 'auto',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '16px 20px 32px 20px'
        }}
      >
        <div className="ios-modal-handle" style={{ marginBottom: 12 }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 20 }}>
                Smart COR Scanner
              </h2>
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  color: '#38BDF8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  letterSpacing: '0.04em'
                }}
              >
                <Zap size={11} /> AI VISION ACTIVE
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
              Upload or photograph your Certificate of Registration to extract schedule & ID
            </div>
          </div>
          <button 
            onClick={onClose}
            className="ios-modal-close-btn"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {!online && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 14,
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12.5,
            color: 'var(--ios-text-primary)'
          }}>
            <WifiOff size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong>Device is currently offline.</strong> AI Scanning requires internet. You can still add subjects manually offline.
            </div>
            {onAddManually && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddManually();
                }}
                className="ios-btn-secondary"
                style={{ width: 'auto', padding: '5px 10px', fontSize: 11.5, margin: 0 }}
              >
                Add Manually
              </button>
            )}
          </div>
        )}

        {/* AI Scanner Viewport Frame */}
        <div className="scanner-container">
          {/* Blueprint Grid Lines */}
          <div className="scanner-blueprint-grid" />

          {/* Background Thumbnail Preview if Loaded */}
          {previewImage && (
            <img 
              src={previewImage} 
              alt="COR Preview" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.35,
                filter: 'contrast(1.2) brightness(0.8)'
              }} 
            />
          )}

          {/* Holographic Frame & Corner Brackets */}
          <div className="scanner-frame-guide" />
          <div className="scanner-corner scanner-corner-tl" />
          <div className="scanner-corner scanner-corner-tr" />
          <div className="scanner-corner scanner-corner-bl" />
          <div className="scanner-corner scanner-corner-br" />

          {/* Animated Laser Sweep & Light Wash */}
          {isScanning && (
            <>
              <div className="scanner-laser" />
              <div className="scanner-laser-light-wash" />
            </>
          )}

          {/* Inner Content depending on scanning state */}
          {isScanning ? (
            <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 20, zIndex: 10, width: '88%' }}>
              {/* Multi-ring Neural AI Orb */}
              <div className="ai-processing-orb">
                <div className="ai-processing-ring-outer" />
                <div className="ai-processing-ring" />
                <Sparkles size={26} color="#38BDF8" style={{ filter: 'drop-shadow(0 0 6px #38BDF8)' }} />
              </div>

              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                {statusMessage}
              </div>

              {/* Step Progress Tracker */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {[
                  { step: 1, label: 'Image Prep' },
                  { step: 2, label: 'Gemini Vision' },
                  { step: 3, label: 'Decomposing Table' },
                  { step: 4, label: 'Verification' }
                ].map(s => {
                  const isDone = currentStep > s.step;
                  const isCurrent = currentStep === s.step;
                  return (
                    <span 
                      key={s.step}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 9.5,
                        fontWeight: 700,
                        background: isDone 
                          ? 'rgba(16, 185, 129, 0.25)' 
                          : isCurrent 
                          ? 'rgba(56, 189, 248, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        color: isDone ? '#34D399' : isCurrent ? '#38BDF8' : 'rgba(255, 255, 255, 0.5)',
                        border: isCurrent ? '1px solid #38BDF8' : '1px solid transparent'
                      }}
                    >
                      {isDone ? '✓ ' : ''}{s.label}
                    </span>
                  );
                })}
              </div>

              {/* Smooth Gradient Progress Fill */}
              <div className="ai-progress-bar-track">
                <div className="ai-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 5, fontWeight: 700 }}>
                {progressPercent}% Complete
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 24, zIndex: 10 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                color: '#38BDF8',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)'
              }}>
                <Camera size={24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
                Position Certificate of Registration Inside Frame
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 3, maxWidth: 260, margin: '3px auto 0 auto' }}>
                Keep document flat • Good lighting • Supports JPG, PNG & HEIC
              </div>
            </div>
          )}
        </div>

        {/* Hidden file & camera inputs */}
        <input 
          type="file" 
          ref={cameraInputRef} 
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" 
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileUpload} 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" 
          style={{ display: 'none' }}
          onChange={handleFileUpload} 
        />

        {/* Primary Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          <button 
            className="ios-btn-primary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
            style={{ height: 48, fontSize: 14 }}
          >
            <Camera size={17} /> Take Photo
          </button>

          <button 
            className="ios-btn-primary"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', height: 48, fontSize: 14 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            <Upload size={17} /> Upload Photo
          </button>
        </div>

        {/* Informative Gemini Free Tier notice link */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setIsQuotaModalOpen(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ios-text-muted)',
              fontSize: 11.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            <Sparkles size={13} color="var(--ios-blue)" />
            <span>Free AI Vision Tier • Daily Tokens & Quota Info</span>
            <Info size={12} />
          </button>
        </div>

        {/* Scanner Quota & Limits Informational Bottom Sheet */}
        <ScannerQuotaModal 
          isOpen={isQuotaModalOpen} 
          onClose={() => setIsQuotaModalOpen(false)} 
          onAddManually={() => {
            setIsQuotaModalOpen(false);
            onClose();
            if (onAddManually) onAddManually();
          }}
        />
      </div>
    </div>
  );
};

export default ScannerModal;
