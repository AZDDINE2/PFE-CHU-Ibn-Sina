import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoChu from '../assets/logo_chu.svg';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [user,     setUser]     = useState('');
  const [pass,     setPass]     = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(user, pass);
      navigate('/');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: '1.5px solid #1E2D45', fontSize: 13.5, outline: 'none',
    background: '#0A0F1C', color: '#E2E8F4',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#080D1A',
      overflow: 'hidden',
    }}>
      {/* ── Left panel (decorative) ──────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 64px',
        background: 'linear-gradient(145deg,#071028 0%,#0D1F50 50%,#0E2680 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG circles */}
        {[
          { w: 400, h: 400, r: '50%', top: -100, left: -120, op: 0.07 },
          { w: 280, h: 280, r: '50%', bottom: -60, right: -60, op: 0.05 },
          { w: 160, h: 160, r: '50%', top: '40%', right: '20%', op: 0.06 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: c.w, height: c.h,
            borderRadius: c.r,
            top: c.top, left: c.left,
            bottom: c.bottom, right: c.right,
            background: 'rgba(59,130,246,' + c.op + ')',
            pointerEvents: 'none',
          }} />
        ))}

        <div style={{ position: 'relative', maxWidth: 440 }}>
          {/* Logo */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#2563EB,#0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
          }}>
            <img src={logoChu} alt="CHU" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'brightness(10)' }} />
          </div>

          <h1 style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>
            CHU Ibn Sina<br/>Rabat
          </h1>
          <p style={{ color: '#4B6080', fontSize: 15, lineHeight: 1.6, marginBottom: 40 }}>
            Plateforme d'analyse et de gestion<br/>des urgences hospitalières
          </p>

          {/* Feature list */}
          {[
            { label: 'Tableaux de bord analytiques en temps réel' },
            { label: 'Prédictions IA des flux patients' },
            { label: 'Gestion des ressources humaines et lits' },
          ].map(({ label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(37,99,235,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, color: '#6B7E99' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ───────────────── */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 52px',
        background: '#0C1220',
        borderLeft: '1px solid #1A2640',
      }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
            Connexion
          </h2>
          <p style={{ color: '#4B6080', fontSize: 13 }}>Accédez à votre espace analytique</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3D5070', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>
              Nom d'utilisateur
            </label>
            <input
              value={user} onChange={e => setUser(e.target.value)}
              placeholder="ex: admin"
              autoComplete="username"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#1E2D45'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3D5070', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={pass} onChange={e => setPass(e.target.value)}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#1E2D45'}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#3D5070', padding: 0,
              }}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#EF4444',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 9, border: 'none',
            background: loading
              ? '#1D3A7A'
              : 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
            color: loading ? '#60a5fa' : '#fff',
            fontWeight: 700, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            transition: 'all 0.18s',
            marginTop: 4,
          }}>
            {loading ? 'Connexion en cours...' : 'Se connecter →'}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #1A2640', textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: '#2D4060' }}>
            CHU Ibn Sina Rabat · Système de gestion des urgences · {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
