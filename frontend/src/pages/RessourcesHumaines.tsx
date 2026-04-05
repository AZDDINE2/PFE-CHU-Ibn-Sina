import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

interface PersonnelStat {
  etablissement: string;
  total: number;
  medecins: number;
  infirmiers: number;
  en_service: number;
  absent: number;
}

interface LitStat {
  etablissement: string;
  total: number;
  disponibles: number;
  occupes: number;
  maintenance: number;
  taux_occupation: number;
}

interface Directeur {
  etablissement: string;
  matricule: string;
  nom_complet: string;
  sexe: string;
  role: string;
  specialite: string;
  statut: string;
  telephone: string;
  email: string;
  date_embauche: string;
}

interface EtabRow {
  etablissement: string;
  directeur: Directeur | null;
  medecins: number;
  infirmiers: number;
  en_service: number;
  lits_total: number;
  lits_dispo: number;
  lits_occupes: number;
  lits_maintenance: number;
  taux_occupation: number;
}

const IconRH: React.FC<{ color?: string }> = ({ color = 'white' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const IconPhone: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/>
  </svg>
);

const IconMail: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconCalendar: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const chargeColor = (t: number) => t > 80 ? '#EF4444' : t > 60 ? '#F59E0B' : '#22C55E';
const chargeLabel = (t: number) => t > 80 ? 'Critique' : t > 60 ? 'Élevée' : 'Normale';

const STATUT_DIR: Record<string, { bg: string; color: string }> = {
  'En service': { bg: '#D1FAE5', color: '#065F46' },
  'En garde':   { bg: '#FEF3C7', color: '#D97706' },
  'En conge':   { bg: '#DBEAFE', color: '#1D4ED8' },
  'Repos':      { bg: '#F1F5F9', color: '#64748B' },
};

const RessourcesHumaines: React.FC = () => {
  const { dark } = useTheme();
  const [rows, setRows]         = useState<EtabRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [openEtabs, setOpenEtabs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]   = useState<'accordion' | 'table'>('accordion');

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, pageBg, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const bg      = pageBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;
  const headerBg = innerBg;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get('/api/personnel/stats',     { headers }),
      axios.get('/api/lits/stats',           { headers }),
      axios.get('/api/personnel/directeurs', { headers }),
    ]).then(([pRes, lRes, dRes]) => {
      const perso:  PersonnelStat[] = pRes.data;
      const lits:   LitStat[]       = lRes.data;
      const dirs:   Directeur[]     = dRes.data;

      const litsMap: Record<string, LitStat>    = {};
      const dirMap:  Record<string, Directeur>  = {};
      lits.forEach(l => { litsMap[l.etablissement] = l; });
      dirs.forEach(d => { dirMap[d.etablissement]  = d; });

      const merged: EtabRow[] = perso.map(p => {
        const l = litsMap[p.etablissement] || { total: 0, disponibles: 0, occupes: 0, maintenance: 0, taux_occupation: 0 };
        return {
          etablissement:    p.etablissement,
          directeur:        dirMap[p.etablissement] || null,
          medecins:         p.medecins,
          infirmiers:       p.infirmiers,
          en_service:       p.en_service,
          lits_total:       l.total,
          lits_dispo:       l.disponibles,
          lits_occupes:     l.occupes,
          lits_maintenance: l.maintenance,
          taux_occupation:  l.taux_occupation ?? 0,
        };
      });
      setRows(merged.sort((a, b) => b.taux_occupation - a.taux_occupation));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleEtab  = (etab: string) => setOpenEtabs(prev => {
    const next = new Set(prev);
    next.has(etab) ? next.delete(etab) : next.add(etab);
    return next;
  });
  const expandAll   = () => setOpenEtabs(new Set(rows.map(r => r.etablissement)));
  const collapseAll = () => setOpenEtabs(new Set());

  const tot_med   = rows.reduce((s, r) => s + r.medecins,   0);
  const tot_inf   = rows.reduce((s, r) => s + r.infirmiers, 0);
  const tot_serv  = rows.reduce((s, r) => s + r.en_service, 0);
  const tot_lits  = rows.reduce((s, r) => s + r.lits_total, 0);
  const tot_dispo = rows.reduce((s, r) => s + r.lits_dispo, 0);

  const kpis = [
    { l: 'Établissements',   v: rows.length, color: '#6366F1' },
    { l: 'Médecins',         v: tot_med,     color: '#3B82F6' },
    { l: 'Infirmiers',       v: tot_inf,     color: '#8B5CF6' },
    { l: 'En service',       v: tot_serv,    color: '#22C55E' },
    { l: 'Lits total',       v: tot_lits,    color: '#F59E0B' },
    { l: 'Lits disponibles', v: tot_dispo,   color: '#10B981' },
  ];

  const btnToggle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? '#3B82F6' : (dark ? '#334155' : '#f1f5f9'),
    color: active ? '#fff' : muted,
  });

  // Initiales pour l'avatar
  const initials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  if (loading) return <LoadingSpinner text="Chargement des ressources..." />;

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        icon={<IconRH />}
        title="Ressources Humaines & Lits"
        subtitle="Directeurs et statistiques par établissement"
        badge="Données réelles"
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.l} style={{ background: cardBg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${border}`, borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.v.toLocaleString('fr-FR')}</div>
          </div>
        ))}
      </div>

      {/* Toggle + expand */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: dark ? '#1e293b' : '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button style={btnToggle(viewMode === 'accordion')} onClick={() => setViewMode('accordion')}>Accordéon</button>
          <button style={btnToggle(viewMode === 'table')}     onClick={() => setViewMode('table')}>Tableau</button>
        </div>
        {viewMode === 'accordion' && (
          <>
            <button onClick={expandAll}   style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: muted, fontSize: 12, cursor: 'pointer' }}>Tout ouvrir</button>
            <button onClick={collapseAll} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: muted, fontSize: 12, cursor: 'pointer' }}>Tout fermer</button>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: muted }}>Trié par taux d'occupation décroissant</span>
      </div>

      {/* ══ ACCORDION MODE ══ */}
      {viewMode === 'accordion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => {
            const isOpen = openEtabs.has(r.etablissement);
            const cc  = chargeColor(r.taux_occupation);
            const dir = r.directeur;
            const dirStatut = dir ? (STATUT_DIR[dir.statut] || STATUT_DIR['Repos']) : null;

            return (
              <div key={r.etablissement} style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', boxShadow: dark ? 'none' : '0 2px 8px rgba(15,31,74,0.06)' }}>

                {/* ── Header accordéon : fiche directeur ── */}
                <div
                  onClick={() => toggleEtab(r.etablissement)}
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', userSelect: 'none', borderBottom: isOpen ? `1px solid ${border}` : 'none', background: isOpen ? (dark ? '#162032' : '#F8FAFC') : 'transparent', transition: 'background 0.15s' }}
                >
                  {/* Avatar directeur */}
                  {dir ? (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, #1a3bdb, #3b82f6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}>
                      {initials(dir.nom_complet)}
                    </div>
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: dark ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconRH color={muted} />
                    </div>
                  )}

                  {/* Info directeur + établissement */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {dir ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: text }}>{dir.nom_complet}</span>
                          <span style={{ fontSize: 11, background: '#3B82F620', color: '#3B82F6', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>Chef de service</span>
                          {dirStatut && (
                            <span style={{ fontSize: 11, background: dirStatut.bg, color: dirStatut.color, borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{dir.statut}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.etablissement}
                        </div>
                        {dir.specialite && (
                          <div style={{ fontSize: 11, color: muted, marginTop: 2, fontStyle: 'italic' }}>{dir.specialite}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 14, color: text }}>{r.etablissement}</div>
                        <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Directeur non renseigné</div>
                      </>
                    )}
                  </div>

                  {/* Stats résumées */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#3B82F620', color: '#3B82F6', fontWeight: 700 }}>{r.medecins} Méd.</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#8B5CF620', color: '#8B5CF6', fontWeight: 700 }}>{r.infirmiers} Inf.</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#10B98120', color: '#10B981', fontWeight: 700 }}>{r.lits_dispo} lits dispo</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 48, height: 6, background: dark ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.taux_occupation}%`, background: cc, borderRadius: 3 }}/>
                      </div>
                      <span style={{ color: cc, fontWeight: 800, fontSize: 12 }}>{r.taux_occupation}%</span>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${cc}20`, color: cc, fontWeight: 700 }}>{chargeLabel(r.taux_occupation)}</span>
                  </div>

                  <IconChevron open={isOpen} color={muted} />
                </div>

                {/* ── Corps accordéon ── */}
                {isOpen && (
                  <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

                    {/* Fiche directeur détaillée */}
                    <div style={{ background: dark ? '#0f172a' : '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Fiche Directeur</div>
                      {dir ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                              {initials(dir.nom_complet)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: text }}>{dir.nom_complet}</div>
                              <div style={{ fontSize: 11, color: muted }}>{dir.sexe === 'M' ? 'Dr.' : 'Dre.'} · {dir.role}</div>
                            </div>
                          </div>
                          {dir.specialite && (
                            <div style={{ fontSize: 12, color: text, padding: '6px 10px', background: '#3B82F610', borderRadius: 6 }}>{dir.specialite}</div>
                          )}
                          {dir.telephone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted }}>
                              <IconPhone color={muted}/> {dir.telephone}
                            </div>
                          )}
                          {dir.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <IconMail color={muted}/> {dir.email}
                            </div>
                          )}
                          {dir.date_embauche && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted }}>
                              <IconCalendar color={muted}/> Depuis {dir.date_embauche}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 4 }}>
                            <span style={{ fontFamily: 'monospace', color: muted }}>{dir.matricule}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: muted, textAlign: 'center', padding: 16 }}>Non renseigné</div>
                      )}
                    </div>

                    {/* Stats Personnel */}
                    <div style={{ background: dark ? '#0f172a' : '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Personnel ({r.medecins + r.infirmiers})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Médecins',   value: r.medecins,   color: '#3B82F6', max: r.medecins + r.infirmiers },
                          { label: 'Infirmiers', value: r.infirmiers, color: '#8B5CF6', max: r.medecins + r.infirmiers },
                          { label: 'En service', value: r.en_service, color: '#22C55E', max: r.medecins + r.infirmiers },
                        ].map(item => (
                          <div key={item.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                              <span style={{ color: text }}>{item.label}</span>
                              <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
                            </div>
                            <div style={{ height: 6, background: dark ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.max ? (item.value / item.max) * 100 : 0}%`, background: item.color, borderRadius: 3 }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats Lits */}
                    <div style={{ background: dark ? '#0f172a' : '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Lits ({r.lits_total} total)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Disponibles',   value: r.lits_dispo,       color: '#10B981' },
                          { label: 'Occupés',        value: r.lits_occupes,     color: '#EF4444' },
                          { label: 'Maintenance',    value: r.lits_maintenance, color: '#F59E0B' },
                        ].map(item => (
                          <div key={item.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                              <span style={{ color: text }}>{item.label}</span>
                              <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
                            </div>
                            <div style={{ height: 6, background: dark ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${r.lits_total ? (item.value / r.lits_total) * 100 : 0}%`, background: item.color, borderRadius: 3 }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Taux occupation jauge */}
                      <div style={{ marginTop: 14, padding: '10px 12px', background: `${cc}15`, borderRadius: 8, border: `1px solid ${cc}30` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: text, fontWeight: 600 }}>Taux d'occupation</span>
                          <span style={{ color: cc, fontWeight: 800 }}>{r.taux_occupation}%</span>
                        </div>
                        <div style={{ height: 8, background: dark ? '#334155' : '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.taux_occupation}%`, background: cc, borderRadius: 4 }}/>
                        </div>
                        <div style={{ fontSize: 11, color: cc, fontWeight: 700, marginTop: 5, textAlign: 'right' }}>{chargeLabel(r.taux_occupation)}</div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TABLE MODE ══ */}
      {viewMode === 'table' && (
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: headerBg, borderBottom: `2px solid ${border}` }}>
                  {['Directeur','Établissement','Médecins','Infirmiers','En service','Lits total','Disponibles','Occupés','Taux occupation','Charge'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                  const cc = chargeColor(r.taux_occupation);
                  return (
                    <tr key={r.etablissement} style={{ background: rowBg, borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '12px 14px' }}>
                        {r.directeur ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {initials(r.directeur.nom_complet)}
                            </div>
                            <span style={{ fontWeight: 600, color: text, fontSize: 12 }}>{r.directeur.nom_complet}</span>
                          </div>
                        ) : <span style={{ color: muted, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: muted, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.etablissement}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: '#3B82F620', color: '#3B82F6', borderRadius: 8, padding: '3px 8px', fontWeight: 700 }}>{r.medecins}</span></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: '#8B5CF620', color: '#8B5CF6', borderRadius: 8, padding: '3px 8px', fontWeight: 700 }}>{r.infirmiers}</span></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: '#22C55E20', color: '#22C55E', borderRadius: 8, padding: '3px 8px', fontWeight: 700 }}>{r.en_service}</span></td>
                      <td style={{ padding: '12px 14px', color: text, fontWeight: 600 }}>{r.lits_total}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: '#10B98120', color: '#10B981', borderRadius: 8, padding: '3px 8px', fontWeight: 700 }}>{r.lits_dispo}</span></td>
                      <td style={{ padding: '12px 14px', color: '#EF4444', fontWeight: 600 }}>{r.lits_occupes}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 6, background: dark?'#334155':'#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${r.taux_occupation}%`, background: cc, borderRadius: 3 }}/>
                          </div>
                          <span style={{ color: cc, fontWeight: 700, fontSize: 12 }}>{r.taux_occupation}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: `${cc}20`, color: cc, borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 11 }}>{chargeLabel(r.taux_occupation)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RessourcesHumaines;
