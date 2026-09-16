import React, { useState } from 'react';
import { NotificationSettings } from '../types';
import {
  Bell,
  Palette,
  Camera,
  Volume2,
  CloudOff,
  LogOut,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Send,
  Trash2,
  CheckCircle2 as CloudCheck,
  ChevronRight,
  ExternalLink,
  Smartphone,
  HardDrive,
  MessageCircle,
  Check,
  Layers,
  Sparkles
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';
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
    triggerLightHaptic();
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
    <div className="ios-section" style={{ paddingBottom: 88, paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}>
      {/* Top Header Bar: Large Title "Settings", Connectivity Tag & Theme Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="subjects-title" style={{ margin: 0, fontSize: 28 }}>Settings</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span 
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isOnline ? '#10B981' : '#F59E0B',
                boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
              }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
              {isOnline ? 'Cloud Synced' : 'Offline Mode'}
            </span>
          </div>
        </div>

        <div className="top-utility-right">
          <div
            className="home-logo-circle"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{ cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}
          >
            <img
              src="/schedly-logo.png"
              alt="Schedly"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>

      {/* Responsive 2-Column Grid on Tablet & Desktop, Single Column on Mobile */}
      <div className="settings-desktop-grid">
        {/* Left Column: Account, Reminders, Audio & Storage */}
        <div className="settings-split-col">
          {/* ================= 1. ACCOUNT & CLOUD BACKUP ================= */}
          <div className="ios-section-header">Account & Cloud Backup</div>
          <div className="ios-settings-group">
            {/* Account Info Row */}
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#3B82F6' }}>
                  <UserCheck size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail || 'Authenticated Student'}
                  </div>
                  <div style={{ fontSize: 11.5, color: isOnline ? '#10B981' : 'var(--ios-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    {isOnline ? (
                      <>
                        <CloudCheck size={12} />
                        <span>Connected to Supabase</span>
                      </>
                    ) : (
                      <>
                        <CloudOff size={12} />
                        <span>Local Cache Active</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {onManualSync && (
                <button
                  type="button"
                  onClick={() => {
                    triggerSelectionHaptic();
                    onManualSync();
                  }}
                  disabled={isSyncing || !isOnline}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 14,
                    border: '1px solid var(--ios-card-border)',
                    background: 'var(--ios-bg-secondary)',
                    color: 'var(--ios-blue)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Sync now with cloud"
                >
                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>
              )}
            </div>

            {/* Divider */}
            {onSignOut && <div className="ios-settings-divider" />}

            {/* Sign Out Row */}
            {onSignOut && (
              <div
                className="ios-settings-row clickable"
                onClick={handleLogoutConfirm}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="ios-settings-icon-tile" style={{ background: '#EF4444' }}>
                    <LogOut size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>Sign Out</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Log out from this device</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)' }} />
              </div>
            )}
          </div>

          {/* ================= 2. CLASS REMINDERS ================= */}
          <div className="ios-section-header">Class Reminders & Notifications</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#8B5CF6' }}>
                  <Bell size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Push Notifications</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Get notified before lectures start</div>
                </div>
              </div>
              <label className="ios-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.remindersEnabled}
                  onChange={handleToggleReminders}
                />
                <span className="ios-toggle-slider" />
              </label>
            </div>

            {settings.remindersEnabled && (
              <>
                <div className="ios-settings-divider" />
                <div style={{ padding: '12px 16px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>Remind me:</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ios-blue)' }}>
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
                          background: settings.reminderMinutes === option.value ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
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
                      onClick={() => {
                        triggerLightHaptic();
                        onTestNotification();
                      }}
                      style={{ width: '100%', marginTop: 12, fontSize: 12, padding: '7px 12px' }}
                    >
                      <Send size={12} /> Test Notification Now
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ================= 3. AUDIO & HAPTICS ================= */}
          <div className="ios-section-header">Audio & Feedback</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#F59E0B' }}>
                  <Volume2 size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Alert Sound</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Play chime with class notifications</div>
                </div>
              </div>
              <label className="ios-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={handleToggleSound}
                />
                <span className="ios-toggle-slider" />
              </label>
            </div>
          </div>

          {/* ================= 4. DEVICE OFFLINE STORAGE ================= */}
          <div className="ios-section-header">Device Storage & Privacy</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#10B981' }}>
                  <HardDrive size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Offline-First Storage</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Timetable, Pass, Notes & Docs saved on device</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#10B98115', color: '#10B981' }}>
                Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Facebook Page, Personality Themes, Schedule Management & Legal */}
        <div className="settings-split-col">
          {/* ================= 5. OFFICIAL SCHEDLY FACEBOOK COMMUNITY ================= */}
          <div className="ios-section-header">Official Community & Support</div>
          <a
            href="https://facebook.com/schedlyapp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerLightHaptic()}
            className="schedly-fb-brand-card"
            title="Visit Schedly Facebook Page"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              background: 'var(--ios-card-bg)',
              border: '1.5px solid rgba(24, 119, 242, 0.25)',
              borderRadius: 16,
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              marginBottom: 20
            }}
          >
            <div 
              className="schedly-fb-avatar-wrap"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                maxWidth: 44,
                maxHeight: 44,
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1.5px solid rgba(24, 119, 242, 0.3)',
                boxShadow: '0 4px 12px rgba(24, 119, 242, 0.18)',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src="/schedly-logo.png"
                alt="Schedly"
                style={{ width: 30, height: 30, maxWidth: 30, maxHeight: 30, objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ios-text-primary)' }}>
                  Schedly
                </span>
                <span 
                  style={{ 
                    fontSize: 10, 
                    fontWeight: 800, 
                    padding: '2px 7px', 
                    borderRadius: 999, 
                    background: '#1877F2', 
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Check size={9} strokeWidth={3} /> Official Page
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ios-text-secondary)', marginTop: 2, lineHeight: 1.35 }}>
                Follow us on Facebook for announcements, updates & student support
              </div>
            </div>
            <div style={{ color: '#1877F2', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <ExternalLink size={16} strokeWidth={2.2} />
            </div>
          </a>

          {/* ================= 6. VISUAL PERSONALITY THEMES ================= */}
          <div className="ios-section-header">Visual Personalities</div>
          <div className="ios-settings-group">
            <div style={{ padding: '12px 16px 8px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#EC4899' }}>
                  <Palette size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>Theme Palette</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Same Schedly. Different personality.</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
                        padding: '10px 12px',
                        borderRadius: 13,
                        border: `1.5px solid ${isSelected ? 'var(--ios-blue)' : 'var(--ios-card-border)'}`,
                        background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 18 }}>{themeItem.emoji}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: 13.5,
                              color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-primary)'
                            }}>
                              {themeItem.name}
                            </span>
                            {isSelected && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: 999,
                                background: 'var(--ios-blue)',
                                color: '#FFFFFF'
                              }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 1 }}>
                            {themeItem.personality}
                          </div>
                        </div>
                      </div>

                      {/* Swatches */}
                      <div style={{ display: 'flex', gap: 3.5, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                        {themeItem.swatches.map((color, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
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
          </div>

          {/* ================= 7. COR & SCHEDULE DATA ================= */}
          <div className="ios-section-header">COR & Schedule Management</div>
          <div className="ios-settings-group">
            {/* Scan COR */}
            <div
              className="ios-settings-row clickable"
              onClick={onOpenScanner}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#0284C7' }}>
                  <Camera size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Scan / Re-scan COR</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Upload or take a photo of your schedule</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)' }} />
            </div>

            <div className="ios-settings-divider" />

            {/* Clear Data */}
            <div
              className="ios-settings-row clickable"
              onClick={onResetData}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#EF4444' }}>
                  <Trash2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>Clear All Schedule Data</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Wipes saved courses from storage</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)' }} />
            </div>
          </div>

          {/* ================= 8. PRIVACY POLICY & GUIDELINES ================= */}
          <div className="ios-section-header">Privacy & Guidelines</div>
          <div className="ios-settings-group">
            <div
              className="ios-settings-row clickable"
              onClick={() => {
                triggerLightHaptic();
                onOpenPrivacyPolicy?.();
              }}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#059669' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Privacy Policy & Guidelines</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Terms of use, Digital ID disclaimer & data rights</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)' }} />
            </div>

            <div className="ios-settings-divider" />

            <a
              href="https://facebook.com/schedlyapp"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerLightHaptic()}
              className="ios-settings-row clickable"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ios-settings-icon-tile" style={{ background: '#1877F2' }}>
                  <MessageCircle size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Contact Schedly Support</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Send feedback or get help via Facebook Messenger</div>
                </div>
              </div>
              <ExternalLink size={15} style={{ color: 'var(--ios-text-muted)' }} />
            </a>
          </div>

          {/* Legal Disclaimer & App Info Footer */}
          <div style={{ textAlign: 'center', padding: '8px 12px 20px 12px', color: 'var(--ios-text-muted)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--ios-text-secondary)' }}>
              Schedly • v1.4.0 (Build 2026)
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ios-text-muted)', margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              <strong>Disclaimer:</strong> Schedly is an independent student timetable companion and digital ID tool built for university and college students. It is not officially affiliated with, sponsored by, or endorsed by any specific university or academic institution.
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
