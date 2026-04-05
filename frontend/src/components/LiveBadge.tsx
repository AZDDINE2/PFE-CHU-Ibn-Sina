import React from 'react';

interface LiveBadgeProps {
  live: boolean;
  lastUpdate: Date | null;
  onToggle: () => void;
}

const LiveBadge: React.FC<LiveBadgeProps> = ({ live, lastUpdate, onToggle }) => {
  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <button
      onClick={onToggle}
      title={live ? 'Cliquer pour mettre en pause' : 'Cliquer pour activer le mode live'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
        background: live ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)',
        transition: 'all 0.2s',
      }}
    >
      {/* Point clignotant */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: live ? '#22c55e' : '#94a3b8',
        display: 'inline-block',
        animation: live ? 'livePulse 1.4s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: live ? '#22c55e' : '#94a3b8' }}>
        {live ? 'EN DIRECT' : 'PAUSE'}
      </span>
      {live && (
        <span style={{ fontSize: 10, color: '#64748b' }}>{timeStr}</span>
      )}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </button>
  );
};

export default LiveBadge;
