import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePageTheme } from '../theme';

interface User {
  username: string;
  role: string;
  nom_complet: string;
  actif: number;
  created_at: string;
  etablissement: string;
  password_plain: string;
}

const ROLES = [
  { value: 'admin',        label: 'Administrateur' },
  { value: 'chef_medecin', label: 'Médecin Chef' },
  { value: 'urgentiste',   label: 'Médecin Urgentiste' },
  { value: 'infirmier',    label: 'Cadre Infirmier' },
  { value: 'directeur',    label: 'Directeur Médical' },
  { value: 'analyste',     label: 'Data Analyst' },
  { value: 'admin_si',     label: 'Admin SI' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444', chef_medecin: '#3B82F6', urgentiste: '#8B5CF6',
  infirmier: '#22C55E', directeur: '#F59E0B', analyste: '#06B6D4', admin_si: '#F97316',
};

const ETABLISSEMENTS = [
  '', 'Hopital Ibn Sina', 'Hopital des Enfants', 'Hopital Al Ayachi', 'Hopital Ar-Razi',
  'Hopital des Specialites', 'Hopital de Maternite et de Sante Reproductrice les Orangers',
  'Hopital Moulay Youssef', 'Hopital de Maternite Souissi', 'CHU Ibn Sina',
];

const IconUsers: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconEye: React.FC<{ off?: boolean }> = ({ off }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </> : <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </>}
  </svg>
);

const EMPTY_FORM = { username: '', password: '', role: 'urgentiste', nom_complet: '', etablissement: '' };

