import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const duration = toast.duration ?? 5000;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // max 5 toasts
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/* ── Rendu des toasts ── */
const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
};
const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', icon: '#22c55e' },
  error:   { bg: '#fef2f2', border: '#ef4444', icon: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b' },
  info:    { bg: '#eff6ff', border: '#3b82f6', icon: '#3b82f6' },
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div style={{
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
  }}>
    {toasts.map(t => {
      const c = COLORS[t.type];
      return (
        <div key={t.id} style={{
          pointerEvents: 'all',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: c.bg, border: `1px solid ${c.border}`,
          borderLeft: `4px solid ${c.border}`,
          borderRadius: 10, padding: '12px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: 280, maxWidth: 380,
          animation: 'toastIn 0.25s ease',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: c.border, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
          }}>{ICONS[t.type]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.title}</div>
            {t.message && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.message}</div>}
          </div>
          <button onClick={() => onRemove(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
          }}>×</button>
        </div>
      );
    })}
    <style>{`
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  </div>
);
