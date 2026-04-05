import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { IconHospital } from '../components/Icons';

const SAISONS = ['Hiver','Printemps','Été','Automne'];
const JOURS   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const ANTECEDENTS_LIST = ['Cardiaque','Diabète','Respiratoire','Neurologique','Cancer','HTA','Aucun'];

interface TriageResult {
  triage: string;
  triage_num: number;
  color: string;
  risque: string;
  score: number;
  duree_estimee_min: number | null;
  facteurs: {
    age_risque: boolean;
    heure_nuit: boolean;
    jour_ferie: boolean;
    antecedents_graves: boolean;
  };
  prix: {
    sejour: number;
    soins: number;
    total: number;
  };
}

const TriagePrediction: React.FC = () => {
  const { dark } = useTheme();
  const { showToast } = useToast();

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const border   = themeBorder;
  const textCol  = textPrimary;
  const mutedCol = textMuted;
  const inputBg  = innerBg;

  const [form, setForm] = useState({
    age: 40, sexe: 'M', heure: 10, jour_semaine: 0, mois: 3,
    saison: 'Printemps', jour_ferie: false, antecedents: 'Aucun',
  });
  const [result, setResult]   = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/predict/triage', form);
      setResult(data);
      showToast({
        type: data.triage_num <= 2 ? 'error' : data.triage_num === 3 ? 'warning' : 'success',
        title: `Triage prédit : ${data.triage}`,
        message: `Niveau de risque : ${data.risque}`,
      });
    } catch {
      showToast({ type: 'error', title: 'Erreur', message: 'Impossible de contacter le backend.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: inputBg, color: textCol,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: mutedCol,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block',
  };

  return (
    <div>
      <PageHeader
        icon={<IconHospital size={22} color="white"/>}
        title="Prédiction Triage"
        subtitle="Aide à la décision pour le niveau de triage à l'admission"
        badge="IA — Règles expertes"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '0 4px' }}>

        {/* ── Formulaire ── */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
          <h3 style={{ margin: '0 0 18px', color: textCol, fontSize: 15, fontWeight: 700 }}>
            Informations patient
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Âge</label>
                <input type="number" min={0} max={120} value={form.age}
                  onChange={e => set('age', +e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sexe</label>
                <select value={form.sexe} onChange={e => set('sexe', e.target.value)} style={inputStyle}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Heure d'arrivée</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min={0} max={23} value={form.heure}
                    onChange={e => set('heure', +e.target.value)} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 700, color: textCol, minWidth: 32 }}>{String(form.heure).padStart(2,'0')}h</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Mois</label>
                <input type="number" min={1} max={12} value={form.mois}
                  onChange={e => set('mois', +e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Jour de la semaine</label>
                <select value={form.jour_semaine} onChange={e => set('jour_semaine', +e.target.value)} style={inputStyle}>
                  {JOURS.map((j, i) => <option key={j} value={i}>{j}</option>)}
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
                {ANTECEDENTS_LIST.map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: textCol }}>
                    <input type="radio" name="antecedent" value={a}
                      checked={form.antecedents === a}
                      onChange={() => set('antecedents', a)} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: textCol }}>
              <input type="checkbox" checked={form.jour_ferie}
                onChange={e => set('jour_ferie', e.target.checked)} />
              Jour férié / week-end
            </label>

            <button type="submit" disabled={loading} style={{
              padding: '11px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {loading ? 'Analyse en cours...' : 'Prédire le niveau de triage'}
            </button>
          </form>
        </div>

        {/* ── Résultat ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              {/* Niveau de triage principal */}
              <div style={{
                background: cardBg, borderRadius: 12, padding: 28,
                border: `2px solid ${result.color}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: mutedCol, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                  Niveau de triage prédit
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 900, color: result.color, marginBottom: 4,
                }}>{result.triage}</div>
                <div style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: 20,
                  background: `${result.color}18`, color: result.color,
                  fontWeight: 700, fontSize: 13,
                }}>Risque : {result.risque}</div>
                {result.duree_estimee_min && (
                  <div style={{ marginTop: 16, padding: '12px 0', borderTop: `1px solid ${border}` }}>
                    <div style={{ fontSize: 12, color: mutedCol }}>Durée estimée de séjour</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: textCol }}>{result.duree_estimee_min} min</div>
                  </div>
                )}
              </div>

              {/* Facteurs de risque */}
              <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: textCol, marginBottom: 12 }}>Facteurs identifiés</div>
                {([
                  ['Âge à risque (< 2 ans ou ≥ 60 ans)', result.facteurs.age_risque],
                  ['Arrivée en heure de nuit (22h–6h)', result.facteurs.heure_nuit],
                  ['Jour férié', result.facteurs.jour_ferie],
                  ['Antécédents graves', result.facteurs.antecedents_graves],
                ] as [string, boolean][]).map(([label, active]) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: `1px solid ${border}`,
                    opacity: active ? 1 : 0.45,
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: active ? '#ef444420' : '#22c55e20',
                      color: active ? '#ef4444' : '#22c55e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                    }}>{active ? '!' : '✓'}</span>
                    <span style={{ fontSize: 13, color: textCol }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Score */}
              <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: mutedCol, marginBottom: 8 }}>SCORE DE RISQUE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 10, borderRadius: 5, background: border, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(result.score / 8 * 100, 100)}%`,
                      height: '100%', borderRadius: 5, background: result.color,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontWeight: 800, color: result.color, minWidth: 24 }}>{result.score}</span>
                </div>
              </div>

              {/* Prix estimés */}
              {result.prix && (
                <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: textCol, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Estimation des coûts
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: 'Prix séjour', value: result.prix.sejour, color: '#3b82f6' },
                      { label: 'Prix soins',  value: result.prix.soins,  color: '#8b5cf6' },
                    ].map(item => (
                      <div key={item.label} style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${border}` }}>
                        <div style={{ fontSize: 10, color: mutedCol, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: item.color }}>{item.value.toLocaleString('fr-FR')} <span style={{ fontSize: 11, fontWeight: 600 }}>MAD</span></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: `#f59e0b18`, border: `1.5px solid #f59e0b`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>TOTAL ESTIMÉ</span>
                    <span style={{ fontWeight: 900, fontSize: 22, color: '#f59e0b' }}>{result.prix.total.toLocaleString('fr-FR')} MAD</span>
                  </div>
                  <div style={{ fontSize: 11, color: mutedCol, marginTop: 8, textAlign: 'center' }}>
                    Estimation basée sur le niveau de triage, la durée et les facteurs de risque
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{
              background: cardBg, borderRadius: 12, padding: 40,
              border: `1px dashed ${border}`, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              color: mutedCol,
            }}>
              <div style={{ marginBottom: 8 }}><IconHospital size={48} color={mutedCol}/></div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Prédiction en attente</div>
              <div style={{ fontSize: 13 }}>Remplissez le formulaire et cliquez sur "Prédire"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriagePrediction;
