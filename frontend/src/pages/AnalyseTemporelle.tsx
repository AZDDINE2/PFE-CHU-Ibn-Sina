import React, { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid, ReferenceLine, LineChart, Line,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterBar from '../components/FilterBar';
import { IconChart, IconActivity, IconBarChart, IconTrendingUp, IconTrendingDown, DotRed, DotGreen, IconMapPin, IconMail } from '../components/Icons';
import {
  fetchTemporel, fetchHoraire, fetchSaison, fetchJour,
  TSPoint, HorairePoint, SaisonPoint, JourPoint,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { usePDF, PDFSection } from '../hooks/usePDF';
import ExportButton from '../components/ExportButton';
import EmailModal from '../components/EmailModal';

const SAISON_COLORS: Record<string,string> = {
  Hiver:'#3B82F6', Printemps:'#22C55E', 'Eté':'#F59E0B', Automne:'#F97316',
};
const SAISON_ICONS: Record<string,string> = {
  Hiver:'Hiv.', Printemps:'Pri.', 'Eté':'Été', Automne:'Aut.',
};
const ALL_ANNEES = ['2019','2020','2021','2022','2023','2024','2025','2026'];

/* Moving average helper */
const movingAvg = (data: TSPoint[], window = 14): Array<TSPoint & { ma: number }> => {
  return data.map((point, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, p) => s + p.y, 0) / slice.length;
    return { ...point, ma: Math.round(avg * 10) / 10 };
  });
};

