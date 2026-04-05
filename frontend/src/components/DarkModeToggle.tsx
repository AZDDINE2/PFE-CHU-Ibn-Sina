import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle: React.FC = () => {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${dark ? '#1F2937' : '#E2E8F0'}`,
        background: dark ? '#1F2937' : '#F8FAFC',
        color: dark ? '#94a3b8' : '#64748B',
        fontSize: 12, fontWeight: 600,
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = dark ? '#374151' : '#EFF6FF';
        e.currentTarget.style.borderColor = dark ? '#374151' : '#BFDBFE';
        e.currentTarget.style.color = dark ? '#e2e8f0' : '#2563EB';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = dark ? '#1F2937' : '#F8FAFC';
        e.currentTarget.style.borderColor = dark ? '#1F2937' : '#E2E8F0';
        e.currentTarget.style.color = dark ? '#94a3b8' : '#64748B';
      }}
    >
      {dark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
      {dark ? 'Mode clair' : 'Mode sombre'}
    </button>
  );
};

export default DarkModeToggle;
