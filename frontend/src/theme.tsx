/**
 * Shared design tokens for all pages.
 * Import usePageTheme() in any page component for consistent styling.
 */

export interface PageTheme {
  /* Surfaces */
  pageBg:      string;
  cardBg:      string;
  cardBg2:     string;   // slightly inset / alternate
  innerBg:     string;   // inputs, table headers, nested sections

  /* Borders */
  border:      string;
  borderStrong:string;

  /* Text */
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;

  /* Charts / Tooltips */
  tooltipBg:    string;
  tooltipBorder:string;
  tooltipText:  string;
  cursorFill:   string;
  tickColor:    string;

  /* Shadows */
  cardShadow: string;
  hoverShadow:string;

  /* Common card style (spread onto a div) */
  card: React.CSSProperties;
  cardHover: React.CSSProperties;

  /* Badge style */
  badge: (color: string) => React.CSSProperties;

  /* Section divider style */
  divider: React.CSSProperties;
}

import React from 'react';
import { useTheme } from './context/ThemeContext';

export function usePageTheme(): PageTheme {
  const { dark } = useTheme();

  const pageBg       = dark ? '#0A0F1C' : '#F0F4FF';
  const cardBg       = dark ? '#111827' : '#ffffff';
  const cardBg2      = dark ? '#0D1520' : '#F8FAFC';
  const innerBg      = dark ? '#0A0F1C' : '#F1F5F9';
  const border       = dark ? '#1F2937' : '#E8EDF5';
  const borderStrong = dark ? '#374151' : '#CBD5E1';
  const textPrimary  = dark ? '#F1F5F9' : '#0F172A';
  const textSecondary= dark ? '#94A3B8' : '#475569';
  const textMuted    = dark ? '#4B5563' : '#94A3B8';
  const tooltipBg    = dark ? '#111827' : '#ffffff';
  const tooltipBorder= dark ? '#1F2937' : '#E2E8F0';
  const tooltipText  = dark ? '#F1F5F9' : '#0F172A';
  const cursorFill   = dark ? 'rgba(148,163,184,0.06)' : 'rgba(37,99,235,0.05)';
  const tickColor    = dark ? '#4B5563' : '#94A3B8';
  const cardShadow   = dark
    ? '0 1px 4px rgba(0,0,0,0.35)'
    : '0 1px 4px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)';
  const hoverShadow  = dark
    ? '0 6px 24px rgba(0,0,0,0.45)'
    : '0 6px 24px rgba(15,23,42,0.10)';

  const card: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: cardShadow,
  };

  const cardHover: React.CSSProperties = {
    ...card,
    transition: 'box-shadow 0.18s, transform 0.15s',
    cursor: 'default',
  };

  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: `${color}18`,
    color,
    border: `1px solid ${color}30`,
  });

  const divider: React.CSSProperties = {
    height: 1,
    background: border,
    margin: '16px 0',
  };

  return {
    pageBg, cardBg, cardBg2, innerBg,
    border, borderStrong,
    textPrimary, textSecondary, textMuted,
    tooltipBg, tooltipBorder, tooltipText, cursorFill, tickColor,
    cardShadow, hoverShadow,
    card, cardHover, badge, divider,
  };
}

/** Shared section title used across all pages */
export const SectionTitle: React.FC<{ label: string; sub?: string; border: string; color: string }> = ({
  label, sub, border, color,
}) => (
  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 3, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
    <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    {sub && <span style={{ fontSize: 11, color: '#94A3B8' }}>{sub}</span>}
    <div style={{ flex: 1, height: 1, background: border }} />
  </div>
);

/** Stat chip (small metric) */
export const StatChip: React.FC<{ label: string; value: string | number; color: string; bg: string; border: string }> = ({
  label, value, color, bg, border,
}) => (
  <div style={{
    background: bg, border: `1px solid ${border}`, borderRadius: 10,
    padding: '12px 16px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
  </div>
);
