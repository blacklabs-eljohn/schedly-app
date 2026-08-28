import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  PlusCircle, 
  Key, 
  Check, 
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { getStoredGeminiApiKey, saveStoredGeminiApiKey } from '../services/aiVisionService';

interface ScannerQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddManually?: () => void;
}

export const ScannerQuotaModal: React.FC<ScannerQuotaModalProps> = ({
  isOpen,
  onClose,
  onAddManually
}) => {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState(() => getStoredGeminiApiKey());
  const [keySaved, setKeySaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKey.trim()) {
      saveStoredGeminiApiKey(customKey.trim());
      setKeySaved(true);
      triggerSuccessHaptic();
      setTimeout(() => {
        setKeySaved(false);
        onClose();
      }, 1200);
    }
  };

  const handleManualAction = () => {
    triggerLightHaptic();
    onClose();
    if (onAddManually) {
      onAddManually();
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="ios-modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 20px 28px 20px'
        }}
      >
        {/* iOS Drag Handle */}
        <div className="ios-modal-handle" />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: 12, 
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)', 
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="ios-modal-title" style={{ margin: 0, fontSize: 18 }}>
                Free AI Scanner Notice
              </h2>
              <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                Google Gemini Community API Quota
              </div>
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

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
          
          {/* Main Friendly Notice Card */}
          <div 
            className="ios-card" 
            style={{ 
              padding: '14px 16px', 
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(99, 102, 241, 0.04) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.18)',
              marginBottom: 14 
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={15} color="var(--ios-blue)" /> Why did the scanner reach its limit?
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Schedly is a <strong>free, student-built passion project</strong>. To keep the smart OCR scanner 100% free for all students, it runs on Google Gemini’s shared community free tier.
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
              During peak enrollment hours when hundreds of students upload CORs simultaneously, our shared daily AI tokens may temporarily cap out.
            </p>
          </div>

          {/* Reset Information Banner */}
          <div 
            className="detail-grouped-list" 
            style={{ padding: '12px 14px', marginBottom: 14 }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--ios-green)', marginTop: 2 }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  ✨ Does the token quota reset?
                </div>
                <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2, lineHeight: 1.45 }}>
                  <strong>Yes, absolutely!</strong> Google automatically resets our free token quota <strong>every day at midnight (Pacific Time)</strong>. If it was just a temporary 1-minute burst, you can also retry in a few minutes.
                </div>
              </div>
            </div>
          </div>

          {/* What to do next */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-muted)', marginBottom: 8, letterSpacing: '0.03em' }}>
              Recommended Alternatives
            </div>

            {/* Alternative 1: Add Manually */}
            <button
              type="button"
              onClick={handleManualAction}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--ios-blue)',
                background: 'var(--ios-blue-light)',
                color: 'var(--ios-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: 8,
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PlusCircle size={18} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Add Subjects Manually</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>Takes less than a minute • No AI tokens needed</div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800 }}>Fast ⚡</span>
            </button>

            {/* Custom Gemini Key Option (Expandable) */}
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setShowKeyInput(!showKeyInput);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-muted)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 2px'
                }}
              >
                <Key size={12} /> {showKeyInput ? 'Hide Custom API Key Options' : 'Have your own Google Gemini Key? (Unlimited Scans)'}
              </button>

              {showKeyInput && (
                <form onSubmit={handleSaveKey} style={{ marginTop: 8, padding: '12px', background: 'var(--ios-bg-secondary)', borderRadius: 12, border: '1px solid var(--ios-card-border)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    If you created a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--ios-blue)', textDecoration: 'underline' }}>aistudio.google.com</a>, paste it here to get your own private quota:
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="password"
                      className="ios-input"
                      placeholder="AIzaSy..."
                      value={customKey}
                      onChange={e => setCustomKey(e.target.value)}
                      style={{ fontSize: 12, padding: '8px 10px' }}
                    />
                    <button 
                      type="submit" 
                      className="ios-btn-primary" 
                      style={{ fontSize: 12, padding: '0 14px', flexShrink: 0 }}
                    >
                      {keySaved ? <Check size={14} /> : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Primary Dismiss Button */}
          <button
            type="button"
            className="ios-btn-primary"
            onClick={() => {
              triggerLightHaptic();
              onClose();
            }}
            style={{ width: '100%', padding: '12px', fontSize: 13.5, fontWeight: 800 }}
          >
            Understood
          </button>
        </div>

      </div>
    </div>
  );
};

export default ScannerQuotaModal;
