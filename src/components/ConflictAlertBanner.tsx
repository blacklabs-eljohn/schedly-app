import React from 'react';
import { ScheduleConflict } from '../types';
import { AlertTriangle } from 'lucide-react';

interface ConflictAlertBannerProps {
  conflicts: ScheduleConflict[];
  onSelectConflictCourse?: (courseCode: string) => void;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({ conflicts }) => {
  if (conflicts.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {conflicts.map(c => (
        <div key={c.id} className="ios-conflict-alert">
          <AlertTriangle className="ios-conflict-icon" size={18} />
          <div>
            <div className="ios-conflict-title">Schedule Conflict Detected</div>
            <div className="ios-conflict-desc">{c.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConflictAlertBanner;
