"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss
    const duration = toast.duration || 4000;
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const toastConfig = {
    success: {
      icon: CheckCircle,
      bg: "bg-gradient-to-r from-green-500 to-emerald-500",
      iconBg: "bg-green-600",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-gradient-to-r from-red-500 to-rose-500",
      iconBg: "bg-red-600",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-gradient-to-r from-amber-500 to-orange-500",
      iconBg: "bg-amber-600",
    },
    info: {
      icon: Info,
      bg: "bg-gradient-to-r from-blue-500 to-indigo-500",
      iconBg: "bg-blue-600",
    },
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`
                pointer-events-auto
                ${config.bg}
                rounded-2xl shadow-2xl p-4 pr-12 min-w-[300px] max-w-[400px]
                backdrop-blur-lg
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`${config.iconBg} p-2 rounded-xl`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{toast.title}</h4>
                  {toast.message && (
                    <p className="text-sm text-white/80 mt-0.5">{toast.message}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
