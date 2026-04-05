import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

interface Lit {
  id: number;
  etablissement: string;
  numero_lit: string;
  service: string;
  type_lit: string;
  statut: string;
  id_patient: string;
  nom_patient: string;
  date_admission: string;
  updated_at: string;
}

const STATUTS_LIT = ['Disponible', 'Occupe', 'En maintenance', 'Reserve'];

const STATUT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Disponible':     { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  'Occupe':         { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' },
  'En maintenance': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  'Reserve':        { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' },
};

const IconLit: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/>
    <path d="M2 17h20"/><path d="M6 8v9"/>
  </svg>
);

const IconChevron: React.FC<{ open: boolean; color: string }> = ({ open, color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* Mini bar showing statut distribution for an établissement */
const StatBar: React.FC<{ lits: Lit[] }> = ({ lits }) => {
  const total = lits.length;
  if (!total) return null;
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', width: 120, gap: 1 }}>
      {STATUTS_LIT.map(s => {
        const pct = (lits.filter(l => l.statut === s).length / total) * 100;
        if (!pct) return null;
        return <div key={s} style={{ width: `${pct}%`, background: STATUT_COLORS[s].border }} />;
      })}
    </div>
  );
};

const GestionLits: React.FC = () => {
  const { dark } = useTheme();
  const [lits, setLits]               = useState<Lit[]>([]);
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useState<'accordion' | 'table'>('accordion');
  const [openEtabs, setOpenEtabs]       = useState<Set<string>>(new Set());
  const [openServices, setOpenServices] = useState<Set<string>>(new Set());
  const [editLit, setEditLit]           = useState<Lit | null>(null);
  const [editStatut, setEditStatut]     = useState('');
  const [editPatient, setEditPatient]   = useState('');
  // table-mode filter
  const [filterEtab, setFilterEtab]     = useState('');

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
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await axios.get('/api/lits', { headers });
      setLits(r.data);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group lits by etablissement → service
  const byEtab: Record<string, Record<string, Lit[]>> = {};
  lits.forEach(l => {
    if (!byEtab[l.etablissement]) byEtab[l.etablissement] = {};
    if (!byEtab[l.etablissement][l.service]) byEtab[l.etablissement][l.service] = [];
    byEtab[l.etablissement][l.service].push(l);
  });
  const etablissements = Object.keys(byEtab).sort();

  const toggleEtab = (etab: string) => {
    setOpenEtabs(prev => {
      const next = new Set(prev);
      next.has(etab) ? next.delete(etab) : next.add(etab);
      return next;
    });
  };

  const toggleService = (key: string) => {
    setOpenServices(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const expandAll  = () => setOpenEtabs(new Set(etablissements));
  const collapseAll = () => { setOpenEtabs(new Set()); setOpenServices(new Set()); };

  const updateLit = async () => {
    if (!editLit) return;
    const key = `${editLit.etablissement}|${editLit.numero_lit}`;
    setUpdating(key);
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `/api/lits/${encodeURIComponent(editLit.etablissement)}/${encodeURIComponent(editLit.numero_lit)}`,
        { statut: editStatut, nom_patient: editPatient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLits(prev => prev.map(l =>
        l.etablissement === editLit.etablissement && l.numero_lit === editLit.numero_lit
          ? { ...l, statut: editStatut, nom_patient: editPatient }
          : l
      ));
      setEditLit(null);
    } catch {
      alert('Erreur lors de la mise à jour');
    } finally { setUpdating(null); }
  };

  const openEdit = (lit: Lit) => {
    setEditLit(lit);
    setEditStatut(lit.statut);
    setEditPatient(lit.nom_patient || '');
  };

  const matchesSearch = (l: Lit) =>
    !search ||
    l.numero_lit.toLowerCase().includes(search.toLowerCase()) ||
    (l.nom_patient || '').toLowerCase().includes(search.toLowerCase()) ||
    l.service.toLowerCase().includes(search.toLowerCase());

  const matchesStatut = (l: Lit) => !filterStatut || l.statut === filterStatut;

  const counts = STATUTS_LIT.reduce((acc, s) => {
    acc[s] = lits.filter(l => l.statut === s).length;
    return acc;
  }, {} as Record<string, number>);

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
    background: inputBg, color: text, fontSize: 12, cursor: 'pointer',
  };

  const btnToggle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? '#3B82F6' : (dark ? '#334155' : '#f1f5f9'),
    color: active ? '#fff' : muted,
  });

  if (loading) return <LoadingSpinner text="Chargement des lits..." />;

  /* ── TABLE MODE RENDER ── */
  const tableFiltered = lits.filter(l =>
    matchesSearch(l) && matchesStatut(l) &&
    (!filterEtab || l.etablissement === filterEtab)
  );

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        icon={<IconLit />}
        title="Gestion des Lits"
        subtitle={`${lits.length} lits · ${counts['Disponible'] ?? 0} disponibles · ${etablissements.length} établissements`}
        badge="Lits"
      />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {STATUTS_LIT.map(statut => {
          const sc = STATUT_COLORS[statut];
          const pct = lits.length ? Math.round((counts[statut] / lits.length) * 100) : 0;
          return (
            <div
              key={statut}
              onClick={() => setFilterStatut(filterStatut === statut ? '' : statut)}
              style={{ background: cardBg, borderRadius: 10, padding: '14px 18px', border: `2px solid ${filterStatut === statut ? sc.border : border}`, borderLeft: `4px solid ${sc.border}`, cursor: 'pointer', transition: 'border 0.15s' }}
            >
              <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{statut}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: sc.border }}>{counts[statut] ?? 0}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{pct}% du total</div>
              <div style={{ marginTop: 6, height: 4, background: dark ? '#334155' : '#e2e8f0', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: sc.border, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ background: cardBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}`, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Rechercher lit, patient, service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={selectStyle}>
          <option value="">Tous les statuts</option>
          {STATUTS_LIT.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: dark ? '#0f172a' : '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button style={btnToggle(viewMode === 'accordion')} onClick={() => setViewMode('accordion')}>Accordéon</button>
          <button style={btnToggle(viewMode === 'table')} onClick={() => setViewMode('table')}>Tableau</button>
        </div>
        {viewMode === 'accordion' && (
          <>
            <button onClick={expandAll}   style={{ ...selectStyle, background: dark?'#334155':'#f1f5f9', border:'none' }}>Tout ouvrir</button>
            <button onClick={collapseAll} style={{ ...selectStyle, background: dark?'#334155':'#f1f5f9', border:'none' }}>Tout fermer</button>
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
            const etabLits = Object.values(byEtab[etab]).flat().filter(l => matchesSearch(l) && matchesStatut(l));
            if (!etabLits.length && (search || filterStatut)) return null;
            const isOpen = openEtabs.has(etab);
            const services = Object.keys(byEtab[etab]).sort();
            const etabCounts = STATUTS_LIT.reduce((a, s) => ({ ...a, [s]: etabLits.filter(l => l.statut === s).length }), {} as Record<string,number>);
            const allLitsForEtab = Object.values(byEtab[etab]).flat();

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <StatBar lits={allLitsForEtab} />
                      <span style={{ fontSize: 11, color: muted }}>{allLitsForEtab.length} lits</span>
                    </div>
                  </div>
                  {/* Statut badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUTS_LIT.map(s => etabCounts[s] > 0 && (
                      <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUT_COLORS[s].bg, color: STATUT_COLORS[s].color }}>
                        {etabCounts[s]} {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Services */}
                {isOpen && (
                  <div>
                    {services.map(service => {
                      const svcLits = byEtab[etab][service].filter(l => matchesSearch(l) && matchesStatut(l));
                      if (!svcLits.length && (search || filterStatut)) return null;
                      const svcKey = `${etab}||${service}`;
                      const svcOpen = openServices.has(svcKey);
                      const allSvcLits = byEtab[etab][service];

                      return (
                        <div key={service} style={{ borderBottom: `1px solid ${border}` }}>
                          {/* Service header */}
                          <div
                            onClick={() => toggleService(svcKey)}
                            style={{ padding: '10px 20px 10px 44px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', background: dark ? '#162032' : '#F8FAFC' }}
                          >
                            <IconChevron open={svcOpen} color={muted} />
                            <span style={{ fontWeight: 600, fontSize: 13, color: text }}>{service}</span>
                            <span style={{ fontSize: 11, color: muted }}>({allSvcLits.length} lits)</span>
                            <div style={{ flex: 1 }} />
                            {STATUTS_LIT.map(s => {
                              const cnt = allSvcLits.filter(l => l.statut === s).length;
                              if (!cnt) return null;
                              return (
                                <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: STATUT_COLORS[s].bg, color: STATUT_COLORS[s].color }}>
                                  {cnt}
                                </span>
                              );
                            })}
                          </div>

                          {/* Lits grid */}
                          {svcOpen && (
                            <div style={{ padding: '12px 20px 12px 44px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {svcLits.map(l => {
                                const sc = STATUT_COLORS[l.statut] || STATUT_COLORS['Disponible'];
                                return (
                                  <div
                                    key={l.numero_lit}
                                    onClick={() => openEdit(l)}
                                    title={l.nom_patient ? `Patient: ${l.nom_patient}` : l.statut}
                                    style={{
                                      width: 90, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                                      border: `1.5px solid ${sc.border}`, background: sc.bg,
                                      display: 'flex', flexDirection: 'column', gap: 3,
                                      transition: 'transform 0.1s, box-shadow 0.1s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                  >
                                    <span style={{ fontSize: 12, fontWeight: 800, color: sc.color, fontFamily: 'monospace' }}>{l.numero_lit}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, textTransform: 'uppercase', opacity: 0.8 }}>{l.type_lit}</span>
                                    {l.nom_patient && (
                                      <span style={{ fontSize: 9, color: sc.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nom_patient}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE MODE ── */}
      {viewMode === 'table' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <select value={filterEtab} onChange={e => setFilterEtab(e.target.value)} style={{ ...selectStyle, minWidth: 260 }}>
              <option value="">Tous les établissements</option>
              {etablissements.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{tableFiltered.length} lits</span>
            </div>
            {tableFiltered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: muted }}>Aucun résultat</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: headerBg, borderBottom: `2px solid ${border}` }}>
                      {['N° Lit','Établissement','Service','Type','Statut','Patient','Admission','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableFiltered.map((l, i) => {
                      const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                      const sc = STATUT_COLORS[l.statut] || STATUT_COLORS['Disponible'];
                      return (
                        <tr key={`${l.etablissement}-${l.numero_lit}`} style={{ background: rowBg, borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: text, fontFamily: 'monospace' }}>{l.numero_lit}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.etablissement}</td>
                          <td style={{ padding: '10px 14px', color: text }}>{l.service}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 12 }}>{l.type_lit}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{l.statut}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: text, fontSize: 12 }}>{l.nom_patient || <span style={{ color: muted }}>—</span>}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 11 }}>{l.date_admission ? l.date_admission.slice(0,10) : '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => openEdit(l)} style={{ padding: '4px 12px', borderRadius: 6, background: '#3B82F620', color: '#3B82F6', border: '1px solid #3B82F640', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                              Modifier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal edit */}
      {editLit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: cardBg, borderRadius: 12, padding: 28, width: 420, border: `1px solid ${border}` }}>
            <h3 style={{ color: text, margin: '0 0 4px', fontSize: 16 }}>Lit {editLit.numero_lit}</h3>
            <p style={{ color: muted, fontSize: 12, margin: '0 0 20px' }}>{editLit.etablissement} · {editLit.service} · {editLit.type_lit}</p>

            <label style={{ fontSize: 12, color: muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>STATUT</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {STATUTS_LIT.map(s => {
                const sc = STATUT_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setEditStatut(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      border: `2px solid ${editStatut === s ? sc.border : 'transparent'}`,
                      background: editStatut === s ? sc.bg : (dark ? '#334155' : '#f1f5f9'),
                      color: editStatut === s ? sc.color : muted,
                    }}
                  >{s}</button>
                );
              })}
            </div>

            <label style={{ fontSize: 12, color: muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>NOM PATIENT (si occupé)</label>
            <input
              value={editPatient}
              onChange={e => setEditPatient(e.target.value)}
              placeholder="Nom du patient..."
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 13, width: '100%', marginBottom: 24, boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditLit(null)} style={{ padding: '8px 18px', borderRadius: 8, background: dark?'#334155':'#f1f5f9', color: text, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button
                onClick={updateLit}
                disabled={!!updating}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#3B82F6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: updating ? 0.6 : 1 }}
              >
                {updating ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionLits;
