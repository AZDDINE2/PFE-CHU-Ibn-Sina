/**
 * EmailModal — Modal d'envoi de rapport PDF par email
 * Usage: <EmailModal open onClose={...} pdfBase64={...} filename="rapport.pdf" />
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { IconMail, IconPaperclip, IconAlertTriangle } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  pdfBase64?: string;
  filename?: string;
  pageTitle?: string;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const EmailModal: React.FC<Props> = ({
  open, onClose, pdfBase64, filename = 'rapport_CHU.pdf', pageTitle,
}) => {
  const { dark }     = useTheme();
  const { showToast } = useToast();
  const [to,      setTo]      = useState('');
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  /* Réinitialiser à l'ouverture */
  useEffect(() => {
    if (open) { setTo(''); setTouched(false); }
  }, [open]);

  if (!open) return null;

  const bg      = dark ? '#1e293b' : '#fff';
  const border  = dark ? '#334155' : '#e2e8f0';
  const text    = dark ? '#e2e8f0' : '#0f172a';
  const muted   = dark ? '#94a3b8' : '#64748b';
  const inputBg = dark ? '#0f172a' : '#f8fafc';

  const emailOk  = isValidEmail(to);
  const showErr  = touched && !emailOk && to.length > 0;
  const canSend  = emailOk && !!pdfBase64 && !sending;

  const handleSend = async () => {
    setTouched(true);
    if (!emailOk) {
      showToast({ type: 'warning', title: 'Email invalide', message: 'Veuillez entrer une adresse email valide.' });
      return;
    }
    if (!pdfBase64) {
      showToast({ type: 'warning', title: 'Aucun PDF', message: 'Générez d\'abord un rapport PDF depuis la page.' });
      return;
    }
    setSending(true);
    try {
      await axios.post('/api/email/send', {
        to: to.trim(),
        subject: `Rapport CHU Ibn Sina — ${pageTitle || 'Dashboard Urgences'}`,
        body: `Bonjour,\n\nVeuillez trouver ci-joint le rapport "${pageTitle || 'Dashboard Urgences'}" généré automatiquement depuis le Dashboard CHU Ibn Sina.\n\nCordialement,\nDashboard Gestion des Urgences — CHU Ibn Sina Rabat`,
        pdf_base64: pdfBase64,
        filename,
      });
      showToast({ type: 'success', title: 'Email envoyé', message: `Rapport envoyé à ${to.trim()}` });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erreur lors de l\'envoi.';
      showToast({ type: 'error', title: 'Échec envoi email', message: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg, borderRadius: 16, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: `1px solid ${border}`,
          animation: 'fadeInUp 0.2s ease',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: text, display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconMail size={15} color="#3B82F6"/> Envoyer par email
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {pageTitle ? `Rapport — ${pageTitle}` : 'Rapport PDF CHU Ibn Sina'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 22, lineHeight: 1 }}
          >×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Champ email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Destinataire *
            </label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="directeur@chuis.ma"
              disabled={sending}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1.5px solid ${showErr ? '#EF4444' : emailOk && touched ? '#22C55E' : border}`,
                background: sending ? (dark ? '#0a0f1c' : '#f1f5f9') : inputBg,
                color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                cursor: sending ? 'not-allowed' : 'text',
              }}
              onFocus={e => { e.target.style.borderColor = showErr ? '#EF4444' : '#3B82F6'; }}
              onBlur={e => { setTouched(true); e.target.style.borderColor = showErr ? '#EF4444' : (emailOk ? '#22C55E' : border); }}
            />
            {showErr && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Adresse email invalide
              </div>
            )}
          </div>

          {/* Aperçu sujet */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: dark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}` }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Sujet de l'email</div>
            <div style={{ fontSize: 12, color: text, fontWeight: 600 }}>
              Rapport CHU Ibn Sina — {pageTitle || 'Dashboard Urgences'}
            </div>
          </div>

          {/* Fichier joint */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: dark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: pdfBase64 ? '#FEE2E2' : (dark ? '#1e293b' : '#f1f5f9'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {pdfBase64
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                : <IconPaperclip size={14} color={muted}/>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pdfBase64 ? filename : 'Aucun fichier joint'}
              </div>
              <div style={{ fontSize: 11, color: muted }}>
                {pdfBase64 ? 'PDF généré — prêt à envoyer' : 'Générez d\'abord un PDF depuis la page'}
              </div>
            </div>
            {pdfBase64 && (
              <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 700, background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>✓ Prêt</span>
            )}
          </div>

          {/* Alerte SMTP */}
          {!pdfBase64 && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFF7ED', color: '#C2410C', fontSize: 12, border: '1px solid #FFEDD5', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <IconAlertTriangle size={14} color="#C2410C"/>
              <span>Aucun PDF disponible. Cliquez sur "Exporter PDF" d'abord, puis ouvrez ce dialog.</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {sending && (
            <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" style={{ animation: 'spin 0.9s linear infinite' }}>
                <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
              Envoi en cours...
            </span>
          )}
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '9px 16px', borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', color: sending ? muted : text,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >Annuler</button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: canSend ? 'linear-gradient(135deg,#1a3bdb,#3b82f6)' : '#94a3b8',
              color: '#fff',
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <IconMail size={13} color="white"/>
            {sending ? 'Envoi...' : 'Envoyer →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
