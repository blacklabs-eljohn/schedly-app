import React from 'react';
import { Home, Clock, CalendarDays, BookOpen, FolderOpen, Settings, Sun, Moon, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { TabType } from './BottomTabBar';
import { StudentProfile } from '../types';
import { SyncState } from '../services/syncService';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface DesktopSidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  profile?: StudentProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  syncState: SyncState;
  isOnline: boolean;
  onTriggerSync?: () => void;
  onOpenIDModal?: () => void;
  onOpenCommandPalette?: () => void;
}

const TABS: { key: TabType; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { key: 'home', label: 'Home Dashboard', icon: Home },
  { key: 'schedule', label: 'Class Schedule', icon: Clock },
  { key: 'calendar', label: 'Academic Calendar', icon: CalendarDays },
  { key: 'subjects', label: 'Course Hub', icon: BookOpen },
  { key: 'folders', label: 'Folders & Files', icon: FolderOpen },
  { key: 'settings', label: 'Settings & Cloud', icon: Settings }
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  profile,
  theme,
  onToggleTheme,
  syncState,
  isOnline,
  onTriggerSync,
  onOpenIDModal,
  onOpenCommandPalette
}) => {
  const getStudentFirstName = (name?: string): string => {
    if (!name || !name.trim()) return 'Student';
    const clean = name.trim();
    if (clean.includes(',')) {
      const parts = clean.split(',');
      const afterComma = parts[1]?.trim() || '';
      const firstWord = afterComma.split(' ')[0]?.trim();
      if (firstWord) {
        return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      }
    }
    const firstWord = clean.split(' ')[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  };

  const firstName = getStudentFirstName(profile?.fullName);

  return (
    <aside className="desktop-sidebar-container" aria-label="Desktop Navigation">
      {/* Brand Header */}
      <div className="desktop-sidebar-header">
        <div className="desktop-sidebar-brand">
          <div className="desktop-sidebar-logo-box">
            <img src="/schedly-logo.png" alt="Schedly" className="desktop-sidebar-logo-img" />
          </div>
          <div className="desktop-sidebar-brand-text">
            <div className="desktop-brand-title">Schedly</div>
            <div className="desktop-brand-subtitle">Student Workspace</div>
          </div>
        </div>
      </div>

      {/* Student Profile Pill */}
      {profile && (
        <div 
          className="desktop-sidebar-profile-card"
          onClick={() => {
            triggerLightHaptic();
            if (onOpenIDModal) onOpenIDModal();
          }}
          title="Click to view Digital Student ID"
        >
          <div className="desktop-profile-avatar">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt={firstName} />
            ) : (
              <span>{firstName.charAt(0)}</span>
            )}
          </div>
          <div className="desktop-profile-info">
            <div className="desktop-profile-name">{profile.fullName || 'Student'}</div>
            <div className="desktop-profile-sub">
              {profile.studentNumber || profile.program || 'NEMSU Scholar'}
            </div>
          </div>
        </div>
      )}

      {/* Spotlight Command Bar Trigger (macOS / iPadOS style) */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onOpenCommandPalette();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '12px',
            background: 'var(--ios-card-bg)',
            border: '1px solid var(--ios-card-border)',
            color: 'var(--ios-text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--ios-shadow-sm)'
          }}
          title="Quick Search & Actions (⌘K / Ctrl+K)"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--ios-blue)', fontSize: 13 }}>🔍</span>
            <span>Search or jump...</span>
          </span>
          <kbd 
            style={{
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'var(--ios-bg-primary)',
              border: '1px solid var(--ios-card-border)',
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--ios-text-muted)',
              fontFamily: 'inherit'
            }}
          >
            ⌘K
          </kbd>
        </button>
      )}

      {/* Main Navigation Menu */}
      <nav className="desktop-sidebar-nav">
        <div className="desktop-nav-section-label">MAIN NAVIGATION</div>
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                triggerSelectionHaptic();
                onSelectTab(key);
              }}
              aria-selected={isActive}
            >
              <div className="desktop-nav-icon-wrap">
                <Icon size={18} />
              </div>
              <span className="desktop-nav-label">{label}</span>
              {isActive && <div className="desktop-nav-active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer (Sync State + Theme Switcher) */}
      <div className="desktop-sidebar-footer">
        {/* Sync Status Badge */}
        <div 
          className={`desktop-sync-badge ${syncState.toLowerCase()}`}
          onClick={onTriggerSync}
          title={isOnline ? "Cloud Sync Active (Click to force refresh)" : "Working Offline on Device"}
          style={{ cursor: onTriggerSync ? 'pointer' : 'default' }}
        >
          {syncState === 'SYNCING' ? (
            <>
              <RefreshCw size={13} className="spin-animation" />
              <span>Syncing Cloud...</span>
            </>
          ) : isOnline ? (
            <>
              <CloudCheck size={14} color="var(--ios-green)" />
              <span>Cloud Synced</span>
            </>
          ) : (
            <>
              <CloudOff size={14} color="var(--ios-text-muted)" />
              <span>Offline Cache</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="desktop-theme-toggle-btn"
          onClick={() => {
            triggerLightHaptic();
            onToggleTheme();
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} color="#F59E0B" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} color="var(--ios-blue)" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
export default DesktopSidebar;
