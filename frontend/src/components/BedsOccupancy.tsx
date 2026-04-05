/**
 * BedsOccupancy — Visualisation de l'occupation des lits par établissement
 */
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconAlertTriangle } from './Icons';

interface Etab {
  nom: string;
  capacite_lits: number;
  Nb_Patients: number;
  Taux_Hospit_Pct: number;
  Alerte_Charge: string;
}

interface Props { etablissements: Etab[] }

const BedsOccupancy: React.FC<Props> = ({ etablissements }) => {
  const { dark } = useTheme();
  const cardBg = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#e2e8f0';
  const textCol = dark ? '#e2e8f0' : '#0f172a';
  const mutedCol = dark ? '#94a3b8' : '#64748b';
  const trackBg = dark ? '#334155' : '#f1f5f9';

  const getColor = (pct: number, alerte: string) => {
    if (alerte === 'Critique' || pct > 85) return '#ef4444';
    if (alerte === 'Warning'  || pct > 60) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 20, border: `1px solid ${border}` }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: textCol, marginBottom: 16 }}>
        Occupation des lits par établissement
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {etablissements.map(e => {
          const occupancy = Math.min((e.Taux_Hospit_Pct / 100) * e.capacite_lits, e.capacite_lits);
          const pct = Math.min(e.Taux_Hospit_Pct, 100);
          const color = getColor(pct, e.Alerte_Charge);
          const litsLibres = Math.max(Math.round(e.capacite_lits - occupancy), 0);

          return (
            <div key={e.nom}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: textCol, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.nom}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: mutedCol }}>{litsLibres} lits libres</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color, background: `${color}18`,
                    padding: '2px 7px', borderRadius: 10,
                  }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: trackBg, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: color,
                  width: `${pct}%`, transition: 'width 0.6s ease',
                  animation: pct > 85 ? 'criticalPulse 1.5s ease-in-out infinite' : 'none',
                }} />
              </div>
              {pct > 85 && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconAlertTriangle size={10} color="#ef4444"/> Capacité critique — {e.Alerte_Charge}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes criticalPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default BedsOccupancy;
