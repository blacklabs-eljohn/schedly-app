import React, { useState } from 'react';
import { StudentProfile } from '../types';
import { QrCode, Shield, Phone, Heart } from 'lucide-react';

interface DigitalIDCardProps {
  profile: StudentProfile;
  onEditClick: () => void;
  onCardClick: () => void;
}

export const DigitalIDCard: React.FC<DigitalIDCardProps> = ({
  profile,
  onCardClick
}) => {
  const [isFlipped] = useState(false);

  const getThemeClass = () => {
    if (!profile) return 'theme-app-dynamic';
    // If user has 'Use App Theme' enabled (default), dynamically follow the active Schedly theme
    if (profile.useAppTheme !== false || profile.selectedTheme === 'app-dynamic') {
      return 'theme-app-dynamic';
    }

    switch (profile.selectedTheme) {
      case 'digital-blue': return 'theme-navy-gold';
      case 'silver-specular': return 'theme-midnight-slate';
      case 'lime-tech': return 'theme-emerald-campus';
      case 'y2k-pink': return 'theme-sunset-coral';
      case 'lavender': return 'theme-cyber-lavender';
      case 'minimal-white': return 'theme-clean-white';
      default: return 'theme-app-dynamic';
    }
  };

  const handleToggleFlip = () => {
    onCardClick();
  };

  return (
    <div className="digital-id-3d-scene">
      <div className={`digital-id-3d-card ${isFlipped ? 'is-flipped' : ''}`}>
        
        {/* FRONT FACE OF DIGITAL ID */}
        <div 
          id="digital-id-card-capture"
          className={`digital-id-face digital-id-front ${getThemeClass()}`}
          onClick={handleToggleFlip}
          role="button"
          tabIndex={0}
          style={{ padding: '18px 20px', cursor: 'pointer' }}
        >
          {/* Holographic Metallic Shimmer Light Sweep */}
          <div className="id-card-shimmer-sweep" aria-hidden="true" />

          {/* Clean Top Row: School Branding Only */}
          <div className="id-card-top-row" style={{ marginBottom: 12 }}>
            <div className="id-card-school" style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em' }}>
              <Shield size={15} />
              <span>{profile.schoolName || 'NEMSU'}</span>
            </div>
          </div>

          {/* Body Info */}
          <div className="id-card-body">
            <div className="id-photo-container">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Student" />
              ) : (
                <div style={{ fontSize: 24 }}>🎓</div>
              )}
            </div>

            <div className="id-info-col">
              <h3 className="id-student-name">{profile.fullName || 'Student Name'}</h3>
              <p className="id-student-program">{profile.program || 'Degree Program'}</p>

              <div className="id-meta-grid">
                <div className="id-meta-cell">
                  <label>YEAR</label>
                  <span>{profile.yearLevel || '1st Year'}</span>
                </div>
                <div className="id-meta-cell">
                  <label>SECTION</label>
                  <span>{profile.section || 'Sec 1'}</span>
                </div>
                <div className="id-meta-cell">
                  <label>A.Y.</label>
                  <span>{profile.academicYear || '2026–2027'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Barcode */}
          <div className="id-card-footer">
            <div>
              <div className="id-number-tag">{profile.studentNumber || '2026-10492'}</div>
              <div className="id-tap-hint">
                <span>Tap for pass details</span>
              </div>
            </div>

            <div className="id-barcode-bars">
              {[4, 2, 6, 3, 2, 5, 2, 4, 3, 6, 2, 4, 3, 2, 5, 3, 2, 4, 6].map((w, i) => (
                <div key={i} className="id-barcode-line" style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* BACK FACE OF DIGITAL ID */}
        <div 
          className={`digital-id-face digital-id-back ${getThemeClass()}`}
          onClick={handleToggleFlip}
          role="button"
          tabIndex={0}
        >
          {/* Holographic Metallic Shimmer Light Sweep */}
          <div className="id-card-shimmer-sweep" aria-hidden="true" />

          {/* Back Header */}
          <div className="id-card-top-row" style={{ marginBottom: 8 }}>
            <div className="id-card-school">
              <QrCode size={14} />
              <span>DIGITAL CAMPUS PASS</span>
            </div>
          </div>

          {/* Emergency & QR Center */}
          <div className="id-back-qr-row">
            <div className="id-qr-box">
              <svg viewBox="0 0 100 100" width="64" height="64">
                <rect x="0" y="0" width="30" height="30" fill="#0F172A" />
                <rect x="5" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="10" width="10" height="10" fill="#0F172A" />
                
                <rect x="70" y="0" width="30" height="30" fill="#0F172A" />
                <rect x="75" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="80" y="10" width="10" height="10" fill="#0F172A" />

                <rect x="0" y="70" width="30" height="30" fill="#0F172A" />
                <rect x="5" y="75" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="80" width="10" height="10" fill="#0F172A" />

                <rect x="40" y="10" width="20" height="10" fill="#0F172A" />
                <rect x="40" y="40" width="20" height="20" fill="#0F172A" />
                <rect x="70" y="40" width="10" height="30" fill="#0F172A" />
                <rect x="40" y="70" width="20" height="10" fill="#0F172A" />
                <rect x="80" y="80" width="15" height="15" fill="#0F172A" />
              </svg>
            </div>

            {/* Emergency Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>
                IN CASE OF EMERGENCY
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.emergencyContactName || 'Parent / Guardian'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Phone size={10} /> {profile.emergencyContactPhone || '+63 912 345 6789'}
              </div>

              {profile.bloodType && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '1px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>
                  <Heart size={9} /> Blood Type: {profile.bloodType}
                </div>
              )}
            </div>
          </div>

          {/* Verification & Security Notice */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: 6, fontSize: 8.5, opacity: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Verified Student Pass · Schedly</span>
            <span style={{ fontFamily: 'var(--ios-font-mono)' }}>ID: {profile.studentNumber}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DigitalIDCard;
