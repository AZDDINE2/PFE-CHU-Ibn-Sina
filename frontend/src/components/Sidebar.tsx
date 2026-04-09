import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { IconDashboard, IconChart, IconHospital, IconBrain, IconPill, IconUsers, IconBell } from './Icons';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../config/permissions';
import logoChu from '../assets/logo_chu.svg';

/* ── Local icons ──────────────────────────────────────── */
const Ico = {
  Map: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  Admission: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  ),
  RH: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Live: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Settings: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Bed: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/>
      <path d="M2 17h20"/><path d="M6 8v9"/>
    </svg>
  ),
  Logout: ({ s = 15 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Chevron: ({ s = 13, flip = false }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: flip ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

/* ── Nav items ────────────────────────────────────────── */
const SECTIONS = [
  {
    label: 'Tableau de bord',
    items: [
      { to: '/',               label: 'KPIs Globaux',        Icon: () => <IconDashboard size={16} color="currentColor"/> },
      { to: '/temporel',       label: 'Analyse Temporelle',  Icon: () => <IconChart size={16} color="currentColor"/> },
      { to: '/etablissements', label: 'Établissements',      Icon: () => <IconHospital size={16} color="currentColor"/> },
      { to: '/predictions',    label: 'Prédictions IA',      Icon: () => <IconBrain size={16} color="currentColor"/> },
      { to: '/soins',          label: 'Soins Médicaux',      Icon: () => <IconPill size={16} color="currentColor"/> },
    ],
  },
  {
    label: 'Opérationnel',
    items: [
      { to: '/patients',    label: 'Patients Actuels',    Icon: () => <Ico.Live s={16}/> },
      { to: '/ressources',  label: 'Vue d\'ensemble RH',  Icon: () => <Ico.RH s={16}/> },
      { to: '/personnel',   label: 'Personnel',           Icon: () => <IconUsers size={16} color="currentColor"/> },
      { to: '/lits',        label: 'Gestion des Lits',    Icon: () => <Ico.Bed s={16}/> },
      { to: '/admission',   label: 'Admission Patient',   Icon: () => <Ico.Admission s={16}/> },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/carte',        label: 'Carte Géographique', Icon: () => <Ico.Map s={16}/> },
      { to: '/tableau',      label: 'Données Brutes',     Icon: () => <IconUsers size={16} color="currentColor"/> },
      { to: '/alertes',      label: 'Alertes & Seuils',   Icon: () => <IconBell size={16} color="currentColor"/> },
      { to: '/utilisateurs', label: 'Utilisateurs',       Icon: () => <Ico.Settings s={16}/> },
    ],
  },
];

/* ── Component ────────────────────────────────────────── */
const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const allowedPaths = ROLE_PERMISSIONS[user?.role ?? 'admin'] ?? [];
  const roleLabel = ROLE_LABELS[user?.role ?? 'admin'] ?? 'Utilisateur';

  const handleLogout = () => { logout(); navigate('/login'); };

  const w = collapsed ? 68 : 240;

  return (
    <nav style={{
      width: w,
      minWidth: w,
      height: '100vh',
      background: '#0C1220',
      borderRight: '1px solid #1A2640',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      overflowY: 'auto',
      overflowX: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── Logo ────────────────────────────── */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 16px' : '0 16px 0 20px',
        borderBottom: '1px solid #1A2640',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#2563EB,#0EA5E9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img src={logoChu} alt="CHU" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'brightness(10)' }} />
            </div>
            <div>
              <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>CHU Ibn Sina</div>
              <div style={{ color: '#4B6080', fontSize: 10, fontWeight: 500 }}>Urgences · Analytics</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#2563EB,#0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={logoChu} alt="CHU" style={{ width: 20, height: 20, objectFit: 'contain', filter: 'brightness(10)' }} />
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid #1A2640',
            borderRadius: 6, width: 24, height: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4B6080', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#8B9CB3'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#4B6080'; }}
          >
            <Ico.Chevron s={12} />
          </button>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            position: 'absolute', right: -12, top: 20,
            background: '#0C1220', border: '1px solid #1A2640',
            borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4B6080', zIndex: 10,
          }}>
            <Ico.Chevron s={11} flip />
          </button>
        )}
      </div>

      {/* ── Nav sections ────────────────────── */}
      <div style={{ flex: 1, padding: '12px 0', overflow: 'hidden' }}>
        {SECTIONS.map(section => {
          const visible = section.items.filter(({ to }) => allowedPaths.includes(to));
          if (!visible.length) return null;
          return (
            <div key={section.label} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{
                  padding: '10px 20px 5px',
                  fontSize: 10, fontWeight: 700,
                  color: '#2D4060',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}>
                  {section.label}
                </div>
              )}
              {collapsed && <div style={{ height: 8 }} />}
              <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {visible.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    title={collapsed ? label : undefined}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#FFFFFF' : '#6B7E99',
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(37,99,235,0.9) 0%, rgba(37,99,235,0.7) 100%)'
                        : 'transparent',
                      transition: 'all 0.13s',
                      position: 'relative',
                    })}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      if (!el.style.background.includes('235')) {
                        el.style.background = 'rgba(255,255,255,0.05)';
                        el.style.color = '#B0BECC';
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      if (!el.style.background.includes('235')) {
                        el.style.background = 'transparent';
                        el.style.color = '#6B7E99';
                      }
                    }}
                  >
                    <Icon />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── User footer ─────────────────────── */}
      <div style={{
        borderTop: '1px solid #1A2640',
        padding: collapsed ? '12px 8px' : '12px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          {user?.username?.[0]?.toUpperCase() || 'A'}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#D1DCE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || 'admin'}
              </div>
              <div style={{ fontSize: 10, color: '#4B6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {roleLabel}
              </div>
            </div>
            <button onClick={handleLogout} title="Déconnexion" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3D5070', padding: '5px', borderRadius: 6,
              display: 'flex', alignItems: 'center', transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3D5070')}
            >
              <Ico.Logout s={15} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;
