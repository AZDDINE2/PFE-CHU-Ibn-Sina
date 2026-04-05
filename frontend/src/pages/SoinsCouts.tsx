import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterBar from '../components/FilterBar';
import {
  IconPill, IconActivity, IconStethoscope, IconBarChart, IconClipboard, IconTrophy,
  IconCheckCircle, IconAlertCircle, IconRefreshCw, DotBlue, DotYellow, DotGray,
  Medal1, Medal2, Medal3, IconMail,
} from '../components/Icons';
import {
  fetchSoinsTypes, fetchCoutsParType, fetchCoutsParEtab, fetchResultats, fetchMedicaments,
  SoinType, CoutType, CoutEtab, Resultat, Medicament,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { usePDF, PDFSection } from '../hooks/usePDF';
import ExportButton from '../components/ExportButton';
import EmailModal from '../components/EmailModal';

const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899'];

const RESULTAT_ICONS: Record<string, React.ReactNode> = {
  'Guéri':       <IconCheckCircle size={10} color="#22C55E"/>,
  'Amélioré':    <DotBlue size={10}/>,
  'Stationnaire':<DotYellow size={10}/>,
  'Décédé':      <DotGray size={10}/>,
  'Transfert':   <IconRefreshCw size={10} color="#8B5CF6"/>,
};

const SoinsCouts: React.FC = () => {
  const { dark } = useTheme();
  const { exportReport, exporting, pdfBase64, pdfFilename } = usePDF('SoinsCouts_CHU.pdf');
  const [emailOpen, setEmailOpen] = useState(false);
  const [types,     setTypes]     = useState<SoinType[]>([]);
  const [coutType,  setCoutType]  = useState<CoutType[]>([]);
  const [coutEtab,  setCoutEtab]  = useState<CoutEtab[]>([]);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [medics,    setMedics]    = useState<Medicament[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [topN,      setTopN]      = useState('10');
  const [sortBy,    setSortBy]    = useState<'count'|'cout'>('count');
  const [chartView, setChartView] = useState<'bar'|'radial'>('bar');

  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const labelColor = textMuted;    // alias
  const sectionHead = textSecondary;
  const tooltipColor = tooltipText;

  const tooltipStyle = {
    contentStyle: { background:tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, color:tooltipColor },
    itemStyle: { color:tooltipColor },
    labelStyle: { color:tooltipColor, fontWeight:700 },
    cursor: { fill:cursorFill },
  };

  useEffect(()=>{
    Promise.all([fetchSoinsTypes(), fetchCoutsParType(), fetchCoutsParEtab(), fetchResultats(), fetchMedicaments()])
      .then(([t,ct,ce,r,m])=>{setTypes(t);setCoutType(ct);setCoutEtab(ce);setResultats(r);setMedics(m);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  const displayTypes = useMemo(()=>{
    const n = parseInt(topN)||10;
    return sortBy==='count'
      ? types.slice(0,n)
      : [...types].sort((a,b)=>{
          const ca=coutType.find(c=>c.type_soin===a.type_soin)?.cout_moyen||0;
          const cb=coutType.find(c=>c.type_soin===b.type_soin)?.cout_moyen||0;
          return cb-ca;
        }).slice(0,n);
  },[types,coutType,topN,sortBy]);

  /* Top 3 soins by count */
  const top3soins = useMemo(()=>[...types].sort((a,b)=>b.count-a.count).slice(0,3),[types]);
  /* Most expensive */
  const mostExp = useMemo(()=>[...coutType].sort((a,b)=>b.cout_moyen-a.cout_moyen)[0],[coutType]);
  /* Top médicament */
  const topMedic = useMemo(()=>medics[0],[medics]);

  if (loading) return <LoadingSpinner text="Chargement des soins..."/>;

  const totalSoins = types.reduce((s,t)=>s+t.count,0);
  const totalCout  = coutEtab.reduce((s,e)=>s+e.cout_total,0);
  const coutMoyen  = coutType.length ? coutType.reduce((s,c)=>s+c.cout_moyen,0)/coutType.length : 0;
  const topEtab    = [...coutEtab].sort((a,b)=>b.cout_total-a.cout_total)[0];

  /* Résultats with percentage */
  const totalResultats = resultats.reduce((s,r)=>s+r.count,0);
  const resultatsWithPct = resultats.map(r=>({
    ...r,
    pct: totalResultats ? (r.count/totalResultats*100).toFixed(1) : '0',
    fill: COLORS[resultats.indexOf(r)%COLORS.length],
  }));

  const handleExportPDF = () => {
    const sections: PDFSection[] = [
      { type: 'title', text: 'Rapport Soins & Coûts — CHU Ibn Sina' },
      { type: 'kpis', items: [
        { label: 'Total actes',      value: totalSoins.toLocaleString('fr-FR'), color: 'blue' },
        { label: 'Coût total (M MAD)', value: `${(totalCout/1e6).toFixed(2)}M`, color: 'green' },
        { label: 'Coût moyen (MAD)', value: coutMoyen.toFixed(0),              color: 'orange' },
        { label: 'Nb types de soins', value: types.length,                     color: 'blue' },
      ]},
      { type: 'spacer' },
      { type: 'subtitle', text: 'Types de soins — Volume (Top 10)' },
      { type: 'table',
        title: 'Top 10 types de soins par volume',
        columns: ['Type de soin', 'Nb Actes'],
        rows: types.slice(0, 10).map(t => [t.type_soin, t.count]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Coût moyen par type de soin' },
      { type: 'table',
        title: 'Top 10 coûts moyens',
        columns: ['Type de soin', 'Coût moyen (MAD)'],
        rows: coutType.slice(0, 10).map(c => [c.type_soin, c.cout_moyen.toFixed(0)]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Coût total par établissement' },
      { type: 'table',
        title: 'Coûts par établissement',
        columns: ['Établissement', 'Coût total (MAD)', 'Coût total (M MAD)'],
        rows: coutEtab.map(e => [
          e.etablissement,
          e.cout_total.toLocaleString('fr-FR'),
          `${(e.cout_total / 1e6).toFixed(2)}M`,
        ]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Résultats des soins' },
      { type: 'table',
        title: 'Distribution des résultats cliniques',
        columns: ['Résultat', 'Nb Actes', '%'],
        rows: resultats.map(r => [
          r.resultat,
          r.count,
          totalResultats > 0 ? `${(r.count / totalResultats * 100).toFixed(1)}%` : '—',
        ]),
      },
      { type: 'spacer' },
      { type: 'subtitle', text: 'Top médicaments prescrits' },
      { type: 'table',
        title: 'Médicaments les plus prescrits',
        columns: ['Médicament', 'Nb Prescriptions'],
        rows: medics.map(m => [m.medicament, m.count]),
      },
    ];
    exportReport('SoinsCouts_CHU.pdf', 'Rapport Soins & Coûts — CHU Ibn Sina', sections);
  };

  return (
    <>
    <div id="page-soins">
      <PageHeader
        icon={<IconPill size={22} color="white"/>}
        title="Soins & Coûts"
        subtitle="Analyse des actes médicaux et coûts associés"
        actions={<div style={{display:'flex',gap:8}}><ExportButton label={exporting?'Export...':'Exporter'} csvUrl="/api/export/urgences" onExportPDF={handleExportPDF}/><button onClick={()=>setEmailOpen(true)} style={{padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#1a3bdb,#3b82f6)',color:'#fff',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><IconMail size={13} color="white"/> Email</button></div>}
      />

      <FilterBar
        triage={['5','10','15','20'].map(n=>`Top ${n}`)}
        selectedTriage={`Top ${topN}`}
        onTriage={v=>setTopN(v.replace('Top ',''))}
        orientation={['Volume (count)','Coût moyen']}
        selectedOrientation={sortBy==='count'?'Volume (count)':'Coût moyen'}
        onOrientation={v=>setSortBy(v==='Volume (count)'?'count':'cout')}
        onReset={()=>{setTopN('10');setSortBy('count');}}
      />

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Total actes',     v:totalSoins.toLocaleString('fr-FR'),      c:'#3B82F6', icon:<IconStethoscope size={13} color="#3B82F6"/> },
          { l:'Coût total',      v:`${(totalCout/1e6).toFixed(2)}M MAD`,    c:'#22C55E', icon:<IconActivity size={13} color="#22C55E"/> },
          { l:'Coût moyen/acte', v:`${coutMoyen.toFixed(0)} MAD`,           c:'#F59E0B', icon:<IconBarChart size={13} color="#F59E0B"/> },
          { l:'Types de soins',  v:types.length,                            c:'#8B5CF6', icon:<IconClipboard size={13} color="#8B5CF6"/> },
        ].map(item=>(
          <div key={item.l} style={{ background:cardBg, borderRadius:12, padding:'14px 18px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, borderTop:`3px solid ${item.c}` }}>
            <div style={{ fontSize:10, color:labelColor, textTransform:'uppercase', fontWeight:700, marginBottom:2 }}>
              {item.icon} {item.l}
            </div>
            <div style={{ fontWeight:800, fontSize:18, color:item.c, marginTop:4 }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Highlights bar */}
      <div style={{ background:cardBg, borderLeft:'4px solid #3B82F6', borderRadius:'0 10px 10px 0', padding:'12px 22px', marginBottom:20, display:'flex', gap:24, flexWrap:'wrap', boxShadow:cardShadow }}>
        <div>
          <div style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', fontWeight:700 }}>Soin le + fréquent</div>
          <div style={{ fontWeight:800, fontSize:14, color:titleColor, marginTop:2 }}>
            {top3soins[0]?.type_soin} — {top3soins[0]?.count.toLocaleString('fr-FR')} actes
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', fontWeight:700 }}>Soin le + coûteux</div>
          <div style={{ fontWeight:800, fontSize:14, color:'#EF4444', marginTop:2 }}>
            {mostExp?.type_soin} — {mostExp?.cout_moyen.toFixed(0)} MAD
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', fontWeight:700 }}>Médicament top</div>
          <div style={{ fontWeight:800, fontSize:14, color:'#22C55E', marginTop:2 }}>
            {topMedic?.medicament} — {topMedic?.count.toLocaleString('fr-FR')} prescriptions
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', fontWeight:700 }}>Établissement + coûteux</div>
          <div style={{ fontWeight:800, fontSize:14, color:'#8B5CF6', marginTop:2 }}>
            {topEtab?.etablissement?.replace('Hopital ','')} — {(topEtab?.cout_total/1e6).toFixed(2)}M MAD
          </div>
        </div>
      </div>

      {/* Types & coûts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontWeight:700, color:titleColor, fontSize:14 }}>Types de soins — Volume</div>
            <div style={{ fontSize:11, color:labelColor }}>{displayTypes.length} types affichés</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={displayTypes} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="type_soin" tick={{ fontSize:10, fill:tickColor }} width={120} axisLine={false} tickLine={false}/>
              <Tooltip {...tooltipStyle} formatter={(v:any)=>[v.toLocaleString('fr-FR'),'Actes']}/>
              <Bar dataKey="count" radius={[0,5,5,0]}>
                {displayTypes.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ fontWeight:700, marginBottom:12, color:titleColor, fontSize:14 }}>Coût moyen par type</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coutType.slice(0,parseInt(topN)||10)} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="type_soin" tick={{ fontSize:10, fill:tickColor }} width={120} axisLine={false} tickLine={false}/>
              <Tooltip {...tooltipStyle} formatter={(v:any)=>[`${v.toFixed(0)} MAD`,'Coût moyen']}/>
              <Bar dataKey="cout_moyen" fill="#F59E0B" radius={[0,5,5,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Résultats & coûts par étab */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Résultats pie + breakdown */}
        <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ fontWeight:700, marginBottom:4, color:titleColor, fontSize:14 }}>Résultats des soins</div>
          <div style={{ fontSize:11, color:labelColor, marginBottom:10 }}>Distribution des issues cliniques</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={resultatsWithPct} dataKey="count" nameKey="resultat" cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={3}>
                  {resultatsWithPct.map((r,i)=><Cell key={i} fill={r.fill}/>)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v:any)=>[v.toLocaleString('fr-FR'),'Actes']}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:8 }}>
              {resultatsWithPct.map(r=>(
                <div key={r.resultat} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.fill, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:titleColor, fontWeight:600, flex:1, display:'flex', alignItems:'center', gap:5 }}>
                    {RESULTAT_ICONS[r.resultat]||null} {r.resultat}
                  </span>
                  <span style={{ fontSize:11, fontWeight:800, color:r.fill }}>{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coûts par étab */}
        <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ fontWeight:700, marginBottom:4, color:titleColor, fontSize:14 }}>Coût total par établissement</div>
          <div style={{ fontSize:11, color:labelColor, marginBottom:10 }}>En millions MAD</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coutEtab} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1e6).toFixed(1)}M`}/>
              <YAxis type="category" dataKey="etablissement" tick={{ fontSize:9, fill:tickColor }} width={130} axisLine={false} tickLine={false}/>
              <Tooltip {...tooltipStyle} formatter={(v:any)=>[`${(v/1e6).toFixed(2)}M MAD`,'Coût total']}/>
              <Bar dataKey="cout_total" radius={[0,5,5,0]}>
                {coutEtab.map((_,i)=>(
                  <Cell key={i} fill={i===0?'#EF4444':i===1?'#F59E0B':'#8B5CF6'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 3 soins highlight */}
      <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', marginBottom:16, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
        <div style={{ fontWeight:700, fontSize:14, color:titleColor, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <IconTrophy size={16} color="#F59E0B"/> Top 3 soins les plus pratiqués
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {top3soins.map((s,i)=>{
            const cout = coutType.find(c=>c.type_soin===s.type_soin);
            const MedalComp = [Medal1, Medal2, Medal3][i];
            const colors = ['#F59E0B','#94A3B8','#CD7F32'];
            return (
              <div key={s.type_soin} style={{ background:innerBg, borderRadius:12, padding:'16px', textAlign:'center', border:`1px solid ${cardBorder}` }}>
                <div style={{ marginBottom:8 }}><MedalComp size={32}/></div>
                <div style={{ fontSize:13, fontWeight:700, color:titleColor, marginBottom:6 }}>{s.type_soin}</div>
                <div style={{ fontSize:20, fontWeight:800, color:colors[i] }}>{s.count.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:10, color:labelColor, marginBottom:8 }}>actes réalisés</div>
                {cout && <div style={{ fontSize:11, fontWeight:700, color:'#22C55E', background:'#F0FDF4', padding:'3px 10px', borderRadius:20 }}>
                  {cout.cout_moyen.toFixed(0)} MAD/acte
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Médicaments */}
      <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, marginBottom:4, color:titleColor, fontSize:14 }}>
          <IconActivity size={15} color="#22C55E"/> Top médicaments prescrits
        </div>
        <div style={{ fontSize:11, color:labelColor, marginBottom:14 }}>Classement par nombre de prescriptions</div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={medics} margin={{ top:4, right:20, left:0, bottom:35 }}>
            <XAxis dataKey="medicament" tick={{ fontSize:10, fill:tickColor }} axisLine={{ stroke:cardBorder }} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
            <YAxis tick={{ fontSize:11, fill:tickColor }} axisLine={false} tickLine={false}/>
            <Tooltip {...tooltipStyle} formatter={(v:any)=>[v.toLocaleString('fr-FR'),'Prescriptions']}/>
            <Bar dataKey="count" radius={[4,4,0,0]}>
              {medics.map((_,i)=><Cell key={i} fill={i===0?'#22C55E':i===1?'#3B82F6':i===2?'#F59E0B':'#8B5CF6'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)} pdfBase64={pdfBase64} filename={pdfFilename} pageTitle="Soins & Coûts — CHU Ibn Sina"/>
    </>
  );
};

export default SoinsCouts;
