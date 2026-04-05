/**
 * FullscreenButton — Bascule le mode plein écran (idéal pour affichage mural)
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const FullscreenButton: React.FC = () => {
  const { dark } = useTheme();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const bg     = dark ? '#1F2937' : '#F8FAFC';
  const border = dark ? '#1F2937' : '#E2E8F0';
  const color  = dark ? '#94a3b8' : '#64748B';

  return (
    <button
      onClick={toggle}
      title={fullscreen ? 'Quitter le plein écran' : 'Mode plein écran'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${border}`, background: bg,
        cursor: 'pointer', color,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = dark ? '#374151' : '#EFF6FF'; e.currentTarget.style.borderColor = dark ? '#374151' : '#BFDBFE'; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = border; }}
    >
      {fullscreen ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      )}
    </button>
  );
};

export default FullscreenButton;
