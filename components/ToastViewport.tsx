'use client';

type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = {
  id: number;
  message: string;
  tone?: ToastTone;
};

export default function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div style={viewport}>
      {toasts.map((toast) => {
        const tone = toast.tone || 'info';
        return (
          <div
            key={toast.id}
            style={{
              ...toastCard,
              ...(tone === 'success'
                ? successToast
                : tone === 'error'
                  ? errorToast
                  : infoToast),
            }}
          >
            <div style={toastMessage}>{toast.message}</div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              style={dismissButton}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

const viewport: React.CSSProperties = {
  position: 'fixed',
  top: 'calc(var(--site-header-height) + 16px)',
  right: 16,
  display: 'grid',
  gap: 10,
  width: 'min(360px, calc(100vw - 32px))',
  zIndex: 10050,
};

const toastCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)',
  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.14)',
  backdropFilter: 'blur(10px)',
};

const toastMessage: React.CSSProperties = {
  flex: 1,
  color: 'var(--text-primary)',
  fontSize: 14,
  lineHeight: 1.5,
  fontWeight: 600,
};

const dismissButton: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
  cursor: 'pointer',
};

const successToast: React.CSSProperties = {
  borderColor: 'rgba(34,197,94,0.28)',
  boxShadow: '0 18px 50px rgba(34, 197, 94, 0.12)',
};

const errorToast: React.CSSProperties = {
  borderColor: 'rgba(239,68,68,0.28)',
  boxShadow: '0 18px 50px rgba(239, 68, 68, 0.12)',
};

const infoToast: React.CSSProperties = {
  borderColor: 'rgba(56,189,248,0.28)',
  boxShadow: '0 18px 50px rgba(56, 189, 248, 0.12)',
};
