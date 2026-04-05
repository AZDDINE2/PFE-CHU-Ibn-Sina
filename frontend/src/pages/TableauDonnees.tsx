import React, { useEffect, useState, useMemo, useCallback } from 'react';
import WordCloud from '../components/WordCloud';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ExportButton from '../components/ExportButton';
import EmailModal from '../components/EmailModal';
import {
  IconUsers, IconClipboard, IconClock, IconAlertCircle, IconHospital, IconFilter, IconLightbulb, IconMail,
} from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { usePDF, PDFSection } from '../hooks/usePDF';
import axios from 'axios';

interface UrgRow {
  id_passage: number;
  Nom_Complet: string;
  Age: number;
  Sexe: string;
  CIN: string;
  Groupe_Sanguin: string;
  Antecedents: string;
  Niveau_Triage: string;
  Date_Arrivee: string;
  Etablissement: string;
  Orientation: string;
  Duree_Sejour_min: number;
  Saison: string;
  Annee: number;
  Mutuelle: string;
  Prix_Sejour: number;
  Prix_Soins: number;
}

interface HistoriqueItem {
  id_passage: string;
  date: string;
  niveau_triage: string;
  motif: string;
  orientation: string;
  duree_min: number;
  etablissement: string;
  mutuelle: string;
  prix_sejour: number;
  prix_soins: number;
}

interface PatientRow {
  nom_complet: string;
  age: number;
  sexe: string;
  cin: string;
  groupe_sanguin: string;
  antecedents: string;
  mutuelle: string;
  total_sejour: number;
  total_soins: number;
  nb_visites: number;
  derniere_visite: string;
  triage_max: string;
  historique: HistoriqueItem[];
}

const PAGE_SIZE = 50;

const TRIAGE_COLOR: Record<string, string> = {
  'P1 - Urgence absolue': '#EF4444',
  'P2 - Urgence relative': '#F59E0B',
  'P3 - Urgence différée': '#3B82F6',
  'P4 - Non urgent':       '#22C55E',
};
const ORIENT_COLOR: Record<string, string> = {
  'Hospitalise': '#3B82F6', 'Ambulatoire': '#22C55E',
  'Fugue': '#EF4444', 'Décédé': '#64748B', 'Domicile': '#8B5CF6', 'Transfere': '#F97316',
};

