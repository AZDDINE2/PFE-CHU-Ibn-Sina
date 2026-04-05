import React, { useEffect, useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { IconHospital, IconSwords, IconTarget, IconCheck, DotBlue, DotYellow, DotGray } from '../components/Icons';
import { fetchEtablissements, Etab } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

const COLORS = ['#3B82F6', '#F59E0B'];
const ALERTE_COLOR: Record<string,string> = { Normal:'#22C55E', Elevé:'#F59E0B', Critique:'#EF4444' };

const normalize = (val: number, min: number, max: number) =>
  max === min ? 50 : Math.round(((val - min) / (max - min)) * 100);

/* Fields for comparison */
const FIELDS: { key: keyof Etab; label: string; unit: string; higherBetter: boolean }[] = [
  { key:'capacite_lits',   label:'Capacité lits',   unit:'',    higherBetter:true },
  { key:'nb_medecins',     label:'Médecins',         unit:'',    higherBetter:true },
  { key:'nb_urgentistes',  label:'Urgentistes',      unit:'',    higherBetter:true },
  { key:'Nb_Patients',     label:'Patients total',   unit:'',    higherBetter:true },
  { key:'Taux_Hospit_Pct', label:'Taux hospit.',     unit:'%',   higherBetter:true },
  { key:'Taux_Fugue_Pct',  label:'Taux fugue',       unit:'%',   higherBetter:false },
  { key:'Duree_Moy_Min',   label:'Durée moy.',       unit:' min',higherBetter:false },
  { key:'Taux_P1_Pct',     label:'Cas critiques P1', unit:'%',   higherBetter:false },
];

const ComparaisonCard: React.FC<{
  etab: Etab; color: string; label: string;
  onClear: () => void; dark: boolean; score: number;
}> = ({ etab, color, label, onClear, dark, score }) => {
  const bg     = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#f1f5f9';
  const text   = dark ? '#e2e8f0' : '#0f172a';
  const muted  = dark ? '#94a3b8' : '#64748B';
  const inner  = dark ? '#0f172a' : '#F8FAFC';
  const scoreColor = score>=70?'#22C55E':score>=50?'#F59E0B':'#EF4444';

  return (
    <div style={{ background:bg, borderRadius:12, padding:'18px 20px', boxShadow:'0 4px 16px rgba(22,36,84,0.09)', borderTop:`3px solid ${color}`, border:`1px solid ${border}`, position:'relative' }}>
      <button onClick={onClear} title="Retirer" style={{ position:'absolute', top:10, right:12, background:'none', border:'none', cursor:'pointer', color:muted, fontSize:18, lineHeight:1, padding:0 }}>×</button>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:color }}/>
        <span style={{ fontSize:10, fontWeight:700, color:muted, textTransform:'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontWeight:800, fontSize:14, color:text, marginBottom:2 }}>{etab.nom}</div>
      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:12 }}>{etab.type_etab} · {etab.ville}</div>

      {/* Score */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ flex:1, height:7, background:inner, borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${score}%`, background:scoreColor, borderRadius:4, transition:'width 0.6s' }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:800, color:scoreColor, minWidth:40 }}>{score}/100</span>
      </div>

      {FIELDS.slice(0,6).map(f => (
        <div key={f.key as string} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${border}`, fontSize:12 }}>
          <span style={{ color:muted }}>{f.label}</span>
          <span style={{ fontWeight:700, color:text }}>
            {f.key==='Nb_Patients'
              ? (etab[f.key] as number|undefined)?.toLocaleString('fr-FR')
              : `${etab[f.key]}${f.unit}`}
          </span>
        </div>
      ))}

      <div style={{ marginTop:10, textAlign:'center', borderRadius:8, padding:'6px',
        background: ALERTE_COLOR[etab.Alerte_Charge]==='#22C55E'?'#F0FDF4':ALERTE_COLOR[etab.Alerte_Charge]==='#F59E0B'?'#FFFBEB':'#FEF2F2',
        color:ALERTE_COLOR[etab.Alerte_Charge]||'#22C55E', fontWeight:800, fontSize:13,
      }}>{etab.Alerte_Charge}</div>
    </div>
  );
};

