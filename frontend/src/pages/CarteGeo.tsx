import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { IconHospital } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import axios from 'axios';

interface EtabGeo {
  nom: string; type_etab: string; ville: string;
  lat: number; lng: number;
  capacite_lits: number; nb_medecins: number; nb_urgentistes: number;
  Nb_Patients: number; Taux_Hospit_Pct: number;
  Duree_Moy_Min: number; Alerte_Charge: string;
}

const ALERTE_COLOR: Record<string, string> = { Normal:'#22C55E', Elevé:'#F59E0B', Critique:'#EF4444' };
const ALERTE_BG:    Record<string, string> = { Normal:'#F0FDF4', Elevé:'#FFFBEB', Critique:'#FEF2F2' };

const StatBox: React.FC<{ label: string; value: string | number; color?: string; dark: boolean }> = ({ label, value, color, dark }) => (
  <div style={{ background: dark ? '#0f172a' : '#F8FAFC', borderRadius:8, padding:'10px 14px', flex:1 }}>
    <div style={{ fontSize:9, color:'#94A3B8', textTransform:'uppercase', fontWeight:700, marginBottom:3 }}>{label}</div>
    <div style={{ fontWeight:800, fontSize:15, color: color || (dark ? '#e2e8f0' : '#0f172a') }}>{value}</div>
  </div>
);

