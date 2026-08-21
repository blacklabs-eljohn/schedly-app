import React from 'react';
import { DayScheduleInfo } from '../types';
import { formatDuration, formatTime12H } from '../services/scheduleEngine';
import { Coffee, Clock, BookOpen, Utensils, Sparkles } from 'lucide-react';

interface FreeTimeCardProps {
  dayInfo: DayScheduleInfo;
}

export const FreeTimeCard: React.FC<FreeTimeCardProps> = ({ dayInfo }) => {
  const { day, freeTimeGaps, totalFreeTimeMinutes, firstClassStart, lastClassEnd } = dayInfo;

  if (totalFreeTimeMinutes === 0 && freeTimeGaps.length === 0) {
    return (
      <div className="ios-card">
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
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Back-to-back Classes</div>
            <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 1 }}>
              No major break gaps for {day}. Stay energized!
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getBreakSuggestion = (mins: number) => {
    if (mins >= 120) return { icon: BookOpen, text: 'Library Study & Review' };
    if (mins >= 60) return { icon: Utensils, text: 'Lunch Break & Relax' };
    return { icon: Coffee, text: 'Quick Coffee & Campus Walk' };
  };

  return (
    <div className="ios-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--ios-green-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ios-green)',
            flexShrink: 0
          }}>
            <Coffee size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Free Time & Breaks</div>
            {firstClassStart && lastClassEnd && (
              <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>
                {formatTime12H(firstClassStart)} – {formatTime12H(lastClassEnd)}
              </div>
            )}
          </div>
        </div>
        <span className="ios-tag-pill ios-tag-pill-green">
          {formatDuration(totalFreeTimeMinutes)} Total
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {freeTimeGaps.map((gap) => {
          const suggestion = getBreakSuggestion(gap.durationMinutes);
          const SuggestionIcon = suggestion.icon;

          return (
            <div 
              key={gap.id}
              style={{
                background: 'var(--ios-bg-primary)',
                borderRadius: 10,
                padding: '10px 12px',
                border: '1px solid var(--ios-card-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color="var(--ios-green)" />
                  <span>{formatTime12H(gap.startTime)} – {formatTime12H(gap.endTime)}</span>
                </div>
                <span style={{ color: 'var(--ios-green)', fontSize: 12, fontWeight: 700 }}>
                  {gap.formattedDuration}
                </span>
              </div>

              {gap.prevCourseCode && gap.nextCourseCode && (
                <div style={{ fontSize: 11, color: 'var(--ios-text-muted)', marginTop: 3 }}>
                  Between <strong>{gap.prevCourseCode}</strong> and <strong>{gap.nextCourseCode}</strong>
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ios-text-secondary)',
                marginTop: 6,
                paddingTop: 6,
                borderTop: '1px solid var(--ios-divider)'
              }}>
                <SuggestionIcon size={12} color="var(--ios-green)" />
                <span>{suggestion.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FreeTimeCard;