const Comparaison: React.FC = () => {
  const { dark } = useTheme();
  const [etabs, setEtabs]   = useState<Etab[]>([]);
  const [loading, setLoading] = useState(true);
  const [selA, setSelA] = useState<Etab|null>(null);
  const [selB, setSelB] = useState<Etab|null>(null);

  /* theme */
  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const labelColor = textMuted;    // alias
  const sectionHead = textSecondary;
  const tooltipColor = tooltipText;
  const selectBg = dark ? '#0f172a' : '#fff';

  const tooltipStyle = {
    contentStyle: { background:tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, color:tooltipColor },
    itemStyle: { color:tooltipColor },
    labelStyle: { color:tooltipColor, fontWeight:700 },
  };

  useEffect(() => {
    fetchEtablissements().then(d => { setEtabs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Chargement..." />;

  const available = etabs.filter(e => e.nom !== selA?.nom && e.nom !== selB?.nom);

  /* Score helper (simple) */
  const score = (e: Etab) => {
    const norm = (val: number, key: keyof Etab) => {
      const vals = etabs.map(x => Number(x[key])||0);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      return mx===mn?50:(val-mn)/(mx-mn)*100;
    };
    return Math.round((norm(e.Taux_Hospit_Pct,'Taux_Hospit_Pct') + (100-norm(e.Taux_Fugue_Pct,'Taux_Fugue_Pct')) + (100-norm(e.Duree_Moy_Min,'Duree_Moy_Min')) + norm(e.Ratio_Medecins_Lits,'Ratio_Medecins_Lits'))/4);
  };

  /* Radar */
  const radarFields: { key: keyof Etab; label: string }[] = [
    { key:'capacite_lits',   label:'Lits' },
    { key:'nb_medecins',     label:'Médecins' },
    { key:'Nb_Patients',     label:'Patients' },
    { key:'Taux_Hospit_Pct', label:'Hospit %' },
    { key:'Taux_Fugue_Pct',  label:'Fugue %' },
    { key:'Duree_Moy_Min',   label:'Durée moy' },
  ];
  const radarData = radarFields.map(f => {
    const vals = etabs.map(e => Number(e[f.key])||0);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return {
      subject: f.label,
      A: selA ? normalize(Number(selA[f.key])||0, mn, mx) : 0,
      B: selB ? normalize(Number(selB[f.key])||0, mn, mx) : 0,
    };
  });

  /* Bar comparison */
  const barData = FIELDS.map(f => ({
    name: f.label,
    A: selA ? Number(selA[f.key])||0 : 0,
    B: selB ? Number(selB[f.key])||0 : 0,
    unit: f.unit,
  }));

  /* Winner analysis */
  const winnerData = selA && selB ? FIELDS.map(f => {
    const valA = Number(selA[f.key])||0;
    const valB = Number(selB[f.key])||0;
    const winnerIsA = f.higherBetter ? valA >= valB : valA <= valB;
    return { ...f, valA, valB, winner: valA===valB ? 'tie' : winnerIsA ? 'A' : 'B' };
  }) : [];

  const scoreA = selA ? score(selA) : 0;
  const scoreB = selB ? score(selB) : 0;
  const winsA  = winnerData.filter(w=>w.winner==='A').length;
  const winsB  = winnerData.filter(w=>w.winner==='B').length;

  return (
    <div id="page-comparaison">
      <PageHeader
        icon={<IconHospital size={22} color="white" />}
        title="Comparaison Établissements"
        subtitle="Analysez côte à côte deux établissements du CHU Ibn Sina"
        badge="Analyse comparative"
      />

      {/* Selectors */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        {[
          { sel:selA, setSel:setSelA, color:COLORS[0], label:'Établissement A' },
          { sel:selB, setSel:setSelB, color:COLORS[1], label:'Établissement B' },
        ].map(({ sel, setSel, color, label }) => (
          <div key={label}>
            <div style={{ fontSize:11, fontWeight:700, color:labelColor, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>
              <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:color, marginRight:6 }}/>
              {label}
            </div>
            {!sel ? (
              <select onChange={e => { const found=etabs.find(x=>x.nom===e.target.value); if(found) setSel(found); }} defaultValue=""
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${cardBorder}`, fontSize:13, background:selectBg, color:labelColor, outline:'none', cursor:'pointer' }}>
                <option value="" disabled>Choisir un établissement...</option>
                {available.map(e => <option key={e.nom} value={e.nom}>{e.nom}</option>)}
              </select>
            ) : (
              <ComparaisonCard etab={sel} color={color} label={label} onClear={()=>setSel(null)} dark={dark} score={score(sel)}/>
            )}
          </div>
        ))}
      </div>

      {selA && selB ? (
        <>
          {/* Score banner */}
          <div style={{ background:cardBg, borderRadius:12, padding:'16px 24px', marginBottom:16, boxShadow:cardShadow, border:`1px solid ${cardBorder}`, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontSize:12, color:labelColor, fontWeight:600, marginBottom:4 }}>{selA.nom.replace('Hopital ','')}</div>
              <div style={{ fontSize:28, fontWeight:800, color: scoreA>=scoreB?'#22C55E':'#EF4444' }}>{scoreA}/100</div>
              <div style={{ fontSize:11, color:labelColor }}>{winsA} indicateurs gagnés</div>
            </div>
            <div style={{ textAlign:'center', padding:'0 20px', borderLeft:`1px solid ${cardBorder}`, borderRight:`1px solid ${cardBorder}` }}>
              <div style={{ marginBottom:4 }}><IconSwords size={30} color={titleColor}/></div>
              <div style={{ fontSize:12, fontWeight:700, color:titleColor }}>
                {scoreA===scoreB ? 'Égalité' : scoreA>scoreB ? `${selA.nom.split(' ').pop()} remporte` : `${selB.nom.split(' ').pop()} remporte`}
              </div>
            </div>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontSize:12, color:labelColor, fontWeight:600, marginBottom:4 }}>{selB.nom.replace('Hopital ','')}</div>
              <div style={{ fontSize:28, fontWeight:800, color: scoreB>=scoreA?'#22C55E':'#EF4444' }}>{scoreB}/100</div>
              <div style={{ fontSize:11, color:labelColor }}>{winsB} indicateurs gagnés</div>
            </div>
          </div>

          {/* Metric-by-metric table */}
          <div style={{ background:cardBg, borderRadius:12, padding:'20px 24px', marginBottom:16, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
            <div style={{ fontWeight:700, fontSize:14, color:titleColor, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <IconTarget size={15} color="#3B82F6"/> Comparaison indicateur par indicateur
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {/* Header */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px 1fr', gap:8, padding:'6px 10px', fontSize:11, color:labelColor, fontWeight:700, textTransform:'uppercase' }}>
                <span style={{ color:COLORS[0] }}>A — {selA.nom.replace('Hopital ','').split(' ')[0]}</span>
                <span style={{ textAlign:'center' }}>Indicateur</span>
                <span style={{ textAlign:'center' }}>Gagnant</span>
                <span style={{ textAlign:'right', color:COLORS[1] }}>B — {selB.nom.replace('Hopital ','').split(' ')[0]}</span>
              </div>
              {winnerData.map(w => (
                <div key={w.key as string} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px 1fr', gap:8, padding:'8px 10px', borderRadius:8, background:innerBg, alignItems:'center' }}>
                  <span style={{ fontWeight:700, fontSize:13, color: w.winner==='A'?COLORS[0]:titleColor }}>
                    {w.key==='Nb_Patients' ? (w.valA as number).toLocaleString('fr-FR') : `${w.valA}${w.unit}`}
                    {w.winner==='A' && <span style={{ marginLeft:6, fontSize:10, background:`${COLORS[0]}20`, color:COLORS[0], padding:'1px 6px', borderRadius:4, fontWeight:700, display:'inline-flex', alignItems:'center' }}><IconCheck size={10} color={COLORS[0]}/></span>}
                  </span>
                  <span style={{ textAlign:'center', fontSize:11, color:labelColor, fontWeight:600 }}>{w.label}</span>
                  <span style={{ textAlign:'center', display:'flex', justifyContent:'center', alignItems:'center' }}>
                    {w.winner==='tie' ? <DotGray size={10}/> : w.winner==='A' ? <DotBlue size={10}/> : <DotYellow size={10}/>}
                  </span>
                  <span style={{ fontWeight:700, fontSize:13, color: w.winner==='B'?COLORS[1]:titleColor, textAlign:'right' }}>
                    {w.winner==='B' && <span style={{ marginRight:6, fontSize:10, background:`${COLORS[1]}20`, color:COLORS[1], padding:'1px 6px', borderRadius:4, fontWeight:700, display:'inline-flex', alignItems:'center' }}><IconCheck size={10} color={COLORS[1]}/></span>}
                    {w.key==='Nb_Patients' ? (w.valB as number).toLocaleString('fr-FR') : `${w.valB}${w.unit}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Radar + Bar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div style={{ background:cardBg, borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(22,36,84,0.08)', border:`1px solid ${cardBorder}` }}>
              <div style={{ fontWeight:700, fontSize:14, color:titleColor, marginBottom:4 }}>Analyse radar (0–100)</div>
              <div style={{ fontSize:12, color:labelColor, marginBottom:16 }}>100 = valeur max parmi tous les établissements</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={dark?'#334155':'#F1F5F9'}/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:tickColor }}/>
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fontSize:10, fill:tickColor }}/>
                  <Radar name={selA.nom.split(' ').slice(0,3).join(' ')} dataKey="A" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} strokeWidth={2}/>
                  <Radar name={selB.nom.split(' ').slice(0,3).join(' ')} dataKey="B" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.2} strokeWidth={2}/>
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:12, color:tickColor }}/>
                  <Tooltip {...tooltipStyle} formatter={(v:number) => [`${v}/100`, '']}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background:cardBg, borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(22,36,84,0.08)', border:`1px solid ${cardBorder}` }}>
              <div style={{ fontWeight:700, fontSize:14, color:titleColor, marginBottom:20 }}>Comparaison des valeurs brutes</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData.slice(0,5)} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid horizontal={false} stroke={dark?'#334155':'#F1F5F9'}/>
                  <XAxis type="number" tick={{ fontSize:11, fill:tickColor }}/>
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize:11, fill:tickColor }}/>
                  <Tooltip {...tooltipStyle}/>
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:12, color:tickColor }}/>
                  <Bar dataKey="A" name={selA.nom.replace('Hopital ','').split(' ')[0]} fill={COLORS[0]} radius={[0,4,4,0]}/>
                  <Bar dataKey="B" name={selB.nom.replace('Hopital ','').split(' ')[0]} fill={COLORS[1]} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background:cardBg, borderRadius:12, padding:'48px 24px', textAlign:'center', color:labelColor, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
          <div style={{ marginBottom:12 }}><IconSwords size={48} color={labelColor}/></div>
          <div style={{ fontSize:14, fontWeight:600, color:titleColor }}>Sélectionnez deux établissements pour démarrer la comparaison</div>
          <div style={{ fontSize:12, marginTop:6 }}>Radar, tableau des indicateurs et comparaison détaillée s'afficheront automatiquement</div>
        </div>
      )}

      {/* Quick list */}
      {(!selA || !selB) && (
        <div style={{ background:cardBg, borderRadius:12, padding:'16px', boxShadow:cardShadow, marginTop:16, border:`1px solid ${cardBorder}` }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:titleColor }}>Sélection rapide</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
            {etabs.map(e => {
              const isSelA = selA?.nom===e.nom;
              const isSelB = selB?.nom===e.nom;
              const alertColor = ALERTE_COLOR[e.Alerte_Charge]||'#22C55E';
              return (
                <div key={e.nom}
                  onClick={() => { if(isSelA||isSelB) return; if(!selA) setSelA(e); else if(!selB) setSelB(e); }}
                  style={{
                    padding:'10px 12px', borderRadius:10, cursor:isSelA||isSelB?'default':'pointer',
                    border:`1px solid ${isSelA?COLORS[0]:isSelB?COLORS[1]:cardBorder}`,
                    background: isSelA?(dark?'#1e3a5f':'#EFF6FF'):isSelB?(dark?'#3b2f0a':'#FFFBEB'):(dark?'#0f172a':'#FAFBFC'),
                    opacity:(selA&&selB&&!isSelA&&!isSelB)?0.4:1, transition:'all 0.15s',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:alertColor, flexShrink:0 }}/>
                    <div style={{ fontSize:12, fontWeight:600, color:titleColor }}>{e.nom.replace('Hopital ','')}</div>
                  </div>
                  <div style={{ fontSize:10, color:labelColor, marginTop:2 }}>{e.capacite_lits} lits · {e.nb_medecins} médecins</div>
                  <div style={{ fontSize:10, fontWeight:700, color:alertColor, marginTop:2 }}>{e.Alerte_Charge}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Comparaison;
