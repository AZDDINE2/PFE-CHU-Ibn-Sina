import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { canAccess } from './config/permissions';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import TopProgressBar from './components/TopProgressBar';
import DarkModeToggle from './components/DarkModeToggle';
import SessionBanner from './components/SessionBanner';
import KPIsGlobaux from './pages/KPIsGlobaux';
import AnalyseTemporelle from './pages/AnalyseTemporelle';
import Etablissements from './pages/Etablissements';
import PredictionsML from './pages/PredictionsML';
import SoinsCouts from './pages/SoinsCouts';
import CarteGeo from './pages/CarteGeo';
import TableauDonnees from './pages/TableauDonnees';
import Login from './pages/Login';
import AdmissionPatient from './pages/AdmissionPatient';
import OnboardingTour from './components/OnboardingTour';
import FullscreenButton from './components/FullscreenButton';
import Alertes from './pages/Alertes';
import RessourcesHumaines from './pages/RessourcesHumaines';
import PatientsActuels from './pages/PatientsActuels';
import GestionUtilisateurs from './pages/GestionUtilisateurs';
import GestionPersonnel from './pages/GestionPersonnel';
import GestionLits from './pages/GestionLits';
import { useTheme } from './context/ThemeContext';

const ROUTE_LABELS: Record<string, string> = {
  '/':               'KPIs Globaux',
  '/temporel':       'Analyse Temporelle',
  '/etablissements': 'Établissements',
  '/predictions':    'Prédictions IA',
  '/soins':          'Soins Médicaux',
  '/carte':          'Carte Géographique',
  '/tableau':        'Tableau des Données',
  '/alertes':        'Alertes & Seuils',
  '/admission':      'Admission Patient',
  '/ressources':     'Vue d\'ensemble RH',
  '/patients':       'Patients Actuels',
  '/utilisateurs':   'Utilisateurs',
  '/personnel':      'Personnel',
  '/lits':           'Gestion des Lits',
};

const Guarded: React.FC<{ path: string; element: React.ReactElement }> = ({ path, element }) => {
  const { user } = useAuth();
  if (!canAccess(user?.role, path)) return <Navigate to="/" replace />;
  return element;
};

