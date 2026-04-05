import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: number;   // e.g. +5.2 or -2.1 percent
  sub?: string;     // small subtitle below the value
}

const KPICard: React.FC<Props> = ({ label, value, unit = '', color = '#2563EB', icon, trend, sub }) => {
  const { dark } = useTheme();
  const bg     = dark ? '#111827' : '#ffffff';
  const border = dark ? '#1F2937' : '#E8EDF5';
  const text   = dark ? '#F1F5F9' : '#0F172A';
  const muted  = dark ? '#4B5563' : '#94A3B8';
  const subText= dark ? '#6B7280' : '#64748B';

  const trendColor = trend == null ? '' : trend >= 0 ? '#22C55E' : '#EF4444';
  const trendArrow = trend == null ? '' : trend >= 0 ? '↑' : '↓';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      padding: '16px 18px',
      boxShadow: dark
        ? '0 1px 4px rgba(0,0,0,0.3)'
        : '0 1px 4px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)',
      transition: 'box-shadow 0.18s, transform 0.15s',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = dark
          ? '0 6px 20px rgba(0,0,0,0.4)'
          : '0 6px 20px rgba(15,23,42,0.10)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = dark
          ? '0 1px 4px rgba(0,0,0,0.3)'
          : '0 1px 4px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Colored accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, borderRadius: '12px 0 0 12px',
        background: color,
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 0.9,
          color: muted,
          lineHeight: 1.4,
        }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: text, lineHeight: 1, letterSpacing: -0.5 }}>
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </div>
        {unit && (
          <div style={{ fontSize: 12, fontWeight: 500, color: subText, marginBottom: 3 }}>{unit}</div>
        )}
      </div>

      {/* Trend / sub */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend != null && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: trendColor,
            background: `${trendColor}15`,
            padding: '2px 7px',
            borderRadius: 20,
          }}>
            {trendArrow} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: subText }}>{sub}</span>}
      </div>
    </div>
  );
};

export default KPICard;
