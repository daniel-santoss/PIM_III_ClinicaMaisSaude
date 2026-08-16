import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";
import type { ToastType } from "../hooks/useToast";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleAddToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: ToastType }>;
      const newToast: ToastMessage = {
        id: Date.now().toString() + Math.random().toString(),
        ...customEvent.detail,
      };

      setToasts((prev) => {
        // Remove toasts antigos se houver mais de 3
        const current = [...prev, newToast];
        if (current.length > 3) {
          return current.slice(current.length - 3);
        }
        return current;
      });
    };

    window.addEventListener("addToast", handleAddToast);
    return () => window.removeEventListener("addToast", handleAddToast);
  }, []);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        const iconClass = isSuccess ? "text-success" : isError ? "text-danger" : "text-warning";
        const Icon = isSuccess ? CheckCircle : isError ? XCircle : AlertTriangle;

        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-line bg-white shadow-modal pointer-events-auto transition-all animate-in slide-in-from-right-8 fade-in duration-300 max-w-sm"
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />
            <p className="text-sm font-medium text-ink flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 text-muted hover:text-body transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
