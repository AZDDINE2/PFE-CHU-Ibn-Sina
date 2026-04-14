import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface Patient {
  IPP: string;
  nom_complet: string;
  age: number;
  sexe: string;
  cin: string;
  niveau_triage: string;
  motif: string;
  etablissement: string;
  heure_arrivee: string;
  statut: string;
  lit_numero: string;
  updated_at: string;
  updated_by: string;
}

interface LiveKPIs {
  patients_aujourd_hui: number;
  patients_actifs: number;
  lits_occupes: number;
  total_lits: number;
  taux_charge: number;
  taux_p1_aujourd_hui: number;
  heure_maj: string;
}

const STATUTS = ['En triage', 'En attente', 'En traitement', 'Sorti'];

const STATUT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'En triage':     { bg: '#FEF3C7', color: '#D97706', border: '#F59E0B' },
  'En attente':    { bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' },
  'En traitement': { bg: '#D1FAE5', color: '#065F46', border: '#22C55E' },
  'Sorti':         { bg: '#F1F5F9', color: '#64748B', border: '#94A3B8' },
};

const TRIAGE_COLORS: Record<string, string> = {
  P1: '#EF4444', P2: '#F59E0B', P3: '#3B82F6', P4: '#22C55E', P5: '#94A3B8',
};

