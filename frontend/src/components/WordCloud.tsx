/**
 * WordCloud — Nuage de mots SVG pur (sans dépendance externe)
 */
import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Word { text: string; count: number }
interface Props { words: Word[]; title?: string }

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#64748b'];

const WordCloud: React.FC<Props> = ({ words, title }) => {
  const { dark } = useTheme();
  const cardBg   = dark ? '#1e293b' : '#fff';
  const border   = dark ? '#334155' : '#e2e8f0';
  const textCol  = dark ? '#e2e8f0' : '#0f172a';

  const sorted = useMemo(() =>
    [...words].sort((a, b) => b.count - a.count).slice(0, 30),
    [words]
  );

  if (!sorted.length) return null;

  const maxCount = sorted[0]?.count || 1;

  // Disposition en grille aléatoire mais déterministe
  const positioned = useMemo(() =>
    sorted.map((w, i) => {
      const ratio = w.count / maxCount;
      const size  = Math.round(10 + ratio * 22);
      const col   = COLORS[i % COLORS.length];
      // Pseudo-aléatoire déterministe basé sur l'index
      const angle = (i * 137.5) % 360; // golden angle pour distribution uniforme
      const r     = 30 + (i / sorted.length) * 180;
      const x     = 50 + (r * Math.cos((angle * Math.PI) / 180)) * 0.4;
      const y     = 50 + (r * Math.sin((angle * Math.PI) / 180)) * 0.22;
      return { ...w, size, col, x, y, opacity: 0.6 + ratio * 0.4 };
    }),
    [sorted, maxCount]
  );

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 20, border: `1px solid ${border}` }}>
      {title && (
        <div style={{ fontWeight: 800, fontSize: 14, color: textCol, marginBottom: 12 }}>{title}</div>
      )}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        {positioned.map((w, i) => (
          <span
            key={i}
            title={`${w.text} : ${w.count} occurrences`}
            style={{
              position: 'absolute',
              left: `${Math.max(2, Math.min(92, w.x))}%`,
              top:  `${Math.max(2, Math.min(88, w.y))}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: w.size,
              fontWeight: w.count === maxCount ? 800 : w.size > 18 ? 700 : 500,
              color: w.col,
              opacity: w.opacity,
              whiteSpace: 'nowrap',
              cursor: 'default',
              transition: 'transform 0.2s, opacity 0.2s',
              userSelect: 'none',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'translate(-50%,-50%) scale(1.15)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = String(w.opacity); (e.target as HTMLElement).style.transform = 'translate(-50%,-50%)'; }}
          >
            {w.text}
          </span>
        ))}
      </div>
      {/* Légende */}
      <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {sorted.slice(0, 5).map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLORS[i % COLORS.length] }}>
            <span style={{ fontWeight: 700 }}>{w.text}</span>
            <span style={{ color: dark ? '#475569' : '#94a3b8' }}>({w.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordCloud;
