import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLive } from '../hooks/useLive';
import LiveBadge from '../components/LiveBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PageHeader from '../components/PageHeader';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  IconDashboard, IconUsers, IconClock, IconAlert, IconTrend, IconActivity,
  IconTrendingUp, IconAlertCircle, IconCheckCircle, IconAlertTriangle, IconLightbulb,
  DotRed, DotGreen, IconMail,
} from '../components/Icons';
import { fetchKPIs, fetchOrientation, fetchHoraire, fetchTriage, KPIs, OrientPoint, HorairePoint, TriagePoint } from '../services/api';
import ExportButton from '../components/ExportButton';
import { usePDF, PDFSection } from '../hooks/usePDF';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import EmailModal from '../components/EmailModal';
import axios from 'axios';

const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6'];

const TRIAGE_COLORS: Record<string,string> = {
  'P1 - Urgence absolue':   '#EF4444',
  'P2 - Urgence relative':  '#F59E0B',
  'P3 - Urgence différée':  '#3B82F6',
  'P4 - Non urgent':        '#22C55E',
};

interface SemaineStats {
  patients: number;
  duree_moy: number;
  taux_fugue: number;
  taux_p1: number;
}
interface Comparaison {
  actuelle: SemaineStats;
  precedente: SemaineStats;
  delta: SemaineStats;
  periode_actuelle: string;
  periode_precedente: string;
}

const TrendBadge: React.FC<{ val: number; inverse?: boolean }> = ({ val, inverse = false }) => {
  const good = inverse ? val <= 0 : val >= 0;
  const color = val === 0 ? '#94A3B8' : good ? '#22C55E' : '#EF4444';
  const arrow = val === 0 ? '=' : val > 0 ? '↑' : '↓';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 20, marginLeft: 6 }}>
      {arrow} {Math.abs(val)}
    </span>
  );
};

