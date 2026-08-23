import React, { useState, useRef, useEffect } from 'react';
import { scanCORImage, ScanEngine } from '../services/ocrService';
import { parseCORText, extractStudentProfileFromCOR } from '../services/corParser';
import { getStoredGeminiApiKey, saveStoredGeminiApiKey, hasGeminiApiKey } from '../services/aiVisionService';
import { Course, StudentProfile } from '../types';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  FileText, 
  ExternalLink,
  Zap
} from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (extractedCourses: Course[], extractedProfile?: Partial<StudentProfile>, totalUnits?: number) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [engine, setEngine] = useState<ScanEngine>('auto');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Text paste input
  const [pastedText, setPastedText] = useState('');

  // Gemini API Key config drawer
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiApiKey();
      setApiKeyInput(stored);
      setHasKey(hasGeminiApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    saveStoredGeminiApiKey(apiKeyInput);
    setHasKey(hasGeminiApiKey());
    setShowKeyConfig(false);
    triggerSuccessHaptic();
  };

  const handleProcessImage = async (imageSrc: string) => {
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
        },
        engine,
        apiKeyInput
      );

      triggerSuccessHaptic();
      setIsScanning(false);
      onScanComplete(result.courses, result.profile, result.totalUnits);
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      alert('Scanning encountered an issue. Please try again or use the Paste Text option.');
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

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setIsScanning(true);
    setCurrentStep(3);
    setStatusMessage('Parsing pasted COR timetable with AI engine...');
    setProgressPercent(60);
    triggerLightHaptic();

    setTimeout(() => {
      const courses = parseCORText(pastedText);
      const profile = extractStudentProfileFromCOR(pastedText);
      const totalUnits = courses.reduce((sum, c) => sum + (c.units || 3), 0);

      setIsScanning(false);
      triggerSuccessHaptic();
      onScanComplete(courses, profile, totalUnits);
    }, 450);
  };

  const handleLoadSampleNEMSUCOR = () => {
    const sampleText = `
NORTH EASTERN MINDANAO STATE UNIVERSITY
Cantilan Campus, Cantilan, Surigao del Sur
Certificate of Registration
SY: 2026-2027 Term : 1

IDNO: 2026-01537   Last Name: CRISOSTOMO   First Name: ELJOHN   Middle Name: SIENES   Sex: M
Course: BSCS   Year Level: 1

Course No.  Section     Descriptive Title                        Time        Days Room Bldg Lec Lab Units Instructor
CS 111-     CS2019CS1C  Introduction to Computing                7:00-8:30   MTH  TBA       2.0 3.0 3.0   Cantila, Brieg
CS 112-     CS2019CS1C  Fundamentals of Programming (lec & Lab)  3:00-4:00   TF   TBA       2.0 3.0 3.0
GE-MMW      CS1C        Mathematics in the Modern World          2:30-4:00   MTH  TBA       3.0     3.0
GE-PC       CS1C        Purposive Communication                  10:00-11:30 TF   TBA       3.0     3.0
GE-US       CS1C        Understanding the Self                   1:00-2:30   MTH  TBA       3.0     3.0   Basadre,
IT 1        CS1C        Living in the IT Era                     8:30-10:00  TF   TBA       3.0     3.0   Orozco, Jennifer L
MATH 1      CS1C        Advance College Algebra                  7:00-8:30   TF   TBA       3.0     3.0
NSTP1       CS1C        National Service Training Program        7:00-11:00  SAT  TBA       3.0 0.0 3.0   Sumaoy, Roey C.
PATHFIT 1   CS1C        Movement Competency Training1            10:00-11:30 MTH  TBA       2.0     2.0   Arimang, Nancy

Total Units: 26
    `;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 1000, 1300);
      ctx.fillStyle = '#0F172A';
      ctx.font = '14px monospace';
      sampleText.split('\n').forEach((l, i) => {
        ctx.fillText(l, 36, 50 + i * 28);
      });
      handleProcessImage(canvas.toDataURL('image/jpeg', 0.95));
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
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
              Upload or snap your Certificate of Registration to extract schedule & ID
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'var(--ios-card-bg)', 
              border: '1px solid var(--ios-card-border)', 
              borderRadius: '50%', 
              width: 32, 
              height: 32, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--ios-text-muted)', 
              cursor: 'pointer' 
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--ios-bg-secondary)', borderRadius: 12, padding: 4, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab('upload');
            }}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 9,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'upload' ? 'var(--ios-card-bg)' : 'transparent',
              color: activeTab === 'upload' ? 'var(--ios-text-primary)' : 'var(--ios-text-muted)',
              boxShadow: activeTab === 'upload' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Camera size={15} color={activeTab === 'upload' ? 'var(--ios-blue)' : 'currentColor'} /> 
            <span>Photo / Upload COR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab('paste');
            }}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 9,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'paste' ? 'var(--ios-card-bg)' : 'transparent',
              color: activeTab === 'paste' ? 'var(--ios-text-primary)' : 'var(--ios-text-muted)',
              boxShadow: activeTab === 'paste' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={15} color={activeTab === 'paste' ? 'var(--ios-blue)' : 'currentColor'} /> 
            <span>Paste Portal Text</span>
          </button>
        </div>

        {/* AI Key Status & Engine Selector Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--ios-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-blue)',
              flexShrink: 0
            }}>
              <Sparkles size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>Google Gemini 3.6 Flash</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                High-precision multimodal timetable extraction
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setShowKeyConfig(!showKeyConfig);
            }}
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ios-blue)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {hasKey ? 'Key Active' : 'Configure Key'}
          </button>
        </div>

        {/* Gemini API Key Drawer */}
        {showKeyConfig && (
          <div className="ios-card" style={{ marginBottom: 14, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              Google Gemini API Key
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
              Google Gemini Vision provides human-level accuracy on photographs of paper CORs.
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="password"
                className="ios-input"
                style={{ fontSize: 12, padding: '8px 12px' }}
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                className="ios-btn-primary"
                style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}
                onClick={handleSaveApiKey}
              >
                Save
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--ios-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                <span>Get a free key from Google AI Studio</span> <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {activeTab === 'upload' ? (
          <>
            {/* Futuristic Scanning Viewport Frame */}
            <div className="scanner-container">
              {/* Blueprint Grid Lines */}
              <div className="scanner-blueprint-grid" />

              {/* Optional Background Thumbnail Preview if Loaded */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
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
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, fontWeight: 700 }}>
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
                    Position NEMSU COR Inside Frame
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
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

            {/* Official Sample Card */}
            <div 
              onClick={handleLoadSampleNEMSUCOR}
              role="button"
              tabIndex={0}
              style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'var(--ios-bg-secondary)',
                border: '1px solid var(--ios-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--ios-blue-light)',
                  color: 'var(--ios-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ios-text-primary)' }}>
                    Test Official NEMSU Cantilan Sample
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                    BSCS 1st Year · 9 Subjects · 26 Total Units
                  </div>
                </div>
              </div>

              <span className="ios-tag-pill ios-tag-pill-blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                Try Sample
              </span>
            </div>
          </>
        ) : (
          /* Paste COR Text Mode */
          <div style={{ marginTop: 4 }}>
            <div className="ios-input-group" style={{ marginBottom: 12 }}>
              <label className="ios-input-label">Paste Certificate of Registration Text</label>
              <textarea
                className="ios-input"
                style={{ height: 160, fontFamily: 'monospace', fontSize: 12, resize: 'none', borderRadius: 14 }}
                placeholder={`Paste your COR text here e.g.:
NORTH EASTERN MINDANAO STATE UNIVERSITY
IDNO: 2026-01537 Last Name: CRISOSTOMO First Name: ELJOHN
CS 111- Introduction to Computing 7:00-8:30 MTH TBA 3.0 Cantila, Brieg
GE-MMW Mathematics in the Modern World 2:30-4:00 MTH TBA 3.0`}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
              />
            </div>

            <button
              className="ios-btn-primary"
              onClick={handleProcessPastedText}
              disabled={!pastedText.trim() || isScanning}
              style={{ height: 46 }}
            >
              <Sparkles size={16} /> Parse Text & Generate Schedule
            </button>

            <button 
              className="ios-btn-secondary"
              onClick={handleLoadSampleNEMSUCOR}
              disabled={isScanning}
              style={{ marginTop: 10, height: 44 }}
            >
              <Sparkles size={15} color="var(--ios-blue)" /> Load Official NEMSU Sample
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerModal;
