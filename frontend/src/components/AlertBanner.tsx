import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Alerte { etablissement: string; type: string; valeur: string; seuil: string; niveau: string; }

const AlertBanner: React.FC = () => {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    axios.get('/api/alertes')
      .then(r => setAlertes(r.data))
      .catch(() => {});
  }, []);

  if (!visible || alertes.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg,#FEF2F2,#FFF7ED)',
      border: '1px solid #FECACA',
      borderLeft: '4px solid #EF4444',
      borderRadius: '0 8px 8px 0',
      padding: '10px 16px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontWeight: 700, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {alertes.length} alerte{alertes.length > 1 ? 's' : ''} active{alertes.length > 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {alertes.slice(0, 3).map((a, i) => (
            <span key={i} style={{
              background: a.niveau === 'critique' ? '#FEE2E2' : '#FEF3C7',
              color: a.niveau === 'critique' ? '#DC2626' : '#D97706',
              border: `1px solid ${a.niveau === 'critique' ? '#FECACA' : '#FDE68A'}`,
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>
              {a.etablissement.split(' ').slice(0, 2).join(' ')} — {a.type} ({a.valeur})
            </span>
          ))}
          {alertes.length > 3 && (
            <span style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>+{alertes.length - 3} autres</span>
          )}
        </div>
      </div>
      <button onClick={() => setVisible(false)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#94A3B8', fontSize: 18, lineHeight: 1, padding: '0 4px',
      }}>×</button>
    </div>
  );
};

export default AlertBanner;
