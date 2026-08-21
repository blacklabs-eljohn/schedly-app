import React, { useState, useEffect, useRef } from 'react';
import { StudentProfile, IDTheme } from '../types';
import { X, Camera, Check, Palette, Trash2, Shield } from 'lucide-react';

interface EditIDModalProps {
  profile: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: StudentProfile) => void;
}

const THEME_OPTIONS: { id: IDTheme; name: string; gradient: string }[] = [
  { id: 'digital-blue', name: 'Navy & Gold', gradient: 'linear-gradient(145deg, #0F2042, #1A365D)' },
  { id: 'silver-specular', name: 'Midnight Slate', gradient: 'linear-gradient(145deg, #1E293B, #0F172A)' },
  { id: 'lime-tech', name: 'Emerald Campus', gradient: 'linear-gradient(145deg, #064E3B, #065F46)' },
  { id: 'y2k-pink', name: 'Sunset Coral', gradient: 'linear-gradient(145deg, #9F1239, #BE123C)' },
  { id: 'lavender', name: 'Cyber Lavender', gradient: 'linear-gradient(145deg, #4338CA, #3730A3)' },
  { id: 'minimal-white', name: 'Clean White', gradient: 'linear-gradient(145deg, #FFFFFF, #E2E8F0)' }
];

export const EditIDModal: React.FC<EditIDModalProps> = ({
  profile: initialProfile,
  isOpen,
  onClose,
  onSave
}) => {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state every time modal opens or initialProfile updates
  useEffect(() => {
    if (initialProfile && isOpen) {
      setProfile({
        ...initialProfile,
        schoolName: initialProfile.schoolName || 'NEMSU',
        academicYear: initialProfile.academicYear || '2026–2027',
        fullName: initialProfile.fullName || '',
        studentNumber: initialProfile.studentNumber || '',
        program: initialProfile.program || '',
        yearLevel: initialProfile.yearLevel || '1ST YEAR',
        section: initialProfile.section || '',
        profilePhoto: initialProfile.profilePhoto || '',
        emergencyContactName: initialProfile.emergencyContactName || '',
        emergencyContactPhone: initialProfile.emergencyContactPhone || '',
        bloodType: initialProfile.bloodType || 'O+'
      });
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleUpdateField = (field: keyof StudentProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleUpdateField('profilePhoto', evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    handleUpdateField('profilePhoto', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="ios-modal-title" style={{ margin: 0 }}>Edit Student Pass</h2>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              Personalize your digital ID pass, school branding, and info
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

        {/* Profile Photo Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <div className="id-photo-container" style={{ width: 76, height: 90, marginBottom: 8, borderRadius: 14, overflow: 'hidden' }}>
            {profile.profilePhoto ? (
              <img 
                src={profile.profilePhoto} 
                alt="Student" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ios-bg-primary)' }}>
                <Camera size={22} color="var(--ios-text-muted)" />
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/jpeg,image/png,image/jpg,image/webp,image/heic,image/*" 
            style={{ display: 'none' }}
            onChange={handlePhotoUpload} 
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button"
              className="ios-btn-secondary" 
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12.5, margin: 0 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={13} /> {profile.profilePhoto ? 'Change Photo' : 'Upload Photo'}
            </button>

            {profile.profilePhoto && (
              <button 
                type="button"
                className="ios-btn-secondary" 
                style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5, color: 'var(--ios-red)', margin: 0 }}
                onClick={handleRemovePhoto}
                title="Remove photo"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Theme Picker */}
        <div className="ios-input-group" style={{ marginBottom: 16 }}>
          <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Palette size={13} color="var(--ios-blue)" /> Card Style Theme
          </label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px' }}>
            {THEME_OPTIONS.map(theme => (
              <div 
                key={theme.id}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: theme.gradient,
                  cursor: 'pointer',
                  border: profile.selectedTheme === theme.id ? '2px solid var(--ios-blue)' : '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: profile.selectedTheme === theme.id ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  boxShadow: profile.selectedTheme === theme.id ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                  flexShrink: 0
                }}
                onClick={() => handleUpdateField('selectedTheme', theme.id)}
                title={theme.name}
              >
                {profile.selectedTheme === theme.id && (
                  <Check size={16} color={theme.id === 'minimal-white' ? '#0F172A' : '#FFFFFF'} />
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 4, fontWeight: 600 }}>
            Theme: {THEME_OPTIONS.find(t => t.id === profile.selectedTheme)?.name || 'Navy & Gold'}
          </div>
        </div>

        {/* School Name & Branding */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ios-input-group">
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={12} color="var(--ios-blue)" /> School / University
            </label>
            <input 
              className="ios-input"
              value={profile.schoolName || ''}
              onChange={e => handleUpdateField('schoolName', e.target.value)}
              placeholder="e.g. NEMSU"
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Academic Year</label>
            <input 
              className="ios-input"
              value={profile.academicYear || ''}
              onChange={e => handleUpdateField('academicYear', e.target.value)}
              placeholder="e.g. 2026–2027"
            />
          </div>
        </div>

        {/* Editable Form Inputs */}
        <div className="ios-input-group">
          <label className="ios-input-label">Full Name</label>
          <input 
            className="ios-input"
            value={profile.fullName || ''}
            onChange={e => handleUpdateField('fullName', e.target.value)}
            placeholder="e.g. Ethan Rivera"
          />
        </div>

        <div className="ios-input-group">
          <label className="ios-input-label">Student ID Number</label>
          <input 
            className="ios-input"
            value={profile.studentNumber || ''}
            onChange={e => handleUpdateField('studentNumber', e.target.value)}
            placeholder="e.g. 2026-10492"
          />
        </div>

        <div className="ios-input-group">
          <label className="ios-input-label">Academic Program / Degree</label>
          <input 
            className="ios-input"
            value={profile.program || ''}
            onChange={e => handleUpdateField('program', e.target.value)}
            placeholder="e.g. BS Computer Science"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Year Level</label>
            <input 
              className="ios-input"
              value={profile.yearLevel || ''}
              onChange={e => handleUpdateField('yearLevel', e.target.value)}
              placeholder="e.g. 1st Year"
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Section</label>
            <input 
              className="ios-input"
              value={profile.section || ''}
              onChange={e => handleUpdateField('section', e.target.value)}
              placeholder="e.g. Sec 1"
            />
          </div>
        </div>

        {/* Emergency Contact & Medical Info (for Back of ID Pass) */}
        <div className="ios-section-header" style={{ marginTop: 8, marginBottom: 8 }}>
          Emergency & Medical Information
        </div>

        <div className="ios-input-group">
          <label className="ios-input-label">Emergency Contact Person</label>
          <input 
            className="ios-input"
            value={profile.emergencyContactName || ''}
            onChange={e => handleUpdateField('emergencyContactName', e.target.value)}
            placeholder="e.g. Maria Rivera (Mother)"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div className="ios-input-group">
            <label className="ios-input-label">Emergency Contact Phone</label>
            <input 
              className="ios-input"
              value={profile.emergencyContactPhone || ''}
              onChange={e => handleUpdateField('emergencyContactPhone', e.target.value)}
              placeholder="e.g. +63 912 345 6789"
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-input-label">Blood Type</label>
            <select 
              className="ios-input"
              value={profile.bloodType || 'O+'}
              onChange={e => handleUpdateField('bloodType', e.target.value)}
            >
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button 
            type="button"
            className="ios-btn-primary"
            onClick={() => onSave(profile)}
          >
            Save ID Pass
          </button>

          <button 
            type="button"
            className="ios-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditIDModal;
