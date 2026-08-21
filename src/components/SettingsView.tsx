import React from 'react';
import { NotificationSettings } from '../types';
import { 
  Bell, 
  Camera, 
  RotateCcw, 
  Volume2, 
  Sun, 
  Moon, 
  Cloud, 
  CloudOff, 
  LogOut, 
  RefreshCw, 
  UserCheck,
  ExternalLink
} from 'lucide-react';
import { triggerLightHaptic } from '../services/hapticsService';

interface SettingsViewProps {
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onOpenScanner: () => void;
  onResetData: () => void;
  onTestNotification: () => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  userEmail?: string;
  onSignOut?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  isOnline?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenScanner,
  onResetData,
  onTestNotification,
  onToggleTheme,
  theme,
  userEmail,
  onSignOut,
  onManualSync,
  isSyncing = false,
  isOnline = true,
}) => {
  const handleLogoutConfirm = () => {
    if (window.confirm('Are you sure you want to sign out of Schedly?')) {
      onSignOut?.();
    }
  };

  return (
    <div className="ios-section" style={{ paddingBottom: 90, paddingTop: 4 }}>
      {/* Top Header Bar: Left Title "Settings", Right Schedly Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="subjects-title">Settings</h1>

        <div className="top-utility-right">
          <div 
            className="home-logo-circle"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src="/schedly-logo.png" 
              alt="Schedly" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>

      {/* Account & Cloud Sync Section */}
      <div className="ios-section-header">Account & Cloud Sync</div>
      <div className="ios-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--ios-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--ios-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-blue)',
              flexShrink: 0
            }}>
              <UserCheck size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail || 'Authenticated Student'}
              </div>
              <div style={{ fontSize: 11.5, color: isOnline ? 'var(--ios-green)' : 'var(--ios-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                {isOnline ? (
                  <>
                    <Cloud size={12} color="var(--ios-green)" />
                    <span>Supabase Cloud Active</span>
                  </>
                ) : (
                  <>
                    <CloudOff size={12} />
                    <span>Offline Mode (Local Cache)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {onManualSync && (
            <button 
              type="button"
              className="ios-btn-secondary"
              onClick={onManualSync}
              disabled={isSyncing || !isOnline}
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12, margin: 0 }}
              title="Sync now with cloud"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}
        </div>

        {/* Sign Out Button */}
        {onSignOut && (
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, cursor: 'pointer' }}
            onClick={handleLogoutConfirm}
            role="button"
            tabIndex={0}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--ios-red-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-red)',
              flexShrink: 0
            }}>
              <LogOut size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ios-red)' }}>Sign Out</div>
              <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Log out of this device</div>
            </div>
          </div>
        )}
      </div>

      {/* Reminders & Notifications Group */}
      <div className="ios-section-header">Class Reminders</div>
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: settings.remindersEnabled ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--ios-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ios-blue)',
              flexShrink: 0
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Push Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Get notified before class begins</div>
            </div>
          </div>
          
          <label className="ios-toggle-switch">
            <input 
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={e => onUpdateSettings({ ...settings, remindersEnabled: e.target.checked })}
            />
            <span className="ios-toggle-slider" />
          </label>
        </div>

        {settings.remindersEnabled && (
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--ios-divider)' }}>
            <div className="ios-input-group" style={{ marginBottom: 12 }}>
              <label className="ios-input-label">Reminder Alert Time</label>
              <select 
                className="ios-input"
                value={settings.reminderMinutes}
                onChange={e => onUpdateSettings({ ...settings, reminderMinutes: Number(e.target.value) })}
              >
                <option value={10}>10 minutes before class</option>
                <option value={15}>15 minutes before class</option>
                <option value={30}>30 minutes before class (Recommended)</option>
                <option value={45}>45 minutes before class</option>
                <option value={60}>1 hour before class</option>
              </select>
            </div>

            <button 
              type="button"
              className="ios-btn-secondary"
              onClick={onTestNotification}
              style={{ fontSize: 13, padding: '10px 14px' }}
            >
              <Volume2 size={15} /> Test Reminder Notification
            </button>
          </div>
        )}
      </div>

      {/* COR Management Group */}
      <div className="ios-section-header">COR & Schedule Data</div>
      <div className="ios-card">
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--ios-divider)', cursor: 'pointer' }}
          onClick={onOpenScanner}
          role="button"
          tabIndex={0}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--ios-blue-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ios-blue)',
            flexShrink: 0
          }}>
            <Camera size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Scan / Re-scan COR</div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Upload camera photo of your schedule</div>
          </div>
        </div>

        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, cursor: 'pointer' }}
          onClick={onResetData}
          role="button"
          tabIndex={0}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--ios-red-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ios-red)',
            flexShrink: 0
          }}>
            <RotateCcw size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ios-red)' }}>Reset Timetable Data</div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Clear all courses and start fresh</div>
          </div>
        </div>
      </div>

      {/* About Schedly & Privacy */}
      <div className="ios-card" style={{ background: 'var(--ios-blue-light)', border: '1px solid var(--ios-blue)', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <img 
            src="/schedly-icon.png" 
            alt="Schedly" 
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
            }} 
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ios-blue)' }}>Schedly · Supabase Cloud Connected</div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-primary)', marginTop: 2, lineHeight: 1.4 }}>
              Your COR schedule and digital pass are safely backed up with Row Level Security. Fully offline-accessible on iOS PWA, Android, and Web.
            </div>
          </div>
        </div>
      </div>

      {/* Developer Credits (Instagram Link) */}
      <div className="ios-section-header">Developer & Credits</div>
      <a 
        href="https://www.instagram.com/ethan_sienes/" 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={() => triggerLightHaptic()}
        className="ios-card" 
        style={{ 
          marginBottom: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 14, 
          textDecoration: 'none', 
          color: 'inherit',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: '2px solid var(--ios-blue)',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          background: 'var(--ios-card-border)'
        }}>
          <img 
            src="/eljohn-sienes.png" 
            alt="Ethan Sienes" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ios-text-primary)' }}>Ethan Sienes</span>
            <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 9.5, padding: '1px 6px' }}>Developer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--ios-blue)', fontWeight: 700 }}>@ethan_sienes</span>
          </div>
        </div>
        <ExternalLink size={16} color="var(--ios-text-muted)" style={{ flexShrink: 0 }} />
      </a>

      {/* Legal Disclaimer & App Info Footer */}
      <div style={{ textAlign: 'center', padding: '6px 12px 16px 12px', color: 'var(--ios-text-muted)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--ios-text-secondary)' }}>
          Schedly • v1.0.0 (Build 2026)
        </div>
        <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ios-text-muted)', margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          <strong>Disclaimer:</strong> Schedly is an independent student timetable companion and digital ID tool. It is not officially affiliated with, sponsored by, or endorsed by North Eastern Mindanao State University (NEMSU). All university names, marks, and curriculum data belong to their respective institution.
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