const CarteGeo: React.FC = () => {
  const { dark } = useTheme();
  const [etabs,   setEtabs]    = useState<EtabGeo[]>([]);
  const [loading, setLoading]  = useState(true);
  const [selected, setSelected]= useState<EtabGeo | null>(null);
  const [filter, setFilter]    = useState<string>('Tous');

  const {
    cardBg, cardBg2, innerBg, border, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const cardBorder = border;       // alias for backward compat
  const titleColor = textPrimary;  // alias
  const mutedColor = textMuted;

  useEffect(() => {
    axios.get('/api/etablissements/carte')
      .then(r => { setEtabs(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Chargement de la carte..." />;

  const filtered = filter === 'Tous' ? etabs : etabs.filter(e => e.Alerte_Charge === filter);

  const totalLits    = etabs.reduce((s,e)=>s+e.capacite_lits,0);
  const totalPats    = etabs.reduce((s,e)=>s+(e.Nb_Patients||0),0);
  const nbCritiques  = etabs.filter(e=>e.Alerte_Charge==='Critique').length;
  const dureeAvg     = etabs.length ? Math.round(etabs.reduce((s,e)=>s+(e.Duree_Moy_Min||0),0)/etabs.length) : 0;

  return (
    <div>
      <PageHeader
        icon={<IconHospital size={22} color="white" />}
        title="Carte Géographique"
        subtitle={`Localisation et état des ${etabs.length} établissements — CHU Ibn Sina Rabat`}
        badge="Rabat–Salé"
      />

      {/* KPI summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { l:'Établissements', v: etabs.length, c:'#3B82F6' },
          { l:'Capacité totale', v:`${totalLits} lits`, c:'#22C55E' },
          { l:'Total patients', v: totalPats.toLocaleString('fr-FR'), c:'#8B5CF6' },
          { l:'Alertes critiques', v: nbCritiques, c: nbCritiques>0?'#EF4444':'#22C55E' },
        ].map(item=>(
          <div key={item.l} style={{ background:cardBg, borderRadius:12, padding:'14px 18px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, borderTop:`3px solid ${item.c}` }}>
            <div style={{ fontSize:10, color:mutedColor, textTransform:'uppercase', fontWeight:700 }}>{item.l}</div>
            <div style={{ fontWeight:800, fontSize:20, color:item.c, marginTop:4 }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Légende + filtre */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        {['Tous',...Object.keys(ALERTE_COLOR)].map(k => (
          <button key={k} onClick={()=>setFilter(k)} style={{
            display:'flex', alignItems:'center', gap:6,
            background: filter===k ? (ALERTE_COLOR[k]||'#3B82F6') : cardBg,
            border:`1px solid ${filter===k ? (ALERTE_COLOR[k]||'#3B82F6') : cardBorder}`,
            borderRadius:8, padding:'6px 14px', cursor:'pointer',
            color: filter===k ? '#fff' : mutedColor,
            fontWeight: filter===k ? 700 : 500, fontSize:12,
            transition:'all 0.15s',
          }}>
            {k !== 'Tous' && <div style={{ width:8, height:8, borderRadius:'50%', background: filter===k?'rgba(255,255,255,0.7)':ALERTE_COLOR[k] }}/>}
            {k}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:12, color:mutedColor }}>Taille = capacité en lits · Cliquez pour les détails</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        {/* Carte */}
        <div style={{ borderRadius:12, overflow:'hidden', boxShadow:'0 4px 16px rgba(22,36,84,0.1)', height:540 }}>
          <MapContainer center={[34.02, -6.84]} zoom={12} style={{ height:'100%', width:'100%' }} scrollWheelZoom>
            <TileLayer
              url={dark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              attribution='© OpenStreetMap · © CartoDB'
            />
            {filtered.map(e => {
              const color = ALERTE_COLOR[e.Alerte_Charge] || '#22C55E';
              const isSelected = selected?.nom === e.nom;
              return (
                <CircleMarker
                  key={e.nom}
                  center={[e.lat, e.lng]}
                  radius={Math.max(12, e.capacite_lits / 22)}
                  fillColor={color}
                  fillOpacity={isSelected ? 0.95 : 0.75}
                  color={isSelected ? '#fff' : color}
                  weight={isSelected ? 3 : 2}
                  eventHandlers={{ click: () => setSelected(e) }}
                >
                  <LeafletTooltip permanent direction="top" offset={[0, -10]}
                    className="leaflet-tooltip-custom">
                    <span style={{ fontSize:11, fontWeight:700 }}>{e.nom.replace('Hopital ','')}</span>
                  </LeafletTooltip>
                  <Popup>
                    <div style={{ minWidth:200, fontFamily:'Inter,sans-serif' }}>
                      <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:4 }}>{e.nom}</div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:10 }}>{e.type_etab} · {e.ville}</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                        <div><b>{e.capacite_lits}</b> lits</div>
                        <div><b>{e.nb_medecins}</b> médecins</div>
                        <div><b>{e.nb_urgentistes}</b> urgentistes</div>
                        <div><b>{e.Nb_Patients?.toLocaleString('fr-FR')}</b> patients</div>
                        <div><b>{e.Duree_Moy_Min}</b> min moy.</div>
                        <div><b>{e.Taux_Hospit_Pct}%</b> hospit.</div>
                      </div>
                      <div style={{ marginTop:8, background:ALERTE_BG[e.Alerte_Charge]||'#F0FDF4', borderRadius:6, padding:'5px 10px', textAlign:'center', color:color, fontWeight:800, fontSize:12 }}>
                        {e.Alerte_Charge}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Panel détail */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {selected ? (
            <div style={{ background:cardBg, borderRadius:12, overflow:'hidden', boxShadow:'0 4px 16px rgba(22,36,84,0.1)', border:`2px solid ${ALERTE_COLOR[selected.Alerte_Charge]}` }}>
              {/* Header coloré */}
              <div style={{ background:`linear-gradient(135deg,${ALERTE_COLOR[selected.Alerte_Charge]}cc,${ALERTE_COLOR[selected.Alerte_Charge]})`, padding:'16px 20px' }}>
                <div style={{ fontWeight:800, fontSize:15, color:'#fff' }}>{selected.nom}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:2 }}>{selected.type_etab} · {selected.ville}</div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <StatBox label="Lits" value={selected.capacite_lits} dark={dark} />
                  <StatBox label="Médecins" value={selected.nb_medecins} dark={dark} />
                  <StatBox label="Urgentistes" value={selected.nb_urgentistes} dark={dark} />
                </div>
                {[
                  { l:'Total patients',       v: selected.Nb_Patients?.toLocaleString('fr-FR') },
                  { l:'Durée moy. séjour',    v: `${selected.Duree_Moy_Min} min`, c: selected.Duree_Moy_Min>240?'#EF4444':undefined },
                  { l:'Taux hospitalisation', v: `${selected.Taux_Hospit_Pct}%` },
                ].map(item=>(
                  <div key={item.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${cardBorder}`, fontSize:13 }}>
                    <span style={{ color:mutedColor }}>{item.l}</span>
                    <span style={{ fontWeight:700, color:(item as any).c || titleColor }}>{item.v}</span>
                  </div>
                ))}
                <div style={{ marginTop:12, textAlign:'center', background:`${ALERTE_COLOR[selected.Alerte_Charge]}20`, borderRadius:8, padding:'8px', color:ALERTE_COLOR[selected.Alerte_Charge], fontWeight:800, fontSize:13 }}>
                  Charge : {selected.Alerte_Charge}
                </div>
                <button onClick={()=>setSelected(null)} style={{ width:'100%', marginTop:10, background:'transparent', border:`1px solid ${cardBorder}`, borderRadius:8, padding:'7px', fontSize:12, color:mutedColor, cursor:'pointer' }}>
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background:cardBg, borderRadius:12, padding:'28px 20px', textAlign:'center', color:mutedColor, boxShadow:cardShadow, border:`1px solid ${cardBorder}` }}>
              <div style={{ fontSize:40, marginBottom:10, color:mutedColor }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/>
                <line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
            </div>
              <div style={{ fontSize:13, fontWeight:600 }}>Cliquez sur un cercle</div>
              <div style={{ fontSize:12, marginTop:4 }}>pour voir les détails de l'établissement</div>
            </div>
          )}

          {/* Liste établissements */}
          <div style={{ background:cardBg, borderRadius:12, padding:'14px 16px', boxShadow:cardShadow, border:`1px solid ${cardBorder}`, flex:1, overflowY:'auto', maxHeight:280 }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:10, color:titleColor, textTransform:'uppercase', letterSpacing:0.5 }}>Tous les établissements</div>
            {etabs.map(e => (
              <div key={e.nom} onClick={() => setSelected(e)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8,
                cursor:'pointer', marginBottom:2, transition:'background 0.15s',
                background: selected?.nom===e.nom ? (dark?'#1e3a5f':'#EFF6FF') : 'transparent',
              }}
                onMouseEnter={el => { if (selected?.nom!==e.nom) el.currentTarget.style.background = dark?'#334155':'#F8FAFC'; }}
                onMouseLeave={el => { if (selected?.nom!==e.nom) el.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width:10, height:10, borderRadius:'50%', background:ALERTE_COLOR[e.Alerte_Charge], flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:titleColor, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.nom}</div>
                  <div style={{ fontSize:10, color:mutedColor }}>{e.Nb_Patients?.toLocaleString('fr-FR')} patients · {e.capacite_lits} lits</div>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:ALERTE_COLOR[e.Alerte_Charge], flexShrink:0 }}>{e.Alerte_Charge}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarteGeo;