const GestionUtilisateurs: React.FC = () => {
  const { dark } = useTheme();
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [newPassword, setNewPassword]     = useState('');

  const {
    cardBg, cardBg2, innerBg, border: themeBorder, pageBg, textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor, cardShadow, card,
  } = usePageTheme();
  const bg      = pageBg;
  const border  = themeBorder;
  const text    = textPrimary;
  const muted   = textMuted;
  const headerBg = innerBg;
  const inputBg  = innerBg;
  const overlay  = 'rgba(0,0,0,0.55)';

  const token = () => localStorage.getItem('token');
  const authH = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    try {
      const r = await axios.get('/api/users', { headers: authH() });
      setUsers(r.data);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (t: string, ok: boolean) => {
    setMsg({ text: t, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const toggleShowPass = (username: string) => {
    setShowPasswords(prev => {
      const next = new Set(prev);
      next.has(username) ? next.delete(username) : next.add(username);
      return next;
    });
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setNewPassword('');
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await axios.patch(`/api/users/${editUser.username}`, {
        password:      newPassword || undefined,
        role:          editUser.role,
        nom_complet:   editUser.nom_complet,
        actif:         editUser.actif,
        etablissement: editUser.etablissement,
      }, { headers: authH() });
      flash('Utilisateur modifié avec succès', true);
      setEditUser(null);
      load();
    } catch (err: any) {
      flash(err.response?.data?.detail || 'Erreur', false);
    } finally { setSaving(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/users', form, { headers: authH() });
      flash('Utilisateur créé avec succès', true);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      flash(err.response?.data?.detail || 'Erreur', false);
    } finally { setSaving(false); }
  };

  const toggleActif = async (u: User) => {
    try {
      await axios.patch(`/api/users/${u.username}`, {
        actif: u.actif === 1 ? 0 : 1,
        role: u.role, nom_complet: u.nom_complet, etablissement: u.etablissement,
      }, { headers: authH() });
      load();
    } catch { flash('Erreur', false); }
  };

  const deleteUser = async (username: string) => {
    if (!window.confirm(`Supprimer "${username}" ?`)) return;
    try {
      await axios.delete(`/api/users/${username}`, { headers: authH() });
      flash('Supprimé', true);
      load();
    } catch (err: any) { flash(err.response?.data?.detail || 'Erreur', false); }
  };

  const seedDirectors = async () => {
    if (!window.confirm('Créer/mettre à jour les comptes directeurs depuis la table personnel ?')) return;
    setSeeding(true); setSeedResult(null);
    try {
      const r = await axios.post('/api/users/seed-directors', {}, { headers: authH() });
      setSeedResult(r.data);
      flash(`${r.data.total_created} créé(s), ${r.data.total_updated} mis à jour`, true);
      load();
    } catch (err: any) {
      flash(err.response?.data?.detail || 'Erreur', false);
    } finally { setSeeding(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: inputBg, color: text,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  // Grouper par rôle
  const byRole: Record<string, User[]> = {};
  users.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  });

  if (loading) return <LoadingSpinner text="Chargement des utilisateurs..." />;

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <PageHeader
        icon={<IconUsers />}
        title="Gestion des Utilisateurs"
        subtitle="Comptes, rôles et accès par établissement"
        badge={`${users.length} comptes`}
      />

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: msg.ok ? '#D1FAE5' : '#FEE2E2', color: msg.ok ? '#065F46' : '#991B1B', fontWeight: 600, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvel utilisateur
        </button>
        <button onClick={seedDirectors} disabled={seeding} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#D97706,#F59E0B)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: seeding ? 0.7 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {seeding ? 'Création...' : 'Créer comptes Directeurs'}
        </button>
      </div>

      {/* Résultat seed */}
      {seedResult && (
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: 20, marginBottom: 20 }}>
          <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, border: '1px solid #F59E0B', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>Mot de passe pour tous les directeurs</div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#D97706', letterSpacing: 2 }}>{seedResult.mot_de_passe_defaut}</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Nom','Établissement','Username','Mot de passe','État'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...seedResult.created.map((c: any) => ({ ...c, _s: 'créé' })), ...seedResult.updated.map((c: any) => ({ ...c, _s: 'mis à jour' }))].map((c: any, i: number) => (
                <tr key={c.username} style={{ background: i%2===0 ? 'transparent' : (dark?'#0f172a30':'#f8fafc') }}>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: text }}>{c.nom_complet}</td>
                  <td style={{ padding: '7px 10px', color: muted, fontSize: 11 }}>{c.etablissement}</td>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#3B82F6', fontWeight: 800 }}>{c.username}</td>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#D97706', fontWeight: 700 }}>{c.mot_de_passe}</td>
                  <td style={{ padding: '7px 10px' }}><span style={{ background: c._s==='créé'?'#D1FAE5':'#DBEAFE', color: c._s==='créé'?'#065F46':'#1D4ED8', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 10 }}>{c._s}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form création */}
      {showCreate && (
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 16 }}>Créer un utilisateur</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Username *</label>
                <input required style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ex: m.benali"/></div>
              <div><label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Mot de passe *</label>
                <input required type="password" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/></div>
              <div><label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Nom complet</label>
                <input style={inputStyle} value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))} placeholder="Dr. Prénom Nom"/></div>
              <div><label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Rôle *</label>
                <select required style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Établissement (directeurs)</label>
                <select style={inputStyle} value={form.etablissement} onChange={e => setForm(f => ({ ...f, etablissement: e.target.value }))}>
                  {ETABLISSEMENTS.map(e => <option key={e} value={e}>{e || '— Aucun (accès global) —'}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1D4ED8', color: '#fff', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement...' : 'Créer'}</button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: muted, fontSize: 13 }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau utilisateurs groupé par rôle */}
      {ROLES.map(roleObj => {
        const group = byRole[roleObj.value];
        if (!group?.length) return null;
        const rc = ROLE_COLORS[roleObj.value] || '#64748B';
        return (
          <div key={roleObj.value} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: rc, textTransform: 'uppercase', letterSpacing: 1 }}>{roleObj.label}</span>
              <span style={{ fontSize: 11, background: `${rc}20`, color: rc, borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>{group.length}</span>
              <div style={{ flex: 1, height: 1, background: border }}/>
            </div>
            <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: headerBg, borderBottom: `1px solid ${border}` }}>
                    {['Utilisateur','Nom complet','Établissement','Mot de passe','Statut','Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.map((u, i) => {
                    const rowBg = dark ? (i%2===0?'#1e293b':'#162032') : (i%2===0?'#fff':'#FAFBFC');
                    const passVisible = showPasswords.has(u.username);
                    return (
                      <tr key={u.username} style={{ background: rowBg, borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${rc}99,${rc})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>
                              {u.username[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 700, color: text }}>{u.username}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: muted }}>{u.nom_complet || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {u.etablissement ? (
                            <span style={{ fontSize: 11, background: '#F59E0B20', color: '#D97706', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{u.etablissement}</span>
                          ) : <span style={{ color: muted, fontSize: 11 }}>Accès global</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, color: text, letterSpacing: passVisible ? 0 : 2 }}>
                              {passVisible ? (u.password_plain || '••••••••') : '••••••••'}
                            </span>
                            <button onClick={() => toggleShowPass(u.username)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 2, display: 'flex', alignItems: 'center' }}>
                              <IconEye off={passVisible} />
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: u.actif ? '#D1FAE5' : '#FEE2E2', color: u.actif ? '#065F46' : '#991B1B', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 11 }}>
                            {u.actif ? 'Actif' : 'Désactivé'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: '#3B82F6', fontSize: 11, fontWeight: 600 }}>Modifier</button>
                            <button onClick={() => toggleActif(u)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: u.actif ? '#FEF3C7' : '#D1FAE5', cursor: 'pointer', color: u.actif ? '#D97706' : '#065F46', fontSize: 11, fontWeight: 600 }}>
                              {u.actif ? 'Désactiver' : 'Activer'}
                            </button>
                            {u.username !== 'admin' && (
                              <button onClick={() => deleteUser(u.username)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#FEE2E2', cursor: 'pointer', color: '#991B1B', fontSize: 11, fontWeight: 600 }}>Supprimer</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* ── MODAL MODIFIER ── */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: cardBg, borderRadius: 16, padding: 32, width: 500, border: `1px solid ${border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${ROLE_COLORS[editUser.role] || '#64748b'}99,${ROLE_COLORS[editUser.role] || '#64748b'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                {editUser.username[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: text }}>{editUser.username}</div>
                <div style={{ fontSize: 12, color: muted }}>{editUser.nom_complet}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nom complet */}
              <div>
                <label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Nom complet</label>
                <input style={inputStyle} value={editUser.nom_complet} onChange={e => setEditUser({ ...editUser, nom_complet: e.target.value })} placeholder="Dr. Prénom Nom"/>
              </div>

              {/* Rôle */}
              <div>
                <label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Rôle</label>
                <select style={inputStyle} value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Établissement */}
              <div>
                <label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                  Établissement assigné
                  <span style={{ marginLeft: 6, fontSize: 10, color: muted, fontWeight: 400 }}>(le directeur ne verra que cet établissement)</span>
                </label>
                <select style={inputStyle} value={editUser.etablissement} onChange={e => setEditUser({ ...editUser, etablissement: e.target.value })}>
                  {ETABLISSEMENTS.map(e => <option key={e} value={e}>{e || '— Aucun (accès global) —'}</option>)}
                </select>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                  Nouveau mot de passe
                  <span style={{ marginLeft: 6, fontSize: 10, color: muted, fontWeight: 400 }}>
                    (actuel : <span style={{ fontFamily: 'monospace', color: '#F59E0B', fontWeight: 700 }}>{editUser.password_plain || '—'}</span>)
                  </span>
                </label>
                <input type="text" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer"/>
              </div>

              {/* Statut */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 11, color: muted, fontWeight: 700, textTransform: 'uppercase' }}>Compte actif</label>
                <button
                  onClick={() => setEditUser({ ...editUser, actif: editUser.actif === 1 ? 0 : 1 })}
                  style={{ padding: '5px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                    background: editUser.actif ? '#D1FAE5' : '#FEE2E2', color: editUser.actif ? '#065F46' : '#991B1B' }}>
                  {editUser.actif ? 'Actif' : 'Désactivé'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: muted, fontWeight: 600 }}>Annuler</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a3bdb,#3b82f6)', color: '#fff', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUtilisateurs;
