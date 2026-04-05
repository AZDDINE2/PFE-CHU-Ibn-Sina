import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

interface LayerStats { urgences: number; soins: number; etablissements: number; }
interface Status { bronze: LayerStats; gold: LayerStats; }

const PipelineControl: React.FC = () => {
  const { dark } = useTheme();
  const [status, setStatus]   = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'success'|'error'>('success');

  const surface = dark ? '#1e293b' : '#fff';
  const border  = dark ? '#334155' : '#e2e8f0';
  const text     = dark ? '#f1f5f9' : '#0f172a';
  const muted    = dark ? '#94a3b8' : '#64748b';

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/pipeline/status');
      setStatus(res.data);
    } catch { /* silencieux */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const runPipeline = async () => {
    setRunning(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/pipeline/run',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(res.data.message);
      setMsgType('success');
      await fetchStatus();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || 'Erreur pipeline');
      setMsgType('error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{
      background: surface, border: `1px solid ${border}`, borderRadius: 12,
      padding: '20px 24px', marginBottom: 24
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M22 12H2M22 12l-4-4M22 12l-4 4M2 12l4-4M2 12l4 4"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: text }}>Pipeline ETL — Bronze → Gold</span>
        </div>
        <button
          onClick={runPipeline}
          disabled={running}
          style={{
            background: running ? '#94a3b8' : '#3b82f6',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontWeight: 600, fontSize: 13,
            cursor: running ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          {running ? (
            <>
              <span style={{
                width: 14, height: 14, border: '2px solid #fff',
                borderTopColor: 'transparent', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.8s linear infinite'
              }}/>
              Traitement...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Lancer le pipeline
            </>
          )}
        </button>
      </div>

      {/* Layers */}
      {status && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: msg ? 12 : 0 }}>
          {/* Bronze */}
          <LayerBox label="Bronze" color="#b45309" bg={dark ? '#1c1408' : '#fffbeb'} border="#d97706"
            stats={status.bronze} dark={dark}/>

          {/* Arrow */}
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <path d="M2 12h24M18 6l8 6-8 6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
          </svg>

          {/* Gold */}
          <LayerBox label="Gold" color="#15803d" bg={dark ? '#071a0e' : '#f0fdf4'} border="#16a34a"
            stats={status.gold} dark={dark}/>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: msgType === 'success' ? (dark ? '#0d2818' : '#f0fdf4') : (dark ? '#1f0a0a' : '#fef2f2'),
          color: msgType === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${msgType === 'success' ? '#86efac' : '#fca5a5'}`
        }}>
          {msgType === 'success' ? '✓' : '✗'} {msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const LayerBox: React.FC<{
  label: string; color: string; bg: string; border: string;
  stats: LayerStats; dark: boolean;
}> = ({ label, color, bg, border, stats, dark }) => {
  const muted = dark ? '#94a3b8' : '#64748b';
  return (
    <div style={{
      flex: 1, background: bg, border: `1.5px solid ${border}`,
      borderRadius: 10, padding: '12px 16px'
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {([['Urgences', stats.urgences], ['Soins', stats.soins], ['Établissements', stats.etablissements]] as [string, number][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: muted }}>{k}</span>
            <span style={{ fontWeight: 700, color }}>{v.toLocaleString('fr-FR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineControl;
