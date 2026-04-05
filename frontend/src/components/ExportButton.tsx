import React, { useState } from 'react';

interface Props {
  label?: string;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  csvUrl?: string;
  excelUrl?: string;
}

const ExportButton: React.FC<Props> = ({ label = 'Exporter', onExportCSV, onExportPDF, csvUrl, excelUrl }) => {
  const [open, setOpen] = useState(false);

  const handleCSV = () => {
    setOpen(false);
    if (csvUrl) {
      const a = document.createElement('a');
      a.href = csvUrl;
      a.download = '';
      a.click();
    } else if (onExportCSV) onExportCSV();
  };

  const handleExcel = () => {
    setOpen(false);
    const a = document.createElement('a');
    a.href = excelUrl || '/api/export/excel';
    a.download = '';
    a.click();
  };

  const handlePDF = () => { setOpen(false); onExportPDF?.(); };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#fff', border: '1.5px solid #E2E8F0',
        borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
        fontSize: 12, fontWeight: 600, color: '#475569',
        boxShadow: '0 1px 4px rgba(22,36,84,0.07)',
        transition: 'all 0.15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,31,74,0.14)',
          border: '1px solid #E2E8F0', zIndex: 100, minWidth: 160, overflow: 'hidden',
        }}>
          {(onExportCSV || csvUrl) && (
            <button onClick={handleCSV} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, color: '#475569', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
              Exporter CSV
            </button>
          )}
          <button onClick={handleExcel} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, color: '#475569', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
              </svg>
              Exporter Excel
            </button>
          {onExportPDF && (
            <button onClick={handlePDF} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, color: '#475569', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Exporter PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
