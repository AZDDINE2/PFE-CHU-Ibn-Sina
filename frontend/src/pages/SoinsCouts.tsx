import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  IconPill, IconActivity, IconStethoscope, IconClipboard, IconTrophy,
  IconCheckCircle, IconRefreshCw, DotBlue, DotYellow, DotGray,
  Medal1, Medal2, Medal3,
} from '../components/Icons';
import {
  fetchSoinsTypes, fetchResultats, fetchMedicaments,
  fetchMaladiesSaisonnieres,
  SoinType, Resultat, Medicament, SaisonMaladies,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899'];

const RESULTAT_ICONS: Record<string, React.ReactNode> = {
  'Guéri':        <IconCheckCircle size={10} color="#22C55E"/>,
  'Amélioré':     <DotBlue size={10}/>,
  'Stationnaire': <DotYellow size={10}/>,
  'Décédé':       <DotGray size={10}/>,
  'Transfert':    <IconRefreshCw size={10} color="#8B5CF6"/>,
};

/* ── Saison SVG icons ───────────────────────────────────── */
const IconSnowflake: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 7l-5 5-5-5"/>
    <path d="M17 17l-5-5-5 5"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M7 7l5 5 5-5" transform="rotate(90 12 12)"/>
    <path d="M7 17l5-5 5 5" transform="rotate(90 12 12)"/>
  </svg>
);

const IconFlower: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2a4 4 0 0 1 4 4c0 2-4 3-4 3s-4-1-4-3a4 4 0 0 1 4-4z"/>
    <path d="M12 22a4 4 0 0 1-4-4c0-2 4-3 4-3s4 1 4 3a4 4 0 0 1-4 4z"/>
    <path d="M2 12a4 4 0 0 1 4-4c2 0 3 4 3 4s-1 4-3 4a4 4 0 0 1-4-4z"/>
    <path d="M22 12a4 4 0 0 1-4 4c-2 0-3-4-3-4s1-4 3-4a4 4 0 0 1 4 4z"/>
  </svg>
);

const IconSun: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconLeaf: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const SAISON_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  'Hiver':     IconSnowflake,
  'Printemps': IconFlower,
  'Ete':       IconSun,
  'Automne':   IconLeaf,
};

/* ── Saison config ─────────────────────────────────────── */
/* "Ete" = valeur DB, displayed as "Été" */
const SAISON_LABEL: Record<string, string> = {
  'Hiver': 'Hiver', 'Printemps': 'Printemps', 'Ete': 'Été', 'Automne': 'Automne',
};

const SAISON_CONFIG: Record<string, { color: string; bg: string; months: string }> = {
  'Hiver':     { color: '#60A5FA', bg: '#EFF6FF', months: 'Déc · Jan · Fév' },
  'Printemps': { color: '#34D399', bg: '#ECFDF5', months: 'Mar · Avr · Mai' },
  'Ete':       { color: '#F59E0B', bg: '#FFFBEB', months: 'Jun · Jul · Aoû' },
  'Automne':   { color: '#F97316', bg: '#FFF7ED', months: 'Sep · Oct · Nov' },
};

const SAISON_CONFIG_DARK: Record<string, { color: string; bg: string }> = {
  'Hiver':     { color: '#60A5FA', bg: 'rgba(96,165,250,0.08)'  },
  'Printemps': { color: '#34D399', bg: 'rgba(52,211,153,0.08)'  },
  'Ete':       { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)'  },
  'Automne':   { color: '#F97316', bg: 'rgba(249,115,22,0.08)'  },
};

