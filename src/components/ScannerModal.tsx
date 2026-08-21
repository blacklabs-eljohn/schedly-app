import React, { useState, useRef } from 'react';
import { scanCORImage } from '../services/ocrService';
import { Course, StudentProfile } from '../types';
import { Camera, Upload, X, Loader2, Sparkles, FileImage } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (extractedCourses: Course[], extractedProfile?: Partial<StudentProfile>) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessImage = async (imageSrc: string) => {
    setIsScanning(true);
    setStatusMessage('Reading Certificate of Registration...');
    setProgressPercent(10);

    const result = await scanCORImage(imageSrc, (status, pct) => {
      setStatusMessage(status);
      setProgressPercent(pct);
    });

    setIsScanning(false);
    onScanComplete(result.courses, result.profile);
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

  const handleLoadSampleNEMSUCOR = () => {
    const sampleText = `
NORTH EASTERN MINDANAO STATE UNIVERSITY
Cantilan Campus, Cantilan, Surigao del Sur
Certificate of Registration
SY: 2026-2027 Term : 1

IDNO: 2026-01537   Last Name: CRISOSTOMO   First Name: ELJOHN   Middle Name: SIENES   Sex: M
Course: BSCS   Year Level: 1

CS 111- CS2019CS1C Introduction to Computing 7:00-8:30 MTH TBA 2.0 3.0 3.0 Cantila, Brieg
CS 112- CS2019CS1C Fundamentals of Programming (lec & Lab) 3:00-4:00 TF TBA 2.0 3.0 3.0
GE-MMW CS1C Mathematics in the Modern World 2:30-4:00 MTH TBA 3.0 3.0
GE-PC CS1C Purposive Communication 10:00-11:30 TF TBA 3.0 3.0
GE-US CS1C Understanding the Self 1:00-2:30 MTH TBA 3.0 3.0 Basadre,
IT 1 CS1C Living in the IT Era 8:30-10:00 TF TBA 3.0 3.0 Orozco, Jennifer L
MATH 1 CS1C Advance College Algebra 7:00-8:30 TF TBA 3.0 3.0
NSTP1 CS1C National Service Training Program 7:00-11:00 SAT TBA 3.0 0.0 3.0 Sumaoy, Roey C.
PATHFIT 1 CS1C Movement Competency Training1 10:00-11:30 MTH TBA 2.0 2.0 Arimang, Nancy
    `;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 900, 1200);
      ctx.fillStyle = '#0F172A';
      ctx.font = '14px monospace';
      sampleText.split('\n').forEach((l, i) => {
        ctx.fillText(l, 30, 40 + i * 26);
      });
      handleProcessImage(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0 }}>Scan COR Schedule</h2>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              Upload JPG, JPEG, PNG, or take a photo of your COR
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

        {/* Viewport Frame */}
        <div className="scanner-container">
          <div className="scanner-frame-guide" />
          <div className="scanner-laser" />

          {isScanning ? (
            <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 20, zIndex: 10 }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 10px auto', color: 'var(--ios-blue)' }} />
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{statusMessage}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>{progressPercent}% Processing</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#FFFFFF', padding: 20, zIndex: 10 }}>
              <FileImage size={40} style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>Place NEMSU COR Inside Frame</div>
              <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>
                Supports JPG, JPEG, PNG, WEBP, and Camera capture
              </div>
            </div>
          )}
        </div>

        {/* Hidden inputs with universal JPG, JPEG, PNG support */}
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

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
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
            <Upload size={15} /> Upload File (JPG/PNG)
          </button>
        </div>

        <button 
          className="ios-btn-secondary"
          onClick={handleLoadSampleNEMSUCOR}
          disabled={isScanning}
          style={{ marginTop: 8 }}
        >
          <Sparkles size={15} color="var(--ios-blue)" /> Test with Official NEMSU Sample COR
        </button>
      </div>
    </div>
  );
};

export default ScannerModal;
