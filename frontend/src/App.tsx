import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { canAccess } from './config/permissions';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import TopProgressBar from './components/TopProgressBar';
import DarkModeToggle from './components/DarkModeToggle';
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
  '/tableau':        'Données Brutes',
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

const Topbar: React.FC = () => {
  const { dark } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const label = ROUTE_LABELS[location.pathname] ?? 'Dashboard';

  const bg     = dark ? '#111827' : '#ffffff';
  const border = dark ? '#1F2937' : '#E8EDF5';
  const text   = dark ? '#94A3B8' : '#64748B';
  const title  = dark ? '#F1F5F9' : '#0F172A';

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
            <span style={{ fontSize: 12, fontWeight: 600, color: title }}>{user.username}</span>
          </div>
        )}
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
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </ToastProvider>
);

export default App;
