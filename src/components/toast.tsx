// src/components/toast.tsx
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";
interface ToastItem { id: number; type: ToastType; message: string; }

const ToastContext = createContext<{ showToast: (type: ToastType, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 z-[100] space-y-2 w-full max-w-sm" dir="rtl">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-warm-lg border animate-in slide-in-from-top fade-in duration-300
              ${t.type === "success" ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
          >
            {t.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm font-semibold">{t.message}</div>
            <button onClick={() => remove(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.showToast;
}