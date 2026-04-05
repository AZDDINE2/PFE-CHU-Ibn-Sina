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

type Tab = 'prevision' | 'anomalies' | 'patient' | 'lits';

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
    { id: 'prevision',  label: 'Prévision Affluence',  icon: <IconChart />,  desc: 'Combien de patients dans les 30 prochains jours ?' },
    { id: 'anomalies',  label: 'Anomalies du Jour',    icon: <IconAlert />,  desc: 'Quelque chose d\'inhabituel se passe-t-il aujourd\'hui ?' },
    { id: 'patient',    label: 'Évaluation Patient',   icon: <IconUser />,   desc: 'Prédire le niveau de triage et la durée de séjour' },
    { id: 'lits',       label: 'Orientation Lits',     icon: <IconBed />,    desc: 'Trouver un lit disponible selon le profil patient' },
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
      {tab === 'anomalies' && <TabAnomalies dark={dark} cardBg={cardBg} border={border} text={text} muted={muted} />}
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
// TAB 2 — ANOMALIES DU JOUR
// ══════════════════════════════════════════════════════════════

const TabAnomalies: React.FC<{ dark: boolean; cardBg: string; border: string; text: string; muted: string }> = ({ dark, cardBg, border, text, muted }) => {
  const [data, setData]     = useState<Anomalie[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/anomalies', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const anomalies   = data.filter(d => d.anomalie);
  const hausse      = anomalies.filter(d => d.ecart_pct > 0);
  const baisse      = anomalies.filter(d => d.ecart_pct < 0);
  const tickColor   = dark ? '#94a3b8' : '#64748b';
  const gridColor   = dark ? '#334155' : '#f1f5f9';
  const tooltipBg   = dark ? '#0f172a' : '#fff';
  const tooltipBorder = dark ? '#334155' : '#e2e8f0';

  if (loading) return <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Analyse en cours...</div>;

  const chartData = data.map(d => ({
    heure:        `${String(d.heure).padStart(2,'0')}h`,
    'Moy. historique': d.historique_moy,
    "Aujourd'hui": d.aujourd_hui,
    anomalie:     d.anomalie,
    ecart:        d.ecart_pct,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Alert banner */}
      {anomalies.length > 0 ? (
        <div style={{
          background: '#fef3c720', border: '1.5px solid #f59e0b',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <IconWarningLg size={32} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>
              {anomalies.length} heure{anomalies.length > 1 ? 's' : ''} avec activité inhabituelle détectée{anomalies.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {hausse.length > 0 && `${hausse.length} pic(s) de hausse · `}
              {baisse.length > 0 && `${baisse.length} baisse(s) anormale(s)`}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#d1fae520', border: '1.5px solid #22c55e', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconCheckLg size={32} color="#22c55e" />
          <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>Flux normal — Aucune anomalie détectée aujourd'hui</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Anomalies détectées', value: anomalies.length, color: anomalies.length > 0 ? '#f59e0b' : '#22c55e' },
          { label: 'Hausses inhabituelles', value: hausse.length, color: '#ef4444' },
          { label: 'Baisses anormales',     value: baisse.length, color: '#3b82f6' },
        ].map(k => (
          <div key={k.label} style={{ background: cardBg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: cardBg, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 4 }}>Flux horaire : Aujourd'hui vs Moyenne historique</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 20 }}>
          Bleu = moyenne habituelle sur l'ensemble des données · Rouge = valeur du dernier jour disponible
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="heure" tick={{ fill: tickColor, fontSize: 10 }} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: text, fontWeight: 700 }}
              itemStyle={{ color: text }}
              formatter={(val: any, name: string) => [typeof val === 'number' ? val.toFixed(1) : val, name]}
            />
            <Bar dataKey="Moy. historique" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.7} />
            <Bar dataKey="Aujourd'hui" radius={[4,4,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.anomalie ? '#ef4444' : '#22c55e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10 }}>
          {[['#3b82f6','Moy. historique'],['#22c55e',"Aujourd'hui (normal)"],['#ef4444',"Aujourd'hui (anomalie)"]].map(([c,l]) => (
            <span key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: muted }}>
              <span style={{ width:12, height:12, borderRadius:3, background:c, display:'inline-block' }}/>{l}
            </span>
          ))}
        </div>
      </div>

      {/* Detail list */}
      {anomalies.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 12, padding: 22, border: `1px solid ${border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 14 }}>Détail des anomalies</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anomalies.map(d => (
              <div key={d.heure} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: d.ecart_pct > 0 ? '#fef3c720' : '#dbeafe20',
                border: `1px solid ${d.ecart_pct > 0 ? '#f59e0b40' : '#3b82f640'}`,
              }}>
                <span style={{ fontWeight: 700, color: text }}>{String(d.heure).padStart(2,'0')}h00 – {String(d.heure+1).padStart(2,'0')}h00</span>
                <span style={{ color: muted, fontSize: 12 }}>Attendu : {d.historique_moy.toFixed(1)} · Réel : {d.aujourd_hui}</span>
                <span style={{ fontWeight: 800, color: d.ecart_pct > 0 ? '#ef4444' : '#3b82f6', fontSize: 14 }}>
                  {d.ecart_pct > 0 ? '+' : ''}{d.ecart_pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
