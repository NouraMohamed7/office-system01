"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalLayout, Card } from "@/components/portal-layout";
import { MinusCircle, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  type DeductionRewardRow,
  fetchMyDeductionsRewards,
  getCurrentUserId,
  subscribeDeductionsRewards,
} from "@/modules/deductions/api/deductions.api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "primary";
}) {
  const toneMap: Record<string, string> = {
    success: "text-success",
    danger: "text-destructive",
    primary: "text-primary",
  };
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular ${toneMap[tone]}`}>{value}</div>
    </Card>
  );
}

function DeductionsRewardsContent() {
  const showToast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DeductionRewardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(
    async (uid: string, silent = false) => {
      try {
        const data = await fetchMyDeductionsRewards(uid);
        setEntries(data);
      } catch (err) {
        if (!silent) {
          showToast("error", err instanceof Error ? err.message : "تعذر تحميل البيانات");
        }
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  // بنجيب المستخدم مرة واحدة بس، بعدين نستخدم الـ id في التحميل + الاشتراك
  useEffect(() => {
    let active = true;
    getCurrentUserId().then((uid) => {
      if (!active) return;
      if (!uid) {
        showToast("error", "تعذر التعرف على المستخدم، من فضلك أعد تسجيل الدخول");
        setLoading(false);
        return;
      }
      setUserId(uid);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadEntries(userId);
    // الاشتراك متقيّد بصفوف الموظف ده بس (server-side filter) — مش بيستقبل
    // ولا يعمل refetch بسبب تغييرات خاصة بموظفين تانيين
    const unsubscribe = subscribeDeductionsRewards(() => loadEntries(userId, true), userId);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const ded = useMemo(() => entries.filter((e) => e.type === "deduction"), [entries]);
  const rew = useMemo(() => entries.filter((e) => e.type === "reward"), [entries]);
  const totalDed = useMemo(() => ded.reduce((s, d) => s + Number(d.value), 0), [ded]);
  const totalRew = useMemo(() => rew.reduce((s, r) => s + Number(r.value), 0), [rew]);
  const net = totalRew - totalDed;

  const timeline = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="عدد الخصومات" value={String(ded.length)} tone="danger" />
        <MiniStat label="عدد المكافآت" value={String(rew.length)} tone="success" />
        <MiniStat label="إجمالي الخصومات" value={`${totalDed.toLocaleString()} ج`} tone="danger" />
        <MiniStat
          label="الصافي"
          value={`${net >= 0 ? "+" : ""}${net.toLocaleString()} ج`}
          tone={net >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="!p-0">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <span className="font-bold">السجل الكامل</span>
        </div>
        <ul className="divide-y divide-border">
          {timeline.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">
              لا يوجد لديك خصومات أو مكافآت مسجّلة
            </li>
          )}
          {timeline.map((entry) => {
            const isReward = entry.type === "reward";
            return (
              <li
                key={entry.id}
                className={`flex items-center gap-3 p-3 ${
                  isReward ? "bg-success/[0.03]" : "bg-destructive/[0.03]"
                }`}
              >
                {isReward ? (
                  <PlusCircle className="size-5 shrink-0 text-success" />
                ) : (
                  <MinusCircle className="size-5 shrink-0 text-destructive" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold">{entry.cause}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(entry.date)}</div>
                </div>
                <div className={`font-bold tabular ${isReward ? "text-success" : "text-destructive"}`}>
                  {isReward ? "+" : "-"}
                  {Number(entry.value).toLocaleString()} ج
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export default function EmployeeDeductionsPage() {
  return (
    <PortalLayout title="الخصومات والمكافآت" subtitle="سجل التحفيز والتحاسب الخاص بك.">
      <DeductionsRewardsContent />
    </PortalLayout>
  );
}