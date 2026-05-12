'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuthStore } from '@/lib/auth-store';

type ToastTone = 'success' | 'error' | 'info';

type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
  kind?: 'primary' | 'secondary';
};

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs?: number;
};

type ToastInput = Omit<ToastItem, 'id'>;

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastViewport({
  toasts,
  dismissToast,
}: {
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-md flex-col gap-3 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto toast-card ${
            toast.tone === 'success'
              ? 'toast-success'
              : toast.tone === 'error'
                ? 'toast-error'
                : 'toast-info'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.description ? (
              <p className="mt-1 text-sm text-white/72">{toast.description}</p>
            ) : null}
            {toast.action ? (
              <button
                type="button"
                onClick={async () => {
                  await toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className={`mt-3 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  toast.action.kind === 'secondary'
                    ? 'border border-white/14 bg-white/6 text-white/84 hover:bg-white/10'
                    : 'bg-white text-slate-950 hover:bg-white/85'
                }`}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            ปิด
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const durationMs = toast.durationMs ?? 2800;
      setToasts((current) => [...current, { ...toast, id, durationMs }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within AppProviders');
  }

  return context;
}
