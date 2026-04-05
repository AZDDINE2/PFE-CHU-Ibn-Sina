/**
 * EmailModal — Modal d'envoi de rapport PDF par email
 * Usage: <EmailModal open onClose={...} pdfBase64={...} filename="rapport.pdf" />
 */
import React, { useState } from 'react';
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

const EmailModal: React.FC<Props> = ({ open, onClose, pdfBase64, filename = 'rapport_CHU.pdf', pageTitle }) => {
  const { dark }    = useTheme();
  const { showToast } = useToast();
  const [to, setTo]   = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const bg     = dark ? '#1e293b' : '#fff';
  const border = dark ? '#334155' : '#e2e8f0';
  const text   = dark ? '#e2e8f0' : '#0f172a';
  const muted  = dark ? '#94a3b8' : '#64748b';
  const inputBg= dark ? '#0f172a' : '#f8fafc';

  const handleSend = async () => {
    if (!to || !to.includes('@')) {
      showToast({ type: 'warning', title: 'Email invalide', message: 'Veuillez entrer une adresse email valide.' });
      return;
    }
    setSending(true);
    try {
      await axios.post('/api/email/send', {
        to,
        subject: `Rapport CHU Ibn Sina — ${pageTitle || 'Dashboard Urgences'}`,
        body: `Bonjour,\n\nVeuillez trouver ci-joint le rapport "${pageTitle || 'Dashboard Urgences'}" généré automatiquement depuis le Dashboard CHU Ibn Sina.\n\nCordialement,\nDashboard Gestion des Urgences — CHU Ibn Sina Rabat`,
        pdf_base64: pdfBase64,
        filename,
      });
      showToast({ type: 'success', title: 'Email envoyé', message: `Rapport envoyé à ${to}` });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erreur lors de l\'envoi.';
      showToast({ type: 'error', title: 'Échec envoi email', message: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: bg, borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}`,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: text, display: 'flex', alignItems: 'center', gap: 6 }}><IconMail size={14} color="currentColor"/> Envoyer par email</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Rapport PDF — {pageTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 20 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Destinataire
            </label>
            <input
              type="email" value={to} onChange={e => setTo(e.target.value)}
              placeholder="directeur@chuis.ma"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${border}`, background: inputBg, color: text,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: dark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, color: muted }}>Fichier joint</div>
            <div style={{ fontSize: 13, color: text, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}><IconPaperclip size={14} color="currentColor"/> {filename}</div>
          </div>

          {!pdfBase64 && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: 12 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><IconAlertTriangle size={14} color="#92400e"/> Aucun PDF joint. Générez d'abord un rapport depuis la page.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 8, border: `1px solid ${border}`,
            background: 'transparent', color: text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Annuler</button>
          <button onClick={handleSend} disabled={sending || !pdfBase64} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: sending || !pdfBase64 ? '#94a3b8' : 'linear-gradient(135deg,#1a3bdb,#3b82f6)',
            color: '#fff', cursor: sending || !pdfBase64 ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>
            {sending ? 'Envoi en cours...' : 'Envoyer →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
