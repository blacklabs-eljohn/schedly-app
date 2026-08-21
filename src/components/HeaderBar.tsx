import React from 'react';
import { Sun, Moon, GraduationCap, ShieldCheck } from 'lucide-react';

interface HeaderBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ theme, onToggleTheme }) => {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="ios-header">
      <div className="ios-header-left">
        <div className="ios-header-logo-badge">
          <GraduationCap size={22} />
        </div>
        <div className="ios-header-title-wrap">
          <div className="ios-header-meta">
            <span>{dateString}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span className="campus-tag">
              <ShieldCheck size={11} /> NEMSU
            </span>
          </div>
          <h1 className="ios-header-title">Student Portal</h1>
        </div>
      </div>

      <button 
        className="ios-theme-toggle" 
        onClick={onToggleTheme} 
        aria-label="Toggle Theme"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        {theme === 'dark' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#2563EB" />}
      </button>
    </header>
  );
};

export default HeaderBar;
