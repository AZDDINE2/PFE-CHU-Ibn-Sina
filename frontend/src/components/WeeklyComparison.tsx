/**
 * WeeklyComparison — Comparaison semaine actuelle vs semaine précédente
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { IconCalendar } from './Icons';

interface Stats { patients: number; duree_moy: number; taux_fugue: number; taux_p1: number; }
interface CompData {
  actuelle: Stats;
  precedente: Stats;
  delta: Stats;
  periode_actuelle: string;
  periode_precedente: string;
}

const KPI_CONFIG = [
  { key: 'patients',   label: 'Patients',        unit: '',    lowerBetter: false },
  { key: 'duree_moy',  label: 'Durée moy.',       unit: ' min', lowerBetter: true  },
  { key: 'taux_fugue', label: 'Taux fugue',       unit: '%',   lowerBetter: true  },
  { key: 'taux_p1',    label: 'Cas P1',           unit: '%',   lowerBetter: true  },
];

const WeeklyComparison: React.FC = () => {
  const { dark } = useTheme();
  const [data, setData] = useState<CompData | null>(null);

  useEffect(() => {
    axios.get('/api/stats/comparaison')
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const bg     = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#f1f5f9';
  const text   = dark ? '#e2e8f0' : '#0f172a';
  const muted  = dark ? '#94a3b8' : '#64748b';
  const inner  = dark ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ background: bg, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(22,36,84,0.07)', border: `1px solid ${border}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: text, display: 'flex', alignItems: 'center', gap: 6 }}><IconCalendar size={14} color="currentColor"/> Comparaison des périodes</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
            Dernière semaine disponible ({data.periode_precedente} → {data.periode_actuelle}) vs semaine précédente
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {KPI_CONFIG.map(({ key, label, unit, lowerBetter }) => {
          const act  = (data.actuelle  as any)[key];
          const prec = (data.precedente as any)[key];
          const d    = (data.delta     as any)[key];
          const better = lowerBetter ? d < 0 : d > 0;
          const worse  = lowerBetter ? d > 0 : d < 0;
          const color  = d === 0 ? '#94a3b8' : better ? '#22c55e' : worse ? '#ef4444' : '#94a3b8';
          const arrow  = d === 0 ? '=' : d > 0 ? '↑' : '↓';

          return (
            <div key={key} style={{ background: inner, borderRadius: 10, padding: '14px 16px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: text }}>{act}{unit}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 3 }}>
                  {arrow} {Math.abs(d)}{unit}
                </span>
              </div>
              <div style={{ fontSize: 11, color: muted }}>
                Précédente : <strong style={{ color: text }}>{prec}{unit}</strong>
              </div>
              <div style={{ marginTop: 8, height: 4, background: dark ? '#334155' : '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: prec > 0 ? `${Math.min((act / Math.max(act, prec)) * 100, 100)}%` : '50%',
                  background: color, transition: 'width 0.6s',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyComparison;
