import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label?: string;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  csvUrl?: string;
  excelUrl?: string;
  /** true = bouton placé sur un fond sombre (PageHeader gradient) */
  onDark?: boolean;
}

/* Téléchargement fiable cross-browser (Firefox inclus) */
const triggerDownload = (url: string, filename?: string) => {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
};

const Spinner: React.FC<{ color?: string }> = ({ color = '#475569' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
    strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite' }}>
    <line x1="12" y1="2"  x2="12" y2="6"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2"  y1="12" x2="6"  y2="12"/>
    <line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
    <line x1="16.24" y1="7.76"  x2="19.07" y2="4.93"/>
  </svg>
);

const ExportButton: React.FC<Props> = ({
  label = 'Exporter',
  onExportCSV,
  onExportPDF,
  csvUrl,
  excelUrl,
  onDark = false,
}) => {
  const { dark }  = useTheme();
  const [open, setOpen]         = useState(false);
  const [loadCSV, setLoadCSV]   = useState(false);
  const [loadXLSX, setLoadXLSX] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Fermer sur clic extérieur */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCSV = async () => {
    setOpen(false);
    if (csvUrl) {
      setLoadCSV(true);
      try { triggerDownload(csvUrl, 'urgences_CHU_Ibn_Sina.csv'); }
      finally { setTimeout(() => setLoadCSV(false), 1500); }
    } else if (onExportCSV) { onExportCSV(); }
  };

  const handleExcel = async () => {
    setOpen(false);
    setLoadXLSX(true);
    try { triggerDownload(excelUrl || '/api/export/excel', 'CHU_Ibn_Sina_Data.xlsx'); }
    finally { setTimeout(() => setLoadXLSX(false), 2500); }
  };

  const handlePDF = () => { setOpen(false); onExportPDF?.(); };

  /* Thème */
  const bg     = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#E2E8F0';
  const text   = dark ? '#cbd5e1' : '#475569';
  const hover  = dark ? '#334155' : '#F8FAFC';
  const shadow = dark
    ? '0 8px 24px rgba(0,0,0,0.4)'
    : '0 8px 24px rgba(15,31,74,0.14)';

  /* Style bouton selon contexte */
  const btnBg     = onDark ? 'rgba(255,255,255,0.15)' : (dark ? '#1e293b' : '#ffffff');
  const btnBorder = onDark ? 'rgba(255,255,255,0.28)' : border;
  const btnText   = onDark ? '#ffffff' : text;
  const btnShadow = onDark ? 'none' : `0 1px 4px rgba(22,36,84,${dark ? '0.2' : '0.07'})`;

  const isLoading = loadCSV || loadXLSX;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>

      {/* Bouton principal */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: btnBg,
          border: `1.5px solid ${btnBorder}`,
          borderRadius: 8, padding: '7px 14px', cursor: isLoading ? 'wait' : 'pointer',
          fontSize: 12, fontWeight: 600, color: btnText,
          boxShadow: btnShadow,
          transition: 'all 0.15s',
        }}
      >
        {isLoading
          ? <Spinner color={btnText}/>
          : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )
        }
        {isLoading ? (loadCSV ? 'CSV...' : 'Excel...') : label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: bg, borderRadius: 10,
          boxShadow: shadow,
          border: `1px solid ${border}`,
          zIndex: 1000, minWidth: 200, overflow: 'hidden',
        }}>

          {/* CSV */}
          {(onExportCSV || csvUrl) && (
            <MenuItem
              onClick={handleCSV}
              icon={<CsvIcon/>}
              label="Exporter CSV"
              sub=".csv · Toutes les données"
              hover={hover} text={text}
            />
          )}

          {/* Excel */}
          <MenuItem
            onClick={handleExcel}
            icon={<XlsxIcon/>}
            label="Exporter Excel"
            sub=".xlsx · 3 feuilles (Urgences, Soins, Établissements)"
            hover={hover} text={text}
          />

          {/* PDF */}
          {onExportPDF && (
            <MenuItem
              onClick={handlePDF}
              icon={<PdfIcon/>}
              label="Exporter PDF"
              sub="Rapport officiel CHU Ibn Sina"
              hover={hover} text={text}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ── Item ligne du dropdown ─── */
const MenuItem: React.FC<{
  onClick: () => void; icon: React.ReactNode;
  label: string; sub: string;
  hover: string; text: string;
}> = ({ onClick, icon, label, sub, hover, text }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '10px 14px', border: 'none', background: 'none',
      cursor: 'pointer', textAlign: 'left',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = hover)}
    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
  >
    <div style={{ flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{label}</div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{sub}</div>
    </div>
  </button>
);

/* ── Icônes formats ─── */
const CsvIcon = () => (
  <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="#D1FAE5"/>
    <text x="4" y="27" fontSize="14" fontWeight="800" fill="#065F46" fontFamily="monospace">CSV</text>
  </svg>
);
const XlsxIcon = () => (
  <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="#DCFCE7"/>
    <text x="2" y="27" fontSize="12" fontWeight="800" fill="#166534" fontFamily="monospace">XLSX</text>
  </svg>
);
const PdfIcon = () => (
  <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="#FEE2E2"/>
    <text x="3" y="27" fontSize="13" fontWeight="800" fill="#991B1B" fontFamily="monospace">PDF</text>
  </svg>
);

export default ExportButton;
