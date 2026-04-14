import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterBar from '../components/FilterBar';
import {
  IconHospital, IconBed, IconUsers, IconAlert,
  IconUserMd, IconAlertTriangle, IconCheckCircle, IconTarget, IconTrophy, IconLightbulb,
  Medal1, Medal2, Medal3, IconMail,
} from '../components/Icons';
import { fetchEtablissements, Etab } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { usePDF, PDFSection } from '../hooks/usePDF';
import ExportButton from '../components/ExportButton';
import BedsOccupancy from '../components/BedsOccupancy';
import EmailModal from '../components/EmailModal';

const ALERTE_COLOR: Record<string,string> = { Normal:'#22C55E', Elevé:'#F59E0B', Critique:'#EF4444' };
const ALERTE_BG:    Record<string,string> = { Normal:'#F0FDF4', Elevé:'#FFFBEB', Critique:'#FEF2F2' };

/* ── Score de performance 0–100 ── */
const perfScore = (e: Etab, all: Etab[]): number => {
  const norm = (val: number, key: keyof Etab) => {
    const vals = all.map(x => Number(x[key])||0);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return mx===mn ? 50 : (val - mn)/(mx - mn)*100;
  };
  // Higher hospit & lower fugue & higher medecins/lits ratio = better
  const hospit  = norm(e.Taux_Hospit_Pct, 'Taux_Hospit_Pct');
  const fugue   = 100 - norm(e.Taux_Fugue_Pct, 'Taux_Fugue_Pct');
  const duree   = 100 - norm(e.Duree_Moy_Min, 'Duree_Moy_Min');
  const ratio   = norm(e.Ratio_Medecins_Lits, 'Ratio_Medecins_Lits');
  return Math.round((hospit + fugue + duree + ratio) / 4);
};

