// src/app/performance/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useMemo, useState } from "react";
import { TrendingUp, Target } from "lucide-react";

type Kpi = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  lowerIsBetter?: boolean;
};

const MONTHLY_SCORES = [
  { month: "فبراير", score: 78 },
  { month: "مارس", score: 82 },
  { month: "أبريل", score: 75 },
  { month: "مايو", score: 88 },
  { month: "يونيو", score: 91 },
  { month: "يوليو", score: 94 },
];

const KPIS: Kpi[] = [
  { id: "k1", label: "الالتزام بالحضور", current: 96, target: 95, unit: "%" },
  { id: "k2", label: "إنجاز المهام في الوقت", current: 88, target: 90, unit: "%" },
  { id: "k3", label: "رضا العملاء", current: 4.6, target: 4.5, unit: "/5" },
  { id: "k4", label: "متوسط زمن الرد", current: 12, target: 15, unit: "دقيقة", lowerIsBetter: true },
];

export default function PerformancePage() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHLY_SCORES[MONTHLY_SCORES.length - 1].month);

  const overallScore = MONTHLY_SCORES[MONTHLY_SCORES.length - 1].score;
  const previousScore = MONTHLY_SCORES[MONTHLY_SCORES.length - 2].score;
  const diff = overallScore - previousScore;

  const selectedData = MONTHLY_SCORES.find((m) => m.month === selectedMonth)!;
  const maxScore = Math.max(...MONTHLY_SCORES.map((m) => m.score));

  const overallRating = useMemo(() => {
    if (overallScore >= 90) return { label: "ممتاز", tone: "success" as const };
    if (overallScore >= 75) return { label: "جيد جدًا", tone: "primary" as const };
    if (overallScore >= 60) return { label: "جيد", tone: "warning" as const };
    return { label: "يحتاج تحسين", tone: "danger" as const };
  }, [overallScore]);

  return (
    <PortalLayout title="الأداء" subtitle="تقييم أدائك الشامل وتتبع أهدافك">
      {/* Overall score hero */}
      <Card className="p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="mx-auto md:mx-0">
            <ScoreRing score={overallScore} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-foreground">تقييمك العام: {overallRating.label}</h2>
              <ToneBadge tone={overallRating.tone}>{overallScore}/100</ToneBadge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              أداؤك في يوليو أفضل من يونيو بـ {Math.abs(diff)} نقطة {diff >= 0 ? "📈" : "📉"}، استمري كده!
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm">
              <TrendingUp className={`h-4 w-4 ${diff >= 0 ? "text-success" : "text-destructive"}`} />
              <span className={diff >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {diff >= 0 ? "+" : ""}{diff} نقطة عن الشهر اللي فات
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly chart */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground">تطور الأداء الشهري</h3>
          <ToneBadge tone="primary">{selectedData.month}: {selectedData.score}</ToneBadge>
        </div>
        <div className="flex items-end justify-between gap-2 h-48">
          {MONTHLY_SCORES.map((m) => {
            const heightPct = (m.score / maxScore) * 100;
            const isSelected = m.month === selectedMonth;
            return (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
              >
                <span className={`text-xs font-bold tabular-nums transition ${isSelected ? "text-primary" : "text-transparent group-hover:text-muted-foreground"}`}>
                  {m.score}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg transition-all ${isSelected ? "bg-primary" : "bg-secondary group-hover:bg-primary/40"}`}
                />
                <span className={`text-[11px] transition ${isSelected ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {m.month}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* KPIs */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> مؤشرات الأداء الرئيسية
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {KPIS.map((k) => {
            const achieved = k.lowerIsBetter ? k.current <= k.target : k.current >= k.target;
            const pct = k.lowerIsBetter
              ? Math.min(100, (k.target / Math.max(k.current, 0.01)) * 100)
              : Math.min(100, (k.current / k.target) * 100);
            return (
              <div key={k.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{k.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${achieved ? "bg-success/15 text-success" : "bg-warning/25 text-[oklch(0.48_0.11_82)]"}`}>
                    {achieved ? "محقق" : "قيد التحسين"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xl font-bold text-foreground tabular-nums">{k.current}{k.unit}</span>
                  <span className="text-xs text-muted-foreground">من هدف {k.target}{k.unit}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full transition-all ${achieved ? "bg-success" : "bg-warning"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PortalLayout>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 15.9;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 36 36" className="h-36 w-36 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground tabular-nums">{score}</div>
          <div className="text-xs text-muted-foreground">من 100</div>
        </div>
      </div>
    </div>
  );
}

function ToneBadge({ tone, children }: { tone: "primary" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${map[tone]}`}>
      {children}
    </span>
  );
}