/** Formate les secondes en "Xh Ym" ou "Xm Ys" */
function formatTokenTime(secs: number): string {
  if (secs <= 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

const Topbar: React.FC = () => {
  const { dark } = useTheme();
  const location = useLocation();
  const { user, secondsLeft, logout } = useAuth();
  const label = ROUTE_LABELS[location.pathname] ?? 'Dashboard';

  const bg     = dark ? '#111827' : '#ffffff';
  const border = dark ? '#1F2937' : '#E8EDF5';
  const text   = dark ? '#94A3B8' : '#64748B';
  const title  = dark ? '#F1F5F9' : '#0F172A';

  // Couleur du badge de token selon le temps restant
  const tokenColor =
    secondsLeft <= 2 * 60  ? '#EF4444' :   // rouge  ≤ 2 min
    secondsLeft <= 15 * 60 ? '#F97316' :   // orange ≤ 15 min
    '#22C55E';                              // vert   > 15 min

  return (
    <div className="topbar" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: text, fontWeight: 500 }}>CHU Ibn Sina</span>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={text} strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span style={{ fontSize: 13, color: title, fontWeight: 600 }}>{label}</span>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FullscreenButton />
        <DarkModeToggle />

        {/* Indicateur de token */}
        {user && secondsLeft > 0 && (
          <div title="Durée de vie restante du token JWT" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6,
            background: `${tokenColor}18`,
            border: `1px solid ${tokenColor}44`,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={tokenColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: tokenColor, fontVariantNumeric: 'tabular-nums' }}>
              {formatTokenTime(secondsLeft)}
            </span>
          </div>
        )}

        {/* User chip */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px 5px 6px',
            borderRadius: 8, border: `1px solid ${border}`,
            background: dark ? '#1F2937' : '#F8FAFC',
            marginLeft: 4,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 11,
            }}>
              {user.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: title, lineHeight: 1 }}>{user.username}</span>
              <span style={{ fontSize: 10, color: text, lineHeight: 1, textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            {/* Bouton déconnexion */}
            <button
              onClick={logout}
              title="Se déconnecter"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 4px', marginLeft: 2, borderRadius: 4,
                color: text, opacity: 0.6, display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const BackendLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dark } = useTheme();
  const [ready, setReady] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await axios.get('/api/status');
        if (r.data.ready) { if (!cancelled) setReady(true); return; }
      } catch {}
      if (!cancelled) setTimeout(check, 3000);
    };
    check();
    const dotsInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => { cancelled = true; clearInterval(dotsInterval); };
  }, []);

  if (ready) return <>{children}</>;

  const bg = dark ? '#0A0F1C' : '#F0F4FF';
  const card = dark ? '#111827' : '#ffffff';
  const text = dark ? '#F1F5F9' : '#0F172A';
  const muted = dark ? '#64748b' : '#94a3b8';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: card, borderRadius: 20, padding: '48px 56px', textAlign: 'center', boxShadow: '0 8px 40px #0002', maxWidth: 380 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 8 }}>Chargement des données{dots}</div>
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 24 }}>
          Le serveur initialise les données<br/>des urgences (530 000 visites).<br/>Veuillez patienter quelques secondes.
        </div>
        <div style={{ height: 4, background: dark ? '#1e293b' : '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 2, animation: 'slide 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }`}</style>
      </div>
    </div>
  );
};

const AppInner: React.FC = () => {
  const { user } = useAuth();
  const { dark } = useTheme();
  const location = useLocation();

  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;
  if (location.pathname === '/login') {
    if (user) return <Navigate to="/" replace />;
    return <Login />;
  }

  return (
    <div className="app-layout" style={{ background: dark ? '#0A0F1C' : '#F0F4FF' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar />
        <main id="main-content" style={{
          flex: 1, padding: '24px 28px', overflowY: 'auto',
          background: dark ? '#0A0F1C' : '#F0F4FF',
        }}>
          <TopProgressBar />
          <SessionBanner />
          <AlertBanner />
          <OnboardingTour />
          <Routes>
            <Route path="/"               element={<KPIsGlobaux />} />
            <Route path="/temporel"       element={<Guarded path="/temporel"       element={<AnalyseTemporelle />} />} />
            <Route path="/etablissements" element={<Guarded path="/etablissements" element={<Etablissements />} />} />
            <Route path="/predictions"    element={<Guarded path="/predictions"    element={<PredictionsML />} />} />
            <Route path="/soins"          element={<Guarded path="/soins"          element={<SoinsCouts />} />} />
            <Route path="/carte"          element={<Guarded path="/carte"          element={<CarteGeo />} />} />
            <Route path="/tableau"        element={<Guarded path="/tableau"        element={<TableauDonnees />} />} />
            <Route path="/alertes"        element={<Guarded path="/alertes"        element={<Alertes />} />} />
            <Route path="/admission"      element={<Guarded path="/admission"      element={<AdmissionPatient />} />} />
            <Route path="/ressources"     element={<Guarded path="/ressources"     element={<RessourcesHumaines />} />} />
            <Route path="/patients"       element={<Guarded path="/patients"       element={<PatientsActuels />} />} />
            <Route path="/utilisateurs"   element={<Guarded path="/utilisateurs"   element={<GestionUtilisateurs />} />} />
            <Route path="/personnel"      element={<Guarded path="/personnel"      element={<GestionPersonnel />} />} />
            <Route path="/lits"           element={<Guarded path="/lits"           element={<GestionLits />} />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <BackendLoader>
            <AppInner />
          </BackendLoader>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </ToastProvider>
);

export default App;
