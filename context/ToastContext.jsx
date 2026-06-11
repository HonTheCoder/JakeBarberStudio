import { createContext, useContext, useState, useRef } from "react";
import { ToastStack } from "./ToastStack";

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const timers  = useRef({});

  const dismiss = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timers.current[id];
    }, 320);
  };

  const show = (message, type = "success", duration = 3500) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message, leaving: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  };

  const api = {
    toast:   (msg, type, dur) => show(msg, type, dur),
    success: (msg, dur)       => show(msg, "success", dur ?? 3500),
    error:   (msg, dur)       => show(msg, "error",   dur ?? 5000),
    info:    (msg, dur)       => show(msg, "info",    dur ?? 3500),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};