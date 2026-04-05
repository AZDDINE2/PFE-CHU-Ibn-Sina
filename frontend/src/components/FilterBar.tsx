import React from 'react';
import { IconFilter, IconCalendar } from './Icons';

interface FilterBarProps {
  annees?: string[];
  selectedAnnees?: string[];
  onToggleAnnee?: (a: string) => void;

  triage?: string[];
  selectedTriage?: string;
  onTriage?: (t: string) => void;

  etablissements?: string[];
  selectedEtab?: string;
  onEtab?: (e: string) => void;

  orientation?: string[];
  selectedOrientation?: string;
  onOrientation?: (o: string) => void;

  onReset?: () => void;
}

const ALL_ANNEES = ['2019','2020','2021','2022','2023','2024','2025','2026'];

const FilterBar: React.FC<FilterBarProps> = ({
  annees = ALL_ANNEES,
  selectedAnnees = ALL_ANNEES,
  onToggleAnnee,
  triage = [],
  selectedTriage = 'Tous',
  onTriage,
  etablissements = [],
  selectedEtab = 'Tous',
  onEtab,
  orientation = [],
  selectedOrientation = 'Toutes',
  onOrientation,
  onReset,
}) => (
  <div style={{
    background: '#fff', borderRadius: 12, padding: '12px 20px',
    marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center',
    flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(22,36,84,0.06)',
    border: '1px solid #e8edf5',
  }}>
    {/* Icon filtre */}
    <div style={{ display:'flex', alignItems:'center', gap:6, color:'#64748B', fontWeight:600, fontSize:13 }}>
      <IconFilter size={15} />
      Filtres
    </div>

    {/* Années */}
    {onToggleAnnee && (
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, color:'#94A3B8', fontSize:12 }}>
          <IconCalendar size={13} /> Années :
        </div>
        {annees.map(a => (
          <button key={a} onClick={() => onToggleAnnee(a)} style={{
            padding: '3px 11px', borderRadius: 20,
            border: '1.5px solid',
            borderColor: selectedAnnees.includes(a) ? '#3B82F6' : '#E2E8F0',
            background:  selectedAnnees.includes(a) ? '#EFF6FF' : '#F8FAFC',
            color:       selectedAnnees.includes(a) ? '#1D4ED8' : '#94A3B8',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
          }}>{a}</button>
        ))}
      </div>
    )}

    {/* Séparateur */}
    {onTriage && <div style={{ width:1, height:24, background:'#e8edf5' }} />}

    {/* Triage */}
    {onTriage && (
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:'#94A3B8' }}>Triage :</span>
        <select value={selectedTriage} onChange={e => onTriage(e.target.value)} style={{
          padding:'4px 10px', borderRadius:8, border:'1.5px solid #E2E8F0',
          fontSize:12, color:'#475569', background:'#F8FAFC', cursor:'pointer',
        }}>
          <option value="Tous">Tous</option>
          {triage.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    )}

    {/* Etablissement */}
    {onEtab && (
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:'#94A3B8' }}>Etablissement :</span>
        <select value={selectedEtab} onChange={e => onEtab(e.target.value)} style={{
          padding:'4px 10px', borderRadius:8, border:'1.5px solid #E2E8F0',
          fontSize:12, color:'#475569', background:'#F8FAFC', cursor:'pointer', maxWidth:180,
        }}>
          <option value="Tous">Tous</option>
          {etablissements.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
    )}

    {/* Orientation */}
    {onOrientation && (
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:'#94A3B8' }}>Orientation :</span>
        <select value={selectedOrientation} onChange={e => onOrientation(e.target.value)} style={{
          padding:'4px 10px', borderRadius:8, border:'1.5px solid #E2E8F0',
          fontSize:12, color:'#475569', background:'#F8FAFC', cursor:'pointer',
        }}>
          <option value="Toutes">Toutes</option>
          {orientation.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )}

    {/* Reset */}
    {onReset && (
      <button onClick={onReset} style={{
        marginLeft: 'auto', padding:'4px 12px', borderRadius:8,
        border:'1.5px solid #E2E8F0', background:'#F8FAFC',
        color:'#94A3B8', cursor:'pointer', fontSize:12, fontWeight:600,
      }}>Réinitialiser</button>
    )}
  </div>
);

export default FilterBar;
