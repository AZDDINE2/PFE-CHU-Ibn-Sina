/**
 * OnboardingTour — Tour guidé au premier login
 * Stocke l'état dans sessionStorage (réapparaît à chaque login, pas à chaque navigation)
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconBarChart, IconTrendingUp, IconHospital, IconCalendar, IconFileText } from './Icons';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: <IconBarChart size={40} color="#3B82F6"/>,
    title: 'KPIs Globaux',
    description: 'Vue d\'ensemble du dashboard : volume de patients, durée de séjour, taux d\'hospitalisation et niveau de triage P1. Les données se rafraîchissent automatiquement toutes les 30 secondes.',
  },
  {
    icon: <IconTrendingUp size={40} color="#22C55E"/>,
    title: 'Analyse Temporelle',
    description: 'Explorez l\'évolution du volume de patients sur 2019–2026. Filtrez par année pour identifier les tendances et les pics saisonniers.',
  },
  {
    icon: <IconCalendar size={40} color="#8B5CF6"/>,
    title: 'Prédictions ML',
    description: 'Prévisions 30 jours avec le modèle Prophet, comparaison de 3 algorithmes ML (XGBoost, Random Forest, Prophet) et un simulateur interactif pour estimer l\'affluence.',
  },
  {
    icon: <IconHospital size={40} color="#EF4444"/>,
    title: 'Prédiction Triage',
    description: 'Saisissez les informations d\'un patient à l\'admission (âge, sexe, antécédents, heure) pour obtenir une recommandation de niveau de triage P1–P4 en temps réel.',
  },
  {
    icon: <IconCalendar size={40} color="#F59E0B"/>,
    title: 'Carte & Comparaison',
    description: 'Visualisez les 8 établissements sur la carte de Rabat et comparez leurs indicateurs : capacité, taux d\'hospitalisation, durée moyenne et alertes de charge.',
  },
  {
    icon: <IconFileText size={40} color="#06B6D4"/>,
    title: 'Exports PDF & CSV',
    description: 'Chaque page propose un export PDF au format institutionnel CHU Ibn Sina (multi-pages automatique) et un export CSV des données brutes.',
  },
];

const OnboardingTour: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `onboarded_${user.username}`;
    if (!sessionStorage.getItem(key)) {
      setVisible(true);
      setStep(0);
    }
  }, [user]);

  const close = () => {
    if (user) sessionStorage.setItem(`onboarded_${user.username}`, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              BIENVENUE · {step + 1} / {STEPS.length}
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>
              Dashboard CHU Ibn Sina
            </div>
          </div>
          <button onClick={close} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Progression */}
        <div style={{ display: 'flex', gap: 4, padding: '0 28px', marginTop: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              flex: 1, height: 4, borderRadius: 2, cursor: 'pointer',
              background: i <= step ? '#3b82f6' : '#e2e8f0',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Contenu */}
        <div style={{ padding: '24px 28px', minHeight: 160 }}>
          <div style={{ marginBottom: 12 }}>{current.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 10 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            {current.description}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', cursor: step === 0 ? 'not-allowed' : 'pointer',
              color: step === 0 ? '#cbd5e1' : '#0f172a', fontWeight: 600, fontSize: 13,
            }}>
            ← Précédent
          </button>
          <button onClick={close} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: 13,
          }}>
            Passer le tour
          </button>
          <button
            onClick={isLast ? close : () => setStep(s => s + 1)}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: isLast ? '#22c55e' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
            {isLast ? '✓ Commencer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
