import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prediction  { ds: string; yhat: number; yhat_lower: number; yhat_upper: number; }
interface Anomalie    { heure: number; historique_moy: number; aujourd_hui: number; ecart_pct: number; anomalie: boolean; }
interface LitDispo    { etablissement: string; service: string; total: number; disponibles: number; taux_occupation: number; }
interface TriageResult {
  triage: string; triage_num: number; color: string; risque: string; score: number;
  duree_estimee_min: number | null;
  facteurs: { age_risque: boolean; heure_nuit: boolean; jour_ferie: boolean; antecedents_graves: boolean; };
  prix: { sejour: number; soins: number; total: number; };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9V6a2 2 0 012-2h14a2 2 0 012 2v3"/><path d="M3 9h18v9H3z"/><path d="M3 18v2m18-2v2"/>
  </svg>
);
const IconBrain = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 013.76-3.4z"/>
    <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96-.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-3.76-3.4z"/>
  </svg>
);
const IconUsers = ({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconTrendUp = ({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconTrendDown = ({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);
const IconWarningLg = ({ size = 28, color = '#f59e0b' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconCheckLg = ({ size = 28, color = '#22c55e' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconSearch = ({ size = 16, color = 'white' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconHospitalLg = ({ size = 48, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    <line x1="12" y1="7" x2="12" y2="11"/><line x1="10" y1="9" x2="14" y2="9"/>
  </svg>
);
const IconBedLg = ({ size = 36, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9V6a2 2 0 012-2h14a2 2 0 012 2v3"/><path d="M3 9h18v9H3z"/><path d="M3 18v2m18-2v2"/>
  </svg>
);
const IconStar = ({ size = 14, color = '#22c55e' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconLoaderSpin = ({ size = 16, color = 'white' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

const JOURS   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const SAISONS = ['Hiver','Printemps','Été','Automne'];
const ANTECEDENTS = ['Aucun','Cardiaque','Diabète','Respiratoire','Neurologique','Cancer','HTA'];

type Tab = 'prevision' | 'saison' | 'patient' | 'lits';

interface MaladieSaison { motif: string; count: number; pct: number; p1_rate: number; hospit_rate: number; avg_duree: number; }
interface SaisonData    { saison: string; total_patients: number; maladies: MaladieSaison[]; }

// ─── Main Component ───────────────────────────────────────────────────────────

const PredictionsML: React.FC = () => {
  const { dark } = useTheme();
  const [tab, setTab] = useState<Tab>('prevision');
  // inject spin keyframe once
  React.useEffect(() => {
    if (!document.getElementById('spin-kf')) {
      const s = document.createElement('style');
      s.id = 'spin-kf';
      s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }
  }, []);

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, pageBg, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const bg      = pageBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'prevision', label: 'Prévision Affluence',    icon: <IconChart />,  desc: 'Combien de patients dans les 30 prochains jours ?' },
    { id: 'saison',    label: 'Prévision Saisonnière',  icon: <IconAlert />,  desc: 'Quelles pathologies l\'urgence va-t-elle recevoir selon la saison ?' },
    { id: 'patient',   label: 'Évaluation Patient',     icon: <IconUser />,   desc: 'Prédire le niveau de triage et la durée de séjour' },
    { id: 'lits',      label: 'Orientation Lits',       icon: <IconBed />,    desc: 'Trouver un lit disponible selon le profil patient' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      <PageHeader
        icon={<IconBrain />}
        title="Intelligence Décisionnelle IA"
        subtitle="Prévisions, détection d'anomalies et aide à la décision clinique"
        badge="Machine Learning"
      />

      {/* ── Tab Nav ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: tab === t.id ? 'linear-gradient(135deg,#1a3bdb,#3b82f6)' : cardBg,
              color: tab === t.id ? '#fff' : muted,
              boxShadow: tab === t.id ? '0 4px 14px #3b82f640' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Description ── */}
      <div style={{
        background: `#3b82f610`, border: `1px solid #3b82f630`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 20,
        fontSize: 13, color: '#3b82f6', fontWeight: 600,
      }}>
        {TABS.find(t => t.id === tab)?.desc}
      </div>

      {/* ── Tab Content ── */}
      {tab === 'prevision' && <TabPrevision dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'saison'    && <TabSaison    dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'patient'   && <TabPatient   dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'lits'      && <TabLits      dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TAB 1 — PRÉVISION 30 JOURS
// ══════════════════════════════════════════════════════════════

const TabPrevision: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({ dark, cardBg, border, text, muted, innerBg }) => {
  const [data, setData] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/predictions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmtDate = (ds: string) => new Date(ds).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  if (loading) return <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Chargement des prévisions...</div>;
  if (!data.length) return <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Aucune donnée disponible</div>;

  const avg     = Math.round(data.reduce((s, p) => s + p.yhat, 0) / data.length);
  const max     = Math.max(...data.map(p => p.yhat));
  const maxDay  = data.find(p => p.yhat === max);
  const critical = data.filter(p => p.yhat > avg * 1.2).length;
  const trend    = data.length >= 14
    ? ((data.slice(-7).reduce((s,p)=>s+p.yhat,0)/7) - (data.slice(0,7).reduce((s,p)=>s+p.yhat,0)/7))
    : 0;

  const kpis = [
    { label: 'Patients/jour (moy.)', value: avg, color: '#3b82f6', icon: <IconUsers size={22} color="#3b82f6" /> },
    { label: 'Pic prévu', value: max, color: '#ef4444', icon: <IconTrendUp size={22} color="#ef4444" /> },
    { label: 'Jours critiques', value: critical, color: '#f59e0b', icon: <IconWarningLg size={22} color="#f59e0b" /> },
    { label: 'Tendance 30j', value: trend >= 0 ? `+${trend.toFixed(0)}` : trend.toFixed(0), color: trend >= 0 ? '#ef4444' : '#22c55e', icon: trend >= 0 ? <IconTrendUp size={22} color="#ef4444" /> : <IconTrendDown size={22} color="#22c55e" /> },
  ];

  const chartData = data.map(p => ({
    date: fmtDate(p.ds),
    Prévu: p.yhat,
    Min:   p.yhat_lower,
    Max:   p.yhat_upper,
  }));

  const top5 = [...data].sort((a,b) => b.yhat - a.yhat).slice(0, 5);

  const tooltipBg = dark ? '#0f172a' : '#fff';
  const tooltipBorder = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const gridColor = dark ? '#334155' : '#f1f5f9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: cardBg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 8 }}>
              {k.icon}
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', fontWeight: 700 }}>{k.label}</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 4 }}>Prévision du nombre de patients — 30 prochains jours</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 20 }}>La zone bleue indique la fourchette de confiance. La ligne rouge = moyenne journalière.</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: text, fontWeight: 700 }} itemStyle={{ color: text }} />
            <ReferenceLine y={avg} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Moy. ${avg}`, fill: '#ef4444', fontSize: 11 }} />
            <Area type="monotone" dataKey="Max" stroke="transparent" fill="#3b82f610" />
            <Area type="monotone" dataKey="Prévu" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradPrev)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 jours critiques */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 22, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 14 }}>Top 5 jours à forte affluence prévus</div>
        {top5.map((p, i) => {
          const pct = Math.round((p.yhat / max) * 100);
          const colors = ['#ef4444','#f97316','#f59e0b','#3b82f6','#8b5cf6'];
          return (
            <div key={p.ds} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: text, fontWeight: 600 }}>{i+1}. {fmtDate(p.ds)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: colors[i] }}>{p.yhat} patients</span>
              </div>
              <div style={{ height: 8, background: innerBg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: colors[i], borderRadius: 4, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TAB 2 — PRÉVISION SAISONNIÈRE
// ══════════════════════════════════════════════════════════════

/* Détecter la saison courante selon le mois */
function currentSeason(): string {
  const m = new Date().getMonth() + 1; // 1-12
  if (m === 12 || m <= 2) return 'Hiver';
  if (m <= 5)             return 'Printemps';
  if (m <= 8)             return 'Ete';
  return 'Automne';
}

const SAISON_META: Record<string, { label: string; color: string; bg: string; darkBg: string; months: string; conseil: string }> = {
  'Hiver':     { label: 'Hiver',     color: '#60A5FA', bg: '#EFF6FF', darkBg: 'rgba(96,165,250,0.08)',  months: 'Déc · Jan · Fév', conseil: 'Renforcer la capacité en réanimation et pneumologie. Prévoir stocks antiviraux.' },
  'Printemps': { label: 'Printemps', color: '#34D399', bg: '#ECFDF5', darkBg: 'rgba(52,211,153,0.08)',  months: 'Mar · Avr · Mai', conseil: 'Anticiper les pics allergiques et traumatismes sportifs. Équipes dermatologie en alerte.' },
  'Ete':       { label: 'Été',       color: '#F59E0B', bg: '#FFFBEB', darkBg: 'rgba(245,158,11,0.08)',  months: 'Jun · Jul · Aoû', conseil: 'Protocoles coup de chaleur actifs. Surveiller déshydratation et intoxications alimentaires.' },
  'Automne':   { label: 'Automne',   color: '#F97316', bg: '#FFF7ED', darkBg: 'rgba(249,115,22,0.08)',  months: 'Sep · Oct · Nov', conseil: 'Préparer la campagne grippe. Suivi pathologies cardiovasculaires et respiratoires.' },
};

const IconSaisonSvg: Record<string, React.ReactNode> = {
  'Hiver': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M7 7l5 5 5-5"/><path d="M7 17l5-5 5 5"/>
      <path d="M17 7l-5 5-5-5" transform="rotate(90 12 12)"/><path d="M17 17l-5-5-5 5" transform="rotate(90 12 12)"/>
    </svg>
  ),
  'Printemps': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2a4 4 0 0 1 4 4c0 2-4 3-4 3s-4-1-4-3a4 4 0 0 1 4-4z"/>
      <path d="M12 22a4 4 0 0 1-4-4c0-2 4-3 4-3s4 1 4 3a4 4 0 0 1-4 4z"/>
      <path d="M2 12a4 4 0 0 1 4-4c2 0 3 4 3 4s-1 4-3 4a4 4 0 0 1-4-4z"/>
      <path d="M22 12a4 4 0 0 1-4 4c-2 0-3-4-3-4s1-4 3-4a4 4 0 0 1 4 4z"/>
    </svg>
  ),
  'Ete': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  'Automne': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  ),
};

const TabSaison: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({
  dark, cardBg, border, text, muted, innerBg,
}) => {
  const [allData,  setAllData]  = useState<SaisonData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<string>(currentSeason());

  useEffect(() => {
    axios.get('/api/urgences/maladies_saisonnieres')
      .then(r => { setAllData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Chargement des données saisonnières...</div>;
  if (!allData.length) return <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Aucune donnée disponible</div>;

  const saisonData   = allData.find(s => s.saison === selected) ?? allData[0];
  const meta         = SAISON_META[saisonData.saison] ?? SAISON_META['Hiver'];
  const cfgBg        = dark ? meta.darkBg : meta.bg;
  const totalAll     = allData.reduce((s, d) => s + d.total_patients, 0);
  const isCurrentSeason = saisonData.saison === currentSeason();
  const tickColor    = dark ? '#94a3b8' : '#64748b';
  const tooltipBg2   = dark ? '#0f172a' : '#fff';
  const tooltipBorder2 = dark ? '#334155' : '#e2e8f0';

  const chartData = allData.map(s => ({
    name: SAISON_META[s.saison]?.label ?? s.saison,
    patients: s.total_patients,
    color: SAISON_META[s.saison]?.color ?? '#94a3b8',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Current season banner */}
      <div style={{
        background: cfgBg,
        border: `1.5px solid ${meta.color}40`,
        borderRadius: 12, padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
            {IconSaisonSvg[saisonData.saison]}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: meta.color, fontSize: 15 }}>
              {meta.label} {isCurrentSeason && <span style={{ fontSize: 11, background: `${meta.color}20`, padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>Saison actuelle</span>}
            </div>
            <div style={{ fontSize: 12, color: muted }}>{meta.months} · {saisonData.total_patients.toLocaleString('fr-FR')} patients historiques ({((saisonData.total_patients / totalAll) * 100).toFixed(0)}% du total)</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: muted, maxWidth: 340, fontStyle: 'italic', background: `${meta.color}10`, padding: '8px 14px', borderRadius: 8, borderLeft: `3px solid ${meta.color}` }}>
          {meta.conseil}
        </div>
      </div>

      {/* Saison selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {allData.map(s => {
          const m = SAISON_META[s.saison];
          const isActive = s.saison === selected;
          return (
            <button key={s.saison} onClick={() => setSelected(s.saison)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${isActive ? m.color : border}`,
              background: isActive ? (dark ? m.darkBg : m.bg) : cardBg,
              color: isActive ? m.color : muted,
              fontWeight: isActive ? 700 : 500, fontSize: 13,
              transition: 'all 0.15s',
            }}>
              <span style={{ color: isActive ? m.color : '#94a3b8' }}>{IconSaisonSvg[s.saison]}</span>
              {m.label}
              {s.saison === currentSeason() && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, display: 'inline-block' }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* KPIs de la saison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Patients historiques', value: saisonData.total_patients.toLocaleString('fr-FR'), color: meta.color },
          { label: 'Top motif',            value: saisonData.maladies[0]?.motif ?? '—',             color: text, small: true },
          { label: 'Taux P1 moyen',        value: saisonData.maladies.length
              ? `${(saisonData.maladies.reduce((s, m) => s + m.p1_rate, 0) / saisonData.maladies.length).toFixed(1)}%`
              : '—',
            color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{ background: cardBg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${border}` }}>
            <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: k.small ? 15 : 26, fontWeight: 800, color: k.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Distribution saisonnière */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 22, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 4 }}>Volume de patients par saison</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>Répartition historique sur l'ensemble des données</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: tooltipBg2, border: `1px solid ${tooltipBorder2}`, borderRadius: 8 }}
              labelStyle={{ color: text, fontWeight: 700 }}
              itemStyle={{ color: text }}
              formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Patients']}
            />
            <Bar dataKey="patients" radius={[6,6,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.name === (SAISON_META[selected]?.label ?? '') ? meta.color : (dark ? '#1F2937' : '#E2E8F0')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 motifs */}
      <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: text }}>
            Top 5 motifs de consultation prévus — {meta.label}
          </div>
          <div style={{ fontSize: 11, color: muted }}>Basé sur {saisonData.total_patients.toLocaleString('fr-FR')} consultations historiques</div>
        </div>
        <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saisonData.maladies.map((m, i) => (
            <div key={m.motif} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: innerBg, borderRadius: 10, padding: '12px 16px',
              border: `1px solid ${border}`,
            }}>
              {/* Rang */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: i === 0 ? meta.color : `${meta.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i === 0 ? '#fff' : meta.color,
                fontWeight: 800, fontSize: 14,
              }}>{i + 1}</div>

              {/* Motif + barre */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.motif}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, flexShrink: 0, marginLeft: 8 }}>
                    {m.count.toLocaleString('fr-FR')} cas ({m.pct}%)
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: dark ? '#1F2937' : '#E2E8F0' }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', background: meta.color, borderRadius: 3, transition: 'width 0.6s' }}/>
                </div>
              </div>

              {/* Badges stats */}
              <div style={{ display: 'flex', gap: 14, flexShrink: 0, borderLeft: `1px solid ${border}`, paddingLeft: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>{m.p1_rate}%</div>
                  <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', fontWeight: 600 }}>P1 Crit.</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#8B5CF6' }}>{m.hospit_rate}%</div>
                  <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', fontWeight: 600 }}>Hospit.</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text }}>{m.avg_duree}<span style={{ fontSize: 10, color: muted }}>m</span></div>
                  <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', fontWeight: 600 }}>Durée</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TAB 3 — ÉVALUATION PATIENT
// ══════════════════════════════════════════════════════════════

const TabPatient: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({ dark, cardBg, border, text, muted, innerBg }) => {
  const [form, setForm] = useState({
    age: 45, sexe: 'M', heure: 10, jour_semaine: 0, mois: new Date().getMonth() + 1,
    saison: 'Printemps', jour_ferie: false, antecedents: 'Aucun',
  });
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: dark ? '#0f172a' : '#f8fafc',
    color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: muted,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/predict/triage', form);
      setResult(data);
    } catch { alert('Erreur lors de la prédiction'); }
    finally { setLoading(false); }
  };

  const TRIAGE_LABELS: Record<number, string> = {
    1: 'Critique — Prise en charge immédiate',
    2: 'Urgent — Dans les 15 minutes',
    3: 'Semi-urgent — Dans les 30 minutes',
    4: 'Non urgent — Dans les 60 minutes',
    5: 'Très peu urgent — Consultation programmable',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* Formulaire */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 18 }}>Informations patient</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Âge du patient</label>
              <input type="number" min={0} max={120} value={form.age} onChange={e => set('age', +e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sexe</label>
              <select value={form.sexe} onChange={e => set('sexe', e.target.value)} style={inputStyle}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Heure d'arrivée : {String(form.heure).padStart(2,'0')}h00</label>
            <input type="range" min={0} max={23} value={form.heure} onChange={e => set('heure', +e.target.value)} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: muted }}>
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Jour de la semaine</label>
              <select value={form.jour_semaine} onChange={e => set('jour_semaine', +e.target.value)} style={inputStyle}>
                {JOURS.map((j,i) => <option key={j} value={i}>{j}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Saison</label>
              <select value={form.saison} onChange={e => set('saison', e.target.value)} style={inputStyle}>
                {SAISONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Antécédents médicaux</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ANTECEDENTS.map(a => (
                <button key={a} type="button" onClick={() => set('antecedents', a)} style={{
                  padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.antecedents === a ? '#3b82f6' : border}`,
                  background: form.antecedents === a ? '#3b82f6' : 'transparent',
                  color: form.antecedents === a ? '#fff' : text, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                }}>{a}</button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text, fontWeight: 600 }}>
            <input type="checkbox" checked={form.jour_ferie} onChange={e => set('jour_ferie', e.target.checked)} />
            Jour férié ou week-end
          </label>

          <button type="submit" disabled={loading} style={{
            padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
            color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 4,
          }}>
            <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <IconLoaderSpin size={16} /> : <IconSearch size={16} />}
              {loading ? 'Analyse IA en cours...' : 'Évaluer le patient'}
            </span>
          </button>
        </form>
      </div>

      {/* Résultats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {result ? (
          <>
            {/* Niveau triage */}
            <div style={{
              background: cardBg, borderRadius: 12, padding: 28,
              border: `3px solid ${result.color}`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Niveau de triage recommandé</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: result.color, marginBottom: 6 }}>{result.triage}</div>
              <div style={{ fontSize: 13, color: text, marginBottom: 16 }}>{TRIAGE_LABELS[result.triage_num]}</div>
              <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: `${result.color}18`, color: result.color, fontWeight: 700, fontSize: 13 }}>
                Risque : {result.risque}
              </div>

              {/* Score bar */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Score de risque : {result.score}/8</div>
                <div style={{ height: 10, background: border, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(result.score/8*100, 100)}%`, height: '100%', background: result.color, borderRadius: 5, transition: 'width 0.8s ease' }} />
                </div>
              </div>

              {result.duree_estimee_min && (
                <div style={{ marginTop: 14, fontSize: 13, color: muted }}>
                  Durée estimée de séjour : <span style={{ fontWeight: 800, color: text }}>{result.duree_estimee_min} min</span>
                </div>
              )}
            </div>

            {/* Facteurs */}
            <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 12 }}>Facteurs de risque identifiés</div>
              {([
                ['Âge à risque (< 2 ans ou ≥ 60 ans)', result.facteurs.age_risque],
                ['Arrivée en heure de nuit (22h – 6h)', result.facteurs.heure_nuit],
                ['Jour férié ou week-end',               result.facteurs.jour_ferie],
                ['Antécédents médicaux graves',          result.facteurs.antecedents_graves],
              ] as [string, boolean][]).map(([label, active]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${border}`, opacity: active ? 1 : 0.4 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontWeight: 800, fontSize: 12,
                    background: active ? '#fef2f2' : '#f0fdf4', color: active ? '#ef4444' : '#22c55e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{active ? '!' : '✓'}</span>
                  <span style={{ fontSize: 13, color: text }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Coût estimé */}
            {result.prix && (
              <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 14 }}>Estimation des coûts</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'Coût séjour', value: result.prix.sejour, color: '#3b82f6' },
                    { label: 'Coût soins',  value: result.prix.soins,  color: '#8b5cf6' },
                  ].map(item => (
                    <div key={item.label} style={{ background: innerBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: item.color }}>{item.value.toLocaleString('fr-FR')} <span style={{ fontSize: 11 }}>MAD</span></div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fef3c720', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>TOTAL ESTIMÉ</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#f59e0b' }}>{result.prix.total.toLocaleString('fr-FR')} MAD</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ background: cardBg, borderRadius: 12, padding: 60, border: `2px dashed ${border}`, textAlign: 'center', color: muted }}>
            <div style={{ marginBottom: 12, opacity: 0.3 }}><IconHospitalLg size={52} /></div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>En attente d'évaluation</div>
            <div style={{ fontSize: 13 }}>Remplissez le formulaire et cliquez sur "Évaluer le patient"</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TAB 4 — ORIENTATION LITS
// ══════════════════════════════════════════════════════════════

const SERVICES_COMMUNS = ['Urgences','Chirurgie','Medecine interne','Observation','Reanimation'];

const TabLits: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({ dark, cardBg, border, text, muted, innerBg }) => {
  const [service, setService]   = useState('');
  const [results, setResults]   = useState<LitDispo[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: `1px solid ${border}`, background: dark ? '#0f172a' : '#f8fafc',
    color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const handleSearch = async (svc?: string) => {
    const query = svc !== undefined ? svc : service;
    setLoading(true);
    setSearched(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/api/lits/recommander?service=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const maxDispo = results.length ? Math.max(...results.map(r => r.disponibles)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Search form */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 6 }}>Trouver un lit disponible</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 18 }}>Sélectionnez ou tapez le service dont le patient a besoin, et l'IA vous recommande les établissements avec des lits disponibles.</div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', marginBottom: 4 }}>Service requis (optionnel)</div>
            <input
              type="text"
              placeholder="Ex: Urgences, Chirurgie, Cardiologie..."
              value={service}
              onChange={e => setService(e.target.value)}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleSearch(service)}
            />
          </div>
          <button onClick={() => handleSearch(service)} disabled={loading} style={{
            padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', color: '#fff',
            fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
          }}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              {loading ? <IconLoaderSpin size={16} /> : <IconSearch size={16} />}
              {loading ? 'Recherche...' : 'Rechercher'}
            </span>
          </button>
        </div>

        {/* Quick buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {SERVICES_COMMUNS.map(s => (
            <button key={s} onClick={() => { setService(s); handleSearch(s); }} style={{
              padding: '5px 12px', borderRadius: 20, border: `1px solid ${border}`,
              background: service === s ? '#3b82f6' : 'transparent',
              color: service === s ? '#fff' : muted,
              fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ color: muted, textAlign: 'center', padding: 40 }}>Recherche des lits disponibles...</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ background: cardBg, borderRadius: 12, padding: 40, border: `1px solid ${border}`, textAlign: 'center', color: muted }}>
          <div style={{ marginBottom: 10, opacity: 0.3 }}><IconBedLg size={40} /></div>
          <div style={{ fontWeight: 700 }}>Aucun lit disponible trouvé</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Essayez un autre service ou consultez la Gestion des Lits</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: text }}>
            {results.length} résultat{results.length > 1 ? 's' : ''} — triés par disponibilité
            {service && <span style={{ fontWeight: 400, color: muted }}> · Service : {service}</span>}
          </div>

          {/* Top recommendation */}
          <div style={{
            background: '#d1fae520', border: '2px solid #22c55e', borderRadius: 12, padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: 4, display:'flex', alignItems:'center', gap:5 }}><IconStar size={13} /> Meilleure recommandation</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: text }}>{results[0].etablissement}</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>Service : {results[0].service}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#22c55e' }}>{results[0].disponibles}</div>
              <div style={{ fontSize: 11, color: muted }}>lits disponibles</div>
              <div style={{ fontSize: 11, color: muted }}>Occupation : {results[0].taux_occupation}%</div>
            </div>
          </div>

          {/* All results (skip first — already shown as best recommendation) */}
          {results.slice(1).map((r, i) => {
            const pct = Math.round((r.disponibles / maxDispo) * 100);
            const occPct = r.taux_occupation;
            const occColor = occPct >= 80 ? '#ef4444' : occPct >= 60 ? '#f59e0b' : '#22c55e';
            return (
              <div key={`${r.etablissement}-${r.service}`} style={{
                background: cardBg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: text, fontSize: 14 }}>{r.etablissement}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Service : {r.service}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e' }}>{r.disponibles}</div>
                      <div style={{ fontSize: 10, color: muted }}>disponibles / {r.total}</div>
                    </div>
                    <div style={{ padding: '4px 10px', borderRadius: 8, background: `${occColor}18`, color: occColor, fontWeight: 700, fontSize: 12 }}>
                      {occPct}% occupé
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, background: innerBg, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PredictionsML;