const EtabCard: React.FC<{ e: Etab; all: Etab[]; dark: boolean; onClick: () => void }> = ({ e, all, dark, onClick }) => {
  const cardBg    = dark ? '#1e293b' : '#fff';
  const cardBorder= dark ? '#334155' : '#f1f5f9';
  const cardShadow= dark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(22,36,84,0.07)';
  const titleColor= dark ? '#e2e8f0' : '#0f172a';
  const labelColor= dark ? '#94a3b8' : '#64748B';
  const innerBg   = dark ? '#0f172a' : '#F8FAFC';
  const score     = perfScore(e, all);
  const scoreColor= score>=70?'#22C55E':score>=50?'#F59E0B':'#EF4444';
  const alertColor= ALERTE_COLOR[e.Alerte_Charge]||'#22C55E';

  return (
    <div onClick={onClick}
      style={{ background:cardBg, borderRadius:12, padding:'18px 20px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, transition:'all 0.2s', cursor:'pointer' }}
      onMouseEnter={el=>{ el.currentTarget.style.boxShadow='0 6px 20px rgba(22,36,84,0.13)'; el.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={el=>{ el.currentTarget.style.boxShadow='0 2px 10px rgba(22,36,84,0.07)'; el.currentTarget.style.transform='none'; }}
    >
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color:titleColor, lineHeight:1.3, marginBottom:3 }}>{e.nom}</div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>{e.type_etab} · {e.ville}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <span style={{ background:ALERTE_BG[e.Alerte_Charge]||'#F0FDF4', color:alertColor, borderRadius:20, padding:'2px 9px', fontSize:10, fontWeight:700, border:`1px solid ${alertColor}33`, whiteSpace:'nowrap' }}>
            {e.Alerte_Charge}
          </span>
          <span style={{ fontSize:11, fontWeight:800, color:scoreColor }}>Score: {score}/100</span>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height:5, background:dark?'#0f172a':'#F1F5F9', borderRadius:3, overflow:'hidden', marginBottom:12 }}>
        <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${scoreColor}88,${scoreColor})`, borderRadius:3, transition:'width 0.6s' }}/>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        {[
          { l:'Lits',     v:e.capacite_lits, icon:<IconBed size={10} color="#94A3B8"/> },
          { l:'Médecins', v:e.nb_medecins,   icon:<IconUserMd size={10} color="#94A3B8"/> },
          { l:'Patients', v:e.Nb_Patients?.toLocaleString('fr-FR'), icon:<IconUsers size={10} color="#94A3B8"/> },
          { l:'Hospit.',  v:`${e.Taux_Hospit_Pct}%`, icon:<IconHospital size={10} color="#94A3B8"/> },
        ].map(item=>(
          <div key={item.l} style={{ background:innerBg, borderRadius:8, padding:'7px 10px' }}>
            <div style={{ fontSize:9, color:'#94A3B8', textTransform:'uppercase', fontWeight:700, marginBottom:3 }}>
              {item.icon} {item.l}
            </div>
            <div style={{ fontWeight:800, fontSize:14, color:titleColor }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Mini metrics */}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, color:labelColor, fontWeight:700, marginBottom:2 }}>Fugue {e.Taux_Fugue_Pct}%</div>
          <div style={{ height:4, background:dark?'#0f172a':'#F1F5F9', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(e.Taux_Fugue_Pct*10,100)}%`, background: e.Taux_Fugue_Pct>5?'#EF4444':'#22C55E', borderRadius:2 }}/>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, color:labelColor, fontWeight:700, marginBottom:2 }}>Durée {e.Duree_Moy_Min}min</div>
          <div style={{ height:4, background:dark?'#0f172a':'#F1F5F9', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(e.Duree_Moy_Min/3,100)}%`, background: e.Duree_Moy_Min>240?'#EF4444':'#3B82F6', borderRadius:2 }}/>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Modal détail établissement ── */
const EtabModal: React.FC<{ e: Etab; all: Etab[]; dark: boolean; onClose: () => void }> = ({ e, all, dark, onClose }) => {
  const bg     = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#e2e8f0';
  const text   = dark ? '#e2e8f0' : '#0f172a';
  const muted  = dark ? '#94a3b8' : '#64748B';
  const inner  = dark ? '#0f172a' : '#F8FAFC';
  const alertColor = ALERTE_COLOR[e.Alerte_Charge] || '#22C55E';
  const score = perfScore(e, all);

  const radarData = [
    { metric:'Lits',    val: Math.round((e.capacite_lits/Math.max(...all.map(x=>x.capacite_lits)))*100) },
    { metric:'Médecins',val: Math.round((e.nb_medecins/Math.max(...all.map(x=>x.nb_medecins)))*100) },
    { metric:'Hospit.', val: Math.round(e.Taux_Hospit_Pct) },
    { metric:'Qualité', val: score },
    { metric:'Ratio M/L',val: Math.round((e.Ratio_Medecins_Lits/Math.max(...all.map(x=>x.Ratio_Medecins_Lits)))*100) },
  ];

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={ev=>ev.stopPropagation()} style={{ background:bg, borderRadius:20, width:'100%', maxWidth:580, boxShadow:'0 24px 60px rgba(0,0,0,0.3)', border:`1px solid ${border}`, overflow:'hidden', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${alertColor}cc,${alertColor})`, padding:'22px 28px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IconHospital size={24} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{e.nom}</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:12, marginTop:2 }}>{e.type_etab} · {e.ville}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#fff', fontSize:28, fontWeight:800 }}>{score}</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11 }}>Score /100</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'#fff', fontSize:18, marginLeft:8 }}>×</button>
        </div>

        <div style={{ padding:'22px 28px' }}>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
            {[
              { l:'Capacité lits',  v:e.capacite_lits },
              { l:'Médecins',       v:e.nb_medecins },
              { l:'Urgentistes',    v:e.nb_urgentistes },
              { l:'Total patients', v:e.Nb_Patients?.toLocaleString('fr-FR') },
              { l:'Hospit.',        v:`${e.Taux_Hospit_Pct}%` },
              { l:'Durée moy.',     v:`${e.Duree_Moy_Min} min`, alert: e.Duree_Moy_Min>240 },
              { l:'Taux fugue',     v:`${e.Taux_Fugue_Pct}%`, alert: e.Taux_Fugue_Pct>5 },
              { l:'Taux P1',        v:`${e.Taux_P1_Pct}%` },
              { l:'Catégorie',      v:e.Categorie_Taille },
            ].map(item => (
              <div key={item.l} style={{ background:inner, borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:9, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>{item.l}</div>
                <div style={{ fontWeight:800, fontSize:14, color:(item as any).alert?'#EF4444':text }}>{item.v||'—'}</div>
              </div>
            ))}
          </div>

          {/* Ressources humaines row */}
          {(e.nb_infirmiers || e.nb_ambulances) && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {e.nb_infirmiers && (
                <div style={{ background:inner, borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Infirmiers</div>
                  <div style={{ fontWeight:800, fontSize:14, color:text }}>{e.nb_infirmiers}</div>
                </div>
              )}
              {e.nb_ambulances && (
                <div style={{ background:inner, borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Ambulances</div>
                  <div style={{ fontWeight:800, fontSize:14, color:text }}>{e.nb_ambulances}</div>
                </div>
              )}
              {e.annee_fondation && (
                <div style={{ background:inner, borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Fondé en</div>
                  <div style={{ fontWeight:800, fontSize:14, color:text }}>{e.annee_fondation}</div>
                </div>
              )}
              {e.superficie_m2 && (
                <div style={{ background:inner, borderRadius:10, padding:'10px 12px', gridColumn:'span 3' }}>
                  <div style={{ fontSize:9, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Superficie</div>
                  <div style={{ fontWeight:800, fontSize:14, color:text }}>{e.superficie_m2.toLocaleString('fr-FR')} m²</div>
                </div>
              )}
            </div>
          )}

          {/* Contact & infos */}
          {(e.adresse || e.telephone || e.email || e.directeur) && (
            <div style={{ background:inner, borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:12, color:text, marginBottom:10 }}>Contact & Informations</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {e.directeur && (
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ fontSize:10, color:muted, minWidth:80, fontWeight:600 }}>Direction</span>
                    <span style={{ fontSize:12, color:text, fontWeight:600 }}>{e.directeur}</span>
                  </div>
                )}
                {e.adresse && (
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ fontSize:10, color:muted, minWidth:80, fontWeight:600 }}>Adresse</span>
                    <span style={{ fontSize:12, color:text }}>{e.adresse}</span>
                  </div>
                )}
                {e.telephone && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:muted, minWidth:80, fontWeight:600 }}>Téléphone</span>
                    <span style={{ fontSize:12, color:'#3B82F6', fontWeight:600 }}>{e.telephone}</span>
                  </div>
                )}
                {e.email && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:muted, minWidth:80, fontWeight:600 }}>Email</span>
                    <span style={{ fontSize:12, color:'#3B82F6' }}>{e.email}</span>
                  </div>
                )}
                {e.accreditation && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:muted, minWidth:80, fontWeight:600 }}>Accréditation</span>
                    <span style={{ fontSize:11, background:'#F0FDF4', color:'#166534', borderRadius:20, padding:'2px 10px', fontWeight:700, border:'1px solid #BBF7D0' }}>{e.accreditation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Services */}
          {e.services && (
            <div style={{ background:inner, borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:12, color:text, marginBottom:10 }}>Services & Spécialités</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {e.services.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                  <span key={s} style={{ fontSize:11, background: dark?'#1e3a5f':'#EFF6FF', color: dark?'#93C5FD':'#1D4ED8', borderRadius:20, padding:'3px 10px', fontWeight:600, border: dark?'1px solid #1e3a5f':'1px solid #BFDBFE' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Radar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13, color:text, marginBottom:8 }}>Profil de performance</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={dark?'#334155':'#f1f5f9'}/>
                <PolarAngleAxis dataKey="metric" tick={{ fontSize:11, fill:muted }}/>
                <Radar dataKey="val" stroke={alertColor} fill={alertColor} fillOpacity={0.2} strokeWidth={2}/>
                <Tooltip contentStyle={{ background:bg, border:`1px solid ${border}`, borderRadius:8, color:text }}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <button onClick={onClose} style={{ width:'100%', background:`linear-gradient(135deg,${alertColor}cc,${alertColor})`, color:'#fff', border:'none', borderRadius:10, padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const Etablissements: React.FC = () => {
  const { dark } = useTheme();
  const { exportReport, exporting, pdfBase64, pdfFilename, pdfError } = usePDF('Etablissements_CHU.pdf');
  const [emailOpen, setEmailOpen] = useState(false);
  const [etabs,   setEtabs]   = useState<Etab[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreVille, setFiltreVille] = useState('Tous');
  const [filtreType,  setFiltreType]  = useState('Tous');
  const [selectedEtab, setSelectedEtab] = useState<Etab|null>(null);
  const [chartTab, setChartTab] = useState<'lits'|'personnel'|'perf'>('lits');

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

  useEffect(() => {
    fetchEtablissements().then(d=>{setEtabs(d);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  const villes  = useMemo(()=>[...new Set(etabs.map(e=>e.ville))],[etabs]);
  const types   = useMemo(()=>[...new Set(etabs.map(e=>e.type_etab))],[etabs]);
  const filtered = useMemo(()=>etabs
    .filter(e=>filtreVille==='Tous'||e.ville===filtreVille)
    .filter(e=>filtreType==='Tous'||e.type_etab===filtreType),
    [etabs,filtreVille,filtreType]);

  /* Rankings by score */
  const ranked = useMemo(() =>
    [...etabs].sort((a,b) => perfScore(b,etabs)-perfScore(a,etabs)),
    [etabs]);

  if (loading) return <LoadingSpinner text="Chargement des établissements..."/>;

  const totalLits = etabs.reduce((s,e)=>s+e.capacite_lits,0);
  const totalMed  = etabs.reduce((s,e)=>s+e.nb_medecins,0);
  const totalUrg  = etabs.reduce((s,e)=>s+e.nb_urgentistes,0);
  const nbAlertes = etabs.filter(e=>e.Alerte_Charge!=='Normal').length;

  /* Chart data */
  const chartData = filtered.map(e => ({
    nom: e.nom.replace('Hopital ','').replace('Centre Hospitalier ','CH '),
    lits: e.capacite_lits, medecins: e.nb_medecins, urgentistes: e.nb_urgentistes,
    hospit: e.Taux_Hospit_Pct, fugue: e.Taux_Fugue_Pct,
    score: perfScore(e, etabs),
    color: ALERTE_COLOR[e.Alerte_Charge]||'#22C55E',
  }));

  const handleExportPDF = () => {
    const sections: PDFSection[] = [
      { type: 'title', text: 'Rapport Établissements — CHU Ibn Sina' },
      { type: 'kpis', items: [
        { label: 'Total établissements', value: etabs.length,              color: 'blue' },
        { label: 'Total lits',           value: totalLits,                 color: 'green' },
        { label: 'Total médecins',       value: totalMed,                  color: 'blue' },
        { label: 'Total urgentistes',    value: totalUrg,                  color: 'orange' },
        { label: 'Nb alertes actives',   value: nbAlertes,                 color: nbAlertes > 0 ? 'red' : 'green' },
      ]},
      { type: 'spacer' },
      { type: 'subtitle', text: 'Fiche de chaque établissement' },
      ...filtered.flatMap((e): PDFSection[] => [
        {
          type: 'table',
          title: e.nom,
          columns: ['Indicateur', 'Valeur'],
          rows: [
            ['Nom',               e.nom],
            ['Type',              e.type_etab],
            ['Ville',             e.ville],
            ['Lits',              e.capacite_lits],
            ['Médecins',          e.nb_medecins],
            ['Urgentistes',       e.nb_urgentistes],
            ['Patients',          e.Nb_Patients ?? '—'],
            ['Hospitalisation %', `${e.Taux_Hospit_Pct}%`],
            ['Fugue %',           `${e.Taux_Fugue_Pct}%`],
            ['Durée moy (min)',   e.Duree_Moy_Min],
            ['Alerte charge',     e.Alerte_Charge],
          ],
        },
      ]),
      { type: 'spacer' },
      { type: 'subtitle', text: 'Classement par score de performance' },
      {
        type: 'table',
        title: 'Classement des établissements',
        columns: ['Rang', 'Établissement', 'Score/100', 'Alerte', 'Lits', 'Médecins'],
        rows: ranked.map((e, i) => [
          i + 1,
          e.nom,
          perfScore(e, etabs),
          e.Alerte_Charge,
          e.capacite_lits,
          e.nb_medecins,
        ]),
      },
    ];
    exportReport('Etablissements_CHU.pdf', 'Rapport Établissements — CHU Ibn Sina', sections);
  };

  return (
    <>
    <div id="page-etablissements">
      {selectedEtab && <EtabModal e={selectedEtab} all={etabs} dark={dark} onClose={()=>setSelectedEtab(null)}/>}

      <PageHeader
        icon={<IconHospital size={22} color="white"/>}
        title="Établissements"
        subtitle={`Comparaison des ${etabs.length} établissements du CHU Ibn Sina`}
        badge={`${etabs.length} établissements`}
        actions={<div style={{display:'flex',gap:8}}><ExportButton label={exporting?'Export...':'Exporter'} csvUrl="/api/export/urgences" onExportPDF={handleExportPDF} onDark/><button onClick={()=>setEmailOpen(true)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.28)',cursor:'pointer',background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><IconMail size={13} color="white"/> Email</button></div>}
      />

      <FilterBar
        etablissements={villes}
        selectedEtab={filtreVille}
        onEtab={setFiltreVille}
        triage={types}
        selectedTriage={filtreType}
        onTriage={setFiltreType}
        onReset={()=>{setFiltreVille('Tous');setFiltreType('Tous');}}
      />

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Établissements', v:etabs.length, c:'#3B82F6', icon:<IconHospital size={13} color="#3B82F6"/> },
          { l:'Capacité totale', v:`${totalLits} lits`, c:'#22C55E', icon:<IconBed size={13} color="#22C55E"/> },
          { l:'Personnel médical', v:`${totalMed+totalUrg}`, c:'#8B5CF6', icon:<IconUserMd size={13} color="#8B5CF6"/> },
          { l:'Alertes actives', v:nbAlertes, c:nbAlertes>0?'#EF4444':'#22C55E', icon:nbAlertes>0?<IconAlertTriangle size={13} color="#EF4444"/>:<IconCheckCircle size={13} color="#22C55E"/> },
        ].map(item=>(
          <div key={item.l} style={{ background:cardBg, borderRadius:12, padding:'14px 18px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, borderTop:`3px solid ${item.c}` }}>
            <div style={{ fontSize:10, color:labelColor, textTransform:'uppercase', fontWeight:700, marginBottom:2 }}>
              {item.icon} {item.l}
            </div>
            <div style={{ fontWeight:800, fontSize:20, color:item.c, marginTop:4 }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14, marginBottom:24 }}>
        {filtered.map(e=><EtabCard key={e.nom} e={e} all={etabs} dark={dark} onClick={()=>setSelectedEtab(e)}/>)}
      </div>

      {/* Charts */}
      <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', marginBottom:16, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, color:titleColor, fontSize:14 }}>Comparaison des indicateurs</div>
            <div style={{ fontSize:11, color:labelColor, marginTop:2 }}>
              {chartTab==='lits' ? 'Capacité totale en lits par établissement' : chartTab==='personnel' ? 'Effectif médecins et urgentistes' : 'Score de performance sur 100 (hospitalisation, durée, fugue)'}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {([
              ['lits',      'Capacité lits'],
              ['personnel', 'Personnel'],
              ['perf',      'Performance'],
            ] as const).map(([tab,label])=>(
              <button key={tab} onClick={()=>setChartTab(tab)} style={{
                padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
                background: chartTab===tab?'#3B82F6':innerBg, color: chartTab===tab?'#fff':labelColor,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
            <XAxis type="number" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="nom" tick={{ fontSize:9, fill:tickColor }} width={140} axisLine={false} tickLine={false}/>
            {chartTab==='lits' && <Tooltip {...tooltipStyle} formatter={(v:any)=>[v,'Lits']}/>}
            {chartTab==='personnel' && <Tooltip {...tooltipStyle}/>}
            {chartTab==='perf' && <Tooltip {...tooltipStyle} formatter={(v:any)=>[`${v}/100`,'Score']}/>}
            {chartTab==='lits' && <Bar dataKey="lits" fill="#3B82F6" radius={[0,5,5,0]} name="Lits"/>}
            {chartTab==='personnel' && <>
              <Bar dataKey="medecins"    fill="#3B82F6" radius={[0,5,5,0]} name="Médecins"/>
              <Bar dataKey="urgentistes" fill="#22C55E" radius={[0,5,5,0]} name="Urgentistes"/>
            </>}
            {chartTab==='perf' && <Bar dataKey="score" radius={[0,5,5,0]} name="Score">
              {chartData.map((d,i)=>(
                <rect key={i} fill={d.score>=70?'#22C55E':d.score>=50?'#F59E0B':'#EF4444'}/>
              ))}
            </Bar>}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking table */}
      <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
        <div style={{ fontWeight:700, fontSize:14, color:titleColor, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <IconTrophy size={16} color="#F59E0B"/> Classement des établissements — Score de performance
        </div>
        <div style={{ fontSize:11, color:labelColor, marginBottom:14 }}>
          Score calculé sur : hospitalisation, taux de fugue (inversé), durée de séjour (inversée), ratio médecins/lits
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ranked.map((e, i) => {
            const score = perfScore(e, etabs);
            const scoreColor = score>=70?'#22C55E':score>=50?'#F59E0B':'#EF4444';
            return (
              <div key={e.nom} onClick={()=>setSelectedEtab(e)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10,
                background:innerBg, cursor:'pointer',
                border: `1px solid ${i===0?'#F59E0B33':cardBorder}`,
              }}>
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800,
                  background: i===0?'#FEF3C7':i===1?'#F1F5F9':i===2?'#FEF3C7':innerBg,
                  color: i===0?'#F59E0B':i===1?'#94A3B8':i===2?'#CD7F32':'#64748B',
                }}>
                  {i===0?<Medal1 size={24}/>:i===1?<Medal2 size={24}/>:i===2?<Medal3 size={24}/>:<span style={{ fontWeight:800 }}>{i+1}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:titleColor, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.nom}</div>
                  <div style={{ fontSize:10, color:labelColor }}>{e.type_etab} · {e.capacite_lits} lits</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <div style={{ width:80 }}>
                    <div style={{ height:5, background:dark?'#1e293b':'#E2E8F0', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${score}%`, background:scoreColor, borderRadius:3 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:scoreColor, minWidth:40, textAlign:'right' }}>{score}/100</span>
                  <span style={{ fontSize:10, fontWeight:700, background:`${ALERTE_COLOR[e.Alerte_Charge]}20`, color:ALERTE_COLOR[e.Alerte_Charge], padding:'2px 8px', borderRadius:6, whiteSpace:'nowrap' }}>
                    {e.Alerte_Charge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:10, fontSize:11, color:labelColor, textAlign:'center' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><IconLightbulb size={13} color={labelColor}/> Cliquez sur un établissement pour voir son profil détaillé</span>
        </div>
      </div>

      {/* ── Occupation des lits ── */}
      {etabs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <BedsOccupancy etablissements={etabs} />
        </div>
      )}
    </div>

    {pdfError && (
      <div style={{ margin: '0 0 16px', padding: '10px 16px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 13 }}>
        Erreur PDF : {pdfError}
      </div>
    )}
    <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)} pdfBase64={pdfBase64} filename={pdfFilename} pageTitle="Établissements — CHU Ibn Sina"/>
    </>
  );
};

export default Etablissements;
