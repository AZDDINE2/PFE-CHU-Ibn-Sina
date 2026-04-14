import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

interface Personnel {
  id: number;
  matricule: string;
  etablissement: string;
  nom_complet: string;
  sexe: string;
  role: string;
  specialite: string;
  statut: string;
  telephone: string;
  email: string;
  date_embauche: string;
  updated_at: string;
}

const STATUTS_PERS = ['En service', 'En garde', 'En congé', 'Repos'];

const STATUT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'En service': { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  'En garde':   { bg: '#FEF3C7', color: '#D97706', border: '#F59E0B' },
  'En congé':   { bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' },
  'En conge':   { bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' }, // compat anciennes données
  'Repos':      { bg: '#F1F5F9', color: '#64748B', border: '#94A3B8' },
};

const IconPersonnel: React.FC = () => (
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

const GestionPersonnel: React.FC = () => {
  const { dark } = useTheme();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterRole, setFilterRole]     = useState('');
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useState<'accordion' | 'table'>('accordion');
  const [openEtabs, setOpenEtabs]       = useState<Set<string>>(new Set());
  const [openRoles, setOpenRoles]       = useState<Set<string>>(new Set());
  // table mode
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
    const token = localStorage.getItem('token');
    try {
      const r = await axios.get('/api/personnel', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPersonnel(r.data);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by établissement → role
  const byEtab: Record<string, Record<string, Personnel[]>> = {};
  personnel.forEach(p => {
    if (!byEtab[p.etablissement]) byEtab[p.etablissement] = {};
    const roleKey = p.role.includes('édecin') || p.role.includes('nterne') ? 'Médecins' : 'Infirmiers & Aides';
    if (!byEtab[p.etablissement][roleKey]) byEtab[p.etablissement][roleKey] = [];
    byEtab[p.etablissement][roleKey].push(p);
  });
  const etablissements = Object.keys(byEtab).sort();

  const toggleEtab = (etab: string) => setOpenEtabs(prev => {
    const next = new Set(prev);
    next.has(etab) ? next.delete(etab) : next.add(etab);
    return next;
  });

  const toggleRole = (key: string) => setOpenRoles(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const expandAll   = () => setOpenEtabs(new Set(etablissements));
  const collapseAll = () => { setOpenEtabs(new Set()); setOpenRoles(new Set()); };

  const updateStatut = async (matricule: string, statut: string) => {
    setUpdating(matricule);
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`/api/personnel/${matricule}`, { statut }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPersonnel(prev => prev.map(p =>
        p.matricule === matricule ? { ...p, statut } : p
      ));
    } catch {
      alert('Erreur lors de la mise à jour');
    } finally { setUpdating(null); }
  };

  const matchesSearch = (p: Personnel) =>
    !search ||
    p.nom_complet.toLowerCase().includes(search.toLowerCase()) ||
    p.matricule.toLowerCase().includes(search.toLowerCase()) ||
    p.specialite?.toLowerCase().includes(search.toLowerCase());

  const matchesStatut = (p: Personnel) => !filterStatut || p.statut === filterStatut;
  const matchesRole   = (p: Personnel) => !filterRole   || p.role === filterRole;

  const counts = STATUTS_PERS.reduce((acc, s) => {
    acc[s] = personnel.filter(p => p.statut === s).length;
    return acc;
  }, {} as Record<string, number>);

  const allRoles = Array.from(new Set(personnel.map(p => p.role))).sort();

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
    background: inputBg, color: text, fontSize: 12, cursor: 'pointer',
  };

  const btnToggle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? '#3B82F6' : (dark ? '#334155' : '#f1f5f9'),
    color: active ? '#fff' : muted,
  });

  if (loading) return <LoadingSpinner text="Chargement du personnel..." />;

  const tableFiltered = personnel.filter(p =>
    matchesSearch(p) && matchesStatut(p) && matchesRole(p) &&
    (!filterEtab || p.etablissement === filterEtab)
  );

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        icon={<IconPersonnel />}
        title="Gestion du Personnel"
        subtitle={`${personnel.length} membres · ${etablissements.length} établissements`}
        badge="RH"
      />

      {/* KPI cards — cliquables pour filtrer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {STATUTS_PERS.map(statut => {
          const sc = STATUT_COLORS[statut];
          return (
            <div
              key={statut}
              onClick={() => setFilterStatut(filterStatut === statut ? '' : statut)}
              style={{ background: cardBg, borderRadius: 10, padding: '14px 18px', cursor: 'pointer', transition: 'border 0.15s',
                border: `2px solid ${filterStatut === statut ? sc.border : border}`, borderLeft: `4px solid ${sc.border}` }}
            >
              <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{statut}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: sc.border }}>{counts[statut] ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ background: cardBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}`, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Rechercher nom, matricule, spécialité..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 200 }}
        />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={selectStyle}>
          <option value="">Tous les statuts</option>
          {STATUTS_PERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={selectStyle}>
          <option value="">Tous les rôles</option>
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
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
            const allEtabPerso = Object.values(byEtab[etab]).flat();
            const etabFiltered = allEtabPerso.filter(p => matchesSearch(p) && matchesStatut(p) && matchesRole(p));
            if (!etabFiltered.length && (search || filterStatut || filterRole)) return null;
            const isOpen = openEtabs.has(etab);
            const roles  = Object.keys(byEtab[etab]).sort();
            const etabCounts = STATUTS_PERS.reduce((a, s) => ({
              ...a, [s]: allEtabPerso.filter(p => p.statut === s).length
            }), {} as Record<string,number>);

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
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{allEtabPerso.length} membres</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUTS_PERS.map(s => etabCounts[s] > 0 && (
                      <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUT_COLORS[s].bg, color: STATUT_COLORS[s].color }}>
                        {etabCounts[s]} {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Roles */}
                {isOpen && roles.map(role => {
                  const rolePerso = byEtab[etab][role].filter(p => matchesSearch(p) && matchesStatut(p) && matchesRole(p));
                  if (!rolePerso.length && (search || filterStatut || filterRole)) return null;
                  const roleKey = `${etab}||${role}`;
                  const roleOpen = openRoles.has(roleKey);
                  const allRolePerso = byEtab[etab][role];

                  return (
                    <div key={role} style={{ borderBottom: `1px solid ${border}` }}>
                      {/* Role header */}
                      <div
                        onClick={() => toggleRole(roleKey)}
                        style={{ padding: '10px 20px 10px 44px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', background: dark ? '#162032' : '#F8FAFC' }}
                      >
                        <IconChevron open={roleOpen} color={muted} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: text }}>{role}</span>
                        <span style={{ fontSize: 11, color: muted }}>({allRolePerso.length})</span>
                        <div style={{ flex: 1 }} />
                        {STATUTS_PERS.map(s => {
                          const cnt = allRolePerso.filter(p => p.statut === s).length;
                          if (!cnt) return null;
                          return (
                            <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: STATUT_COLORS[s].bg, color: STATUT_COLORS[s].color }}>
                              {cnt}
                            </span>
                          );
                        })}
                      </div>

                      {/* Membres list */}
                      {roleOpen && (
                        <div style={{ padding: '8px 44px 12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${border}` }}>
                                {['Matricule','Nom','Spécialité','Tél.','Statut','Modifier'].map(h => (
                                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rolePerso.map((p, i) => {
                                const sc = STATUT_COLORS[p.statut] || STATUT_COLORS['Repos'];
                                const rowBg = dark ? (i%2===0?'transparent':'#0f172a20') : (i%2===0?'transparent':'#f8fafc');
                                return (
                                  <tr key={p.matricule} style={{ background: rowBg }}>
                                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: muted }}>{p.matricule}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: text }}>{p.nom_complet}</td>
                                    <td style={{ padding: '8px 10px', color: muted, fontSize: 12 }}>{p.specialite || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: muted, fontSize: 12 }}>{p.telephone || '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '2px 9px', fontWeight: 700, fontSize: 11 }}>{p.statut}</span>
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <select
                                        disabled={updating === p.matricule}
                                        value={p.statut}
                                        onChange={e => updateStatut(p.matricule, e.target.value)}
                                        style={{ fontSize: 12, padding: '3px 7px', borderRadius: 6, border: `1px solid ${border}`, background: cardBg, color: text, cursor: 'pointer', opacity: updating === p.matricule ? 0.5 : 1 }}
                                      >
                                        {STATUTS_PERS.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{tableFiltered.length} membres</span>
            </div>
            {tableFiltered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: muted }}>Aucun résultat</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: headerBg, borderBottom: `2px solid ${border}` }}>
                      {['Matricule','Nom','Établissement','Rôle','Spécialité','Tél.','Statut','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableFiltered.map((p, i) => {
                      const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                      const sc = STATUT_COLORS[p.statut] || STATUT_COLORS['Repos'];
                      return (
                        <tr key={p.matricule} style={{ background: rowBg, borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: muted }}>{p.matricule}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: text }}>{p.nom_complet}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.etablissement}</td>
                          <td style={{ padding: '10px 14px', color: text, fontSize: 12 }}>{p.role}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 12 }}>{p.specialite || '—'}</td>
                          <td style={{ padding: '10px 14px', color: muted, fontSize: 12 }}>{p.telephone || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 11 }}>{p.statut}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              disabled={updating === p.matricule}
                              value={p.statut}
                              onChange={e => updateStatut(p.matricule, e.target.value)}
                              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${border}`, background: cardBg, color: text, cursor: 'pointer', opacity: updating === p.matricule ? 0.5 : 1 }}
                            >
                              {STATUTS_PERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
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
    </div>
  );
};

export default GestionPersonnel;
