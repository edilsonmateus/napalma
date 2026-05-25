import { useEffect } from "react";

export default function AppToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast?.text) return undefined;
    const timer = setTimeout(() => onClose?.(), 2800);
    return () => clearTimeout(timer);
  }, [toast?.text, onClose]);

  if (!toast?.text) return null;

  return (
    <p className={`toast app-toast toast-${toast.type || "info"}`}>
      {toast.text}
    </p>
  );
}
