import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, ReferenceLine, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
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
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconCpu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
    <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
    <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
    <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
    <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
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

type Tab = 'prevision' | 'saison' | 'patient' | 'lits' | 'planif' | 'modeles';

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
    { id: 'prevision', label: 'Prévision Affluence',    icon: <IconChart />,    desc: 'Combien de patients dans les 30 prochains jours ?' },
    { id: 'saison',    label: 'Prévision Saisonnière',  icon: <IconAlert />,    desc: 'Quelles pathologies l\'urgence va-t-elle recevoir selon la saison ?' },
    { id: 'planif',    label: 'Planification Date',     icon: <IconCalendar/>,  desc: 'Patients prévus, ressources humaines et lits nécessaires pour une date donnée' },
    { id: 'patient',   label: 'Évaluation Patient',     icon: <IconUser />,     desc: 'Prédire le niveau de triage et la durée de séjour' },
    { id: 'lits',      label: 'Orientation Lits',       icon: <IconBed />,      desc: 'Trouver un lit disponible selon le profil patient' },
    { id: 'modeles',   label: 'Modèles & Performance',  icon: <IconCpu />,      desc: 'Résultats R², MAE et RMSE de chaque modèle de machine learning' },
  ];

  const activeTab = TABS.find(t => t.id === tab)!;

  // SVG icons for header stats
  const IcoModel = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  );
  const IcoData = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  );
  const IcoTarget = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', background: bg }}>

      {/* ══ HEADER ══ */}
      <div style={{
        background: dark
          ? 'linear-gradient(135deg,#0f1a35 0%,#1a2d5a 100%)'
          : 'linear-gradient(135deg,#1e40af 0%,#2563eb 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 013.76-3.4z"/>
              <path d="M14.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 004.96-.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-3.76-3.4z"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'white' }}>Prédiction ML</h1>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '2px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Machine Learning
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              Prévisions et aide à la décision clinique basées sur les données CHU
            </p>
          </div>
        </div>

        {/* Right: 3 stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Modèles', value: '3', Icon: IcoModel },
            { label: 'Données', value: '530K', Icon: IcoData },
            { label: 'Meilleur R²', value: '96.7%', Icon: IcoTarget },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 80,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <s.Icon />
              <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TAB NAV ══ */}
      <div style={{
        background: cardBg, border: `1px solid ${border}`,
        borderRadius: 12, padding: 5, marginBottom: 20,
        display: 'flex', gap: 3, flexWrap: 'wrap',
      }}>
        {TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 12.5, flex: 1, minWidth: 120, justifyContent: 'center',
              background: isActive ? 'linear-gradient(135deg,#1e40af,#2563eb)' : 'transparent',
              color: isActive ? '#fff' : muted,
              boxShadow: isActive ? '0 2px 10px #2563eb30' : 'none',
              transition: 'all 0.15s',
            }}>
              <span style={{ opacity: isActive ? 1 : 0.5, display: 'flex' }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB CONTENT ══ */}
      {tab === 'prevision' && <TabPrevision dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'saison'    && <TabSaison    dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'planif'    && <TabPlanif    dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'patient'   && <TabPatient   dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'lits'      && <TabLits      dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
      {tab === 'modeles'   && <TabModeles   dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} innerBg={innerBg} />}
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
// TAB PLANIF — PLANIFICATION PAR DATE
// ══════════════════════════════════════════════════════════════

interface PlanifResult {
  date: string; jour_semaine: string; saison: string;
  patients_prevus: number; patients_hospitalises: number; taux_hospit_pct: number;
  ressources_humaines: { specialite: string; actuel: number; total_equipe: number; recommande: number; ecart: number; statut: string }[];
  lits_par_service:    { service: string; total: number; disponibles: number; besoin: number; ecart: number; statut: string }[];
}

const STATUT_COLOR: Record<string, string> = { ok: '#22C55E', alerte: '#F59E0B', critique: '#EF4444' };
const STATUT_LABEL: Record<string, string>  = { ok: 'OK', alerte: 'Alerte', critique: 'Critique' };

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_COURT = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

