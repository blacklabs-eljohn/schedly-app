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
  Loader2, 
  Sparkles, 
  FileText, 
  Key, 
  CheckCircle2, 
  ExternalLink,
  Cpu,
  Image as ImageIcon
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
    setStatusMessage('Preparing document image...');
    setProgressPercent(15);
    triggerLightHaptic();

    try {
      const result = await scanCORImage(
        imageSrc,
        (status, pct) => {
          setStatusMessage(status);
          setProgressPercent(pct);
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
    setStatusMessage('Parsing pasted COR text...');
    setProgressPercent(50);
    triggerLightHaptic();

    setTimeout(() => {
      const courses = parseCORText(pastedText);
      const profile = extractStudentProfileFromCOR(pastedText);
      const totalUnits = courses.reduce((sum, c) => sum + (c.units || 3), 0);

      setIsScanning(false);
      triggerSuccessHaptic();
      onScanComplete(courses, profile, totalUnits);
    }, 400);
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
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="ios-modal-handle" />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 className="ios-modal-title" style={{ margin: 0 }}>Smart COR Scanner</h2>
              <span className="ios-tag-pill ios-tag-pill-blue" style={{ fontSize: 10, padding: '2px 6px' }}>
                AI Powered
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
              Extracts NEMSU subjects, times, units, & student ID
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

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--ios-bg-secondary)', borderRadius: 10, padding: 3, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab('upload');
            }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'upload' ? 'var(--ios-card-bg)' : 'transparent',
              color: activeTab === 'upload' ? 'var(--ios-text-primary)' : 'var(--ios-text-muted)',
              boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Camera size={14} /> Photo / Upload
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab('paste');
            }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'paste' ? 'var(--ios-card-bg)' : 'transparent',
              color: activeTab === 'paste' ? 'var(--ios-text-primary)' : 'var(--ios-text-muted)',
              boxShadow: activeTab === 'paste' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={14} /> Paste Portal Text
          </button>
        </div>

        {/* AI Key Status & Engine Selector Banner */}
        <div style={{
          background: 'var(--ios-blue-light)',
          border: '1px solid var(--ios-blue)',
          borderRadius: 12,
          padding: '10px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Sparkles size={16} color="var(--ios-blue)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-blue)' }}>
                {hasKey ? 'Gemini AI Vision Active' : 'Gemini AI Vision Ready'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ios-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hasKey ? 'High-accuracy multimodal extraction' : 'Use free Google AI Studio key or offline OCR'}
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
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ios-blue)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {hasKey ? 'Manage Key' : 'Add Free Key'}
          </button>
        </div>

        {/* Gemini API Key Drawer */}
        {showKeyConfig && (
          <div className="ios-card" style={{ marginBottom: 12, background: 'var(--ios-bg-secondary)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
              Google Gemini API Key (Optional)
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
              Gemini Vision provides near-100% reading accuracy on photos. Keys are 100% free from Google AI Studio.
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="password"
                className="ios-input"
                style={{ fontSize: 12, padding: '8px 10px' }}
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                className="ios-btn-primary"
                style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}
                onClick={handleSaveApiKey}
              >
                Save
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--ios-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <span>Get Free Gemini Key</span> <ExternalLink size={11} />
              </a>

              {hasKey && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    saveStoredGeminiApiKey('');
                    setHasKey(false);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--ios-red)', fontSize: 11, cursor: 'pointer' }}
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upload' ? (
          <>
            {/* Viewport Frame with Laser & Live Preview */}
            <div className="scanner-container" style={{ minHeight: 180, position: 'relative', overflow: 'hidden' }}>
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
                    filter: 'blur(1px)'
                  }} 
                />
              )}

              <div className="scanner-frame-guide" />
              {isScanning && <div className="scanner-laser" />}

              {isScanning ? (
                <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 20, zIndex: 10 }}>
                  <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 10px auto', color: 'var(--ios-blue)' }} />
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{statusMessage}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                    {progressPercent}% Complete
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 20, zIndex: 10 }}>
                  <ImageIcon size={38} style={{ margin: '0 auto 8px auto', opacity: 0.85 }} />
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Position NEMSU COR Inside Frame</div>
                  <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>
                    Supports JPG, JPEG, PNG, HEIC from Camera or Gallery
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button 
                className="ios-btn-primary"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning}
              >
                <Camera size={15} /> Take Photo
              </button>

              <button 
                className="ios-btn-primary"
                style={{ background: 'var(--ios-indigo)' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                <Upload size={15} /> Upload Photo
              </button>
            </div>

            {/* Test Sample Button */}
            <button 
              className="ios-btn-secondary"
              onClick={handleLoadSampleNEMSUCOR}
              disabled={isScanning}
              style={{ marginTop: 10 }}
            >
              <Sparkles size={15} color="var(--ios-blue)" /> Test with Official NEMSU Cantilan Sample
            </button>
          </>
        ) : (
          /* Paste COR Text Mode */
          <div style={{ marginTop: 4 }}>
            <div className="ios-input-group" style={{ marginBottom: 12 }}>
              <label className="ios-input-label">Paste Certificate of Registration Text</label>
              <textarea
                className="ios-input"
                style={{ height: 160, fontFamily: 'monospace', fontSize: 12, resize: 'none' }}
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
            >
              <Sparkles size={15} /> Parse Text & Generate Schedule
            </button>

            <button 
              className="ios-btn-secondary"
              onClick={handleLoadSampleNEMSUCOR}
              disabled={isScanning}
              style={{ marginTop: 10 }}
            >
              <Sparkles size={15} color="var(--ios-blue)" /> Load Sample Text
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerModal;
