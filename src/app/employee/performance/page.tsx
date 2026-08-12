// src/app/employee/performance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalLayout, Card } from "@/components/portal-layout";
import {
  Award,
  Clock,
  FileCheck2,
  FileText,
  ListChecks,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  getMyPerformanceLedger,
  getMyPerformanceSummary,
  PERFORMANCE_POINT_RULES,
  type PerformanceLedgerRow,
  type PerformancePointSummaryRow,
} from "@/modules/performance/api/performance.api";

const BONUS_RULES = PERFORMANCE_POINT_RULES.filter((r) => r.value >= 0);
const PENALTY_RULES = PERFORMANCE_POINT_RULES.filter((r) => r.value < 0);

const BREAKDOWN_ITEMS: {
  key: keyof PerformancePointSummaryRow;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "present_points", label: "الحضور", icon: UserCheck },
  { key: "on_time_points", label: "الالتزام بالمواعيد", icon: Clock },
  { key: "report_submitted_points", label: "التقارير المُرسلة", icon: FileText },
  { key: "report_accepted_points", label: "التقارير المقبولة", icon: FileCheck2 },
  { key: "file_approved_points", label: "الملفات المعتمدة", icon: Award },
  { key: "task_completed_points", label: "المهام المكتملة", icon: ListChecks },
];

const PAGE_SIZE = 15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export default function PerformancePage() {
  const [summary, setSummary] = useState<PerformancePointSummaryRow | null>(null);
  const [ledger, setLedger] = useState<PerformanceLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const s = await getMyPerformanceSummary();
        if (cancelled) return;
        setSummary(s);

        const l = await getMyPerformanceLedger(s?.total_points ?? 0, 200);
        if (!cancelled) setLedger(l);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل بيانات الأداء");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthTrend = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const thisMonth = ledger
      .filter((e) => now - new Date(e.created_at).getTime() <= 30 * day)
      .reduce((s, e) => s + e.points, 0);
    const lastMonth = ledger
      .filter((e) => {
        const diff = now - new Date(e.created_at).getTime();
        return diff > 30 * day && diff <= 60 * day;
      })
      .reduce((s, e) => s + e.points, 0);
    return { thisMonth, lastMonth, diff: thisMonth - lastMonth };
  }, [ledger]);

  const visibleLedger = useMemo(() => ledger.slice(0, visibleCount), [ledger, visibleCount]);

  const currentPoints = summary?.total_points ?? 0;
  const percent = Math.min(100, Math.max(0, summary?.percent ?? 0));

  if (loading) {
    return (
      <PortalLayout title="الأداء" subtitle="نقاطك وسجل عملياتك">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout title="الأداء" subtitle="نقاطك وسجل عملياتك">
        <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive text-sm">
          حدث خطأ أثناء تحميل بيانات الأداء: {error}
        </Card>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="الأداء" subtitle="نقاطك وسجل عملياتك">
      {/* البطل: نقاطك ونسبة أدائك */}
      <Card className="p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="mx-auto md:mx-0 text-center">
            <div className="grid place-items-center h-28 w-28 rounded-full bg-primary/10 border-4 border-primary/20">
              <div>
                <div className="text-3xl font-bold text-primary tabular-nums">{currentPoints}</div>
                <div className="text-[11px] text-muted-foreground">نقطة</div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {ledger.length === 0
                ? "لسه معندكش أي عمليات نقاط مسجّلة."
                : monthTrend.diff >= 0
                ? `جمعت ${monthTrend.thisMonth} نقطة الشهر ده، ده أكتر من اللي فات بـ ${monthTrend.diff} نقطة 📈`
                : `جمعت ${monthTrend.thisMonth} نقطة الشهر ده، أقل من اللي فات بـ ${Math.abs(monthTrend.diff)} نقطة، ركّزي شوية 📉`}
            </p>
            {ledger.length > 0 && (
              <div className="flex items-center gap-2 mt-4 text-sm">
                {monthTrend.diff >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={monthTrend.diff >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                  {monthTrend.diff >= 0 ? "+" : ""}
                  {monthTrend.diff} نقطة عن الشهر اللي فات
                </span>
              </div>
            )}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>نسبة أدائك</span>
                <span className="tabular-nums">{Math.round(percent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div style={{ width: `${percent}%` }} className="h-full rounded-full bg-primary transition-all" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* تفاصيل النقاط */}
      <div className="mb-6">
        <h2 className="mb-3 text-base font-bold text-foreground">تفاصيل النقاط</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BREAKDOWN_ITEMS.map(({ key, label, icon: Icon }) => (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {summary ? Number(summary[key] ?? 0) : 0}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 mb-6">
        {/* سجل النقاط */}
        <Card className="p-0! overflow-hidden">
          <div className="border-b border-border p-4 font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> سجل نقاطك
          </div>
          {ledger.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا توجد عمليات نقاط مسجّلة بعد</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-accent/40 text-xs text-muted-foreground">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                      <th>التاريخ</th>
                      <th>العملية</th>
                      <th>القيمة</th>
                      <th>رصيدك بعدها</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleLedger.map((ev) => (
                      <tr key={ev.id} className="hover:bg-accent/20 transition">
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(ev.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{ev.reason}</td>
                        <td className={`px-4 py-3 font-bold tabular-nums ${ev.points >= 0 ? "text-success" : "text-destructive"}`}>
                          {ev.points > 0 ? `+${ev.points}` : ev.points}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{ev.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleCount < ledger.length && (
                <div className="border-t border-border p-3 text-center">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    عرض المزيد ({ledger.length - visibleCount} متبقي)
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* مرجع قواعد النقاط */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-1">إزاي تكسب أو تخسر نقاط</h3>
        <p className="text-xs text-muted-foreground mb-4">
          قائمة مرجعية بس — نقاطك بتتحدث تلقائيًا من النظام حسب أدائك (الحضور، المهام، التقارير، الملفات).
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold text-success mb-2">تُمنح نقاط عند</div>
            <div className="flex flex-wrap gap-1.5">
              {BONUS_RULES.map((r) => (
                <span key={r.id} className="rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-semibold">
                  {r.label} +{r.value}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-destructive mb-2">تُخصم نقاط عند</div>
            <div className="flex flex-wrap gap-1.5">
              {PENALTY_RULES.map((r) => (
                <span key={r.id} className="rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-[11px] font-semibold">
                  {r.label} {r.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </PortalLayout>
  );
}