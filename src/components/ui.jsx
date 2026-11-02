import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { addMonths, fmtPeriod } from '../lib/format';

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  check: 'M5 12l5 5 9-10',
  logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  briefcase: 'M3 8h18v11H3zM8 8V5h8v3M3 13h18',
  back: 'M19 12H5M11 6l-6 6 6 6',
  x: 'M6 6l12 12M18 6L6 18',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  pin: 'M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function PageHead({ title, subtitle, back, children }) {
  return (
    <header className="page-head">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Field({ label, hint, wide, children }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Loader() {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" /> Yüklənir…
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  const raw = error?.message || String(error);
  const missing = /relation .* does not exist|schema cache|Could not find the table/i.test(raw);
  return (
    <div className="notice error" role="alert">
      <strong>{missing ? 'Verilənlər bazası hazır deyil.' : 'Xəta baş verdi.'}</strong>
      <p>
        {missing
          ? 'supabase/schema.sql faylını Supabase SQL Editor-də işə salın.'
          : raw}
      </p>
      {onRetry && (
        <button type="button" className="btn sm" onClick={onRetry}>
          Yenidən yoxla
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Bağla">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function MonthPicker({ value, onChange }) {
  return (
    <div className="month-picker">
      <button type="button" className="icon-btn" onClick={() => onChange(addMonths(value, -1))} aria-label="Əvvəlki ay">
        <Icon name="chevL" />
      </button>
      <strong>{fmtPeriod(value)}</strong>
      <button type="button" className="icon-btn" onClick={() => onChange(addMonths(value, 1))} aria-label="Növbəti ay">
        <Icon name="chevR" />
      </button>
    </div>
  );
}

export function Stat({ label, value, tone, hint }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