/* ── Small trend badge ─────────────────────────────────── */
const RateBadge: React.FC<{ val: number; label: string; color: string }> = ({ val, label, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}%</span>
    <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════════ */
const SoinsCouts: React.FC = () => {
  const { dark } = useTheme();
  const {
    cardBg, innerBg, border, textPrimary, textMuted, textSecondary,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow,
  } = usePageTheme();

  const cardBorder  = border;
  const titleColor  = textPrimary;
  const labelColor  = textMuted;

  const tooltipStyle = {
    contentStyle: { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: tooltipText },
    itemStyle: { color: tooltipText },
    labelStyle: { color: tooltipText, fontWeight: 700 },
    cursor: { fill: cursorFill },
  };

  const [types,    setTypes]    = useState<SoinType[]>([]);
  const [resultats,setResultats]= useState<Resultat[]>([]);
  const [medics,   setMedics]   = useState<Medicament[]>([]);
  const [saisons,  setSaisons]  = useState<SaisonMaladies[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [topN,     setTopN]     = useState(10);
  const [activeSaison, setActiveSaison] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSoinsTypes(),
      fetchResultats(),
      fetchMedicaments(),
      fetchMaladiesSaisonnieres(),
    ]).then(([t, r, m, s]) => {
      setTypes(t); setResultats(r); setMedics(m); setSaisons(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const displayTypes = useMemo(() => types.slice(0, topN), [types, topN]);
  const top3soins    = useMemo(() => [...types].sort((a, b) => b.count - a.count).slice(0, 3), [types]);

  const totalSoins   = types.reduce((s, t) => s + t.count, 0);
  const totalResultats = resultats.reduce((s, r) => s + r.count, 0);
  const resultatsWithPct = resultats.map(r => ({
    ...r,
    pct: totalResultats ? (r.count / totalResultats * 100).toFixed(1) : '0',
    fill: COLORS[resultats.indexOf(r) % COLORS.length],
  }));

  const activeSaisonData = saisons.find(s => s.saison === activeSaison) ?? saisons[0] ?? null;

  if (loading) return <LoadingSpinner text="Chargement des soins..."/>;

  return (
    <div id="page-soins">
      <PageHeader
        icon={<IconPill size={22} color="white"/>}
        title="Soins Médicaux"
        subtitle="Analyse des actes médicaux, résultats cliniques et maladies saisonnières"
      />

      {/* ── KPI cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Total actes',     v: totalSoins.toLocaleString('fr-FR'), c: '#2563EB', icon: <IconStethoscope size={14} color="#2563EB"/> },
          { l: 'Types de soins',  v: types.length,                       c: '#8B5CF6', icon: <IconClipboard size={14} color="#8B5CF6"/> },
          { l: 'Soin fréquent',   v: top3soins[0]?.type_soin ?? '—',    c: '#22C55E', icon: <IconActivity size={14} color="#22C55E"/>  },
          { l: 'Top médicament',  v: medics[0]?.medicament ?? '—',       c: '#F59E0B', icon: <IconPill size={14} color="#F59E0B"/>      },
        ].map(item => (
          <div key={item.l} style={{
            background: cardBg, borderRadius: 12, padding: '14px 18px',
            boxShadow: cardShadow, border: `1px solid ${cardBorder}`,
            borderLeft: `4px solid ${item.c}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: labelColor, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              {item.icon} {item.l}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: titleColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* ── Types de soins + Résultats ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Types de soins */}
        <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', boxShadow: cardShadow, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: titleColor, fontSize: 14 }}>Types de soins — Volume</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[5, 10, 15].map(n => (
                <button key={n} onClick={() => setTopN(n)} style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${n === topN ? '#2563EB' : cardBorder}`,
                  background: n === topN ? '#2563EB' : 'transparent',
                  color: n === topN ? '#fff' : labelColor,
                }}>Top {n}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayTypes} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="type_soin" tick={{ fontSize: 10, fill: tickColor }} width={130} axisLine={false} tickLine={false}/>
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Actes']}/>
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {displayTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Résultats des soins */}
        <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', boxShadow: cardShadow, border: `1px solid ${cardBorder}` }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: titleColor, fontSize: 14 }}>Résultats des soins</div>
          <div style={{ fontSize: 11, color: labelColor, marginBottom: 16 }}>Distribution des issues cliniques</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={resultatsWithPct} dataKey="count" nameKey="resultat" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                {resultatsWithPct.map((r, i) => <Cell key={i} fill={r.fill}/>)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Actes']}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
            {resultatsWithPct.map(r => (
              <div key={r.resultat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.fill, flexShrink: 0 }}/>
                <span style={{ fontSize: 11, color: titleColor, fontWeight: 500, flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {RESULTAT_ICONS[r.resultat] || null} {r.resultat}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: r.fill }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top 3 soins ────────────────────────────────── */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', marginBottom: 16, boxShadow: cardShadow, border: `1px solid ${cardBorder}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: titleColor, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTrophy size={16} color="#F59E0B"/> Top 3 soins les plus pratiqués
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {top3soins.map((s, i) => {
            const MedalComp = [Medal1, Medal2, Medal3][i];
            const colors = ['#F59E0B', '#94A3B8', '#CD7F32'];
            return (
              <div key={s.type_soin} style={{ background: innerBg, borderRadius: 12, padding: '16px', textAlign: 'center', border: `1px solid ${cardBorder}` }}>
                <div style={{ marginBottom: 8 }}><MedalComp size={32}/></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: titleColor, marginBottom: 6 }}>{s.type_soin}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: colors[i] }}>{s.count.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: 10, color: labelColor }}>actes réalisés</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Médicaments ────────────────────────────────── */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', marginBottom: 24, boxShadow: cardShadow, border: `1px solid ${cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4, color: titleColor, fontSize: 14 }}>
          <IconActivity size={15} color="#22C55E"/> Top médicaments prescrits
        </div>
        <div style={{ fontSize: 11, color: labelColor, marginBottom: 14 }}>Classement par nombre de prescriptions</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={medics} margin={{ top: 4, right: 20, left: 0, bottom: 35 }}>
            <XAxis dataKey="medicament" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
            <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
            <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Prescriptions']}/>
            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {medics.map((_, i) => <Cell key={i} fill={['#22C55E','#3B82F6','#F59E0B','#8B5CF6'][i % 4]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ══ MALADIES SAISONNIÈRES ═══════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
      }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: '#2563EB' }}/>
        <span style={{ fontSize: 13, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
          Maladies Saisonnières
        </span>
        <span style={{ fontSize: 11, color: labelColor }}>Top 5 motifs de consultation par saison</span>
        <div style={{ flex: 1, height: 1, background: cardBorder }}/>
      </div>

      {/* Saison selector tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {saisons.map(s => {
          const cfg = dark ? { ...SAISON_CONFIG[s.saison], ...SAISON_CONFIG_DARK[s.saison] } : SAISON_CONFIG[s.saison];
          const isActive = (activeSaison ?? saisons[0]?.saison) === s.saison;
          return (
            <button key={s.saison} onClick={() => setActiveSaison(s.saison)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${isActive ? cfg.color : cardBorder}`,
              background: isActive ? cfg.bg : cardBg,
              transition: 'all 0.15s',
            }}>
              {(() => { const Icon = SAISON_ICONS[s.saison]; return Icon ? <Icon size={20} color={isActive ? cfg.color : '#94A3B8'}/> : null; })()}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? cfg.color : titleColor }}>{SAISON_LABEL[s.saison] ?? s.saison}</div>
                <div style={{ fontSize: 10, color: labelColor }}>{SAISON_CONFIG[s.saison].months}</div>
              </div>
              <div style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                background: isActive ? `${cfg.color}20` : innerBg,
                color: isActive ? cfg.color : labelColor,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {s.total_patients.toLocaleString('fr-FR')} cas
              </div>
            </button>
          );
        })}
      </div>

      {/* Active saison detail */}
      {activeSaisonData && (() => {
        const cfg = dark
          ? { ...SAISON_CONFIG[activeSaisonData.saison], ...SAISON_CONFIG_DARK[activeSaisonData.saison] }
          : SAISON_CONFIG[activeSaisonData.saison];
        return (
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, overflow: 'hidden' }}>
            {/* Header band */}
            <div style={{
              background: cfg.bg,
              borderBottom: `1px solid ${cardBorder}`,
              padding: '14px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(() => { const Icon = SAISON_ICONS[activeSaisonData.saison]; return Icon ? <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={cfg.color}/></div> : null; })()}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: cfg.color }}>{SAISON_LABEL[activeSaisonData.saison] ?? activeSaisonData.saison}</div>
                  <div style={{ fontSize: 11, color: labelColor }}>{SAISON_CONFIG[activeSaisonData.saison].months}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{activeSaisonData.total_patients.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: 10, color: labelColor, textTransform: 'uppercase', fontWeight: 600 }}>patients reçus</div>
              </div>
            </div>

            {/* Disease list */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeSaisonData.maladies.map((m, i) => (
                <div key={m.motif} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: innerBg, borderRadius: 10, padding: '12px 16px',
                  border: `1px solid ${cardBorder}`,
                }}>
                  {/* Rank */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: i === 0 ? cfg.color : `${cfg.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i === 0 ? '#fff' : cfg.color,
                    fontWeight: 800, fontSize: 13,
                  }}>
                    {i + 1}
                  </div>

                  {/* Motif + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: titleColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.motif}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, flexShrink: 0, marginLeft: 8 }}>
                        {m.count.toLocaleString('fr-FR')} cas ({m.pct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: dark ? '#1F2937' : '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${m.pct}%`, height: '100%', background: cfg.color, borderRadius: 3, transition: 'width 0.5s' }}/>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0, borderLeft: `1px solid ${cardBorder}`, paddingLeft: 16 }}>
                    <RateBadge val={m.p1_rate}     label="P1 Crit."  color="#EF4444"/>
                    <RateBadge val={m.hospit_rate} label="Hospit."   color="#8B5CF6"/>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: titleColor }}>{m.avg_duree}<span style={{ fontSize: 10, fontWeight: 500, color: labelColor }}>m</span></span>
                      <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Durée</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SoinsCouts;
