import React, { useState } from 'react';
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
  UserCheck,
  ShieldCheck,
  Send,
  Trash2,
  CheckCircle2 as CloudCheck
} from 'lucide-react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { ConfirmationModal } from './ConfirmationModal';

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
  onOpenPrivacyPolicy?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenScanner,
  onResetData,
  onTestNotification,
  onToggleTheme,
  theme = 'light',
  userEmail,
  onSignOut,
  onManualSync,
  isSyncing = false,
  isOnline = true,
  onOpenPrivacyPolicy,
}) => {
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    setIsSignOutModalOpen(true);
  };

  const handleToggleReminders = (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerLightHaptic();
    onUpdateSettings({ ...settings, remindersEnabled: e.target.checked });
  };

  const handleSetReminderMinutes = (mins: number) => {
    triggerLightHaptic();
    onUpdateSettings({ ...settings, reminderMinutes: mins });
  };

  const handleToggleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerLightHaptic();
    onUpdateSettings({ ...settings, soundEnabled: e.target.checked });
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

      {/* Responsive 2-Column Grid on Tablet & Desktop, Natural Column on Mobile */}
      <div className="settings-desktop-grid">
        {/* Left Column: Account, Reminders & Audio */}
        <div className="settings-split-col">
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
                        <CloudCheck size={13} />
                        <span>Cloud Synced</span>
                      </>
                    ) : (
                      <>
                        <CloudOff size={13} />
                        <span>Offline Mode (Cached on Device)</span>
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
          <div className="ios-card" style={{ marginBottom: 16 }}>
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
              <input
                type="checkbox"
                className="ios-switch"
                checked={settings.remindersEnabled}
                onChange={handleToggleReminders}
              />
            </div>

            {settings.remindersEnabled && (
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--ios-divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ios-text-secondary)' }}>Remind me:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ios-blue)' }}>
                    {settings.reminderMinutes === 0 ? 'At time of class' : `${settings.reminderMinutes} minutes before`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: '5m', value: 5 },
                    { label: '10m', value: 10 },
                    { label: '15m', value: 15 },
                    { label: '30m', value: 30 },
                    { label: '1h', value: 60 }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSetReminderMinutes(option.value)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 10,
                        border: settings.reminderMinutes === option.value ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                        background: settings.reminderMinutes === option.value ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                        color: settings.reminderMinutes === option.value ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                        fontSize: 12,
                        fontWeight: settings.reminderMinutes === option.value ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {onTestNotification && (
                  <button
                    type="button"
                    className="ios-btn-secondary"
                    onClick={onTestNotification}
                    style={{ width: '100%', marginTop: 14, fontSize: 12.5 }}
                  >
                    <Send size={13} /> Test Notification Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sound & Haptics Group */}
          <div className="ios-section-header">Audio & Haptics</div>
          <div className="ios-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  <Volume2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Alert Sound</div>
                  <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Play chime with notification</div>
                </div>
              </div>
              <input
                type="checkbox"
                className="ios-switch"
                checked={settings.soundEnabled}
                onChange={handleToggleSound}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Themes, Data & Disclaimer */}
        <div className="settings-split-col">
          {/* Schedly 8 Personality Color Themes */}
          <div className="ios-section-header">Schedly Personalities</div>
          <div className="ios-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
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
                  badge: 'Dynamic',
                  emoji: '🎨',
                  personality: 'Dual-tone gradients with high contrast',
                  swatches: ['#38BDF8', '#6366F1', '#EC4899', '#F59E0B'],
                  aliases: ['dual-tone']
                },
                {
                  id: 'highlighter' as const,
                  name: 'Highlighter',
                  badge: 'Vibrant',
                  emoji: '🌈',
                  personality: 'Color-coded by course, maximum vibrancy',
                  swatches: ['#F43F5E', '#10B981', '#3B82F6', '#8B5CF6'],
                  aliases: ['rainbow']
                },
                {
                  id: 'obsidian' as const,
                  name: 'Obsidian',
                  badge: 'Mono',
                  emoji: '🖤',
                  personality: 'Sleek, stealth & minimalist monochrome black',
                  swatches: ['#94A3B8', '#475569', '#1E293B', '#0F172A'],
                  aliases: ['monochrome']
                }
              ].map(themeItem => {
                const currentTheme = (settings.colorTheme || settings.subjectCardTheme || 'bluebook') as string;
                const isSelected = currentTheme === themeItem.id || (themeItem.aliases as string[]).includes(currentTheme);

                return (
                  <div
                    key={themeItem.id}
                    onClick={() => {
                      triggerSuccessHaptic();
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
          <div className="ios-card" style={{ marginBottom: 16 }}>
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
                <Trash2 size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ios-red)' }}>Clear All Schedule Data</div>
                <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>Wipes all saved courses from storage</div>
              </div>
            </div>
          </div>

          {/* Privacy Policy & Rules Section */}
          <div className="ios-section-header">Privacy & Guidelines</div>
          <div className="ios-card" style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onOpenPrivacyPolicy?.();
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
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
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ios-text-primary)' }}>
                    Privacy Policy & Guidelines
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                    Terms of use, Digital ID disclaimer & data rights
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ios-blue)' }}>View ›</span>
            </button>
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
              Schedly • v1.4.0 (Build 2026)
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ios-text-muted)', margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              <strong>Disclaimer:</strong> Schedly is an independent student timetable companion and digital ID tool built for university and college students. It is not officially affiliated with, sponsored by, or endorsed by any specific university or academic institution. All university names, marks, logos, and curriculum data belong to their respective institutions.
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out In-App Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSignOutModalOpen}
        title="Sign Out of Schedly?"
        message="Your timetable and pass are saved safely in your local offline storage and cloud backup."
        confirmText="Sign Out"
        cancelText="Cancel"
        isDestructive={true}
        icon="logout"
        onConfirm={() => {
          setIsSignOutModalOpen(false);
          onSignOut?.();
        }}
        onCancel={() => setIsSignOutModalOpen(false)}
      />
    </div>
  );
};

export default SettingsView;
