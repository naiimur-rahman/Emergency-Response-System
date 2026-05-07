'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(48,209,88,0.12)', border: 'rgba(48,209,88,0.4)', color: '#30d158' },
  error: { bg: 'rgba(255,45,85,0.12)', border: 'rgba(255,45,85,0.4)', color: '#ff2d55' },
  info: { bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.4)', color: '#0a84ff' },
};

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[toast.type] || Info;
  const colors = COLORS[toast.type] || COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`toast-item ${exiting ? 'toast-exit' : 'toast-enter'}`}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <Icon size={18} style={{ color: colors.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {toast.title && <div style={{ fontWeight: 700, fontSize: 13, color: colors.color, marginBottom: 2 }}>{toast.title}</div>}
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{toast.message}</div>
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
