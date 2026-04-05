/**
 * Alertes — Configuration des seuils et vérification des alertes en temps réel
 */
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';
import { useToast } from '../context/ToastContext';
import { IconClock, IconWalk, IconHospital, IconSave, IconBook, IconCheckCircle, IconBell, IconSettings, DotRed, DotYellow } from '../components/Icons';

interface AlertConfig {
  duree_moy_seuil: number;
  taux_fugue_seuil: number;
  taux_p1_seuil: number;
  taux_hospit_seuil: number;
}
interface Alerte { type: string; valeur: string; seuil: string; niveau: 'critique' | 'warning'; }
interface CheckResult { alertes: Alerte[]; stats: Record<string, number>; config: AlertConfig; }

const Alertes: React.FC = () => {
  const { dark } = useTheme();
  const { showToast } = useToast();
  const [config, setConfig] = useState<AlertConfig>({ duree_moy_seuil: 240, taux_fugue_seuil: 3, taux_p1_seuil: 5, taux_hospit_seuil: 35 });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const bg      = cardBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;
  const inner   = innerBg;
  const inputBg = innerBg;

  const loadData = useCallback(() => {
    axios.get('/api/alertes/config').then(r => setConfig(r.data)).catch(() => {});
    axios.get('/api/alertes/check').then(r => setResult(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/alertes/config', config);
      const r = await axios.get('/api/alertes/check');
      setResult(r.data);
      showToast({ type: 'success', title: 'Seuils mis à jour', message: 'La configuration des alertes a été sauvegardée.' });
    } catch {
      showToast({ type: 'error', title: 'Erreur', message: 'Impossible de sauvegarder la configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const SEUILS_CONFIG = [
    { key: 'duree_moy_seuil',   label: 'Durée séjour max',       unit: 'min', icon: <IconClock size={13} color="currentColor"/>, desc: 'Objectif OMS : 240 min' },
    { key: 'taux_fugue_seuil',  label: 'Taux de fugue max',      unit: '%',   icon: <IconWalk size={13} color="currentColor"/>, desc: 'Recommandation : < 3%' },
    { key: 'taux_p1_seuil',     label: 'Taux cas P1 max',        unit: '%',   icon: <DotRed size={10}/>, desc: 'Recommandation : < 5%' },
    { key: 'taux_hospit_seuil', label: 'Taux hospitalisation max',unit: '%',   icon: <IconHospital size={13} color="currentColor"/>, desc: 'Seuil critique : 35%' },
  ];

  return (
    <div>
      <PageHeader
        icon={<IconBell size={22} color="white"/>}
        title="Alertes & Seuils"
        subtitle="Configuration des seuils d'alerte et monitoring en temps réel"
        badge={result ? `${result.alertes.length} alerte${result.alertes.length !== 1 ? 's' : ''}` : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Config seuils */}
        <div style={{ background: bg, borderRadius: 12, padding: '20px 24px', boxShadow:cardShadow, border: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: text, fontSize: 14, marginBottom: 18 }}>
            <IconSettings size={16} color="#3b82f6"/> Configuration des seuils
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SEUILS_CONFIG.map(({ key, label, unit, icon, desc }) => (
              <div key={key}>
                <label style={{ fontSize: 12, fontWeight: 700, color: muted, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>{icon}</span> {label}
                  <span style={{ fontSize: 10, fontWeight: 400, color: muted, marginLeft: 4 }}>({desc})</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    value={(config as any)[key]}
                    onChange={e => setConfig(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${border}`, background: inputBg, color: text,
                      fontSize: 14, fontWeight: 700, outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 13, color: muted, fontWeight: 600, minWidth: 30 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            marginTop: 20, width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Sauvegarde...' : <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><IconSave size={14} color="white"/> Sauvegarder les seuils</span>}
          </button>
        </div>

        {/* Alertes actives */}
        <div style={{ background: bg, borderRadius: 12, padding: '20px 24px', boxShadow:cardShadow, border: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: text, fontSize: 14, marginBottom: 18 }}>
            <IconBell size={16} color="#ef4444"/> Alertes actives
          </div>

          {result && result.alertes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: dark ? '#0f2a1a' : '#f0fdf4', borderRadius: 10, border: `1px solid ${dark ? '#166534' : '#bbf7d0'}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}><IconCheckCircle size={28} color="#22C55E"/></div>
              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>Aucune alerte active</div>
              <div style={{ fontSize: 12, color: dark ? '#86efac' : '#15803d', marginTop: 4 }}>Tous les indicateurs sont dans les seuils normaux</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(result?.alertes || []).map((a, i) => (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: a.niveau === 'critique'
                    ? (dark ? '#2d1a1a' : '#fef2f2')
                    : (dark ? '#2d2610' : '#fffbeb'),
                  border: `1px solid ${a.niveau === 'critique' ? (dark ? '#7f1d1d' : '#fecaca') : (dark ? '#78350f' : '#fde68a')}`,
                  borderLeft: `4px solid ${a.niveau === 'critique' ? '#ef4444' : '#f59e0b'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: a.niveau === 'critique' ? (dark ? '#fca5a5' : '#dc2626') : (dark ? '#fcd34d' : '#d97706') }}>
                      {a.niveau === 'critique' ? <DotRed size={10}/> : <DotYellow size={10}/>} {a.type}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: a.niveau === 'critique' ? '#dc2626' : '#d97706', color: '#fff',
                    }}>{a.niveau.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: dark ? '#cbd5e1' : '#374151' }}>
                    Valeur actuelle : <strong>{a.valeur}</strong> — Seuil : <strong>{a.seuil}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats actuelles */}
          {result && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: inner, borderRadius: 10, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', marginBottom: 10 }}>
                Statistiques actuelles
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { l: 'Durée moy.', v: `${result.stats.duree_moy} min` },
                  { l: 'Taux fugue', v: `${result.stats.taux_fugue}%` },
                  { l: 'Cas P1',     v: `${result.stats.taux_p1}%` },
                  { l: 'Hospit.',    v: `${result.stats.taux_hospit}%` },
                ].map(({ l, v }) => (
                  <div key={l} style={{ fontSize: 12 }}>
                    <span style={{ color: muted }}>{l} : </span>
                    <strong style={{ color: text }}>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide des niveaux */}
      <div style={{ background: bg, borderRadius: 12, padding: '20px 24px', boxShadow:cardShadow, border: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><IconBook size={14} color="currentColor"/> Guide des niveaux d'alerte</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {[
            { level: 'Normal',   color: '#22c55e', lightBg: '#f0fdf4', darkBg: '#0f2a1a', lightBorder: '#bbf7d0', darkBorder: '#166534', desc: 'Tous les indicateurs sont dans les seuils définis.' },
            { level: 'Warning',  color: '#f59e0b', lightBg: '#fffbeb', darkBg: '#2d2100', lightBorder: '#fde68a', darkBorder: '#78350f', desc: 'Un indicateur dépasse légèrement le seuil. Surveiller.' },
            { level: 'Critique', color: '#ef4444', lightBg: '#fef2f2', darkBg: '#2d1010', lightBorder: '#fecaca', darkBorder: '#7f1d1d', desc: 'Dépassement significatif. Action immédiate requise.' },
          ].map(({ level, color, lightBg, darkBg, lightBorder, darkBorder, desc }) => (
            <div key={level} style={{ padding: '12px 16px', borderRadius: 10, background: dark ? darkBg : lightBg, border: `1px solid ${dark ? darkBorder : lightBorder}` }}>
              <div style={{ fontWeight: 700, color, marginBottom: 4 }}>{level}</div>
              <div style={{ fontSize: 12, color: dark ? '#cbd5e1' : '#374151' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Alertes;
