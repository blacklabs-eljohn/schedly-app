import React from 'react';
import { Home, Calendar, BookOpen, Settings } from 'lucide-react';
import { triggerSelectionHaptic } from '../services/hapticsService';

export type TabType = 'home' | 'schedule' | 'subjects' | 'settings';

interface BottomTabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const TABS: { key: TabType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'settings', label: 'Settings', icon: Settings }
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onSelectTab }) => {
  const handleTabClick = (key: TabType) => {
    if (activeTab !== key) {
      triggerSelectionHaptic();
      onSelectTab(key);
    }
  };

  return (
    <div className="ios-tab-bar-container">
      <nav className="ios-tab-bar-dock" aria-label="Main Navigation">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              className={`ios-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(key)}
              type="button"
              aria-selected={isActive}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomTabBar;