const Badge: React.FC<{ text: string; colorMap: Record<string, string> }> = ({ text, colorMap }) => {
  const color = colorMap[text] || '#94A3B8';
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}40`, whiteSpace:'nowrap' }}>
      {text}
    </span>
  );
};

/* ── Modal détail patient ── */
const PatientModal: React.FC<{ row: UrgRow; dark: boolean; onClose: () => void }> = ({ row, dark, onClose }) => {
  const bg    = dark ? '#1e293b' : '#fff';
  const border= dark ? '#334155' : '#e2e8f0';
  const text  = dark ? '#e2e8f0' : '#0f172a';
  const muted = dark ? '#94a3b8' : '#64748B';
  const inner = dark ? '#0f172a' : '#F8FAFC';

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:bg, borderRadius:20, width:'100%', maxWidth:560, boxShadow:'0 24px 60px rgba(0,0,0,0.3)', border:`1px solid ${border}`, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1a3bdb,#3b82f6)', padding:'24px 28px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#fff', flexShrink:0 }}>
            {row.Nom_Complet?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:18 }}>{row.Nom_Complet || 'Patient inconnu'}</div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:13, marginTop:2 }}>
              {row.Age} ans · {row.Sexe} · {row.CIN || '—'}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:muted, textTransform:'uppercase', letterSpacing:0.5 }}>Niveau triage</span>
            <Badge text={row.Niveau_Triage} colorMap={TRIAGE_COLOR} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { l:'Date arrivée',   v:row.Date_Arrivee?.slice(0,10) },
              { l:'Établissement',  v:row.Etablissement },
              { l:'Orientation',    v:row.Orientation },
              { l:'Durée séjour',   v:`${row.Duree_Sejour_min} min`, alert:row.Duree_Sejour_min>300 },
              { l:'Saison',         v:row.Saison },
              { l:'Année',          v:row.Annee },
              { l:'Groupe sanguin', v:row.Groupe_Sanguin || '—' },
              { l:'CIN',            v:row.CIN || '—' },
              { l:'Mutuelle',       v:row.Mutuelle || '—' },
              { l:'Prix séjour',    v:row.Prix_Sejour != null ? `${row.Prix_Sejour.toLocaleString('fr-FR')} MAD` : '—' },
              { l:'Prix soins',     v:row.Prix_Soins  != null ? `${row.Prix_Soins.toLocaleString('fr-FR')} MAD`  : '—' },
            ].map(item => (
              <div key={item.l} style={{ background:inner, borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>{item.l}</div>
                <div style={{ fontWeight:700, fontSize:13, color:(item as any).alert?'#EF4444':text }}>{item.v||'—'}</div>
              </div>
            ))}
          </div>
          {row.Antecedents && (
            <div style={{ background:inner, borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:muted, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Antécédents médicaux</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.6 }}>{row.Antecedents}</div>
            </div>
          )}
          <button onClick={onClose} style={{ background:'linear-gradient(135deg,#1a3bdb,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

type SortDir = 'asc' | 'desc' | null;
type SortKey = keyof UrgRow | null;

const TableauDonnees: React.FC = () => {
  const { dark } = useTheme();
  const { exportReport, exporting, pdfBase64, pdfFilename } = usePDF();
  const [emailOpen, setEmailOpen] = useState(false);
  const [rows,    setRows]    = useState<UrgRow[]>([]);
  const [patientRows, setPatientRows] = useState<PatientRow[]>([]);
  const [vuePatient, setVuePatient] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('Date_Arrivee');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterTriage, setFilterTriage] = useState('');
  const [filterOrient, setFilterOrient] = useState('');
  const [filterAnnee,  setFilterAnnee]  = useState('');
  const [filterSexe,   setFilterSexe]   = useState('');
  const [filterCIN, setFilterCIN] = useState('');
  const [selectedRow,  setSelectedRow]  = useState<UrgRow|null>(null);

  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const labelColor = textMuted;    // alias
  const sectionHead = textSecondary;
  const tooltipColor = tooltipText;
  const borderCol = border;
  const textCol   = textPrimary;
  const mutedCol  = textMuted;

  useEffect(() => {
    axios.get('/api/urgences/liste')
      .then(r => { setRows(r.data); setLoading(false); })
      .catch(() => { setLoading(false); setError(true); });
    axios.get('/api/patients/liste')
      .then(r => setPatientRows(r.data))
      .catch(() => {});
  }, []);

  const triages = useMemo(() => [...new Set(rows.map(r => r.Niveau_Triage))].filter(Boolean).sort(), [rows]);
  const orients = useMemo(() => [...new Set(rows.map(r => r.Orientation))].filter(Boolean).sort(), [rows]);
  const annees  = useMemo(() => [...new Set(rows.map(r => r.Annee))].filter(Boolean).sort(), [rows]);
  const sexes   = useMemo(() => [...new Set(rows.map(r => r.Sexe))].filter(Boolean).sort(), [rows]);
  const cins = useMemo(() => [...new Set(rows.map(r => r.CIN))].filter(Boolean).sort(), [rows]);

  const filtered = useMemo(() => {
    let d = rows;
    if (search)       d = d.filter(r =>
      (r.Nom_Complet||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.Etablissement||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.Niveau_Triage||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.Orientation||'').toLowerCase().includes(search.toLowerCase()) ||
      String(r.id_passage).includes(search)
    );
    if (filterTriage) d = d.filter(r => r.Niveau_Triage === filterTriage);
    if (filterOrient) d = d.filter(r => r.Orientation === filterOrient);
    if (filterAnnee)  d = d.filter(r => String(r.Annee) === filterAnnee);
    if (filterSexe)   d = d.filter(r => r.Sexe === filterSexe);
    if (filterCIN) d = d.filter(r => r.CIN === filterCIN);
    if (sortKey) {
      d = [...d].sort((a,b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (va==null) return 1; if (vb==null) return -1;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return d;
  }, [rows, search, filterTriage, filterOrient, filterAnnee, filterSexe, filterCIN, sortKey, sortDir]);

  /* Stats from filtered data */
  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const avgAge = Math.round(filtered.reduce((s,r)=>s+(r.Age||0),0)/filtered.length);
    const avgDur = Math.round(filtered.reduce((s,r)=>s+(r.Duree_Sejour_min||0),0)/filtered.length);
    const p1count = filtered.filter(r=>r.Niveau_Triage?.startsWith('P1')).length;
    const hospit  = filtered.filter(r=>r.Orientation==='Hospitalise').length;
    return { avgAge, avgDur, p1count, hospit, total:filtered.length };
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  /* Nuage de mots des antécédents */
  const antecedentsWords = useMemo(() => {
    const freq: Record<string, number> = {};
    filtered.forEach(r => {
      if (!r.Antecedents || r.Antecedents === 'Aucun') return;
      r.Antecedents.split(/[,;\/\n]+/).forEach(a => {
        const w = a.trim();
        if (w && w.length > 2) freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq).map(([text, count]) => ({ text, count }));
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey===key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const reset = () => {
    setSearch(''); setFilterTriage(''); setFilterOrient(''); setFilterAnnee('');
    setFilterSexe(''); setFilterCIN(''); setPage(1);
  };

  const pageNums = useMemo(() => {
    const delta = 3;
    const start = Math.max(1, Math.min(page-delta, totalPages-delta*2));
    const end   = Math.min(totalPages, Math.max(page+delta, delta*2+1));
    const nums: number[] = [];
    for (let p = start; p <= end; p++) nums.push(p);
    return nums;
  }, [page, totalPages]);

  const SortIcon: React.FC<{ k: SortKey }> = ({ k }) => (
    <span style={{ color:sortKey===k?'#3B82F6':'#CBD5E1', marginLeft:4, fontSize:10 }}>
      {sortKey===k ? (sortDir==='asc'?'▲':'▼') : '⇅'}
    </span>
  );

  const COLUMNS: [SortKey, string][] = [
    ['id_passage',      'ID'],
    ['Nom_Complet',     'Patient'],
    ['Age',             'Âge'],
    ['Sexe',            'Sexe'],
    ['Niveau_Triage',   'Triage'],
    ['Date_Arrivee',    'Date'],
    ['Etablissement',   'Établissement'],
    ['CIN',             'CIN'],
    ['Orientation',     'Orientation'],
    ['Duree_Sejour_min','Durée (min)'],
    ['Annee',           'Année'],
    ['Mutuelle',        'Mutuelle'],
    ['Prix_Sejour',     'Prix séjour (MAD)'],
    ['Prix_Soins',      'Prix soins (MAD)'],
  ];

  if (loading) return <LoadingSpinner text="Chargement des données..." />;

  if (error) return (
    <div style={{ padding:32, background:'#FEF2F2', borderRadius:12, color:'#EF4444', border:'1px solid #FECACA', fontSize:15, display:'flex', alignItems:'center', gap:10 }}>
      <IconAlertCircle size={20} color="#EF4444"/> Impossible de contacter le backend. Vérifiez que le serveur tourne sur le port 8000.
    </div>
  );

  const selectStyle: React.CSSProperties = {
    padding:'8px 12px', borderRadius:8, border:`1.5px solid ${borderCol}`, fontSize:13,
    background:dark?'#0f172a':'#fff', color:dark?'#e2e8f0':'#475569', outline:'none', cursor:'pointer',
  };
  const hasFilters = !!(search || filterTriage || filterOrient || filterAnnee || filterSexe || filterCIN);

  const handleExportPDF = async () => {
    const filtresLabel = [
      search          && `Recherche: "${search}"`,
      filterTriage    && `Triage: ${filterTriage}`,
      filterOrient    && `Orientation: ${filterOrient}`,
      filterSexe      && `Sexe: ${filterSexe}`,
      filterCIN    && `CIN: ${filterCIN}`,
      filterAnnee     && `Année: ${filterAnnee}`,
    ].filter(Boolean).join(' · ') || 'Aucun filtre (toutes les données)';

    const sections: PDFSection[] = [
      { type: 'title', text: 'Synthèse des données filtrées' },
      { type: 'spacer' },
      { type: 'info', label: 'Filtres appliqués', value: filtresLabel },
      { type: 'info', label: 'Résultats',          value: `${filtered.length.toLocaleString('fr-FR')} passages sur ${rows.length.toLocaleString('fr-FR')} total` },
      { type: 'spacer' },
    ];

    if (stats) {
      sections.push({
        type: 'kpis', items: [
          { label: 'Résultats filtrés', value: stats.total.toLocaleString('fr-FR'), color: 'blue' },
          { label: 'Âge moyen',         value: `${stats.avgAge} ans`,               color: 'green' },
          { label: 'Durée moy. séjour', value: `${stats.avgDur} min`,               color: 'orange' },
          { label: 'Cas critiques P1',  value: stats.p1count.toLocaleString('fr-FR'),color: 'red' },
          { label: 'Hospitalisés',      value: stats.hospit.toLocaleString('fr-FR'), color: 'blue' },
        ],
      });
      sections.push({ type: 'spacer' });
    }

    // Distribution triage
    const triageMap: Record<string, number> = {};
    filtered.forEach(r => { triageMap[r.Niveau_Triage] = (triageMap[r.Niveau_Triage] || 0) + 1; });
    sections.push({
      type: 'table',
      title: 'Distribution par niveau de triage',
      columns: ['Niveau Triage', 'Nombre', '% du total filtré'],
      rows: Object.entries(triageMap).sort().map(([t, n]) => [
        t, n, `${((n / filtered.length) * 100).toFixed(1)} %`,
      ]),
    });

    // Tableau des données (max 200 lignes pour le PDF)
    const limit = Math.min(filtered.length, 200);
    sections.push({
      type: 'table',
      title: `Liste des passages (${limit} premiers résultats sur ${filtered.length})`,
      columns: ['ID', 'Patient', 'Âge', 'Sexe', 'Triage', 'Date', 'Établissement', 'Orientation', 'Durée (min)'],
      rows: filtered.slice(0, limit).map(r => [
        `#${r.id_passage}`,
        r.Nom_Complet || '—',
        r.Age ?? '—',
        r.Sexe || '—',
        r.Niveau_Triage || '—',
        r.Date_Arrivee ? r.Date_Arrivee.split('T')[0] : '—',
        r.Etablissement || '—',
        r.Orientation || '—',
        r.Duree_Sejour_min ?? '—',
      ]),
    });

    await exportReport(
      `tableau_donnees_${new Date().toISOString().split('T')[0]}.pdf`,
      'Tableau des Données — Urgences',
      sections,
      { filtres: filtresLabel },
    );
  };

  return (
    <>
    <div>
      {selectedRow && <PatientModal row={selectedRow} dark={dark} onClose={() => setSelectedRow(null)}/>}

      <PageHeader
        icon={<IconUsers size={22} color="white"/>}
        title="Tableau des Données"
        subtitle={`${filtered.length.toLocaleString('fr-FR')} passages filtrés sur ${rows.length.toLocaleString('fr-FR')} total`}
        badge="Données brutes"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <ExportButton label="CSV" csvUrl="/api/export/urgences"/>
            <button onClick={handleExportPDF} disabled={exporting} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:8, border:'none',
              background: exporting ? '#94a3b8' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
              color:'#fff', fontWeight:700, fontSize:13, cursor: exporting ? 'not-allowed' : 'pointer',
              boxShadow:'0 2px 8px rgba(59,130,246,0.3)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {exporting ? 'Génération...' : 'Rapport PDF'}
            </button>
            <button onClick={()=>setEmailOpen(true)} style={{padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#1a3bdb,#3b82f6)',color:'#fff',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><IconMail size={13} color="white"/> Email</button>
          </div>
        }
      />

      {/* Stat mini-cards */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:14 }}>
          {[
            { l:'Résultats filtrés',  v:stats.total.toLocaleString('fr-FR'), c:'#3B82F6', icon:<IconClipboard size={12} color="#3B82F6"/> },
            { l:'Âge moyen',          v:`${stats.avgAge} ans`,               c:'#22C55E', icon:<IconUsers size={12} color="#22C55E"/> },
            { l:'Durée moy. séjour',  v:`${stats.avgDur} min`,              c:'#F59E0B', icon:<IconClock size={12} color="#F59E0B"/> },
            { l:'Cas critiques P1',   v:stats.p1count.toLocaleString('fr-FR'),c:'#EF4444', icon:<IconAlertCircle size={12} color="#EF4444"/> },
            { l:'Hospitalisés',       v:stats.hospit.toLocaleString('fr-FR'), c:'#8B5CF6', icon:<IconHospital size={12} color="#8B5CF6"/> },
          ].map(item => (
            <div key={item.l} style={{ background:cardBg, borderRadius:10, padding:'10px 14px', boxShadow:'0 2px 6px rgba(22,36,84,0.07)', border:`1px solid ${borderCol}`, borderLeft:`3px solid ${item.c}` }}>
              <div style={{ fontSize:9, color:mutedCol, textTransform:'uppercase', fontWeight:700, marginBottom:2, display:'flex', alignItems:'center', gap:4 }}>
                {item.icon} {item.l}
              </div>
              <div style={{ fontWeight:800, fontSize:16, color:item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Triage quick distribution */}
      {rows.length > 0 && (
        <div style={{ background:cardBg, borderRadius:10, padding:'10px 16px', marginBottom:14, border:`1px solid ${borderCol}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:700, color:mutedCol, textTransform:'uppercase' }}>Distribution triage</span>
          {Object.entries(TRIAGE_COLOR).map(([triage, color]) => {
            const count = filtered.filter(r=>r.Niveau_Triage===triage).length;
            const pct   = filtered.length ? (count/filtered.length*100).toFixed(0) : '0';
            return (
              <div key={triage} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
                <span style={{ fontSize:11, color:textCol, fontWeight:600 }}>{triage.split(' ')[0]}</span>
                <span style={{ fontSize:11, color, fontWeight:800 }}>{pct}%</span>
              </div>
            );
          })}
          {hasFilters && (
            <span style={{ marginLeft:'auto', fontSize:11, background:'#FEF2F2', color:'#EF4444', padding:'2px 8px', borderRadius:6, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}>
              <IconFilter size={10} color="#EF4444"/> Filtres actifs
            </span>
          )}
        </div>
      )}

      {/* Vue toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[{v:false, label:'Vue passages'},{v:true, label:'Vue patients'}].map(({v,label}) => (
          <button key={label} onClick={() => { setVuePatient(v); setPage(1); setExpanded(null); }} style={{
            padding:'8px 18px', borderRadius:8, border:`1.5px solid ${vuePatient===v ? '#3B82F6' : borderCol}`,
            background: vuePatient===v ? '#3B82F6' : cardBg,
            color: vuePatient===v ? '#fff' : textCol,
            fontWeight:700, fontSize:13, cursor:'pointer',
          }}>{label}</button>
        ))}
        {vuePatient && <span style={{ fontSize:12, color:mutedCol, alignSelf:'center', marginLeft:8 }}>
          {patientRows.filter(p => !search || p.nom_complet.toLowerCase().includes(search.toLowerCase())).length} patients uniques
        </span>}
      </div>

      {/* Filters */}
      <div style={{ background:cardBg, borderRadius:12, padding:'14px 16px', boxShadow:cardShadow, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher (nom, établissement, triage, ID)..."
          style={{ flex:'1 1 200px', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${borderCol}`, fontSize:13, outline:'none', color:dark?'#e2e8f0':'#0f172a', background:dark?'#0f172a':'#F8FAFC' }}
          onFocus={e=>e.target.style.borderColor='#3B82F6'}
          onBlur={e=>e.target.style.borderColor=borderCol}
        />
        <select value={filterTriage} onChange={e=>{setFilterTriage(e.target.value);setPage(1);}} style={selectStyle}>
          <option value="">Triage</option>
          {triages.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterOrient} onChange={e=>{setFilterOrient(e.target.value);setPage(1);}} style={selectStyle}>
          <option value="">Orientation</option>
          {orients.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterSexe} onChange={e=>{setFilterSexe(e.target.value);setPage(1);}} style={selectStyle}>
          <option value="">Sexe</option>
          {sexes.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterCIN} onChange={e=>{setFilterCIN(e.target.value);setPage(1);}} style={selectStyle}>
          <option value="">CIN</option>
          {cins.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterAnnee} onChange={e=>{setFilterAnnee(e.target.value);setPage(1);}} style={selectStyle}>
          <option value="">Année</option>
          {annees.map(o=><option key={String(o)} value={String(o)}>{o}</option>)}
        </select>
        {hasFilters && (
          <button onClick={reset} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #FECACA', background:'#FEF2F2', color:'#EF4444', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* ── Vue Patients ── */}
      {vuePatient && (
        <div style={{ background:cardBg, borderRadius:12, boxShadow:'0 4px 16px rgba(22,36,84,0.08)', overflow:'hidden', marginBottom:16 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:dark?'#0f172a':'#F8FAFC', borderBottom:`2px solid ${dark?'#334155':'#E2E8F0'}` }}>
                  {['','Patient','Âge','Sexe','CIN','Antécédents','Mutuelle','Total séjour','Total soins','Visites','Dernière visite','Triage max'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:700, color:dark?'#94a3b8':'#475569', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patientRows
                  .filter(p => !search || p.nom_complet.toLowerCase().includes(search.toLowerCase()))
                  .slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
                  .map((p, i) => {
                    const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                    const isOpen = expanded === p.nom_complet;
                    return (
                      <React.Fragment key={p.nom_complet}>
                        <tr style={{ borderBottom:`1px solid ${dark?'#334155':'#F1F5F9'}`, background:rowBg, cursor:'pointer' }}
                          onClick={() => setExpanded(isOpen ? null : p.nom_complet)}>
                          <td style={{ padding:'9px 14px', color:'#3B82F6', fontWeight:700, fontSize:16 }}>{isOpen ? '▾' : '▸'}</td>
                          <td style={{ padding:'9px 14px', fontWeight:700, color:textCol }}>{p.nom_complet}</td>
                          <td style={{ padding:'9px 14px', color:textCol }}>{p.age} ans</td>
                          <td style={{ padding:'9px 14px', color:mutedCol }}>{p.sexe}</td>
                          <td style={{ padding:'9px 14px', color:mutedCol }}>{p.cin || '—'}</td>
                          <td style={{ padding:'9px 14px', color:mutedCol, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.antecedents}</td>
                          <td style={{ padding:'9px 14px', color:mutedCol }}>{p.mutuelle || '—'}</td>
                          <td style={{ padding:'9px 14px', color:textCol, fontWeight:600 }}>{p.total_sejour ? `${p.total_sejour.toLocaleString('fr-FR')} MAD` : '—'}</td>
                          <td style={{ padding:'9px 14px', color:textCol, fontWeight:600 }}>{p.total_soins ? `${p.total_soins.toLocaleString('fr-FR')} MAD` : '—'}</td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ background:'#3B82F620', color:'#3B82F6', borderRadius:12, padding:'2px 10px', fontWeight:700, fontSize:12 }}>{p.nb_visites}</span>
                          </td>
                          <td style={{ padding:'9px 14px', color:mutedCol }}>{p.derniere_visite}</td>
                          <td style={{ padding:'9px 14px' }}><Badge text={p.triage_max} colorMap={TRIAGE_COLOR}/></td>
                        </tr>
                        {isOpen && (
                          <tr style={{ background:dark?'#0f172a':'#F0F7FF' }}>
                            <td colSpan={12} style={{ padding:'0 16px 12px 40px' }}>
                              <div style={{ fontSize:12, fontWeight:700, color:mutedCol, textTransform:'uppercase', marginBottom:8, marginTop:10 }}>
                                Historique des {p.nb_visites} passages
                              </div>
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                <thead>
                                  <tr style={{ color:mutedCol, fontWeight:700 }}>
                                    {['ID','Date','Triage','Motif','Orientation','Durée','Établissement','Mutuelle','Prix séjour','Prix soins'].map(h=>(
                                      <th key={h} style={{ padding:'4px 10px', textAlign:'left', fontWeight:700 }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.historique.map((h, hi) => (
                                    <tr key={hi} style={{ borderTop:`1px solid ${dark?'#334155':'#E2E8F0'}` }}>
                                      <td style={{ padding:'5px 10px', color:mutedCol, fontFamily:'monospace' }}>#{h.id_passage}</td>
                                      <td style={{ padding:'5px 10px', color:textCol }}>{h.date}</td>
                                      <td style={{ padding:'5px 10px' }}><Badge text={h.niveau_triage} colorMap={TRIAGE_COLOR}/></td>
                                      <td style={{ padding:'5px 10px', color:textCol }}>{h.motif}</td>
                                      <td style={{ padding:'5px 10px' }}><Badge text={h.orientation} colorMap={ORIENT_COLOR}/></td>
                                      <td style={{ padding:'5px 10px', color: h.duree_min>300?'#EF4444':textCol, fontWeight: h.duree_min>300?700:400 }}>{h.duree_min} min</td>
                                      <td style={{ padding:'5px 10px', color:mutedCol, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.etablissement}</td>
                                      <td style={{ padding:'5px 10px', color:mutedCol }}>{h.mutuelle || '—'}</td>
                                      <td style={{ padding:'5px 10px', color:textCol, fontWeight:600 }}>{h.prix_sejour ? `${h.prix_sejour.toLocaleString('fr-FR')} MAD` : '—'}</td>
                                      <td style={{ padding:'5px 10px', color:textCol, fontWeight:600 }}>{h.prix_soins  ? `${h.prix_soins.toLocaleString('fr-FR')} MAD`  : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vue Passages ── */}
      {!vuePatient && <div style={{ background:cardBg, borderRadius:12, boxShadow:'0 4px 16px rgba(22,36,84,0.08)', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:dark?'#0f172a':'#F8FAFC', borderBottom:`2px solid ${dark?'#334155':'#E2E8F0'}` }}>
                {COLUMNS.map(([k,l]) => (
                  <th key={l} onClick={() => toggleSort(k)}
                    style={{ padding:'11px 14px', textAlign:'left', fontWeight:700, color:dark?'#94a3b8':'#475569', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}>
                    {l}<SortIcon k={k}/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => {
                const rowBg   = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                const hoverBg = dark ? '#1e3a5f' : '#EFF6FF';
                return (
                  <tr key={row.id_passage??i}
                    style={{ borderBottom:`1px solid ${dark?'#334155':'#F1F5F9'}`, background:rowBg, cursor:'pointer' }}
                    onClick={() => setSelectedRow(row)}
                    onMouseEnter={e=>(e.currentTarget.style.background=hoverBg)}
                    onMouseLeave={e=>(e.currentTarget.style.background=rowBg)}>
                    <td style={{ padding:'9px 14px', color:mutedCol, fontFamily:'monospace', fontSize:12 }}>#{row.id_passage != null ? Math.round(Number(row.id_passage)) : '—'}</td>
                    <td style={{ padding:'9px 14px', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:textCol, fontWeight:600 }}>{row.Nom_Complet}</td>
                    <td style={{ padding:'9px 14px', color:textCol, fontWeight:600 }}>{row.Age} ans</td>
                    <td style={{ padding:'9px 14px', color:mutedCol }}>{row.Sexe}</td>
                    <td style={{ padding:'9px 14px' }}><Badge text={row.Niveau_Triage} colorMap={TRIAGE_COLOR}/></td>
                    <td style={{ padding:'9px 14px', whiteSpace:'nowrap', color:mutedCol }}>{row.Date_Arrivee?.slice(0,10)}</td>
                    <td style={{ padding:'9px 14px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:textCol, fontWeight:500 }}>{row.Etablissement}</td>
                    <td style={{ padding:'9px 14px', color:mutedCol }}>{row.CIN||'—'}</td>
                    <td style={{ padding:'9px 14px' }}><Badge text={row.Orientation} colorMap={ORIENT_COLOR}/></td>
                    <td style={{ padding:'9px 14px', fontWeight:700, color:row.Duree_Sejour_min>300?'#EF4444':textCol }}>{row.Duree_Sejour_min} min</td>
                    <td style={{ padding:'9px 14px', color:mutedCol }}>{row.Annee}</td>
                    <td style={{ padding:'9px 14px', color:mutedCol }}>{row.Mutuelle || '—'}</td>
                    <td style={{ padding:'9px 14px', color:textCol, fontWeight:600 }}>{row.Prix_Sejour != null ? `${row.Prix_Sejour.toLocaleString('fr-FR')} MAD` : '—'}</td>
                    <td style={{ padding:'9px 14px', color:textCol, fontWeight:600 }}>{row.Prix_Soins != null ? `${row.Prix_Soins.toLocaleString('fr-FR')} MAD` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:`1px solid ${dark?'#334155':'#F1F5F9'}`, flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:12, color:'#94A3B8' }}>
            Page {page} / {totalPages} &nbsp;·&nbsp; {filtered.length.toLocaleString('fr-FR')} résultats
            {hasFilters && <span style={{ marginLeft:8, color:'#3B82F6', fontWeight:600 }}>— Filtres actifs</span>}
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={paginBtn(page===1,dark)}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={paginBtn(page===1,dark)}>‹</button>
            {pageNums.map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{
                ...paginBtn(false,dark),
                background: p===page?'#3B82F6':(dark?'#1e293b':'#fff'),
                color: p===page?'#fff':(dark?'#94a3b8':'#475569'),
                fontWeight: p===page?700:400,
                border: p===page?'1px solid #3B82F6':`1px solid ${dark?'#334155':'#E2E8F0'}`,
              }}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={paginBtn(page===totalPages,dark)}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={paginBtn(page===totalPages,dark)}>»</button>
          </div>
        </div>
      </div>}

      {!vuePatient && <div style={{ marginTop:10, fontSize:11, color:'#94A3B8', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
        <IconLightbulb size={12} color="#94A3B8"/> Cliquez sur une ligne pour voir le détail complet du patient
      </div>}

      {/* ── Nuage de mots antécédents ── */}
      {antecedentsWords.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <WordCloud words={antecedentsWords} title="Antécédents médicaux les plus fréquents" />
        </div>
      )}
    </div>

    <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)} pdfBase64={pdfBase64} filename={pdfFilename} pageTitle="Tableau des Données — CHU Ibn Sina"/>
    </>
  );
};

const paginBtn = (disabled: boolean, dark: boolean): React.CSSProperties => ({
  padding:'6px 10px', borderRadius:7,
  border:`1px solid ${dark?'#334155':'#E2E8F0'}`,
  background: dark?'#1e293b':'#fff',
  color: disabled?(dark?'#475569':'#CBD5E1'):(dark?'#94a3b8':'#475569'),
  cursor: disabled?'not-allowed':'pointer',
  fontSize:13, fontWeight:500, minWidth:34, textAlign:'center',
});

export default TableauDonnees;