const MiniCalendar: React.FC<{
  value: string; onChange: (d: string) => void;
  dark: boolean; border: string; text: string; muted: string; cardBg: string;
}> = ({ value, onChange, dark, border, text, muted, cardBg }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const selDate  = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear,  setViewYear]  = useState(selDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate.getMonth()); // 0-based

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else { setViewMonth(m => m - 1); } };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else { setViewMonth(m => m + 1); } };

  // Build grid: first day of month (0=Sun → convert to Mon-based)
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const accent  = '#2563EB';
  const bgHover = dark ? '#1e293b' : '#EFF6FF';
  const todayBg = dark ? '#1e3a5f' : '#DBEAFE';

  return (
    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px', userSelect: 'none', width: '100%', maxWidth: 320 }}>
      {/* Header nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = bgHover)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{MOIS_FR[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = bgHover)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
        {JOURS_COURT.map(j => (
          <div key={j} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', padding: '2px 0' }}>{j}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const mm = String(viewMonth + 1).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const iso = `${viewYear}-${mm}-${dd}`;
          const isSelected = iso === value;
          const isToday    = iso === todayStr;
          return (
            <button
              key={idx}
              onClick={() => onChange(iso)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                fontSize: 13,
                background: isSelected ? accent : isToday ? todayBg : 'transparent',
                color: isSelected ? '#fff' : isToday ? accent : text,
                outline: isToday && !isSelected ? `2px solid ${accent}` : 'none',
                outlineOffset: -2,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = bgHover; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? todayBg : 'transparent'; }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button onClick={() => { onChange(todayStr); setViewYear(new Date().getFullYear()); setViewMonth(new Date().getMonth()); }}
          style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 14px', fontSize: 12, fontWeight: 600, color: accent, cursor: 'pointer' }}>
          Aujourd'hui
        </button>
      </div>
    </div>
  );
};

const TabPlanif: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({
  dark, cardBg, border, text, muted, innerBg,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date,    setDate]    = useState(today);
  const [result,  setResult]  = useState<PlanifResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const search = async (d?: string) => {
    const target = d ?? date;
    if (!target) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`/api/predictions/planification?date=${target}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Erreur lors de la prédiction.');
    } finally { setLoading(false); }
  };

  const handleDateChange = (d: string) => { setDate(d); search(d); };

  // lancer au chargement avec la date du jour
  React.useEffect(() => { search(); }, []); // eslint-disable-line

  const tickColor = dark ? '#94a3b8' : '#64748b';
  const tooltipBg2 = dark ? '#0f172a' : '#fff';
  const tooltipBorder2 = dark ? '#334155' : '#e2e8f0';

  const saison_color: Record<string,string> = { Hiver:'#60A5FA', Printemps:'#34D399', Ete:'#F59E0B', Automne:'#F97316' };
  const sc = saison_color[result?.saison ?? ''] ?? '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Sélecteur de date ── */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 4 }}>Sélectionner une date</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>
          Cliquez sur un jour pour prédire les patients, ressources humaines et lits nécessaires.
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <MiniCalendar value={date} onChange={handleDateChange} dark={dark} border={border} text={text} muted={muted} cardBg={dark ? '#0A0F1C' : '#F8FAFC'} />
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', paddingTop: 8 }}>
            {/* Selected date display */}
            <div style={{ background: dark ? '#0A0F1C' : '#EFF6FF', borderRadius: 10, padding: '14px 18px', border: `1.5px solid #2563EB40` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}>Date sélectionnée</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text }}>
                {date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2563EB', fontWeight: 600 }}>
                <IconLoaderSpin size={16} color="#2563EB"/> Calcul en cours...
              </div>
            )}
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#EF4444' }}>
            {error}
          </div>
        )}
      </div>

      {result && (<>

        {/* ── KPIs principaux ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[
            { label: 'Date',                value: new Date(result.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }), color: text, small: true },
            { label: 'Patients prévus',     value: result.patients_prevus,      color: '#2563EB' },
            { label: 'Hospitalisations',    value: result.patients_hospitalises, color: '#8B5CF6' },
            { label: 'Saison',              value: result.saison === 'Ete' ? 'Été' : result.saison, color: sc },
          ].map(k => (
            <div key={k.label} style={{ background: cardBg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${border}`, borderLeft: `4px solid ${k.color}` }}>
              <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: k.small ? 13 : 28, fontWeight: 800, color: k.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof k.value === 'number' ? k.value.toLocaleString('fr-FR') : k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Ressources humaines par spécialité ── */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: text }}>Ressources Humaines recommandées</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Par spécialité — basé sur {result.patients_prevus} patients prévus</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ok','alerte','critique'].map(s => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[s], background: `${STATUT_COLOR[s]}15`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${STATUT_COLOR[s]}30` }}>
                  {result.ressources_humaines.filter(r => r.statut === s).length} {STATUT_LABEL[s]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.ressources_humaines.length === 0 && (
              <div style={{ color: muted, textAlign: 'center', padding: 20, fontSize: 13 }}>Aucune donnée de personnel disponible.</div>
            )}
            {result.ressources_humaines.map(r => {
              const sc2 = STATUT_COLOR[r.statut];
              const pct_actuel    = Math.min((r.actuel    / Math.max(r.recommande, 1)) * 100, 100);
              return (
                <div key={r.specialite} style={{ display: 'flex', alignItems: 'center', gap: 14, background: innerBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}` }}>
                  {/* Statut dot */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc2, flexShrink: 0 }}/>
                  {/* Spécialité */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{r.specialite}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.total_equipe} en équipe · {r.actuel} disponibles</div>
                  </div>
                  {/* Barre actuel / recommandé */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 4 }}>
                      <span>Actuel : <strong style={{ color: text }}>{r.actuel}</strong></span>
                      <span>Besoin : <strong style={{ color: sc2 }}>{r.recommande}</strong></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: dark ? '#1F2937' : '#E2E8F0' }}>
                      <div style={{ width: `${pct_actuel}%`, height: '100%', background: sc2, borderRadius: 3, transition: 'width 0.6s' }}/>
                    </div>
                  </div>
                  {/* Écart */}
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: r.ecart > 0 ? '#EF4444' : '#22C55E' }}>
                      {r.ecart > 0 ? `+${r.ecart}` : r.ecart === 0 ? '✓' : `${r.ecart}`}
                    </div>
                    <div style={{ fontSize: 10, color: muted }}>{r.ecart > 0 ? 'manquant' : r.ecart < 0 ? 'excédent' : 'suffisant'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Lits par service ── */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: text }}>Lits recommandés par service</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                Basé sur {result.patients_hospitalises} hospitalisations prévues ({result.taux_hospit_pct}% de taux hospit.)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ok','alerte','critique'].map(s => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[s], background: `${STATUT_COLOR[s]}15`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${STATUT_COLOR[s]}30` }}>
                  {result.lits_par_service.filter(l => l.statut === s).length} {STATUT_LABEL[s]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.lits_par_service.length === 0 && (
              <div style={{ color: muted, textAlign: 'center', padding: 20, fontSize: 13 }}>Aucune donnée de lits disponible.</div>
            )}
            {result.lits_par_service.map(l => {
              const sc3 = STATUT_COLOR[l.statut];
              const pct_dispo = Math.min((l.disponibles / Math.max(l.besoin, 1)) * 100, 100);
              return (
                <div key={l.service} style={{ display: 'flex', alignItems: 'center', gap: 14, background: innerBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${border}` }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc3, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{l.service}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{l.total} lits total · {l.disponibles} disponibles</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 4 }}>
                      <span>Dispo : <strong style={{ color: text }}>{l.disponibles}</strong></span>
                      <span>Besoin : <strong style={{ color: sc3 }}>{l.besoin}</strong></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: dark ? '#1F2937' : '#E2E8F0' }}>
                      <div style={{ width: `${pct_dispo}%`, height: '100%', background: sc3, borderRadius: 3, transition: 'width 0.6s' }}/>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: l.ecart > 0 ? '#EF4444' : '#22C55E' }}>
                      {l.ecart > 0 ? `+${l.ecart}` : l.ecart === 0 ? '✓' : `${l.ecart}`}
                    </div>
                    <div style={{ fontSize: 10, color: muted }}>{l.ecart > 0 ? 'manquant' : l.ecart < 0 ? 'excédent' : 'suffisant'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </>)}
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

// ══════════════════════════════════════════════════════════════
// TAB 6 — MODÈLES ML & PERFORMANCE
// ══════════════════════════════════════════════════════════════

interface ModelMetric { modele: string; R2: number; MAE: number; RMSE: number; }

const MODEL_INFO: Record<string, { color: string; gradient: string; icon: React.ReactNode; desc: string; usage: string; type: string; steps: { title: string; detail: string }[] }> = {
  'Prophet': {
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    desc: 'Modèle de séries temporelles développé par Meta. Capture les tendances, saisonnalités hebdomadaires et annuelles.',
    usage: 'Prévision d\'affluence 30 jours',
    type: 'Série temporelle',
    steps: [
      { title: 'Données historiques', detail: 'Comptage journalier de toutes les arrivées aux urgences de 2019 à 2026, soit une série de ~2 500 points de données.' },
      { title: 'Décomposition', detail: 'Le modèle sépare la série en 3 composantes : tendance globale (croissance/déclin), saisonnalité hebdomadaire (lundi > dimanche) et saisonnalité annuelle (pics hivernaux).' },
      { title: 'Formule additive', detail: 'Prévision = Tendance(t) + Saisonnalité(t) + Termes de régression. Chaque composante est estimée indépendamment par régression.' },
      { title: 'Jours fériés', detail: 'Les jours fériés marocains sont intégrés comme effets ponctuels pour corriger les anomalies prévisibles (Aid, fête du Trône, etc.).' },
      { title: 'Prévision + intervalle', detail: 'Génère les prédictions J+1 à J+30 avec un intervalle de confiance à 80% (yhat_lower / yhat_upper), visible dans le graphique de l\'onglet Prévision.' },
    ],
  },
  'Random Forest': {
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#059669,#10b981)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    desc: 'Ensemble d\'arbres de décision entraîné sur les données d\'urgences. Robuste aux valeurs aberrantes et aux features mixtes.',
    usage: 'Durée de séjour & Simulateur',
    type: 'Apprentissage ensembliste',
    steps: [
      { title: 'Préparation des features', detail: '27 variables en entrée : âge, sexe, niveau de triage (P1–P4), heure d\'arrivée, jour, mois, saison, jour férié, lits disponibles, médecins disponibles...' },
      { title: 'Bagging (Bootstrap Aggregating)', detail: '500 arbres de décision sont construits, chacun entraîné sur un sous-échantillon aléatoire différent des 424 717 lignes d\'entraînement.' },
      { title: 'Sélection aléatoire des features', detail: 'À chaque nœud, seul un sous-ensemble aléatoire de variables est considéré pour la séparation — cela réduit les corrélations entre les arbres.' },
      { title: 'Vote par moyenne', detail: 'La prédiction finale = moyenne des sorties des 500 arbres. Cette agrégation réduit la variance et le surapprentissage par rapport à un seul arbre.' },
      { title: 'Importance des variables', detail: 'Le triage (P1–P4) et l\'âge patient sont les variables les plus prédictives de la durée de séjour, suivis par la période de la journée.' },
    ],
  },
  'XGBoost': {
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    desc: 'Gradient boosting optimisé. Meilleur modèle en termes de R² et RMSE. Utilisé pour les prédictions critiques en temps réel.',
    usage: 'Simulateur & Prédictions temps réel',
    type: 'Gradient Boosting',
    steps: [
      { title: 'Encodages cycliques', detail: 'En plus des 27 features standards, l\'heure et le jour sont encodés en sin/cos pour capturer leur nature circulaire (ex : 23h est proche de 0h).' },
      { title: 'Initialisation', detail: 'Commence par une prédiction de base = moyenne globale des durées de séjour. L\'objectif est de corriger itérativement cette estimation.' },
      { title: 'Boosting itératif', detail: 'À chaque itération (~100 tours), un nouvel arbre est entraîné pour corriger uniquement les erreurs résiduelles du modèle précédent (gradient du résidu).' },
      { title: 'Régularisation L1/L2', detail: 'Des pénalités L1 (Lasso) et L2 (Ridge) sont appliquées pour éviter le surapprentissage sur les 530 000 lignes, et des paramètres de profondeur max d\'arbre limitent la complexité.' },
      { title: 'Prédiction finale', detail: 'Résultat = somme pondérée de tous les arbres. Temps de prédiction < 1ms par patient — utilisé en temps réel dans le simulateur et l\'évaluation de triage.' },
    ],
  },
};

const R2_GAUGE: React.FC<{ value: number; color: string; size?: number }> = ({ value, color, size = 100 }) => {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // demi-cercle
  const progress = value * circumference;
  const angle = (1 - value) * 180;

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#e2e8f030" strokeWidth={size * 0.08} strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={size * 0.08} strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Needle dot */}
      <circle
        cx={cx + r * Math.cos(Math.PI - (value * Math.PI))}
        cy={cy - r * Math.sin(value * Math.PI)}
        r={size * 0.045} fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {/* Center value */}
      <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.18} fontWeight="900" fill={color}>
        {(value * 100).toFixed(2)}%
      </text>
      <text x={cx} y={cy + size * 0.13} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.09} fontWeight="700" fill="#94a3b8">
        R²
      </text>
    </svg>
  );
};

const TabModeles: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string; innerBg: string }> = ({ dark, cardBg, border, text, muted, innerBg }) => {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/modeles/metriques', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setMetrics(r.data); setLoading(false); })
      .catch(() => {
        setMetrics([
          { modele: 'Prophet',       R2: 0.9557, MAE: 0.981,  RMSE: 1.230  },
          { modele: 'Random Forest', R2: 0.9617, MAE: 10.514, RMSE: 13.266 },
          { modele: 'XGBoost',       R2: 0.9670, MAE: 9.811,  RMSE: 12.324 },
        ]);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 12 }}>
      <div style={{ width: 20, height: 20, border: `3px solid ${border}`, borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: muted, fontSize: 14 }}>Chargement des métriques...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const bestModel = metrics.reduce((best, m) => m.R2 > best.R2 ? m : best, metrics[0]);
  const maxMAE  = Math.max(...metrics.map(m => m.MAE));
  const maxRMSE = Math.max(...metrics.map(m => m.RMSE));

  const barData = metrics.map(m => ({
    name: m.modele,
    R2_pct: parseFloat((m.R2 * 100).toFixed(2)),
    MAE: m.MAE, RMSE: m.RMSE,
    color: MODEL_INFO[m.modele]?.color ?? '#3b82f6',
  }));

  // Données radar normalisées (0–100)
  const radarData = [
    { metric: 'R² Score',  ...Object.fromEntries(metrics.map(m => [m.modele, parseFloat(((m.R2 - 0.94) / 0.06 * 100).toFixed(1))])) },
    { metric: 'Précision', ...Object.fromEntries(metrics.map(m => [m.modele, parseFloat(((1 - m.MAE / maxMAE) * 100).toFixed(1))])) },
    { metric: 'Stabilité', ...Object.fromEntries(metrics.map(m => [m.modele, parseFloat(((1 - m.RMSE / maxRMSE) * 100).toFixed(1))])) },
    { metric: 'Vitesse',   Prophet: 62, 'Random Forest': 78, XGBoost: 98 },
    { metric: 'Données',   Prophet: 55, 'Random Forest': 95, XGBoost: 95 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Bandeau synthèse ── */}
      <div style={{
        background: dark ? 'linear-gradient(135deg,#0f172a,#1e1b4b)' : 'linear-gradient(135deg,#eff6ff,#eef2ff)',
        borderRadius: 16, padding: '20px 24px',
        border: `1px solid ${dark ? '#334155' : '#c7d2fe'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Comparaison · 3 modèles</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 2 }}>Performance Machine Learning</div>
          <div style={{ fontSize: 12, color: muted }}>Entraînés sur {(530897).toLocaleString('fr-FR')} visites · Testés sur 20% des données (2025–2026)</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Entraînement', value: '424 717', icon: '🗄', color: '#6366f1' },
            { label: 'Test',         value: '106 180', icon: '🧪', color: '#8b5cf6' },
            { label: 'Meilleur R²',  value: `${(bestModel?.R2*100).toFixed(2)}%`, icon: '🏆', color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: dark ? '#ffffff08' : '#ffffffa0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', border: `1px solid ${border}`, minWidth: 100 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: muted, fontWeight: 600, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grille 3 cartes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {metrics.map((m) => {
          const info  = MODEL_INFO[m.modele] ?? { color:'#3b82f6', gradient:'linear-gradient(135deg,#1a3bdb,#3b82f6)', icon:null, desc:'', usage:'', type:'', steps:[] };
          const isBest = m.modele === bestModel?.modele;
          const isOpen = expanded === m.modele;
          const r2pct  = m.R2 * 100;
          const maePct  = (1 - m.MAE / maxMAE) * 100;
          const rmsePct = (1 - m.RMSE / maxRMSE) * 100;
          return (
            <div key={m.modele} style={{
              borderRadius: 16, overflow: 'hidden',
              border: `1.5px solid ${isBest ? info.color + '70' : border}`,
              boxShadow: isBest ? `0 8px 32px ${info.color}22` : `0 2px 8px #0001`,
              display: 'flex', flexDirection: 'column',
              transition: 'transform 0.2s',
            }}>
              {/* Header gradient */}
              <div style={{ background: info.gradient, padding: '18px 20px 14px', position: 'relative' }}>
                {isBest && (
                  <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 800, color: 'white', background: '#ffffff30', border: '1px solid #ffffff50', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    ★ Meilleur
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ffffff20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {info.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{m.modele}</div>
                    <div style={{ fontSize: 11, color: '#ffffffaa', marginTop: 1 }}>{info.type}</div>
                  </div>
                </div>
                {/* R² grand */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1 }}>{r2pct.toFixed(2)}%</div>
                  <div style={{ fontSize: 11, color: '#ffffffbb', marginTop: 4, fontWeight: 600 }}>Score R²</div>
                </div>
              </div>

              {/* Corps métriques */}
              <div style={{ background: cardBg, padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* MAE */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>MAE</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: text }}>{m.MAE.toFixed(3)}</span>
                  </div>
                  <div style={{ height: 5, background: innerBg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${maePct}%`, height: '100%', background: info.gradient, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>Erreur absolue moyenne</div>
                </div>

                {/* RMSE */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>RMSE</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: text }}>{m.RMSE.toFixed(3)}</span>
                  </div>
                  <div style={{ height: 5, background: innerBg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${rmsePct}%`, height: '100%', background: info.gradient, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>Erreur quadratique</div>
                </div>

                {/* Badge usage */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${info.color}10`, border: `1px solid ${info.color}25`, borderRadius: 8, padding: '5px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: info.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: info.color }}>{info.usage}</span>
                </div>

                <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{info.desc}</div>

                {/* Bouton algo */}
                <button
                  onClick={() => setExpanded(isOpen ? null : m.modele)}
                  style={{
                    marginTop: 'auto',
                    background: isOpen ? `${info.color}15` : (dark ? '#ffffff08' : '#f8fafc'),
                    border: `1px solid ${isOpen ? info.color + '50' : border}`,
                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                    color: isOpen ? info.color : muted,
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s', width: '100%',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    {isOpen
                      ? <><line x1="5" y1="12" x2="19" y2="12"/></>
                      : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                    }
                  </svg>
                  {isOpen ? 'Masquer l\'algorithme' : 'Voir l\'algorithme'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Explication algorithme dépliable ── */}
      {expanded && (() => {
        const m    = metrics.find(x => x.modele === expanded)!;
        const info = MODEL_INFO[expanded] ?? { color:'#3b82f6', gradient:'linear-gradient(135deg,#1a3bdb,#3b82f6)', icon:null, desc:'', usage:'', type:'', steps:[] };
        return (
          <div style={{ background: dark ? `${info.color}0a` : `${info.color}06`, border: `1.5px solid ${info.color}30`, borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: info.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{info.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: text }}>{expanded} — Algorithme détaillé</div>
                <div style={{ fontSize: 11, color: muted }}>{info.type}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {info.steps.map((step, si) => (
                <div key={si} style={{ background: dark ? '#ffffff06' : '#ffffff80', border: `1px solid ${info.color}20`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: info.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0 }}>{si + 1}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Graphiques comparatifs côte à côte ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Barres R² */}
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: '20px 22px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: text, marginBottom: 2 }}>Score R² par modèle</div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 18 }}>Plus proche de 100% = meilleur</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }} barSize={44}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#ffffff08' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: dark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[94, 98]} tick={{ fill: dark ? '#94a3b8' : '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: dark ? '#0f172a' : '#fff', border: `1px solid ${border}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: text, fontWeight: 700 }} formatter={(v: number) => [`${v.toFixed(2)}%`, 'R²']} />
              <Bar dataKey="R2_pct" radius={[8, 8, 0, 0]}>
                {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
              <ReferenceLine y={97} stroke="#ef444440" strokeDasharray="4 4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: '20px 22px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: text, marginBottom: 2 }}>Analyse multidimensionnelle</div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>R², Précision, Stabilité, Vitesse, Volume</div>
          <ResponsiveContainer width="100%" height={190}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke={dark ? '#ffffff15' : '#e2e8f0'} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: dark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {metrics.map(m => (
                <Radar key={m.modele} name={m.modele} dataKey={m.modele}
                  stroke={MODEL_INFO[m.modele]?.color ?? '#3b82f6'}
                  fill={MODEL_INFO[m.modele]?.color ?? '#3b82f6'}
                  fillOpacity={0.12} strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Tooltip contentStyle={{ background: dark ? '#0f172a' : '#fff', border: `1px solid ${border}`, borderRadius: 10, fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tableau compact ── */}
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: text }}>Tableau des métriques</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>Évaluation complète — ensemble de test (20%)</div>
          </div>
          <div style={{ fontSize: 10, color: muted, background: innerBg, padding: '4px 10px', borderRadius: 8, border: `1px solid ${border}` }}>Train 80% / Test 20%</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: innerBg }}>
              {['Modèle', 'Type', 'R² Score', 'MAE', 'RMSE', 'Utilisation', 'Statut'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const info    = MODEL_INFO[m.modele] ?? { color:'#3b82f6', gradient:'', icon:null, desc:'', usage:'', type:'', steps:[] };
              const isBest  = m.modele === bestModel?.modele;
              const quality = m.R2 >= 0.97 ? { label:'Excellent', color:'#10b981' } : m.R2 >= 0.95 ? { label:'Très bon', color:'#3b82f6' } : { label:'Bon', color:'#f59e0b' };
              return (
                <tr key={m.modele} style={{ borderBottom: i < metrics.length-1 ? `1px solid ${border}` : 'none', background: isBest ? `${info.color}05` : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.color }} />
                      <span style={{ fontWeight: 800, fontSize: 13, color: text }}>{m.modele}</span>
                      {isBest && <span style={{ fontSize: 8, fontWeight: 900, color: info.color, background: `${info.color}15`, padding: '2px 6px', borderRadius: 10 }}>BEST</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: muted }}>{info.type}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 5, background: innerBg, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${((m.R2-0.9)/0.1)*100}%`, height: '100%', background: info.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 900, fontSize: 13, color: info.color }}>{(m.R2*100).toFixed(2)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: text }}>{m.MAE.toFixed(3)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: text }}>{m.RMSE.toFixed(3)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: muted }}>{info.usage}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: quality.color, background: `${quality.color}15`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${quality.color}30` }}>
                      {quality.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Note méthodologique ── */}
      <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 12, border: `1px solid ${border}`, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{ fontSize: 12, color: muted, lineHeight: 1.7 }}>
          <strong style={{ color: text }}>Méthodologie :</strong> Entraînement sur données 2019–2024 · Validation sur 2025–2026 ·
          <strong style={{ color: text }}> R²</strong> = variance expliquée (1.0 = parfait) ·
          <strong style={{ color: text }}> MAE</strong> = erreur absolue moyenne ·
          <strong style={{ color: text }}> RMSE</strong> = erreur quadratique (pénalise les pics) ·
          XGBoost obtient le meilleur R² global ({(metrics.find(m => m.modele==='XGBoost')?.R2??0)*100 > 0 ? ((metrics.find(m=>m.modele==='XGBoost')?.R2??0)*100).toFixed(2)+'%' : '96.70%'}) avec le RMSE le plus faible.
        </div>
      </div>

    </div>
  );
};

export default PredictionsML;
