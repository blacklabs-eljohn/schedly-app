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
  HardDrive,
  MessageCircle,
  Check,
  Moon,
  Sun,
  ShieldAlert
} from 'lucide-react';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../services/hapticsService';
import { ConfirmationModal } from './ConfirmationModal';
import '../styles/settings-view.css';

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

const THEME_OPTIONS = [
  {
    id: 'bluebook' as const,
    name: 'Bluebook',
    emoji: '🔵',
    desc: 'Classic Academic Blue',
    swatches: ['#60A5FA', '#2563EB', '#1E3A8A', '#0F172A'],
    aliases: ['blue-cascade']
  },
  {
    id: 'crimson' as const,
    name: 'Crimson',
    emoji: '🔴',
    desc: 'Bold Energy & Ruby',
    swatches: ['#F87171', '#EF4444', '#DC2626', '#991B1B'],
    aliases: []
  },
  {
    id: 'bini' as const,
    name: 'Bini',
    emoji: '🌸',
    desc: 'Playful Bubblegum Pink',
    swatches: ['#F472B6', '#EC4899', '#DB2777', '#BE185D'],
    aliases: []
  },
  {
    id: 'ube' as const,
    name: 'Ube',
    emoji: '🟣',
    desc: 'Deep Purple & Lavender',
    swatches: ['#C4B5FD', '#A78BFA', '#7C3AED', '#5B21B6'],
    aliases: []
  },
  {
    id: 'coffee' as const,
    name: 'Coffee',
    emoji: '☕',
    desc: 'Espresso & Warm Caramel',
    swatches: ['#FDE68A', '#D97706', '#92400E', '#78350F'],
    aliases: []
  },
  {
    id: 'matcha' as const,
    name: 'Matcha',
    emoji: '🍵',
    desc: 'Botanical Matcha Green',
    swatches: ['#86EFAC', '#4ADE80', '#16A34A', '#14532D'],
    aliases: []
  },
  {
    id: 'duos' as const,
    name: 'Duos',
    emoji: '🎨',
    desc: 'Dual-Tone Indigo & Violet',
    swatches: ['#38BDF8', '#6366F1', '#EC4899', '#F59E0B'],
    aliases: ['dual-tone']
  },
  {
    id: 'highlighter' as const,
    name: 'Highlighter',
    emoji: '🌈',
    desc: 'Neon Multi-Color Palette',
    swatches: ['#F43F5E', '#10B981', '#3B82F6', '#8B5CF6'],
    aliases: ['rainbow']
  },
  {
    id: 'obsidian' as const,
    name: 'Obsidian',
    emoji: '🖤',
    desc: 'Minimalist Stealth Mono',
    swatches: ['#94A3B8', '#475569', '#1E293B', '#0F172A'],
    aliases: ['monochrome']
  }
];

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

  const currentTheme = (settings.colorTheme || settings.subjectCardTheme || 'bluebook') as string;

  return (
    <div className="ios-section settings-container-view" style={{ paddingBottom: 110, paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))', maxWidth: 960, margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' }}>
        <div>
          <h1 className="subjects-title" style={{ margin: 0, fontSize: 30, letterSpacing: '-0.02em', fontWeight: 800 }}>Settings</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span 
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isOnline ? '#10B981' : '#F59E0B',
                boxShadow: isOnline ? '0 0 10px rgba(16, 185, 129, 0.7)' : 'none'
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: isOnline ? '#10B981' : 'var(--ios-text-secondary)' }}>
              {isOnline ? 'Cloud Synced' : 'Offline Mode'}
            </span>
          </div>
        </div>

        {onToggleTheme && (
          <button
            type="button"
            onClick={() => {
              triggerSelectionHaptic();
              onToggleTheme();
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 20,
              border: '1px solid var(--ios-card-border)',
              background: 'var(--ios-card-bg)',
              color: 'var(--ios-text-primary)',
              cursor: 'pointer',
              boxShadow: 'var(--ios-shadow-sm)',
              fontSize: 13,
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="#F59E0B" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#6366F1" />
                <span>Dark</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Grid: 2 Columns on Desktop, Single Stack on Mobile */}
      <div className="settings-desktop-grid">
        {/* Left Column */}
        <div className="settings-split-col">
          {/* 1. Account & Cloud Sync */}
          <div className="ios-section-header">Account & Cloud Backup</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
                  <UserCheck size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ios-text-primary)' }}>
                    {userEmail || 'Student Account'}
                  </div>
                  <div style={{ fontSize: 11.5, color: isOnline ? '#10B981' : 'var(--ios-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {isOnline ? (
                      <>
                        <CloudCheck size={12} />
                        <span>Connected to Supabase</span>
                      </>
                    ) : (
                      <>
                        <CloudOff size={12} />
                        <span>Offline Local Cache</span>
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
                    padding: '6px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--ios-card-border)',
                    background: 'var(--ios-bg-secondary)',
                    color: 'var(--ios-blue)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'var(--ios-shadow-sm)'
                  }}
                  title="Sync now with cloud"
                >
                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>
              )}
            </div>

            {onSignOut && <div className="ios-settings-divider" />}

            {onSignOut && (
              <div
                className="ios-settings-row clickable"
                onClick={handleLogoutConfirm}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' }}>
                    <LogOut size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>Sign Out</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Log out from this device</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)', flexShrink: 0 }} />
              </div>
            )}
          </div>

          {/* 2. Class Reminders & Notifications */}
          <div className="ios-section-header">Class Reminders & Notifications</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
                  <Bell size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ios-text-primary)' }}>Push Notifications</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Get notified before lectures start</div>
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
                <div style={{ padding: '14px 16px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ios-text-secondary)' }}>Remind me:</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ios-blue)' }}>
                      {settings.reminderMinutes === 0 ? 'At time of class' : `${settings.reminderMinutes} minutes before`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
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
                          padding: '8px 0',
                          borderRadius: 10,
                          border: settings.reminderMinutes === option.value ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                          background: settings.reminderMinutes === option.value ? 'var(--ios-blue-light)' : 'var(--ios-card-bg)',
                          color: settings.reminderMinutes === option.value ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                          fontSize: 12.5,
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
                      style={{ width: '100%', marginTop: 12, fontSize: 12.5, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Send size={13} /> Test Notification Now
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3. Audio & Storage */}
          <div className="ios-section-header">Audio & Feedback</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  <Volume2 size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ios-text-primary)' }}>Alert Sound</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Play chime with class notifications</div>
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

          <div className="ios-section-header">Device Storage & Privacy</div>
          <div className="ios-settings-group">
            <div className="ios-settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <HardDrive size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ios-text-primary)' }}>Offline-First Storage</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Timetable, Pass, Notes & Docs saved on device</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', flexShrink: 0 }}>
                Encrypted
              </span>
            </div>
          </div>

          {/* Official Community */}
          <div className="ios-section-header">Official Community & Support</div>
          <a
            href="https://facebook.com/schedlyapp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerLightHaptic()}
            className="schedly-fb-brand-card"
            title="Visit Schedly Facebook Page"
          >
            <div className="schedly-fb-avatar-wrap">
              <img
                src="/schedly-logo.png"
                alt="Schedly"
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
        </div>

        {/* Right Column */}
        <div className="settings-split-col">
          {/* 4. Visual Personality Themes */}
          <div className="ios-section-header">Visual Personalities</div>
          <div className="ios-settings-group">
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' }}>
                  <Palette size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ios-text-primary)' }}>Theme Palette</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>Same Schedly. Different personality.</div>
                </div>
              </div>

              {/* Responsive Theme Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                {THEME_OPTIONS.map(themeItem => {
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
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 14,
                        border: `1.5px solid ${isSelected ? 'var(--ios-blue)' : 'var(--ios-card-border)'}`,
                        background: isSelected ? 'var(--ios-blue-light)' : 'var(--ios-bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 16 }}>{themeItem.emoji}</span>
                          <div>
                            <div style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-primary)'
                            }}>
                              {themeItem.name}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--ios-text-muted)', lineHeight: 1.2 }}>
                              {themeItem.desc}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'var(--ios-blue)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Swatches Bar */}
                      <div style={{ display: 'flex', gap: 3.5, alignItems: 'center', marginTop: 'auto' }}>
                        {themeItem.swatches.map((color, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              flex: 1,
                              height: 6,
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

          {/* 5. COR & Schedule Management */}
          <div className="ios-section-header">COR & Schedule Management</div>
          <div className="ios-settings-group">
            <div
              className="ios-settings-row clickable"
              onClick={onOpenScanner}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}>
                  <Camera size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ios-text-primary)' }}>Scan / Re-scan COR</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Upload or take a photo of your schedule</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)', flexShrink: 0 }} />
            </div>

            <div className="ios-settings-divider" />

            <div
              className="ios-settings-row clickable"
              onClick={onResetData}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' }}>
                  <Trash2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>Clear All Schedule Data</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Wipes saved courses from storage</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)', flexShrink: 0 }} />
            </div>
          </div>

          {/* 6. Privacy & Support */}
          <div className="ios-section-header">Privacy & Support</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ios-text-primary)' }}>Privacy Policy & Guidelines</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Terms of use, Digital ID disclaimer & data rights</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ios-text-muted)', flexShrink: 0 }} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="ios-settings-icon-tile" style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0D5CB6 100%)' }}>
                  <MessageCircle size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ios-text-primary)' }}>Contact Schedly Support</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', marginTop: 1 }}>Send feedback or get help via Facebook Messenger</div>
                </div>
              </div>
              <ExternalLink size={15} style={{ color: 'var(--ios-text-muted)', flexShrink: 0 }} />
            </a>
          </div>

          {/* Legal Disclaimer & App Info Footer */}
          <div style={{ textAlign: 'center', padding: '12px 16px 24px 16px', color: 'var(--ios-text-muted)' }}>
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
