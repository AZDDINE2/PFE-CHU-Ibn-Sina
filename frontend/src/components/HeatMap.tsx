/**
 * HeatMap — Carte de chaleur passages par heure × jour de semaine
 */
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { IconCalendar } from './Icons';

interface HeatCell { heure: number; jour: string; jour_num: number; count: number; }

const JOURS  = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const HEURES = Array.from({ length: 24 }, (_, i) => i);

const HeatMap: React.FC = () => {
  const { dark } = useTheme();
  const [cells, setCells] = useState<HeatCell[]>([]);

  useEffect(() => {
    axios.get('/api/heatmap')
      .then(r => setCells(r.data))
      .catch(() => {});
  }, []);

  const { grid, maxVal } = useMemo(() => {
    const g: Record<string, number> = {};
    let mx = 0;
    cells.forEach(c => {
      const key = `${c.heure}-${c.jour_num}`;
      g[key] = c.count;
      if (c.count > mx) mx = c.count;
    });
    return { grid: g, maxVal: mx };
  }, [cells]);

  const getColor = (val: number) => {
    if (!val || maxVal === 0) return dark ? '#1e293b' : '#f1f5f9';
    const t = val / maxVal;
    if (t < 0.25) return dark ? '#1e3a5f' : '#dbeafe';
    if (t < 0.50) return '#3b82f6';
    if (t < 0.75) return '#f59e0b';
    return '#ef4444';
  };

  const bg     = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#f1f5f9';
  const text   = dark ? '#e2e8f0' : '#0f172a';
  const muted  = dark ? '#94a3b8' : '#64748b';
  const cellSize = 28;

  if (cells.length === 0) return null;

  return (
    <div style={{ background: bg, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(22,36,84,0.07)', border: `1px solid ${border}`, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconCalendar size={14} color="currentColor"/> Carte de chaleur — Passages par heure × jour
      </div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 14 }}>
        Plus la couleur est chaude, plus l'affluence est élevée
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(24, ${cellSize}px)`, gap: 2, minWidth: 700 }}>
          {/* Header heures */}
          <div/>
          {HEURES.map(h => (
            <div key={h} style={{ textAlign: 'center', fontSize: 9, color: muted, fontWeight: 600 }}>
              {h}h
            </div>
          ))}

          {/* Rows par jour */}
          {JOURS.map((jour, ji) => (
            <React.Fragment key={jour}>
              <div style={{ fontSize: 10, color: muted, fontWeight: 600, display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                {jour.slice(0, 3)}
              </div>
              {HEURES.map(h => {
                const val = grid[`${h}-${ji}`] || 0;
                return (
                  <div
                    key={h}
                    title={`${jour} ${h}h : ${val} patients`}
                    style={{
                      width: cellSize, height: cellSize, borderRadius: 3,
                      background: getColor(val),
                      cursor: 'default',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; e.currentTarget.style.zIndex = '10'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: muted }}>
        <span>Faible</span>
        {[dark ? '#1e3a5f' : '#dbeafe', '#3b82f6', '#f59e0b', '#ef4444'].map((c, i) => (
          <div key={i} style={{ width: 20, height: 10, borderRadius: 2, background: c }}/>
        ))}
        <span>Élevé</span>
        <span style={{ marginLeft: 12 }}>Max : {maxVal} patients</span>
      </div>
    </div>
  );
};

export default HeatMap;
