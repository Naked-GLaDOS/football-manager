import type React from 'react';

// Shared design tokens + style objects for the dark theme used across the app.
export const c = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  green: '#16a34a',
  greenDim: '#15803d',
  red: '#dc2626',
  danger: '#f87171',
};

export const page: React.CSSProperties = {
  minHeight: '100dvh', background: c.bg, color: c.text,
};

export const container: React.CSSProperties = {
  maxWidth: '60rem', margin: '0 auto', padding: '1rem',
};

export const input: React.CSSProperties = {
  background: c.bg, border: `1px solid ${c.border}`, borderRadius: '0.5rem',
  color: c.text, padding: '0.55rem 0.7rem', fontSize: '0.95rem', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

export const label: React.CSSProperties = {
  color: c.muted, fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block',
};

export const btn: React.CSSProperties = {
  background: c.green, color: '#fff', border: 'none', borderRadius: '0.5rem',
  padding: '0.55rem 0.9rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
};

export const btnGhost: React.CSSProperties = {
  background: 'transparent', color: c.muted, border: `1px solid ${c.border}`,
  borderRadius: '0.5rem', padding: '0.5rem 0.85rem', fontSize: '0.9rem', cursor: 'pointer',
};

export const btnDanger: React.CSSProperties = {
  background: 'transparent', color: c.danger, border: `1px solid ${c.border}`,
  borderRadius: '0.5rem', padding: '0.5rem 0.85rem', fontSize: '0.9rem', cursor: 'pointer',
};

export const card: React.CSSProperties = {
  background: c.card, border: `1px solid ${c.border}`, borderRadius: '0.75rem', padding: '1rem',
};

export const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '1rem', overflowY: 'auto',
};

export const modal: React.CSSProperties = {
  background: c.card, borderRadius: '1rem', padding: '1.5rem',
  maxWidth: '32rem', width: '100%', margin: 'auto',
};