const KPIsGlobaux: React.FC = () => {
  const { dark } = useTheme();
  const [kpis,      setKpis]      = useState<KPIs | null>(null);
  const [orient,    setOrient]    = useState<OrientPoint[]>([]);
  const [horaire,   setHoraire]   = useState<HorairePoint[]>([]);
  const [triage,    setTriage]    = useState<TriagePoint[]>([]);
  const [comparaison, setComparaison] = useState<Comparaison | null>(null);
  const [error,     setError]     = useState('');

  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const labelColor = textMuted;    // alias
  const sectionHead = textSecondary;
  const tooltipColor = tooltipText;

  const { live, lastUpdate, toggleLive, tick } = useLive({ intervalMs: 30_000 });

  const load = useCallback(() => {
    // KPIs globaux — toutes les années, sans filtre
    fetchKPIs('', '')
      .then(k => setKpis(k))
      .catch(() => setError("Impossible de contacter l'API."));

    Promise.all([fetchOrientation(), fetchHoraire(), fetchTriage()])
      .then(([o, h, t]) => { setOrient(o); setHoraire(h); setTriage(t); })
      .catch(() => setError("Impossible de contacter l'API."));

    axios.get('/api/stats/comparaison')
      .then(r => setComparaison(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const q75 = useMemo(() => {
    const vals = horaire.map(h => h.nb_patients).sort((a,b) => a-b);
    return vals[Math.floor(vals.length * 0.75)] || 0;
  }, [horaire]);

  const peakHour = useMemo(() =>
    horaire.reduce((best, h) => h.nb_patients > best.nb_patients ? h : best, horaire[0] || { heure: 0, nb_patients: 0 }),
    [horaire]);

  const triageWithColor = useMemo(() =>
    triage.map(t => ({ ...t, color: TRIAGE_COLORS[t.triage] || '#94A3B8' })),
    [triage]);

  const p1Pct = useMemo(() => {
    const total = triage.reduce((s, t) => s + t.count, 0);
    const p1 = triage.find(t => t.triage.startsWith('P1'));
    return total ? ((p1?.count || 0) / total * 100).toFixed(1) : '0';
  }, [triage]);

  const { exportReport, exporting, pdfBase64, pdfFilename } = usePDF('KPIs_CHU_Ibn_Sina.pdf');
  const [emailOpen, setEmailOpen] = useState(false);

  const tooltipStyle = {
    contentStyle: { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: tooltipColor },
    itemStyle: { color: tooltipColor },
    labelStyle: { color: tooltipColor, fontWeight: 700 },
    cursor: { fill: cursorFill },
  };

  const totalTriage = triage.reduce((s, t) => s + t.count, 0);

  const handleExportPDF = () => {
    if (!kpis) return;
    const sections: PDFSection[] = [
      { type: 'title', text: 'KPIs Globaux — CHU Ibn Sina Rabat' },
      { type: 'kpis', items: [
        { label: 'Total Patients',         value: kpis.total,             color: 'blue' },
        { label: 'Patients / Jour',        value: kpis.patients_par_jour, color: 'green' },
        { label: 'Durée Séjour Moy (min)', value: kpis.duree_moy,         color: kpis.duree_moy > 240 ? 'red' : 'green' },
        { label: 'Taux Hospitalisation',   value: `${kpis.taux_hospit}%`, color: 'blue' },
        { label: 'Cas Critiques P1',       value: `${kpis.taux_p1}%`,     color: kpis.taux_p1 > 5 ? 'red' : 'green' },
      ]},
      { type: 'spacer' },
      { type: 'subtitle', text: 'Répartition des orientations' },
      { type: 'table',
        title: 'Orientations',
        columns: ['Orientation', 'Nb Patients', '%'],
        rows: orient.map(o => [o.orientation, o.count, `${(o.count / orient.reduce((s,x)=>s+x.count,0)*100).toFixed(1)}%`]),
      },
    ];
    exportReport('KPIs_CHU_Ibn_Sina.pdf', 'KPIs Globaux — CHU Ibn Sina Rabat', sections);
  };

  const SectionTitle: React.FC<{ label: string; sub?: string }> = ({ label, sub }) => (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: sectionHead, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 11, color: sectionHead, opacity: 0.7 }}>{sub}</span>}
      <div style={{ flex: 1, height: 1, background: cardBorder, marginLeft: 8 }}/>
    </div>
  );

  if (error) return (
    <div style={{ padding: 28, background: '#FEF2F2', borderRadius: 12, color: '#EF4444', border: '1px solid #FECACA' }}>
      {error}
    </div>
  );
  if (!kpis) return <LoadingSpinner text="Chargement des KPIs..." />;

  const jaugePct  = Math.min((kpis.duree_moy / 240) * 100, 100);
  const jaugeColor= kpis.duree_moy <= 240 ? '#22C55E' : '#EF4444';

  const insights = [
    {
      icon: kpis.duree_moy > 240 ? <DotRed size={12}/> : <DotGreen size={12}/>,
      title: kpis.duree_moy > 240 ? 'Durée de séjour élevée' : 'Durée de séjour optimale',
      text: kpis.duree_moy > 240
        ? `Durée moyenne (${kpis.duree_moy} min) dépasse l'objectif OMS de 240 min.`
        : `Durée moyenne (${kpis.duree_moy} min) conforme à l'objectif OMS.`,
      color: kpis.duree_moy > 240 ? '#EF4444' : '#22C55E',
    },
    {
      icon: <IconTrendingUp size={14} color="#F59E0B"/>,
      title: `Pic d'activité à ${peakHour?.heure}h00`,
      text: `Heure de pointe : ${peakHour?.heure}h00 avec ${peakHour?.nb_patients} patients en moyenne.`,
      color: '#F59E0B',
    },
    {
      icon: kpis.taux_p1 > 5 ? <IconAlertCircle size={14} color="#EF4444"/> : <IconCheckCircle size={14} color="#22C55E"/>,
      title: `${p1Pct}% de cas P1 critiques`,
      text: kpis.taux_p1 > 5
        ? `Taux P1 élevé (${kpis.taux_p1}%). Vérifier la disponibilité des ressources critiques.`
        : `Taux P1 maîtrisé (${kpis.taux_p1}%).`,
      color: kpis.taux_p1 > 5 ? '#EF4444' : '#22C55E',
    },
    {
      icon: kpis.taux_fugue > 3 ? <IconAlertTriangle size={14} color="#F59E0B"/> : <IconCheckCircle size={14} color="#22C55E"/>,
      title: `Taux de fugue : ${kpis.taux_fugue}%`,
      text: kpis.taux_fugue > 3
        ? `Taux de fugue de ${kpis.taux_fugue}% — temps d'attente trop longs.`
        : `Faible taux de fugue (${kpis.taux_fugue}%).`,
      color: kpis.taux_fugue > 3 ? '#F59E0B' : '#22C55E',
    },
  ];

  return (
    <>
    <div id="page-kpis">
      <PageHeader
        icon={<IconDashboard size={22} color="white"/>}
        title="KPIs Globaux"
        subtitle="Vue d'ensemble des urgences — CHU Ibn Sina Rabat"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveBadge live={live} lastUpdate={lastUpdate} onToggle={toggleLive} />
            <ExportButton label={exporting ? 'Export...' : 'Exporter'} csvUrl="/api/export/urgences" onExportPDF={handleExportPDF}/>
            <button onClick={() => setEmailOpen(true)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMail size={13} color="white"/> Email
            </button>
          </div>
        }
      />

      {/* ══ SECTION 1 : KPIs GLOBAUX (toutes années) ══ */}
      <SectionTitle label="KPIs Globaux" sub="Toutes les données · 2019–2026" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14, marginBottom: 16 }}>
        <KPICard label="Total Patients"       value={kpis.total}              color="#3B82F6" icon={<IconUsers size={15} color="#3B82F6"/>} />
        <KPICard label="Patients / Jour"      value={kpis.patients_par_jour}  color="#22C55E" icon={<IconActivity size={15} color="#22C55E"/>} />
        <KPICard label="Durée Séjour Moy."    value={kpis.duree_moy} unit="min" color="#F59E0B" icon={<IconClock size={15} color="#F59E0B"/>} />
        <KPICard label="Taux Hospitalisation" value={`${kpis.taux_hospit}%`}  color="#8B5CF6" icon={<IconTrend size={15} color="#8B5CF6"/>} />
        <KPICard label="Cas Critiques P1"     value={`${kpis.taux_p1}%`}      color="#EF4444" icon={<IconAlert size={15} color="#EF4444"/>} />
      </div>

      {/* OMS Gauge */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '18px 24px', marginBottom: 24, border: `1px solid ${cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: titleColor }}>
            <IconClock size={16} color="#F59E0B"/> Durée de séjour vs. Objectif OMS (240 min)
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: jaugeColor, background: `${jaugeColor}18`, padding: '3px 10px', borderRadius: 20 }}>
            {kpis.duree_moy <= 240 ? '✓ Conforme' : '✗ Dépassé'}
          </span>
        </div>
        <div style={{ background: dark ? '#334155' : '#F1F5F9', borderRadius: 99, height: 14, overflow: 'hidden' }}>
          <div style={{ width: `${jaugePct}%`, height: '100%', background: `linear-gradient(90deg,${jaugeColor}aa,${jaugeColor})`, borderRadius: 99, transition: 'width 0.8s' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
          <span style={{ color: jaugeColor, fontWeight: 700 }}>{kpis.duree_moy} min ({jaugePct.toFixed(0)}% de l'objectif)</span>
          <span style={{ color: labelColor }}>Objectif OMS : 240 min</span>
        </div>
      </div>

      {/* ══ SECTION 2 : KPIs DE LA SEMAINE ══ */}
      <SectionTitle label="KPIs de la Semaine" sub={comparaison ? `Semaine du ${comparaison.periode_precedente} au ${comparaison.periode_actuelle}` : ''} />
      {comparaison ? (
        <div style={{ marginBottom: 24 }}>
          {/* 4 KPI cards with comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'Patients cette semaine', val: comparaison.actuelle.patients,   delta: comparaison.delta.patients,   color: '#3B82F6', inverse: false, unit: '' },
              { label: 'Durée moy. séjour',      val: comparaison.actuelle.duree_moy,  delta: comparaison.delta.duree_moy,  color: '#F59E0B', inverse: true,  unit: 'min' },
              { label: 'Taux fugue',              val: comparaison.actuelle.taux_fugue, delta: comparaison.delta.taux_fugue, color: '#8B5CF6', inverse: true,  unit: '%' },
              { label: 'Taux P1 critiques',       val: comparaison.actuelle.taux_p1,   delta: comparaison.delta.taux_p1,    color: '#EF4444', inverse: true,  unit: '%' },
            ].map(item => (
              <div key={item.label} style={{ background: cardBg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${cardBorder}`, borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: 11, color: labelColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.val}{item.unit}</span>
                  <TrendBadge val={item.delta} inverse={item.inverse} />
                </div>
                <div style={{ fontSize: 11, color: labelColor }}>
                  Sem. préc. : <strong>{comparaison.precedente[item.label === 'Patients cette semaine' ? 'patients' : item.label === 'Durée moy. séjour' ? 'duree_moy' : item.label === 'Taux fugue' ? 'taux_fugue' : 'taux_p1']}{item.unit}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Semaine vs précédente — barre comparative */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${cardBorder}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: titleColor, marginBottom: 14 }}>Comparaison semaine actuelle vs précédente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { label: 'Patients', act: comparaison.actuelle.patients,   prec: comparaison.precedente.patients,   color: '#3B82F6', unit: '' },
                { label: 'Durée moy. (min)', act: comparaison.actuelle.duree_moy, prec: comparaison.precedente.duree_moy, color: '#F59E0B', unit: 'min' },
              ].map(item => {
                const max = Math.max(item.act, item.prec, 1);
                const pctAct  = (item.act  / max) * 100;
                const pctPrec = (item.prec / max) * 100;
                return (
                  <div key={item.label}>
                    <div style={{ fontSize: 12, color: labelColor, fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: titleColor, marginBottom: 3 }}>
                          <span>Cette semaine</span><span style={{ fontWeight: 700, color: item.color }}>{item.act}{item.unit}</span>
                        </div>
                        <div style={{ height: 8, background: dark?'#334155':'#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctAct}%`, background: item.color, borderRadius: 4, transition: 'width 0.5s' }}/>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: labelColor, marginBottom: 3 }}>
                          <span>Semaine précédente</span><span style={{ fontWeight: 600 }}>{item.prec}{item.unit}</span>
                        </div>
                        <div style={{ height: 8, background: dark?'#334155':'#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctPrec}%`, background: `${item.color}70`, borderRadius: 4, transition: 'width 0.5s' }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${cardBorder}`, marginBottom: 24, color: labelColor, fontSize: 13 }}>
          Chargement des données hebdomadaires...
        </div>
      )}

      {/* ══ SECTION 3 : DISTRIBUTIONS ══ */}
      <SectionTitle label="Distributions" sub="Orientations · Triage · Flux horaire" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Orientations */}
        <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${cardBorder}` }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: titleColor, fontSize: 14 }}>Répartition des orientations</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={orient} dataKey="count" nameKey="orientation" cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {orient.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Patients']}/>
              <Legend iconType="circle" iconSize={10} verticalAlign="bottom" align="center" wrapperStyle={{ color: tickColor, paddingTop: 8 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Triage */}
        <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${cardBorder}` }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: titleColor, fontSize: 14 }}>Niveaux de triage</div>
          <div style={{ fontSize: 11, color: labelColor, marginBottom: 12 }}>Distribution des degrés d'urgence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {triageWithColor.map(t => {
              const pct = totalTriage ? (t.count / totalTriage * 100) : 0;
              return (
                <div key={t.triage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: titleColor, fontWeight: 600 }}>{t.triage}</span>
                    <span style={{ color: t.color, fontWeight: 800 }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 8, background: dark ? '#0f172a' : '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: t.color, borderRadius: 4, transition: 'width 0.6s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {triageWithColor.map(t => (
              <span key={t.triage} style={{ fontSize: 10, background: `${t.color}18`, color: t.color, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                {t.triage.split(' ')[0]} : {t.count.toLocaleString('fr-FR')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Flux horaire */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${cardBorder}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: titleColor, fontSize: 14 }}>Flux par heure d'arrivée</div>
          <span style={{ fontSize: 11, background: '#EF444418', color: '#EF4444', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
            Pic : {peakHour?.heure}h00
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={horaire} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="heure" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: cardBorder }} tickLine={false}/>
            <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
            <Tooltip {...tooltipStyle} formatter={(v: any) => [v, 'Patients']} labelFormatter={v => `${v}h`}/>
            <Bar dataKey="nb_patients" radius={[3, 3, 0, 0]}>
              {horaire.map((h, i) => <Cell key={i} fill={h.nb_patients > q75 ? '#EF4444' : '#3B82F6'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: labelColor, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <DotRed size={8}/> Barres rouges = heures au-dessus du 75e percentile ({q75} patients)
        </div>
      </div>

      {/* Insights */}
      <div style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${cardBorder}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: titleColor, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconLightbulb size={16} color="#F59E0B"/> Insights & Recommandations automatiques
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {insights.map(ins => (
            <div key={ins.title} style={{ background: innerBg, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${ins.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>{ins.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: ins.color }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: 12, color: labelColor, lineHeight: 1.6 }}>{ins.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <EmailModal
      open={emailOpen}
      onClose={() => setEmailOpen(false)}
      pdfBase64={pdfBase64}
      filename={pdfFilename}
      pageTitle="KPIs Globaux — CHU Ibn Sina Rabat"
    />
    </>
  );
};

export default KPIsGlobaux;
