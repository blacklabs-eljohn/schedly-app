import React, { useState } from 'react';
import { ScheduleConflict } from '../types';
import { AlertTriangle, Sparkles, ChevronDown, ChevronUp, RotateCcw, Wrench } from 'lucide-react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/hapticsService';

interface ConflictAlertBannerProps {
  conflicts: ScheduleConflict[];
  onAutoResolve?: () => void;
  onResetOfficialSchedule?: () => void;
  onSelectConflictCourse?: (courseCode: string) => void;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({ 
  conflicts,
  onAutoResolve,
  onResetOfficialSchedule,
  onSelectConflictCourse
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  return (
    <div 
      style={{ 
        marginBottom: 16,
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1.5px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: 'var(--ios-shadow-sm)',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div 
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.18)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2
            }}
          >
            <AlertTriangle size={18} strokeWidth={2.5} />
          </div>

          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#DC2626', letterSpacing: '-0.01em' }}>
              Schedule Overlaps Detected
            </div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
              {conflicts.length} class {conflicts.length === 1 ? 'overlap occurs' : 'overlaps occur'} on your timetable.
            </div>
          </div>
        </div>

        {/* Auto-Resolve Quick Action Button */}
        {onAutoResolve && (
          <button
            type="button"
            onClick={() => {
              triggerSuccessHaptic();
              onAutoResolve();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 13px',
              borderRadius: 12,
              border: 'none',
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(239, 68, 68, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Sparkles size={14} />
            <span>Auto-Fix</span>
          </button>
        )}
      </div>

      {/* Collapsible Conflict Items List */}
      <div style={{ marginTop: 12, borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ios-text-primary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0
            }}
          >
            <span>{isExpanded ? 'Hide specific overlaps' : `View ${conflicts.length} conflicting courses`}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {onResetOfficialSchedule && (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onResetOfficialSchedule();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-text-muted)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: 0
              }}
            >
              <RotateCcw size={11} />
              <span>Reset to default</span>
            </button>
          )}
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {conflicts.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--ios-card-bg)',
                  border: '1px solid var(--ios-card-border)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {c.course1.courseCode}
                  </span>
                  <span style={{ color: 'var(--ios-text-muted)', fontSize: 11 }}>vs</span>
                  <span style={{ fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {c.course2.courseCode}
                  </span>
                  <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginLeft: 4 }}>
                    ({c.day})
                  </span>
                </div>

                {onSelectConflictCourse && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      onSelectConflictCourse(c.course1.courseCode);
                    }}
                    style={{
                      background: 'var(--ios-bg-secondary)',
                      border: '1px solid var(--ios-card-border)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--ios-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      flexShrink: 0
                    }}
                  >
                    <Wrench size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictAlertBanner;
