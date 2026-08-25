import React from 'react';
import '../styles/apple-design-system.css';

export const SkeletonBox: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}> = ({ width = '100%', height = '16px', borderRadius = '8px', style, className = '' }) => (
  <div
    className={`ios-skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);

/**
 * Shimmering Skeleton for Digital Student ID Card Hero
 */
export const SkeletonDigitalID: React.FC = () => {
  return (
    <div className="digital-id-viewport" style={{ marginBottom: 16 }}>
      <div 
        className="ios-skeleton-card"
        style={{
          width: '100%',
          aspectRatio: '1.586 / 1',
          borderRadius: 20,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--ios-card-bg)',
          border: '1px solid var(--ios-glass-pill-border)',
          boxShadow: 'var(--ios-shadow-card)'
        }}
      >
        {/* Top bar: School branding & holographic pill shimmer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <div>
              <SkeletonBox width={100} height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <SkeletonBox width={65} height={9} borderRadius={4} />
            </div>
          </div>
          <SkeletonBox width={70} height={22} borderRadius={20} />
        </div>

        {/* Center: Photo avatar & Student details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
          <SkeletonBox width={68} height={68} borderRadius={16} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonBox width="75%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
            <SkeletonBox width="50%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonBox width="60%" height={10} borderRadius={4} />
          </div>
        </div>

        {/* Bottom bar: Barcode line & status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--ios-divider)' }}>
          <SkeletonBox width={110} height={10} borderRadius={4} />
          <SkeletonBox width={60} height={14} borderRadius={6} />
        </div>
      </div>
    </div>
  );
};

/**
 * Shimmering Skeleton for Next Class Hero Card
 */
export const SkeletonNextClass: React.FC = () => {
  return (
    <div 
      className="ios-skeleton-card"
      style={{
        padding: '16px 18px',
        borderRadius: 18,
        background: 'var(--ios-card-bg)',
        border: '1px solid var(--ios-glass-pill-border)',
        boxShadow: 'var(--ios-shadow-card)',
        marginBottom: 16
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SkeletonBox width={90} height={18} borderRadius={20} />
        <SkeletonBox width={60} height={14} borderRadius={6} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <SkeletonBox width={40} height={40} borderRadius={12} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="65%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="45%" height={12} borderRadius={4} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <SkeletonBox width="30%" height={12} borderRadius={4} />
        <SkeletonBox width="35%" height={12} borderRadius={4} />
      </div>
    </div>
  );
};

/**
 * Shimmering Skeleton for Today's Classes (Stacked Cards)
 */
export const SkeletonTodaySchedule: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="ios-skeleton-card"
          style={{
            padding: '16px 18px',
            borderRadius: 18,
            background: 'var(--ios-card-bg)',
            border: '1px solid var(--ios-glass-pill-border)',
            boxShadow: 'var(--ios-shadow-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 1 - idx * 0.18
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <SkeletonBox width={42} height={42} borderRadius={12} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox width="28%" height={10} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width="55%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width="40%" height={11} borderRadius={4} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <SkeletonBox width={48} height={14} borderRadius={4} />
            <SkeletonBox width={38} height={10} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Shimmering Skeleton for Timetable / Agenda View
 */
export const SkeletonTimeline: React.FC = () => {
  return (
    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Day Chip Selector Skeleton */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} width={52} height={34} borderRadius={12} style={{ flexShrink: 0 }} />
        ))}
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <SkeletonBox height={56} borderRadius={14} />
        <SkeletonBox height={56} borderRadius={14} />
        <SkeletonBox height={56} borderRadius={14} />
      </div>

      {/* Schedule Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="ios-skeleton-card"
            style={{
              padding: '16px',
              borderRadius: 16,
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-glass-pill-border)',
              display: 'flex',
              gap: 14
            }}
          >
            <SkeletonBox width={45} height={36} borderRadius={8} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox width="60%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width="30%" height={10} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Shimmering Skeleton for Subjects List View
 */
export const SkeletonSubjectsList: React.FC = () => {
  return (
    <div className="ios-section" style={{ paddingBottom: 78, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      {/* Search Bar Skeleton */}
      <SkeletonBox height={42} borderRadius={14} style={{ marginBottom: 14 }} />

      {/* Summary Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <SkeletonBox width={100} height={28} borderRadius={10} />
        <SkeletonBox width={100} height={28} borderRadius={10} />
      </div>

      {/* Subject Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className="ios-skeleton-card"
            style={{
              padding: '16px',
              borderRadius: 16,
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-glass-pill-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <SkeletonBox width={40} height={40} borderRadius={12} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox width="50%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width="70%" height={12} borderRadius={4} />
            </div>
            <SkeletonBox width={48} height={22} borderRadius={8} />
          </div>
        ))}
      </div>
    </div>
  );
};