const IconPatients: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconChevron: React.FC<{ open: boolean; color: string }> = ({ open, color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const PatientsActuels: React.FC = () => {
  const { dark } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [kpis, setKpis]         = useState<LiveKPIs | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterTriage, setFilterTriage] = useState('');
  const [search, setSearch]             = useState('');
  const [lastRefresh, setLastRefresh]   = useState('');
  const [updating, setUpdating]         = useState<string | null>(null);
  const [lits, setLits]                 = useState<string[]>([]);
  const [litsEtab, setLitsEtab]         = useState<string>('');
  const [viewMode, setViewMode]         = useState<'accordion' | 'table'>('accordion');
  const [openEtabs, setOpenEtabs]       = useState<Set<string>>(new Set());

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, pageBg, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const bg      = pageBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;
  const headerBg = innerBg;
  const inputBg  = innerBg;

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [pRes, kRes] = await Promise.all([
        axios.get('/api/patients/aujourd_hui', { headers }),
        axios.get('/api/kpis/live'),
      ]);
      setPatients(pRes.data);
      setKpis(kRes.data);
      setLastRefresh(new Date().toLocaleTimeString('fr-FR'));
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  const loadLits = useCallback(async (etablissement: string) => {
    if (etablissement === litsEtab && lits.length > 0) return;
    try {
      const r = await axios.get(`/api/lits/disponibles?etablissement=${encodeURIComponent(etablissement)}`);
      setLits(r.data.disponibles || []);
      setLitsEtab(etablissement);
    } catch { }
  }, [lits.length, litsEtab]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000);

  const updateStatut = async (idUrgence: string, statut: string, lit_numero?: string) => {
    setUpdating(idUrgence);
    const token = localStorage.getItem('token');
    const patient = patients.find(p => p.IPP === idUrgence);
    try {
      await axios.patch(`/api/patients/${idUrgence}/statut`, {
        statut,
        lit_numero: lit_numero ?? patient?.lit_numero ?? '',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPatients(prev => prev.map(p =>
        p.IPP === idUrgence
          ? { ...p, statut, lit_numero: lit_numero ?? p.lit_numero }
          : p
      ));
    } catch {
      alert('Erreur lors de la mise à jour');
    } finally { setUpdating(null); }
  };

  // Group by établissement
  const byEtab: Record<string, Patient[]> = {};
  patients.forEach(p => {
    if (!byEtab[p.etablissement]) byEtab[p.etablissement] = [];
    byEtab[p.etablissement].push(p);
  });
  const etablissements = Object.keys(byEtab).sort();

  const toggleEtab = (etab: string) => setOpenEtabs(prev => {
    const next = new Set(prev);
    next.has(etab) ? next.delete(etab) : next.add(etab);
    return next;
  });

  const expandAll   = () => setOpenEtabs(new Set(etablissements));
  const collapseAll = () => setOpenEtabs(new Set());

  const matchesFilters = (p: Patient) =>
    (!filterStatut || p.statut === filterStatut) &&
    (!filterTriage || p.niveau_triage?.startsWith(filterTriage)) &&
    (!search || p.nom_complet.toLowerCase().includes(search.toLowerCase()) ||
      p.cin?.toLowerCase().includes(search.toLowerCase()) ||
      p.motif?.toLowerCase().includes(search.toLowerCase()));

  const statCounts = STATUTS.reduce((a, s) => ({ ...a, [s]: patients.filter(p => p.statut === s).length }), {} as Record<string,number>);

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
    background: inputBg, color: text, fontSize: 12, cursor: 'pointer',
  };

  const btnToggle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? '#3B82F6' : (dark ? '#334155' : '#f1f5f9'),
    color: active ? '#fff' : muted,
  });

  /* Shared patient row renderer */
  const PatientRow = ({ p, i }: { p: Patient; i: number }) => {
    const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
    const sc = STATUT_COLORS[p.statut] || STATUT_COLORS['En triage'];
    const triageLevel = p.niveau_triage?.slice(0,2) || 'P3';
    const tc = TRIAGE_COLORS[triageLevel] || '#94A3B8';
    return (
      <tr key={p.IPP} style={{ background: rowBg, borderBottom: `1px solid ${border}` }}>
        <td style={{ padding: '10px 14px', color: muted, fontWeight: 600, fontSize: 14 }}>{p.heure_arrivee}</td>
        <td style={{ padding: '10px 14px', fontWeight: 700, color: text }}>{p.nom_complet}</td>
        <td style={{ padding: '10px 14px', color: muted, fontSize: 12 }}>{p.cin || '—'}</td>
        <td style={{ padding: '10px 14px', color: muted }}>{p.age} ans · {p.sexe}</td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ background: `${tc}20`, color: tc, borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>
            {p.niveau_triage}
          </span>
        </td>
        <td style={{ padding: '10px 14px', color: text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.motif}</td>
        <td style={{ padding: '10px 14px' }}>
          <select
            disabled={updating === p.IPP}
            value={p.lit_numero || ''}
            onFocus={() => loadLits(p.etablissement)}
            onChange={e => updateStatut(p.IPP, p.statut, e.target.value)}
            style={{ width: 80, padding: '4px 6px', borderRadius: 6, fontSize: 12, border: `1px solid ${p.lit_numero ? '#3B82F6' : border}`, background: p.lit_numero ? '#EFF6FF' : cardBg, color: p.lit_numero ? '#1D4ED8' : muted, fontWeight: p.lit_numero ? 700 : 400, cursor: 'pointer' }}
          >
            <option value="">— Lit —</option>
            {p.lit_numero && !lits.includes(p.lit_numero) && (
              <option value={p.lit_numero}>{p.lit_numero} ✓</option>
            )}
            {lits.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
            {p.statut}
          </span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <select
            disabled={updating === p.IPP}
            value={p.statut}
            onChange={e => updateStatut(p.IPP, e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${border}`, background: cardBg, color: text, cursor: 'pointer', opacity: updating === p.IPP ? 0.5 : 1 }}
          >
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
      </tr>
    );
  };

  const TableHeader = () => (
    <thead>
      <tr style={{ background: headerBg, borderBottom: `2px solid ${border}` }}>
        {['Heure','Patient','CIN','Âge/Sexe','Triage','Motif','Lit','Statut','Action'].map(h => (
          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  if (loading) return <LoadingSpinner text="Chargement des patients..." />;

  const tableFiltered = patients.filter(matchesFilters);

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        icon={<IconPatients />}
        title="Patients Actuels"
        subtitle={`Flux temps réel · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        badge={`MAJ ${lastRefresh}`}
      />

      {/* Live KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: "Aujourd'hui",  v: kpis.patients_aujourd_hui, color: '#3B82F6', sub: 'admissions' },
            { l: 'Actifs',       v: patients.filter(p=>p.statut!=='Sorti').length, color: '#8B5CF6', sub: 'en cours' },
            { l: 'Lits occupés', v: kpis.lits_occupes, color: '#F59E0B', sub: `/ ${kpis.total_lits}` },
            { l: 'Charge',       v: `${kpis.taux_charge}%`, color: kpis.taux_charge > 80 ? '#EF4444' : kpis.taux_charge > 60 ? '#F59E0B' : '#22C55E', sub: 'occupation' },
            { l: 'Taux P1',      v: `${kpis.taux_p1_aujourd_hui}%`, color: '#EF4444', sub: 'critiques' },
            { l: 'Sortis',       v: statCounts['Sorti'] ?? 0, color: '#22C55E', sub: "aujourd'hui" },
          ].map(k => (
            <div key={k.l} style={{ background: cardBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}`, borderTop: `3px solid ${k.color}` }}>
              <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.v}</div>
              <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Barre occupation */}
      {kpis && (
        <div style={{ background: cardBg, borderRadius: 10, padding: '10px 20px', marginBottom: 16, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: muted, fontWeight: 600, whiteSpace: 'nowrap' }}>Occupation lits</span>
          <div style={{ flex: 1, height: 10, background: dark ? '#334155' : '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.taux_charge}%`, background: kpis.taux_charge > 80 ? '#EF4444' : kpis.taux_charge > 60 ? '#F59E0B' : '#22C55E', borderRadius: 5, transition: 'width 0.5s ease' }}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: kpis.taux_charge > 80 ? '#EF4444' : kpis.taux_charge > 60 ? '#F59E0B' : '#22C55E' }}>{kpis.taux_charge}%</span>
          <span style={{ fontSize: 11, color: muted }}>Auto-refresh 30s</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: cardBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}`, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Rechercher patient, CIN, motif..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 180 }}
        />
        {/* Statut filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['', ...STATUTS].map(s => {
            const sc = STATUT_COLORS[s];
            const cnt = s === '' ? patients.length : statCounts[s] ?? 0;
            return (
              <button key={s||'tous'} onClick={() => setFilterStatut(filterStatut === s ? '' : s)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${filterStatut === s ? (sc?.border || '#3B82F6') : border}`,
                background: filterStatut === s ? (sc?.bg || '#EFF6FF') : cardBg,
                color: filterStatut === s ? (sc?.color || '#1D4ED8') : muted,
              }}>
                {s || 'Tous'} ({cnt})
              </button>
            );
          })}
        </div>
        <select value={filterTriage} onChange={e => setFilterTriage(e.target.value)} style={selectStyle}>
          <option value="">Tous niveaux</option>
          {['P1','P2','P3','P4','P5'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: dark ? '#0f172a' : '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button style={btnToggle(viewMode === 'accordion')} onClick={() => setViewMode('accordion')}>Accordéon</button>
          <button style={btnToggle(viewMode === 'table')}     onClick={() => setViewMode('table')}>Tableau</button>
        </div>
        {viewMode === 'accordion' && (
          <>
            <button onClick={expandAll}   style={{ ...selectStyle, border: 'none', background: dark?'#334155':'#f1f5f9' }}>Tout ouvrir</button>
            <button onClick={collapseAll} style={{ ...selectStyle, border: 'none', background: dark?'#334155':'#f1f5f9' }}>Tout fermer</button>
          </>
        )}
        <button onClick={load} style={{ padding: '7px 16px', borderRadius: 8, background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          Actualiser
        </button>
      </div>

      {/* ── ACCORDION MODE ── */}
      {viewMode === 'accordion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {etablissements.map(etab => {
            const etabPatients = byEtab[etab].filter(matchesFilters);
            if (!etabPatients.length && (search || filterStatut || filterTriage)) return null;
            const allEtabPatients = byEtab[etab];
            const isOpen = openEtabs.has(etab);
            const etabCounts = STATUTS.reduce((a, s) => ({ ...a, [s]: allEtabPatients.filter(p => p.statut === s).length }), {} as Record<string,number>);
            const p1Count = allEtabPatients.filter(p => p.niveau_triage?.startsWith('P1')).length;

            return (
              <div key={etab} style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                {/* Établissement header */}
                <div
                  onClick={() => toggleEtab(etab)}
                  style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', borderBottom: isOpen ? `1px solid ${border}` : 'none' }}
                >
                  <IconChevron open={isOpen} color={muted} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etab}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 2, display: 'flex', gap: 12 }}>
                      <span>{allEtabPatients.length} patients</span>
                      {p1Count > 0 && <span style={{ color: '#EF4444', fontWeight: 700 }}>⚠ {p1Count} P1</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUTS.map(s => etabCounts[s] > 0 && (
                      <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUT_COLORS[s].bg, color: STATUT_COLORS[s].color }}>
                        {etabCounts[s]} {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Patients table */}
                {isOpen && (
                  etabPatients.length === 0 ? (
                    <div style={{ padding: '20px 20px 20px 44px', color: muted, fontSize: 13 }}>Aucun patient pour ce filtre</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <TableHeader />
                        <tbody>
                          {etabPatients.map((p, i) => <PatientRow key={p.IPP} p={p} i={i} />)}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}
          {etablissements.length === 0 && (
            <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: 40, textAlign: 'center', color: muted }}>
              Aucun patient aujourd'hui
            </div>
          )}
        </div>
      )}

      {/* ── TABLE MODE ── */}
      {viewMode === 'table' && (
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{tableFiltered.length} patient(s)</span>
            <span style={{ fontSize: 11, color: muted }}>MAJ : {lastRefresh}</span>
          </div>
          {tableFiltered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: muted }}>Aucun patient pour ce filtre</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <TableHeader />
                <tbody>
                  {tableFiltered.map((p, i) => <PatientRow key={p.IPP} p={p} i={i} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientsActuels;
