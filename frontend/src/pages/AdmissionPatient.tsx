/**
 * AdmissionPatient — Formulaire d'admission d'un nouveau patient aux urgences
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';

const IconAdmissionForm: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
);

const GROUPES_SANG = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const ANTECEDENTS = ['Aucun','Diabete','Hypertension','Diabete et HTA','Cardiopathie','Asthme','Allergie','Epilepsie','Insuffisance renale','Cancer'];
const ETABLISSEMENTS = ['Hopital Ibn Sina','CHU Rabat','Hopital Avicenne','Clinique Agdal'];
const NIVEAUX = ['P1 - Critique','P2 - Urgent','P3 - Semi-urgent','P4 - Non urgent'];
const MOTIFS = ['AVC','Brulure','Cephalee','Convulsion','Crise asthme','Crise hypertensive','Douleur abdominale','Douleur lombaire','Douleur thoracique','Dyspnee','Fievre elevee','Fracture membre','Infection','Intoxication','Malaise','Plaie ouverte','Traumatisme cranien','Traumatisme oculaire','Urgence obstetricale','Vomissements'];
const ORIENTATIONS = ['Domicile','Hospitalise','Transfere','Fugue','Decede'];
const FINANCEMENTS = ['Payant','AMO','RAMED','Assurance','Exonération réglementée','Payant Potentiel'];
const NIVEAU_COLORS: Record<string, string> = {
  'P1 - Critique': '#ef4444',
  'P2 - Urgent': '#f97316',
  'P3 - Semi-urgent': '#f59e0b',
  'P4 - Non urgent': '#22c55e',
};

const initialForm = {
  nom_complet: '', cin: '', age: '', sexe: 'M',
  groupe_sanguin: 'O+', antecedents: 'Aucun',
  etablissement: 'Hopital Ibn Sina', niveau_triage: 'P3 - Semi-urgent',
  motif_consultation: 'Malaise', orientation: 'Domicile',
  duree_sejour_min: '60',
  date_arrivee: new Date().toISOString().slice(0, 16),
  mutuelle: 'Payant', prix_sejour: '0', prix_soins: '0',
};

const AdmissionPatient: React.FC = () => {
  const { dark } = useTheme();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ IPP: string } | null>(null);

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card, pageBg,
  } = usePageTheme();
  const bg      = cardBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;
  const inputBg = innerBg;
  const labelColor = dark ? '#cbd5e1' : '#374151';

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Calcul automatique des prix ─────────────────────────────
  const calcPrix = (f: typeof initialForm) => {
    const BASE_SEJOUR: Record<string, number> = {
      'P1 - Critique': 4000, 'P2 - Urgent': 2500,
      'P3 - Semi-urgent': 1200, 'P4 - Non urgent': 500,
    };
    const BASE_SOINS: Record<string, number> = {
      'P1 - Critique': 3000, 'P2 - Urgent': 1800,
      'P3 - Semi-urgent': 900, 'P4 - Non urgent': 300,
    };
    let sejour = BASE_SEJOUR[f.niveau_triage] ?? 1200;
    let soins  = BASE_SOINS[f.niveau_triage]  ?? 900;

    // Heure de nuit (22h–6h) → +20%
    const heure = new Date(f.date_arrivee).getHours();
    if (heure >= 22 || heure < 6) { sejour = Math.round(sejour * 1.2); soins = Math.round(soins * 1.2); }

    // Antécédents graves → +40% soins
    const ant = f.antecedents.toLowerCase();
    if (ant.includes('cardiopathie') || ant.includes('cancer') || ant.includes('insuffisance')) {
      soins = Math.round(soins * 1.4);
    } else if (ant.includes('diabete') || ant.includes('asthme') || ant.includes('epilepsie') || ant.includes('hypertension')) {
      soins = Math.round(soins * 1.2);
    }

    // Durée > 5h → +30% séjour
    if (Number(f.duree_sejour_min) > 300) sejour = Math.round(sejour * 1.3);

    // Âge extrême → +15% soins
    const age = Number(f.age);
    if (age > 0 && (age <= 2 || age >= 70)) soins = Math.round(soins * 1.15);

    // Financement CHU Ibn Sina
    if (f.mutuelle === 'RAMED') { sejour = Math.round(sejour * 0.05); soins = Math.round(soins * 0.05); }
    else if (f.mutuelle === 'Exonération réglementée') { sejour = 0; soins = 0; }
    else if (f.mutuelle === 'AMO') { sejour = Math.round(sejour * 0.2); soins = Math.round(soins * 0.2); }
    else if (f.mutuelle === 'Assurance') { sejour = Math.round(sejour * 0.3); soins = Math.round(soins * 0.3); }
    else if (f.mutuelle === 'Payant Potentiel') { sejour = Math.round(sejour * 0.5); soins = Math.round(soins * 0.5); }
    // Payant = 100% (pas de réduction)

    return { sejour, soins };
  };

  useEffect(() => {
    const { sejour, soins } = calcPrix(form);
    setForm(f => ({ ...f, prix_sejour: String(sejour), prix_soins: String(soins) }));
  }, [form.niveau_triage, form.antecedents, form.date_arrivee, form.duree_sejour_min, form.age, form.mutuelle]); // eslint-disable-line

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_complet.trim()) { showToast({ title: 'Le nom du patient est requis', type: 'error' }); return; }
    if (!form.age || Number(form.age) < 0 || Number(form.age) > 120) { showToast({ title: 'Âge invalide', type: 'error' }); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/patients/add', {
        ...form,
        age: Number(form.age),
        duree_sejour_min: Number(form.duree_sejour_min),
        nb_medecins_dispo: 5,
        nb_lits_dispo: 10,
        date_arrivee: new Date(form.date_arrivee).toISOString(),
        prix_sejour: Number(form.prix_sejour),
        prix_soins: Number(form.prix_soins),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setResult(res.data);
      showToast({ title: `Patient admis — ${res.data.IPP}`, type: 'success' });
      setForm({ ...initialForm, date_arrivee: new Date().toISOString().slice(0, 16) });
    } catch {
      showToast({ title: "Erreur lors de l'admission", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const niveauColor = NIVEAU_COLORS[form.niveau_triage] || '#94a3b8';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: inputBg,
    color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: labelColor, marginBottom: 4, display: 'block', textTransform: 'uppercase' };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
  const sectionStyle: React.CSSProperties = { background: bg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${border}`, marginBottom: 16 };
  const sectionTitle: React.CSSProperties = { fontWeight: 700, fontSize: 13, color: text, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${border}` };
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 };

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        title="Admission Patient"
        subtitle="Enregistrement d'un nouveau passage aux urgences"
        icon={<IconAdmissionForm />}
      />

      {result && (
        <div style={{ background: dark ? '#0f2a1a' : '#f0fdf4', border: `1px solid ${dark ? '#166534' : '#bbf7d0'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>
            <div style={{ fontWeight: 700, color: dark ? '#86efac' : '#15803d', fontSize: 14 }}>Patient admis avec succès</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
              IPP : <strong style={{ color: text }}>{result.IPP}</strong> &nbsp;|&nbsp;
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Niveau triage — en premier, visuellement impactant */}
        <div style={{ ...sectionStyle, borderLeft: `4px solid ${niveauColor}` }}>
          <div style={sectionTitle}>Niveau de Triage</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {NIVEAUX.map(n => (
              <button key={n} type="button" onClick={() => set('niveau_triage', n)} style={{
                padding: '10px 18px', borderRadius: 8, border: `2px solid ${NIVEAU_COLORS[n]}`,
                background: form.niveau_triage === n ? NIVEAU_COLORS[n] : 'transparent',
                color: form.niveau_triage === n ? '#fff' : NIVEAU_COLORS[n],
                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Informations patient */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Informations Patient</div>
          <div style={gridStyle}>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nom complet *</label>
              <input style={inputStyle} value={form.nom_complet} onChange={e => set('nom_complet', e.target.value)} placeholder="Prénom Nom" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>CIN *</label>
              <input style={inputStyle} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="ex: AB123456" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Âge *</label>
              <input style={inputStyle} type="number" min={0} max={120} value={form.age} onChange={e => set('age', e.target.value)} placeholder="ex: 45" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Sexe</label>
              <select style={inputStyle} value={form.sexe} onChange={e => set('sexe', e.target.value)}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Groupe sanguin</label>
              <select style={inputStyle} value={form.groupe_sanguin} onChange={e => set('groupe_sanguin', e.target.value)}>
                {GROUPES_SANG.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
              <label style={labelStyle}>Antécédents médicaux</label>
              <select style={inputStyle} value={form.antecedents} onChange={e => set('antecedents', e.target.value)}>
                {ANTECEDENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Consultation */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Consultation</div>
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date & heure d'arrivée</label>
              <input style={inputStyle} type="datetime-local" value={form.date_arrivee} onChange={e => set('date_arrivee', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Établissement</label>
              <select style={inputStyle} value={form.etablissement} onChange={e => set('etablissement', e.target.value)}>
                {ETABLISSEMENTS.map(et => <option key={et}>{et}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Motif de consultation</label>
              <select style={inputStyle} value={form.motif_consultation} onChange={e => set('motif_consultation', e.target.value)}>
                {MOTIFS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Orientation</label>
              <select style={inputStyle} value={form.orientation} onChange={e => set('orientation', e.target.value)}>
                {ORIENTATIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Durée séjour (min)</label>
              <input style={inputStyle} type="number" min={1} value={form.duree_sejour_min} onChange={e => set('duree_sejour_min', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Facturation & Soins */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Facturation & Soins reçus</div>
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Financement / Couverture</label>
              <select style={inputStyle} value={form.mutuelle} onChange={e => set('mutuelle', e.target.value)}>
                {FINANCEMENTS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Prix du séjour (MAD)
                <span style={{ marginLeft: 6, background: '#3b82f620', color: '#3b82f6', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>AUTO</span>
              </label>
              <div style={{ ...inputStyle, background: dark ? '#1e293b' : '#eff6ff', color: '#3b82f6', fontWeight: 800, fontSize: 15, cursor: 'default', border: `1px solid #3b82f640` }}>
                {Number(form.prix_sejour).toLocaleString('fr-FR')} MAD
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Prix des soins (MAD)
                <span style={{ marginLeft: 6, background: '#8b5cf620', color: '#8b5cf6', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>AUTO</span>
              </label>
              <div style={{ ...inputStyle, background: dark ? '#1e293b' : '#f5f3ff', color: '#8b5cf6', fontWeight: 800, fontSize: 15, cursor: 'default', border: `1px solid #8b5cf640` }}>
                {Number(form.prix_soins).toLocaleString('fr-FR')} MAD
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Total estimé (MAD)
                <span style={{ marginLeft: 6, background: '#f59e0b20', color: '#f59e0b', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>AUTO</span>
              </label>
              <div style={{ ...inputStyle, background: dark ? '#1e293b' : '#fffbeb', color: '#f59e0b', fontWeight: 900, fontSize: 16, cursor: 'default', border: `1.5px solid #f59e0b60` }}>
                {(Number(form.prix_sejour) + Number(form.prix_soins)).toLocaleString('fr-FR')} MAD
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          background: loading ? '#64748b' : `linear-gradient(135deg, ${niveauColor}, ${niveauColor}cc)`,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: `0 4px 16px ${niveauColor}44`, transition: 'all 0.2s',
        }}>
          {loading ? 'Enregistrement...' : 'Admettre le patient'}
        </button>
      </form>
    </div>
  );
};

export default AdmissionPatient;
