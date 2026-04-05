import React from 'react';

interface IconProps { size?: number; color?: string; style?: React.CSSProperties; }

const Svg = ({ size=18, color='currentColor', style, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle', ...style }}>
    {children}
  </svg>
);

/* ── Sidebar / navigation ─────────────────────────────────────────────── */
export const IconDashboard = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Svg>;
export const IconChart     = (p: IconProps) => <Svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
export const IconBrain     = (p: IconProps) => <Svg {...p}><path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5a2.5 2.5 0 0 1-5 0V2z"/><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4z"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="8" y1="12" x2="16" y2="12"/></Svg>;
export const IconFilter    = (p: IconProps) => <Svg {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Svg>;
export const IconChevronRight = (p: IconProps) => <Svg size={14} {...p}><polyline points="9 18 15 12 9 6"/></Svg>;
export const IconChevronDown  = (p: IconProps) => <Svg size={14} {...p}><polyline points="6 9 12 15 18 9"/></Svg>;
export const IconX         = (p: IconProps) => <Svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;

/* ── Medical ──────────────────────────────────────────────────────────── */
export const IconHospital    = (p: IconProps) => <Svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></Svg>;
export const IconBed         = (p: IconProps) => <Svg {...p}><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></Svg>;
export const IconStethoscope = (p: IconProps) => <Svg {...p}><path d="M4.5 2h-1A1.5 1.5 0 0 0 2 3.5v1A6.5 6.5 0 0 0 8.5 11v1a5.5 5.5 0 0 0 11 0v-3"/><circle cx="19.5" cy="8.5" r="2.5"/></Svg>;
export const IconPill        = (p: IconProps) => <Svg {...p}><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/><circle cx="17" cy="17" r="5"/><path d="m14.5 19.5 5-5"/></Svg>;
export const IconUserMd      = (p: IconProps) => <Svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></Svg>;
export const IconAmbulance   = (p: IconProps) => <Svg {...p}><path d="M10 17H7a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M14 17h3a4 4 0 0 0 4-4v-1l-3-6h-6v10"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Svg>;

/* ── Status / alerts ──────────────────────────────────────────────────── */
export const IconAlertTriangle = (p: IconProps) => <Svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
export const IconAlert         = (p: IconProps) => <Svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
export const IconAlertCircle   = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Svg>;
export const IconCheckCircle   = (p: IconProps) => <Svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Svg>;
export const IconCheck         = (p: IconProps) => <Svg {...p}><polyline points="20 6 9 17 4 12"/></Svg>;
export const IconXCircle       = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></Svg>;
export const IconShield        = (p: IconProps) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>;
export const IconInfo          = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Svg>;

/* ── Data / charts ────────────────────────────────────────────────────── */
export const IconBarChart    = (p: IconProps) => <Svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>;
export const IconTrendingUp  = (p: IconProps) => <Svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Svg>;
export const IconTrendingDown= (p: IconProps) => <Svg {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></Svg>;
export const IconTrend       = (p: IconProps) => <Svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Svg>;
export const IconActivity    = (p: IconProps) => <Svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
export const IconClipboard   = (p: IconProps) => <Svg {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></Svg>;

/* ── Actions / UI ─────────────────────────────────────────────────────── */
export const IconTarget      = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Svg>;
export const IconLightbulb   = (p: IconProps) => <Svg {...p}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></Svg>;
export const IconWand        = (p: IconProps) => <Svg {...p}><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2 11 5"/></Svg>;
export const IconTrophy      = (p: IconProps) => <Svg {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></Svg>;
export const IconSwords      = (p: IconProps) => <Svg {...p}><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><polyline points="7.5 4.5 6 3 3 6"/><polyline points="17.5 14.5 19 16 16 19"/></Svg>;
export const IconLoader      = (p: IconProps) => <Svg {...p}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></Svg>;
export const IconRefreshCw   = (p: IconProps) => <Svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Svg>;
export const IconUsers       = (p: IconProps) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>;
export const IconArrowUp     = (p: IconProps) => <Svg {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></Svg>;
export const IconArrowDown   = (p: IconProps) => <Svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></Svg>;
export const IconMapPin      = (p: IconProps) => <Svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Svg>;
export const IconCalendar    = (p: IconProps) => <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Svg>;
export const IconClock       = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
export const IconSun         = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></Svg>;
export const IconMedal       = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></Svg>;
export const IconPackage     = (p: IconProps) => <Svg {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;

/* ── Colored status dots ─────────────────────────────────────────────── */
export const DotRed    = ({ size=10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle' }}>
    <circle cx="5" cy="5" r="4" fill="#EF4444"/>
  </svg>
);
export const DotGreen  = ({ size=10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle' }}>
    <circle cx="5" cy="5" r="4" fill="#22C55E"/>
  </svg>
);
export const DotYellow = ({ size=10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle' }}>
    <circle cx="5" cy="5" r="4" fill="#F59E0B"/>
  </svg>
);
export const DotBlue   = ({ size=10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle' }}>
    <circle cx="5" cy="5" r="4" fill="#3B82F6"/>
  </svg>
);
export const DotGray   = ({ size=10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ display:'inline-block', flexShrink:0, verticalAlign:'middle' }}>
    <circle cx="5" cy="5" r="4" fill="#6B7280"/>
  </svg>
);

/* ── Extra icons ─────────────────────────────────────────────────────── */
export const IconMail        = (p: IconProps) => <Svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Svg>;
export const IconSave        = (p: IconProps) => <Svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Svg>;
export const IconBook        = (p: IconProps) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Svg>;
export const IconSearch      = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>;
export const IconPaperclip   = (p: IconProps) => <Svg {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Svg>;
export const IconFileText    = (p: IconProps) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Svg>;
export const IconStar        = (p: IconProps) => <Svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
export const IconBell        = (p: IconProps) => <Svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>;
export const IconSettings    = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>;
export const IconGrid        = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Svg>;
export const IconThermometer = (p: IconProps) => <Svg {...p}><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></Svg>;
export const IconLink        = (p: IconProps) => <Svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Svg>;
export const IconWalk        = (p: IconProps) => <Svg {...p}><circle cx="12" cy="4" r="1.5"/><path d="M9 12l-2 8"/><path d="M15 12l2 8"/><path d="M9 12h6l-1-5h-4z"/><path d="M7 20l2-8"/><path d="M17 20l-2-8"/></Svg>;
export const IconDownload    = (p: IconProps) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>;

/* ── Rank medals (1st / 2nd / 3rd) ──────────────────────────────────── */
export const Medal1 = ({ size=22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display:'inline-block', verticalAlign:'middle' }}>
    <circle cx="12" cy="12" r="10" fill="#F59E0B" opacity={0.18}/>
    <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth={1.5}/>
    <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F59E0B" fontFamily="system-ui">1</text>
  </svg>
);
export const Medal2 = ({ size=22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display:'inline-block', verticalAlign:'middle' }}>
    <circle cx="12" cy="12" r="10" fill="#94A3B8" opacity={0.18}/>
    <circle cx="12" cy="12" r="10" stroke="#94A3B8" strokeWidth={1.5}/>
    <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94A3B8" fontFamily="system-ui">2</text>
  </svg>
);
export const Medal3 = ({ size=22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display:'inline-block', verticalAlign:'middle' }}>
    <circle cx="12" cy="12" r="10" fill="#CD7C32" opacity={0.18}/>
    <circle cx="12" cy="12" r="10" stroke="#CD7C32" strokeWidth={1.5}/>
    <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#CD7C32" fontFamily="system-ui">3</text>
  </svg>
);
