import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Camera, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen,
  UserCheck
} from 'lucide-react';
import { triggerSelectionHaptic, triggerSuccessHaptic, triggerLightHaptic } from '../services/hapticsService';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  isConsentMode?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  isConsentMode = false
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(1); // Open 1st section by default for instant readability

  if (!isOpen) return null;

  const toggleSection = (index: number) => {
    triggerSelectionHaptic();
    setExpandedSection(prev => (prev === index ? null : index));
  };

  const handleAcceptAndContinue = () => {
    if (!hasAgreed) return;
    triggerSuccessHaptic();
    if (onAccept) {
      onAccept();
    } else {
      onClose();
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
        padding: '16px'
      }}
      onClick={(e) => {
        if (!isConsentMode && e.target === e.currentTarget) {
          triggerLightHaptic();
          onClose();
        }
      }}
    >
      <div 
        className="ios-modal-card" 
        style={{ 
          maxWidth: 620, 
          maxHeight: '88vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 24,
          background: 'var(--ios-card-bg)',
          boxShadow: '0 24px 64px -8px rgba(0, 0, 0, 0.4), 0 8px 24px -4px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--ios-card-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--ios-divider)',
          background: 'var(--ios-card-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(96,165,250,0.24) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-blue)',
              boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
              flexShrink: 0
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ios-text-primary)', letterSpacing: '-0.02em' }}>
                Privacy Policy & Rules
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--ios-blue)', fontWeight: 600 }}>
                Schedly - Your student life, organized
              </p>
            </div>
          </div>

          {!isConsentMode && (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onClose();
              }}
              aria-label="Close"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--ios-bg-secondary)',
                border: '1px solid var(--ios-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ios-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scrollable Policy Body */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          WebkitOverflowScrolling: 'touch',
          background: 'var(--ios-bg-secondary)'
        }}>
          {/* Welcome Banner */}
          <div style={{
            background: 'var(--ios-card-bg)',
            border: '1.5px solid rgba(37,99,235,0.22)',
            borderRadius: 18,
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(37,99,235,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'rgba(37,99,235,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ios-blue)'
              }}>
                <Sparkles size={15} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ios-blue)' }}>
                Built with Student Privacy in Mind
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ios-text-primary)', lineHeight: 1.6 }}>
              Welcome to Schedly! Please review our privacy terms and student guidelines before using the app. We keep your data secure, transparent, and completely under your control.
            </p>
          </div>

          {/* Quick Key Highlights */}
          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              color: 'var(--ios-text-muted)', 
              marginBottom: 10,
              paddingLeft: 2
            }}>
              Key Guarantees
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: 10 
            }}>
              {/* Highlight 1: Digital ID */}
              <div style={{
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                borderRadius: 16,
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>🎨</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Aesthetic Digital ID
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
                  For aesthetic customization & personal style only. Not an official school ID. Nicknames & avatars are 100% welcome!
                </p>
              </div>

              {/* Highlight 2: Zero Data Selling */}
              <div style={{
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                borderRadius: 16,
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Zero Data Selling
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
                  We never sell, monetize, or rent your study load, schedule, or profile data to third-party advertisers.
                </p>
              </div>

              {/* Highlight 3: Offline-First */}
              <div style={{
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                borderRadius: 16,
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    100% Offline Ready
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
                  Your timetable and pass are saved directly on your device storage for instant access anywhere.
                </p>
              </div>

              {/* Highlight 4: AI & Scanner */}
              <div style={{
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                borderRadius: 16,
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>📷</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Safe COR Scanning
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
                  Images uploaded for schedule scanning are used strictly to extract your class timetable.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Policy Accordion Sections */}
          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              color: 'var(--ios-text-muted)', 
              marginBottom: 10,
              paddingLeft: 2
            }}>
              Detailed Terms & Rules
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Section 1: Digital ID Disclaimer */}
              <div style={{
                border: expandedSection === 1 ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                borderRadius: 16,
                background: 'var(--ios-card-bg)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}>
                <button
                  type="button"
                  onClick={() => toggleSection(1)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ios-blue)',
                      flexShrink: 0
                    }}>
                      <UserCheck size={17} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      1. Digital ID Disclaimer & Customization
                    </span>
                  </div>
                  {expandedSection === 1 ? (
                    <ChevronUp size={18} color="var(--ios-blue)" />
                  ) : (
                    <ChevronDown size={18} color="var(--ios-text-muted)" />
                  )}
                </button>
                {expandedSection === 1 && (
                  <div style={{ 
                    padding: '14px 18px 18px 18px', 
                    fontSize: 13.5, 
                    color: 'var(--ios-text-primary)', 
                    lineHeight: 1.65, 
                    borderTop: '1px solid var(--ios-divider)' 
                  }}>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong style={{ color: 'var(--ios-text-primary)' }}>Not an Official School ID:</strong> Schedly's Digital ID is designed strictly as a personalized, aesthetic profile card for students to organize their campus info in style. It does not replicate or replace an official school or university-issued identification card.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--ios-text-primary)' }}>Freedom to Customize:</strong> You can enter your full legal name, first name, or a nickname. Photo uploads are completely optional—you may upload an avatar, character artwork, or leave it blank as you prefer.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Data Collection & Use */}
              <div style={{
                border: expandedSection === 2 ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                borderRadius: 16,
                background: 'var(--ios-card-bg)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}>
                <button
                  type="button"
                  onClick={() => toggleSection(2)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ios-blue)',
                      flexShrink: 0
                    }}>
                      <BookOpen size={17} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      2. Information We Process
                    </span>
                  </div>
                  {expandedSection === 2 ? (
                    <ChevronUp size={18} color="var(--ios-blue)" />
                  ) : (
                    <ChevronDown size={18} color="var(--ios-text-muted)" />
                  )}
                </button>
                {expandedSection === 2 && (
                  <div style={{ 
                    padding: '14px 18px 18px 18px', 
                    fontSize: 13.5, 
                    color: 'var(--ios-text-primary)', 
                    lineHeight: 1.65, 
                    borderTop: '1px solid var(--ios-divider)' 
                  }}>
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <li><strong>Account Credentials:</strong> Email and password handled securely via encrypted authentication.</li>
                      <li><strong>Academic Timetable:</strong> Course titles, codes, meeting times, instructors, and room numbers.</li>
                      <li><strong>COR Documents:</strong> Images processed during schedule scan are used solely for text extraction.</li>
                      <li><strong>Preferences:</strong> Reminder minutes, active themes, and notification triggers.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Section 3: App Permissions & Storage */}
              <div style={{
                border: expandedSection === 3 ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                borderRadius: 16,
                background: 'var(--ios-card-bg)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}>
                <button
                  type="button"
                  onClick={() => toggleSection(3)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ios-blue)',
                      flexShrink: 0
                    }}>
                      <Camera size={17} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      3. Device Permissions & Cloud Sync
                    </span>
                  </div>
                  {expandedSection === 3 ? (
                    <ChevronUp size={18} color="var(--ios-blue)" />
                  ) : (
                    <ChevronDown size={18} color="var(--ios-text-muted)" />
                  )}
                </button>
                {expandedSection === 3 && (
                  <div style={{ 
                    padding: '14px 18px 18px 18px', 
                    fontSize: 13.5, 
                    color: 'var(--ios-text-primary)', 
                    lineHeight: 1.65, 
                    borderTop: '1px solid var(--ios-divider)' 
                  }}>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>Camera / Photo Library:</strong> Used only when taking a photo of your schedule or selecting an ID avatar.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Push Notifications:</strong> Used strictly to schedule class alarms and timetable reminders on your device.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 4: Rules & Guidelines */}
              <div style={{
                border: expandedSection === 4 ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                borderRadius: 16,
                background: 'var(--ios-card-bg)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}>
                <button
                  type="button"
                  onClick={() => toggleSection(4)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ios-blue)',
                      flexShrink: 0
                    }}>
                      <Lock size={17} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      4. Student Guidelines & Data Deletion
                    </span>
                  </div>
                  {expandedSection === 4 ? (
                    <ChevronUp size={18} color="var(--ios-blue)" />
                  ) : (
                    <ChevronDown size={18} color="var(--ios-text-muted)" />
                  )}
                </button>
                {expandedSection === 4 && (
                  <div style={{ 
                    padding: '14px 18px 18px 18px', 
                    fontSize: 13.5, 
                    color: 'var(--ios-text-primary)', 
                    lineHeight: 1.65, 
                    borderTop: '1px solid var(--ios-divider)' 
                  }}>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>Responsible Use:</strong> Do not attempt to use the aesthetic Digital ID to falsely impersonate other individuals or commit official academic fraud.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Full Data Control:</strong> You can edit or wipe your local schedule anytime under Settings. You may also request complete account deletion at any point.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Developer Credit Footer */}
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ios-text-muted)',
            padding: '8px 0 4px 0'
          }}>
            Developed by <strong style={{ color: 'var(--ios-text-primary)' }}>Ethan Sienes</strong> (BlackLabs) • Version 1.2
          </div>
        </div>

        {/* Modal Footer / Consent Controls */}
        <div style={{
          padding: '16px 22px 18px 22px',
          borderTop: '1px solid var(--ios-divider)',
          background: 'var(--ios-card-bg)',
          flexShrink: 0
        }}>
          {isConsentMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Checkbox Agreement */}
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 12, 
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div 
                  onClick={() => {
                    triggerSelectionHaptic();
                    setHasAgreed(!hasAgreed);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    border: hasAgreed ? 'none' : '2px solid var(--ios-card-border)',
                    background: hasAgreed ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    marginTop: 1,
                    transition: 'all 0.2s ease',
                    boxShadow: hasAgreed ? '0 2px 8px rgba(37,99,235,0.35)' : 'none'
                  }}
                >
                  {hasAgreed && <Check size={15} strokeWidth={3} />}
                </div>
                <span 
                  onClick={() => {
                    triggerSelectionHaptic();
                    setHasAgreed(!hasAgreed);
                  }}
                  style={{ fontSize: 13.5, color: 'var(--ios-text-primary)', lineHeight: 1.45 }}
                >
                  I have read and agree to the <strong style={{ color: 'var(--ios-blue)' }}>Privacy Policy</strong>, <strong style={{ color: 'var(--ios-blue)' }}>Terms of Use</strong>, and <strong style={{ color: 'var(--ios-blue)' }}>Student Guidelines</strong>.
                </span>
              </label>

              {/* Accept & Continue Button */}
              <button
                type="button"
                disabled={!hasAgreed}
                onClick={handleAcceptAndContinue}
                className="ios-btn-primary"
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 800,
                  opacity: hasAgreed ? 1 : 0.45,
                  cursor: hasAgreed ? 'pointer' : 'not-allowed',
                  boxShadow: hasAgreed ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Accept & Get Started
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onClose();
              }}
              className="ios-btn-primary"
              style={{
                width: '100%',
                height: 48,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
