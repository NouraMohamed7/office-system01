// src/app/manager/performance/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Card, SectionTitle, Pill, Avatar, StatCard, ProgressBar } from "@/components/manager/primitives";
import { Trophy, X } from "lucide-react";
import {
  getPerformanceSummaries,
  getEmployeeDirectory,
  getEmployeePerformanceLedger,
  subscribeToPerformancePoints,
  PERFORMANCE_POINT_RULES,
  type PerformancePointSummaryRow,
  type EmployeeDirectoryEntry,
  type TeamPerformanceRow,
  type PerformanceLedgerRow,
} from "@/modules/performance/api/performance.api";

const BONUS_RULES = PERFORMANCE_POINT_RULES.filter((r) => r.value >= 0);
const PENALTY_RULES = PERFORMANCE_POINT_RULES.filter((r) => r.value < 0);
const LEDGER_PAGE_SIZE = 20;
const REALTIME_DEBOUNCE_MS = 500;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export default function PerformancePage() {
  const [summaries, setSummaries] = useState<PerformancePointSummaryRow[]>([]);
  const [directory, setDirectory] = useState<Map<string, EmployeeDirectoryEntry>>(new Map());
  const directoryRef = useRef(directory);
  directoryRef.current = directory;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TeamPerformanceRow | null>(null);
  const [ledger, setLedger] = useState<PerformanceLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerVisible, setLedgerVisible] = useState(LEDGER_PAGE_SIZE);

  // Full load: summaries + directory (names/departments — rarely change).
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const s = await getPerformanceSummaries();
      const ids = s.map((r) => r.users_id);
      const dir = await getEmployeeDirectory(ids);
      setSummaries(s);
      setDirectory(dir);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل بيانات الأداء");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cheap refresh on realtime events: re-poll summaries only, and only fetch
  // directory entries for ids we haven't cached yet (e.g. a brand-new employee).
  const refreshSummaries = useCallback(async () => {
    try {
      const s = await getPerformanceSummaries();
      setSummaries(s);
      const missing = s.map((r) => r.users_id).filter((id) => !directoryRef.current.has(id));
      if (missing.length > 0) {
        const extra = await getEmployeeDirectory(missing);
        setDirectory((prev) => new Map([...prev, ...extra]));
      }
    } catch {
      // silent — leaderboard just keeps its last known-good state
    }
  }, []);

  useEffect(() => {
    loadAll();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToPerformancePoints(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshSummaries, REALTIME_DEBOUNCE_MS);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [loadAll, refreshSummaries]);

  const team: TeamPerformanceRow[] = useMemo(
    () =>
      summaries
        .map((s) => ({
          ...s,
          ...(directory.get(s.users_id) ?? { name: "موظف غير معروف", photo_url: null, department: null }),
        }))
        .sort((a, b) => b.total_points - a.total_points),
    [summaries, directory]
  );

  const topEmployee = team[0];

  const stats = useMemo(() => {
    const count = team.length;
    const avgPercent = count ? Math.round(team.reduce((s, e) => s + (e.percent ?? 0), 0) / count) : 0;
    const avgRate = count ? (team.reduce((s, e) => s + (e.avg_rate ?? 0), 0) / count).toFixed(1) : "0.0";
    return { count, avgPercent, avgRate };
  }, [team]);

  async function openEmployee(row: TeamPerformanceRow) {
    setSelected(row);
    setLedger([]);
    setLedgerVisible(LEDGER_PAGE_SIZE);
    setLedgerLoading(true);
    try {
      const l = await getEmployeePerformanceLedger(row.users_id, row.total_points, 200);
      setLedger(l);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }

  const visibleLedger = useMemo(() => ledger.slice(0, ledgerVisible), [ledger, ledgerVisible]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الأداء" subtitle="تقييم شامل للشركة والفرق." />
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الأداء" subtitle="تقييم شامل للشركة والفرق." />
        <Card className="border-destructive/30 bg-destructive/5 text-sm text-destructive">
          حدث خطأ أثناء تحميل بيانات الأداء: {error}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الأداء" subtitle="تقييم شامل للشركة والفرق." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="عدد الموظفين" value={String(stats.count)} tone="primary" />
        <StatCard dense label="أفضل موظف" value={topEmployee ? topEmployee.name.split(" ")[0] : "—"} tone="warning" />
        <StatCard dense label="متوسط الأداء" value={`${stats.avgPercent}%`} tone="success" />
        <StatCard dense label="متوسط المعدل" value={stats.avgRate} sub="/ 5" tone="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-linear-to-br from-warning/20 to-primary/10">
          <div className="absolute -top-4 -left-4 text-6xl opacity-10">🏆</div>
          {topEmployee ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-[oklch(0.5_0.128_82)]">
                <Trophy className="size-4" /> موظف الشهر
              </div>
              <Avatar name={topEmployee.name} size={72} tone="warning" />
              <div className="mt-3 text-xl font-bold">{topEmployee.name}</div>
              <div className="text-sm text-muted-foreground">{topEmployee.department ?? "—"}</div>
              <div className="mt-3 text-3xl font-bold text-primary tabular">{topEmployee.total_points} نقطة</div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>✓ نسبة الأداء {Math.round(topEmployee.percent ?? 0)}%</li>
                <li>✓ متوسط المعدل {(topEmployee.avg_rate ?? 0).toFixed(1)} من 5</li>
                <li>✓ {topEmployee.task_completed_points} نقطة من المهام المكتملة</li>
              </ul>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات أداء بعد</div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-0! overflow-hidden">
          <div className="border-b border-border p-4 font-bold">لوحة الترتيب</div>
          {team.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا توجد بيانات أداء بعد</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-accent/40 text-xs text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                  <th>#</th>
                  <th>الموظف</th>
                  <th>القسم</th>
                  <th>النقاط</th>
                  <th>النسبة</th>
                  <th>المعدل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((r, i) => (
                  <tr
                    key={r.users_id}
                    onClick={() => openEmployee(r)}
                    className="group row-hover hover:row-hover-active cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-warning text-white"
                            : i === 1
                            ? "bg-muted-foreground/30 text-foreground"
                            : i === 2
                            ? "bg-primary/30 text-primary"
                            : "bg-accent text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.name} size={28} />
                        <span className="font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-primary tabular">{r.total_points}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-32">
                        <ProgressBar value={r.percent ?? 0} />
                        <span className="text-xs tabular text-muted-foreground">{Math.round(r.percent ?? 0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular">⭐ {(r.avg_rate ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>قواعد النقاط</SectionTitle>
        <div className="mb-3 text-[11px] text-muted-foreground">
          القواعد دي بيحسبها النظام تلقائيًا حسب الحضور والمهام والتقارير والملفات — مفيش منح نقاط يدوي.
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-bold text-success">تُمنح نقاط عند</div>
            <div className="flex flex-wrap gap-1.5">
              {BONUS_RULES.map((r) => (
                <Pill key={r.id} tone="success">
                  {r.label} +{r.value}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold text-destructive">تُخصم نقاط عند</div>
            <div className="flex flex-wrap gap-1.5">
              {PENALTY_RULES.map((r) => (
                <Pill key={r.id} tone="danger">
                  {r.label} {r.value}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* لوحة تفاصيل الموظف */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-foreground/30"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-card shadow-warm"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size={36} />
                <div>
                  <h3 className="text-base font-bold text-foreground">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.department ?? "—"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-border p-4">
              <div className="rounded-xl bg-accent/30 p-3">
                <p className="text-xs text-muted-foreground">إجمالي النقاط</p>
                <p className="text-xl font-bold tabular text-primary">{selected.total_points}</p>
              </div>
              <div className="rounded-xl bg-accent/30 p-3">
                <p className="text-xs text-muted-foreground">النسبة</p>
                <p className="text-xl font-bold tabular text-foreground">{Math.round(selected.percent ?? 0)}%</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {ledgerLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              ) : ledger.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">لا يوجد سجل نقاط لهذا الموظف</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {visibleLedger.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{entry.reason}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-bold tabular ${
                            entry.points >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {entry.points > 0 ? "+" : ""}
                          {entry.points}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {ledgerVisible < ledger.length && (
                    <div className="pt-3 text-center">
                      <button
                        onClick={() => setLedgerVisible((c) => c + LEDGER_PAGE_SIZE)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        عرض المزيد ({ledger.length - ledgerVisible} متبقي)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}