const AnalyseTemporelle: React.FC = () => {
  const { dark } = useTheme();
  const { exportReport, exporting, pdfBase64, pdfFilename } = usePDF('AnalyseTemporelle_CHU.pdf');
  const [emailOpen, setEmailOpen] = useState(false);
  const [ts,      setTs]      = useState<TSPoint[]>([]);
  const [horaire, setHoraire] = useState<HorairePoint[]>([]);
  const [saison,  setSaison]  = useState<SaisonPoint[]>([]);
  const [jour,    setJour]    = useState<JourPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [annees,  setAnnees]  = useState<string[]>(ALL_ANNEES);
  const [view,    setView]    = useState<'serie'|'mensuel'>('serie');

  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const labelColor = textMuted;    // alias
  const sectionHead = textSecondary;
  const tooltipColor = tooltipText;
  const gridColor = border;

  const tooltipStyle = {
    contentStyle: { background:tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, color:tooltipColor },
    itemStyle: { color:tooltipColor },
    labelStyle: { color:tooltipColor, fontWeight:700 },
    cursor: { fill:cursorFill },
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTemporel(annees.join(',')), fetchHoraire(), fetchSaison(), fetchJour()])
      .then(([t,h,s,j]) => { setTs(t); setHoraire(h); setSaison(s); setJour(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, [annees]);

  /* Derived stats from time series */
  const stats = useMemo(() => {
    if (!ts.length) return null;
    const vals = ts.map(p => p.y);
    const avg  = vals.reduce((s,v)=>s+v,0)/vals.length;
    const max  = Math.max(...vals);
    const min  = Math.min(...vals);
    const maxDay = ts[vals.indexOf(max)];
    const minDay = ts[vals.indexOf(min)];
    const first7 = vals.slice(0,7).reduce((s,v)=>s+v,0)/7;
    const last7  = vals.slice(-7).reduce((s,v)=>s+v,0)/7;
    const trend  = ((last7-first7)/first7)*100;
    return { avg, max, min, maxDay, minDay, trend };
  }, [ts]);

  /* Monthly aggregation */
  const monthlyData = useMemo(() => {
    const buckets: Record<string, number[]> = {};
    ts.forEach(p => {
      const key = p.ds.slice(0,7); // YYYY-MM
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(p.y);
    });
    return Object.entries(buckets)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month: month.slice(5), // MM
        fullMonth: month,
        total: vals.reduce((s,v)=>s+v,0),
        avg: Math.round(vals.reduce((s,v)=>s+v,0)/vals.length),
      }));
  }, [ts]);

  /* Time series with moving average (sampled every 7 days) */
  const tsWithMa = useMemo(() => movingAvg(ts, 14).filter((_,i) => i%7===0), [ts]);

  const mobileTs = useMemo(() => ts.filter((_,i) => i%7===0), [ts]);
  const q75h = Math.max(...horaire.map(h => h.nb_patients)) * 0.75;

  /* Best day of week */
  const maxJour = useMemo(() => jour.reduce((best,j) => j.nb_patients>best.nb_patients?j:best, jour[0]||{jour:'',nb_patients:0}), [jour]);
  const minJour = useMemo(() => jour.reduce((best,j) => j.nb_patients<best.nb_patients?j:best, jour[0]||{jour:'',nb_patients:0}), [jour]);

  const handleExportPDF = () => {
    const sections: PDFSection[] = [
      { type: 'title', text: 'Analyse Temporelle — Flux Patients' },
      { type: 'text', text: 'Période analysée : années ' + annees.join(', ') },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Statistiques de la période' },
      { type: 'kpis', items: [
        {
          label: 'Moy. quotidienne',
          value: stats ? `${stats.avg.toFixed(0)} patients` : '—',
          color: 'blue',
        },
        {
          label: 'Journée record (max)',
          value: stats ? `${stats.max} patients` : '—',
          color: 'red',
        },
        {
          label: 'Journée creuse (min)',
          value: stats ? `${stats.min} patients` : '—',
          color: 'green',
        },
        {
          label: 'Tendance période',
          value: stats ? `${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(1)}%` : '—',
          color: stats && stats.trend >= 0 ? 'red' : 'green',
        },
      ]},
      { type: 'spacer' },
      { type: 'subtitle', text: 'Répartition saisonnière' },
      { type: 'table',
        title: 'Patients par saison',
        columns: ['Saison', 'Nb Patients'],
        rows: saison.map(s => [s.saison, s.nb_patients]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Flux par jour de la semaine' },
      { type: 'table',
        title: 'Patients par jour',
        columns: ['Jour', 'Nb Patients'],
        rows: jour.map(j => [j.jour, j.nb_patients]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: "Top 10 heures d'activité" },
      { type: 'table',
        title: "Top 10 heures d'affluence",
        columns: ['Heure', 'Nb Patients'],
        rows: [...horaire]
          .sort((a, b) => b.nb_patients - a.nb_patients)
          .slice(0, 10)
          .map(h => [`${h.heure}h00`, h.nb_patients]),
      },
    ];
    exportReport('AnalyseTemporelle_CHU.pdf', 'Analyse Temporelle — Flux Patients', sections);
  };

  return (
    <>
    <div id="page-temporel">
      <PageHeader
        icon={<IconChart size={22} color="white"/>}
        title="Analyse Temporelle"
        subtitle="Évolution et patterns des flux patients"
        actions={<div style={{display:'flex',gap:8}}><ExportButton label={exporting?'Export...':'Exporter'} csvUrl="/api/export/urgences" onExportPDF={handleExportPDF}/><button onClick={()=>setEmailOpen(true)} style={{padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#1a3bdb,#3b82f6)',color:'#fff',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><IconMail size={13} color="white"/> Email</button></div>}
      />

      <FilterBar
        selectedAnnees={annees}
        onToggleAnnee={a => setAnnees(p => p.includes(a) ? p.filter(x=>x!==a) : [...p,a])}
        onReset={() => setAnnees(ALL_ANNEES)}
      />

      {loading ? <LoadingSpinner/> : <>
        {/* KPI summary cards */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
            {[
              { l:'Moy. quotidienne', v:`${stats.avg.toFixed(0)} patients`, c:'#3B82F6', icon:<IconBarChart size={13} color="#3B82F6"/> },
              { l:'Journée record',   v: (() => { const d = new Date(stats.maxDay?.ds||''); return `${stats.max} patients · ${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}`; })(), c:'#EF4444', icon:<IconTrendingUp size={13} color="#EF4444"/> },
              { l:'Journée creuse',   v: (() => { const d = new Date(stats.minDay?.ds||''); return `${stats.min} patients · ${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}`; })(), c:'#22C55E', icon:<IconTrendingDown size={13} color="#22C55E"/> },
              { l:'Tendance période',
                v: <span style={{ color: stats.trend>=0?'#EF4444':'#22C55E', fontWeight:800 }}>
                     {stats.trend>=0
                       ? <IconTrendingUp size={13} color="#EF4444" style={{ marginRight:3 }}/>
                       : <IconTrendingDown size={13} color="#22C55E" style={{ marginRight:3 }}/>}
                     {Math.abs(stats.trend).toFixed(1)}%
                   </span>,
                c: stats.trend>=0?'#EF4444':'#22C55E', icon:<IconTrendingUp size={13} color={stats.trend>=0?'#EF4444':'#22C55E'}/> },
            ].map(item => (
              <div key={item.l} style={{ background:cardBg, borderRadius:12, padding:'14px 18px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, borderTop:`3px solid ${item.c}` }}>
                <div style={{ fontSize:10, color:labelColor, textTransform:'uppercase', fontWeight:700, marginBottom:2 }}>
                  {item.icon} {item.l}
                </div>
                <div style={{ fontWeight:800, fontSize:16, color:item.c, marginTop:4 }}>{item.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main chart with toggle */}
        <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', marginBottom:16, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, color:titleColor }}>
              <IconActivity size={16} color="#3B82F6"/>
              {view==='serie' ? 'Série temporelle — Patients par jour + Moyenne mobile 14j' : 'Agrégation mensuelle des passages'}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {(['serie','mensuel'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding:'5px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
                  background: view===v ? '#3B82F6' : innerBg, color: view===v ? '#fff' : labelColor,
                }}>
                  {v==='serie' ? 'Série' : 'Mensuel'}
                </button>
              ))}
            </div>
          </div>

          {view === 'serie' ? (
            <>
              <div style={{ display:'flex', gap:16, marginBottom:10, fontSize:11 }}>
                {[
                  { color:'#3B82F6', label:'Patients / jour', solid:true },
                  { color:'#F59E0B', label:'Moyenne mobile 14j', solid:false },
                ].map(l => (
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, color:labelColor }}>
                    <div style={{ width:18, height:l.solid?8:2, borderRadius:2, background:l.color, borderTop:l.solid?undefined:`2px dashed ${l.color}` }}/>
                    {l.label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={tsWithMa} margin={{ top:4, right:4, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="colorTs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={dark?0.25:0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor}/>
                  <XAxis dataKey="ds" tick={{ fontSize:10, fill:tickColor }} axisLine={{ stroke:gridColor }} tickLine={false}
                    tickFormatter={v=>v.slice(0,7)} interval={Math.floor(tsWithMa.length/8)}/>
                  <YAxis tick={{ fontSize:11, fill:tickColor }} axisLine={false} tickLine={false}/>
                  <Tooltip {...tooltipStyle} labelFormatter={v=>`Date : ${v}`}
                    formatter={(v:any, n) => [v, n==='y'?'Patients':n==='ma'?'Moy. mobile':n]}/>
                  <Area type="monotone" dataKey="y" stroke="#3B82F6" fill="url(#colorTs)" strokeWidth={1.5} dot={false} name="y"/>
                  <Line type="monotone" dataKey="ma" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" name="ma"/>
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:tickColor }} axisLine={{ stroke:gridColor }} tickLine={false}
                  tickFormatter={v=>{const months=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];return months[parseInt(v)-1]||v;}}/>
                <YAxis tick={{ fontSize:11, fill:tickColor }} axisLine={false} tickLine={false}/>
                <Tooltip {...tooltipStyle} labelFormatter={v=>{const months=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];return months[parseInt(v)-1]||v;}}
                  formatter={(v:any) => [v.toLocaleString('fr-FR'),'Total patients']}/>
                <Bar dataKey="total" radius={[5,5,0,0]}>
                  {monthlyData.map((m,i) => {
                    const max = Math.max(...monthlyData.map(x=>x.total));
                    return <Cell key={i} fill={m.total===max?'#EF4444':'#3B82F6'}/>;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3-column bottom row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Horaire */}
          <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
            <div style={{ fontWeight:700, marginBottom:12, color:titleColor, fontSize:14 }}>Flux horaire</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={horaire} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                <XAxis dataKey="heure" tick={{ fontSize:9, fill:tickColor }} axisLine={{ stroke:cardBorder }} tickLine={false} tickFormatter={v=>`${v}h`} interval={3}/>
                <YAxis tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}/>
                <Tooltip {...tooltipStyle} formatter={(v:any)=>[v,'Patients']} labelFormatter={v=>`${v}h00`}/>
                <Bar dataKey="nb_patients" radius={[3,3,0,0]}>
                  {horaire.map((h,i)=><Cell key={i} fill={h.nb_patients>q75h?'#EF4444':'#3B82F6'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Jour semaine */}
          <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
            <div style={{ fontWeight:700, marginBottom:12, color:titleColor, fontSize:14 }}>Par jour de la semaine</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={jour} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                <XAxis dataKey="jour" tick={{ fontSize:9, fill:tickColor }} axisLine={{ stroke:cardBorder }} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}/>
                <Tooltip {...tooltipStyle} formatter={(v:any)=>[v.toLocaleString('fr-FR'),'Patients']}/>
                <Bar dataKey="nb_patients" radius={[3,3,0,0]}>
                  {jour.map((j,i)=>{
                    const maxV=Math.max(...jour.map(x=>x.nb_patients));
                    return <Cell key={i} fill={j.nb_patients===maxV?'#EF4444':'#3B82F6'}/>;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:8, display:'flex', gap:10, fontSize:11, color:labelColor }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><DotRed size={8}/> Max : <b style={{ color:titleColor }}>{maxJour?.jour}</b></span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><DotGreen size={8}/> Min : <b style={{ color:titleColor }}>{minJour?.jour}</b></span>
            </div>
          </div>

          {/* Saison */}
          <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
            <div style={{ fontWeight:700, marginBottom:12, color:titleColor, fontSize:14 }}>Par saison</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
              {saison.map(s => {
                const maxS = Math.max(...saison.map(x=>x.nb_patients));
                const pct = maxS ? (s.nb_patients/maxS*100) : 0;
                const color = SAISON_COLORS[s.saison]||'#3B82F6';
                return (
                  <div key={s.saison}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:12 }}>
                      <span style={{ color:titleColor, fontWeight:600 }}>{SAISON_ICONS[s.saison]||''} {s.saison}</span>
                      <span style={{ color, fontWeight:800 }}>{s.nb_patients.toLocaleString('fr-FR')}</span>
                    </div>
                    <div style={{ height:7, background:dark?'#0f172a':'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {saison.length > 0 && (
              <div style={{ background:innerBg, borderRadius:8, padding:'8px 12px', fontSize:11, color:labelColor, display:'flex', alignItems:'center', gap:5 }}>
                <IconMapPin size={12} color={labelColor}/> Saison la plus chargée :{' '}
                <strong style={{ color:titleColor }}>
                  {saison.reduce((best,s) => s.nb_patients>best.nb_patients?s:best, saison[0])?.saison}
                </strong>
              </div>
            )}
          </div>
        </div>
      </>}
    </div>

    <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)} pdfBase64={pdfBase64} filename={pdfFilename} pageTitle="Analyse Temporelle — CHU Ibn Sina"/>
    </>
  );
};

export default AnalyseTemporelle;
