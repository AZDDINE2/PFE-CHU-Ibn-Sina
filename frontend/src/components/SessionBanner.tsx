import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/** Formate les secondes restantes en "Xh Ym" ou "Xm Ys" */
function formatTime(secs: number): string {
  if (secs <= 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2,'0')}s`;
  return `${s}s`;
}

/**
 * Bannière affichée :
 *  - Verte subtile  quand > 60 min (invisible = juste indicateur dans topbar)
 *  - Orange         quand ≤ 15 min (avertissement)
 *  - Rouge animée   quand ≤ 2 min  (urgence)
 */
const SessionBanner: React.FC = () => {
  const { secondsLeft, refreshToken, logout } = useAuth();
  const { dark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed,  setDismissed]  = useState(false);

  // N'affiche rien si > 15 min ou déjà fermé
  if (secondsLeft <= 0 || secondsLeft > 15 * 60 || dismissed) return null;

  const critical = secondsLeft <= 2 * 60;  // ≤ 2 min = rouge
  const warning  = secondsLeft <= 15 * 60; // ≤ 15 min = orange

  const bgColor     = critical ? (dark ? '#450a0a' : '#fef2f2') : (dark ? '#431407' : '#fff7ed');
  const borderColor = critical ? '#ef4444' : '#f97316';
  const textColor   = critical ? (dark ? '#fca5a5' : '#dc2626') : (dark ? '#fdba74' : '#c2410c');
  const iconColor   = borderColor;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshToken();
      setDismissed(true);           // ferme la bannière après renouvellement réussi
    } catch {
      /* laisse expirer */
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      background: bgColor,
      borderBottom: `2px solid ${borderColor}`,
      animation: critical ? 'sessionPulse 1.5s ease-in-out infinite' : undefined,
    }}>
      <style>{`
        @keyframes sessionPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.75; }
        }
      `}</style>

      {/* Icône horloge */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>

      {/* Message */}
      <span style={{ fontSize: 13, fontWeight: 600, color: textColor, flex: 1 }}>
        {critical
          ? `Session expire dans ${formatTime(secondsLeft)} — Renouvelez maintenant pour ne pas perdre votre travail.`
          : `Votre session expire dans ${formatTime(secondsLeft)}.`
        }
      </span>

      {/* Bouton renouveler */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          padding: '5px 14px',
          borderRadius: 6,
          border: `1.5px solid ${borderColor}`,
          background: 'transparent',
          color: textColor,
          fontSize: 12,
          fontWeight: 700,
          cursor: refreshing ? 'not-allowed' : 'pointer',
          opacity: refreshing ? 0.6 : 1,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {refreshing ? 'Renouvellement…' : 'Renouveler la session'}
      </button>

      {/* Bouton déconnexion */}
      <button
        onClick={logout}
        style={{
          padding: '5px 12px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: textColor,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: 0.7,
        }}
      >
        Se déconnecter
      </button>

      {/* Bouton fermer (si warning, pas critique) */}
      {!critical && (
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: textColor, fontSize: 16, lineHeight: 1, padding: 2, opacity: 0.6,
          }}
          title="Fermer"
        >×</button>
      )}
    </div>
  );
};

export default SessionBanner;
