import React from 'react';
import { NotificationSettings } from '../types';
import { 
  Bell, 
  Palette, 
  Camera, 
  RotateCcw, 
  Volume2, 
  Cloud, 
  CloudOff, 
  LogOut, 
  RefreshCw, 
  UserCheck
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
    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
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

      {/* Account & Schedule Sync Section */}
      <div className="ios-section-header">Account & Schedule Backup</div>
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
                    <span>Schedule Synced & Backed Up</span>
                  </>
                ) : (
                  <>
                    <CloudOff size={12} />
                    <span>Saved Locally (Offline Mode)</span>
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

      {/* Subject Card Aesthetic Style Group */}
      {/* Color Theme (8 Schedly Personalities) */}
      <div className="ios-section-header">Color Theme</div>
      <div className="ios-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
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
            <Palette size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Visual Personality</div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Same Schedly. Different personality.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              id: 'bluebook' as const,
              name: 'Bluebook',
              badge: 'Classic',
              emoji: '🔵',
              personality: 'Academic, familiar, classic Schedly',
              swatches: ['#60A5FA', '#2563EB', '#1E3A8A', '#0F172A'],
              aliases: ['blue-cascade']
            },
            {
              id: 'crimson' as const,
              name: 'Crimson',
              badge: 'Bold',
              emoji: '🔴',
              personality: 'Bold, energetic, confident',
              swatches: ['#F87171', '#EF4444', '#DC2626', '#991B1B'],
              aliases: []
            },
            {
              id: 'bini' as const,
              name: 'Bini',
              badge: 'Playful',
              emoji: '🌸',
              personality: 'Fun, youthful, stylish & modern',
              swatches: ['#F472B6', '#EC4899', '#DB2777', '#BE185D'],
              aliases: []
            },
            {
              id: 'ube' as const,
              name: 'Ube',
              badge: 'Distinctive',
              emoji: '🟣',
              personality: 'Filipino, distinctive, playful & premium',
              swatches: ['#C4B5FD', '#A78BFA', '#7C3AED', '#5B21B6'],
              aliases: []
            },
            {
              id: 'coffee' as const,
              name: 'Coffee',
              badge: 'Cozy',
              emoji: '☕',
              personality: 'Cozy, productive, espresso & mocha',
              swatches: ['#FDE68A', '#D97706', '#92400E', '#78350F'],
              aliases: []
            },
            {
              id: 'matcha' as const,
              name: 'Matcha',
              badge: 'Fresh',
              emoji: '🍵',
              personality: 'Fresh, calm, organized & natural',
              swatches: ['#86EFAC', '#4ADE80', '#16A34A', '#14532D'],
              aliases: []
            },
            {
              id: 'duos' as const,
              name: 'Duos',
              badge: 'Two-Tone',
              emoji: '🎨',
              personality: 'Simple two-color contrast aesthetic',
              swatches: ['#4F46E5', '#0284C7', '#4F46E5', '#0F172A'],
              aliases: ['dual-tone'] as string[]
            },
            {
              id: 'highlighter' as const,
              name: 'Highlighter',
              badge: 'Spectrum',
              emoji: '🌈',
              personality: 'Colorful study & notes highlighter aesthetic',
              swatches: ['#6366F1', '#10B981', '#F43F5E', '#F59E0B'],
              aliases: ['rainbow'] as string[]
            },
            {
              id: 'obsidian' as const,
              name: 'Obsidian',
              badge: 'Mono',
              emoji: '🖤',
              personality: 'Sleek, stealth & minimalist monochrome',
              swatches: ['#94A3B8', '#475569', '#1E293B', '#0F172A'],
              aliases: ['monochrome'] as string[]
            }
          ].map((themeItem) => {
            const currentTheme = (settings.colorTheme || settings.subjectCardTheme || 'bluebook') as string;
            const isSelected = currentTheme === themeItem.id || (themeItem.aliases as string[]).includes(currentTheme);

            return (
              <div 
                key={themeItem.id}
                onClick={() => {
                  triggerLightHaptic();
                  onUpdateSettings({ 
                    ...settings, 
                    colorTheme: themeItem.id,
                    subjectCardTheme: themeItem.id 
                  });
                }}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 13px',
                  borderRadius: 14,
                  border: `1.5px solid ${isSelected ? 'var(--ios-blue)' : 'var(--ios-card-border)'}`,
                  background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20 }}>{themeItem.emoji}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ 
                        fontWeight: 800, 
                        fontSize: 14, 
                        color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-primary)' 
                      }}>
                        {themeItem.name}
                      </span>
                      {isSelected && (
                        <span style={{ 
                          fontSize: 9.5, 
                          fontWeight: 800, 
                          padding: '1px 6px', 
                          borderRadius: 999, 
                          background: 'var(--ios-blue)', 
                          color: '#FFFFFF' 
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                      {themeItem.personality}
                    </div>
                  </div>
                </div>

                {/* Visual 4-Color Swatch Preview */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                  {themeItem.swatches.map((color, cIdx) => (
                    <div 
                      key={cIdx} 
                      style={{ 
                        width: 13, 
                        height: 13, 
                        borderRadius: 3.5, 
                        background: color,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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

      {/* About Schedly & Purpose */}
      <div className="ios-section-header">About Schedly</div>
      <div className="ios-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img 
            src="/schedly-icon.png" 
            alt="Schedly" 
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(37,99,235,0.25)'
            }} 
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ios-text-primary)', letterSpacing: '-0.01em' }}>
              Schedly
            </div>
            <div style={{ fontSize: 12, color: 'var(--ios-blue)', fontWeight: 600 }}>
              Your Smart Campus & Timetable Companion
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--ios-text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
          Schedly was built specifically for college students to eliminate the daily hassle of carrying folded paper Certificate of Registration (COR) printouts, missing room numbers, or running late to class.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'var(--ios-bg-secondary)', borderRadius: 12, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span><strong>Instant AI Scanner:</strong> Converts camera photos of your COR into an organized schedule.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🪪</span>
            <span><strong>Digital Pass:</strong> Your student ID and term credentials always ready in your pocket.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔔</span>
            <span><strong>Smart Alerts:</strong> Reminders before lectures & labs so you're always on time.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📱</span>
            <span><strong>100% Offline:</strong> Access your schedule and pass anytime, even without data or Wi-Fi.</span>
          </div>
        </div>
      </div>

      {/* Developer Credits (Hidden Easter Egg Link) */}
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
          transition: 'transform 0.15s ease'
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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ios-text-primary)' }}>Ethan Sienes</span>
            <span className="ios-tag-pill ios-tag-pill-green" style={{ fontSize: 9.5, padding: '1px 6px' }}>Developer</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ios-text-secondary)', marginTop: 2 }}>
            Designed & Built with ❤️ for Students
          </div>
        </div>
      </a>

      {/* Legal Disclaimer & App Info Footer */}
      <div style={{ textAlign: 'center', padding: '6px 12px 16px 12px', color: 'var(--ios-text-muted)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--ios-text-secondary)' }}>
          Schedly • v1.2.0 (Build 2026)
        </div>
        <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ios-text-muted)', margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          <strong>Disclaimer:</strong> Schedly is an independent student timetable companion and digital ID tool built for university and college students. It is not officially affiliated with, sponsored by, or endorsed by any specific university or academic institution. All university names, marks, logos, and curriculum data belong to their respective institutions.
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
