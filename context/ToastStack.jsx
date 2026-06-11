/* ─── Toast UI — kept separate so ToastContext can mix hook + component exports
       without triggering eslint-plugin-react-refresh/only-export-components   */

const CONFIGS = {
  success: { icon: "check_circle", bg: "#1a7a3c", fg: "#fff" },
  error:   { icon: "error",        bg: "#ba1a1a", fg: "#fff" },
  info:    { icon: "info",         bg: "#1b6aab", fg: "#fff" },
};

const ToastItem = ({ toast, onDismiss }) => {
  const cfg = CONFIGS[toast.type] ?? CONFIGS.info;
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px 12px 14px",
        borderRadius: 14,
        background: cfg.bg,
        color: cfg.fg,
        fontFamily: "Geist, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        maxWidth: 360,
        minWidth: 220,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        cursor: "pointer",
        pointerEvents: "all",
        userSelect: "none",
        animation: toast.leaving
          ? "toastOut 0.3s cubic-bezier(0.4,0,0.2,1) forwards"
          : "toastIn 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards",
        willChange: "transform, opacity",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 20, flexShrink: 0, opacity: 0.92 }}
      >
        {cfg.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 16, opacity: 0.55, flexShrink: 0, marginLeft: 4 }}
      >
        close
      </span>
    </div>
  );
};

export const ToastStack = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(48px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0)    scale(1);   }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)    scale(1);   }
          to   { opacity: 0; transform: translateX(48px) scale(0.9); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
};