// src/components/manager/primitives.tsx
"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, X, Pencil, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "teal"
  | "muted";

const toneToPillClass: Record<Tone, string> = {
  primary: "pill-primary",
  success: "pill-success",
  warning: "pill-warning",
  danger: "pill-danger",
  teal: "pill-teal",
  muted: "pill-muted",
};

const toneToIconBg: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-[oklch(0.5_0.128_82)]",
  danger: "bg-destructive/12 text-destructive",
  teal: "bg-teal/12 text-teal",
  muted: "bg-muted text-muted-foreground",
};

/* ---------------- PageHeader ---------------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-warm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- SectionTitle ---------------- */
export function SectionTitle({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-base font-bold text-foreground">{children}</h2>
      {sub && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{sub}</span>}
    </div>
  );
}

/* ---------------- Pill ---------------- */
export function Pill({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        toneToPillClass[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({
  name,
  size = 40,
  tone = "primary",
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-bold", toneToPillClass[tone])}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
    >
      {initial}
    </div>
  );
}

/* ---------------- StatCard ---------------- */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  dense = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: LucideIcon;
  tone?: Tone;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-warm",
        dense ? "p-3.5" : "p-4",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] text-muted-foreground">{label}</div>
          <div className={cn("font-bold tabular", dense ? "mt-1.5 text-xl" : "mt-2 text-2xl")}>
            {value}
          </div>
          {sub && <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>}
        </div>
        {Icon && (
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-xl",
              toneToIconBg[tone],
              dense ? "size-10" : "size-11",
            )}
          >
            <Icon className={dense ? "size-[18px]" : "size-5"} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- ProgressBar ---------------- */
export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ---------------- ActionRow ---------------- */
export function ActionRow({
  onApprove,
  onReject,
  onRequestEdit,
  onComment,
  disabled = false,
}: {
  onApprove?: () => void;
  onReject?: () => void;
  onRequestEdit?: () => void;
  onComment?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onApprove}
        className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check className="size-3.5" /> اعتماد
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onReject}
        className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="size-3.5" /> رفض
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onRequestEdit}
        className="inline-flex items-center gap-1 rounded-lg bg-warning/15 px-2.5 py-1.5 text-xs font-semibold text-[oklch(0.5_0.128_82)] hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Pencil className="size-3.5" /> طلب تعديل
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onComment}
        className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MessageCircle className="size-3.5" /> تعليق
      </button>
    </div>
  );
}