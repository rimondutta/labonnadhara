"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const IconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const styleMap = {
    success: "bg-mint text-ink border-none",
    error: "bg-coral text-ink border-none",
    info: "bg-sun text-ink border-none",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none items-end">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = IconMap[toast.type || "success"];
            return (
              <m.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "pointer-events-auto px-5 py-4 rounded-[var(--radius-card)] flex items-center gap-3 shadow-[0_8px_30px_rgba(36,39,43,0.15)]",
                  styleMap[toast.type || "success"]
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span className="font-display font-medium text-base leading-tight">
                  {toast.message}
                </span>
              </m.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
