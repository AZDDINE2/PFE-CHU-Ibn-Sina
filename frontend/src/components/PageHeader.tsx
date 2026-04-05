import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<Props> = ({ icon, title, subtitle, badge = '2019–2026', actions }) => {
  const { dark } = useTheme();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
      padding: '18px 24px',
      borderRadius: 12,
      background: dark
        ? 'linear-gradient(135deg,#0F2044 0%,#112060 50%,#0D3080 100%)'
        : 'linear-gradient(135deg,#0F1F4A 0%,#1A3BDB 55%,#3B82F6 100%)',
      boxShadow: '0 4px 20px rgba(15,31,74,0.25)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', right: -30, top: -30,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', right: 60, bottom: -50,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        pointerEvents: 'none',
      }}/>

      {/* Left: icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.25 }}>{title}</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>

      {/* Right: badge + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
        {actions}
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.85)',
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.3,
        }}>
          {badge}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
