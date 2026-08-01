// src/app/performance/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useMemo } from "react";
import { Trophy, TrendingUp, TrendingDown, Medal, Sparkles, Users } from "lucide-react";

type PointEvent = {
  id: string;
  label: string;
  value: number; // موجب = مكافأة / سالب = خصم
  date: Date;
};

type Rule = {
  id: string;
  label: string;
  value: number;
};

type Teammate = {
  name: string;
  dept: string;
  points: number;
  isYou?: boolean;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const CURRENT_EMPLOYEE = { name: "سارة إبراهيم", dept: "التسويق" };

// رصيد النقاط المتراكم قبل بداية السجل الظاهر تحت
const BASE_POINTS = 820;

const pointEvents: PointEvent[] = [
  { id: "pe1", label: "تحقيق Target", value: 25, date: daysAgo(2) },
  { id: "pe2", label: "إنهاء مهمة", value: 10, date: daysAgo(4) },
  { id: "pe3", label: "رفع تقرير", value: 8, date: daysAgo(6) },
  { id: "pe4", label: "تأخير", value: -5, date: daysAgo(9) },
  { id: "pe5", label: "حضور يومي", value: 5, date: daysAgo(9) },
  { id: "pe6", label: "شيت معتمد", value: 12, date: daysAgo(15) },
  { id: "pe7", label: "مساعدة الفريق", value: 8, date: daysAgo(20) },
  { id: "pe8", label: "غياب", value: -20, date: daysAgo(35) },
  { id: "pe9", label: "حضور يومي", value: 5, date: daysAgo(40) },
];

const BONUS_RULES: Rule[] = [
  { id: "r1", label: "حضور يومي", value: 5 },
  { id: "r2", label: "إنهاء مهمة", value: 10 },
  { id: "r3", label: "رفع تقرير", value: 8 },
  { id: "r4", label: "شيت معتمد", value: 12 },
  { id: "r5", label: "تحقيق Target", value: 25 },
  { id: "r6", label: "بدون تأخير", value: 5 },
  { id: "r7", label: "مساعدة الفريق", value: 8 },
  { id: "r8", label: "مهمة عاجلة", value: 15 },
];

const PENALTY_RULES: Rule[] = [
  { id: "r9", label: "غياب", value: -20 },
  { id: "r10", label: "تأخير", value: -5 },
  { id: "r11", label: "رفض مهمة", value: -15 },
  { id: "r12", label: "مخالفة تعليمات", value: -10 },
  { id: "r13", label: "ملف خاطئ", value: -8 },
  { id: "r14", label: "عدم إرسال تقرير", value: -12 },
];

const TEAM: Teammate[] = [
  { name: "نورا حسن", dept: "السوشيال ميديا", points: 933 },
  { name: "محمود علي", dept: "الكول سنتر", points: 907 },
  { name: CURRENT_EMPLOYEE.name, dept: CURRENT_EMPLOYEE.dept, points: BASE_POINTS + pointEvents.reduce((s, e) => s + e.value, 0), isYou: true },
  { name: "كريم سعيد", dept: "المبيعات", points: 820 },
  { name: "دينا فتحي", dept: "التصميم", points: 807 },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export default function PerformancePage() {
  // ترتيب زمني تصاعدي مع رصيد متراكم — بدون إعادة تعيين متغير خارجي (reduce نظيف)
  const chronological = useMemo(() => {
    const sorted = [...pointEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    const { list } = sorted.reduce<{ list: (PointEvent & { bal: number })[]; running: number }>(
      (acc, ev) => {
        const running = acc.running + ev.value;
        return { list: [...acc.list, { ...ev, bal: running }], running };
      },
      { list: [], running: BASE_POINTS }
    );
    return list;
  }, []);

  const ledgerDesc = useMemo(() => [...chronological].reverse(), [chronological]);

  const currentPoints = chronological.length ? chronological[chronological.length - 1].bal : BASE_POINTS;

  const monthTrend = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const thisMonth = pointEvents.filter((e) => now - e.date.getTime() <= 30 * day).reduce((s, e) => s + e.value, 0);
    const lastMonth = pointEvents
      .filter((e) => now - e.date.getTime() > 30 * day && now - e.date.getTime() <= 60 * day)
      .reduce((s, e) => s + e.value, 0);
    return { thisMonth, lastMonth, diff: thisMonth - lastMonth };
  }, []);

  const team = useMemo(() => [...TEAM].sort((a, b) => b.points - a.points), []);
  const rank = team.findIndex((t) => t.isYou) + 1;
  const topPoints = team[0]?.points ?? currentPoints;
  const progressPct = Math.min(100, Math.round((currentPoints / topPoints) * 100));

  return (
    <PortalLayout title="الأداء" subtitle="نقاطك، ترتيبك بين الفريق، وسجل عملياتك">
      {/* البطل: نقاطك وترتيبك */}
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
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/20 text-[oklch(0.48_0.11_82)] px-3 py-1 text-xs font-bold">
              <Trophy className="h-3.5 w-3.5" /> الترتيب #{rank} من {team.length}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-foreground">
                {CURRENT_EMPLOYEE.name} · {CURRENT_EMPLOYEE.dept}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {monthTrend.diff >= 0
                ? `جمعت ${monthTrend.thisMonth} نقطة الشهر ده، ده أكتر من اللي فات بـ ${monthTrend.diff} نقطة 📈`
                : `جمعت ${monthTrend.thisMonth} نقطة الشهر ده، أقل من اللي فات بـ ${Math.abs(monthTrend.diff)} نقطة، ركّزي شوية 📉`}
            </p>
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
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>مسافتك عن صاحب أعلى نقاط في الفريق</span>
                <span className="tabular-nums">
                  {currentPoints} / {topPoints}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div style={{ width: `${progressPct}%` }} className="h-full rounded-full bg-primary transition-all" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* سجل النقاط */}
        <Card className="lg:col-span-2 p-0! overflow-hidden">
          <div className="border-b border-border p-4 font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> سجل نقاطك
          </div>
          {ledgerDesc.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا توجد عمليات نقاط مسجّلة بعد</div>
          ) : (
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
                  {ledgerDesc.map((ev) => (
                    <tr key={ev.id} className="hover:bg-accent/20 transition">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(ev.date)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{ev.label}</td>
                      <td className={`px-4 py-3 font-bold tabular-nums ${ev.value >= 0 ? "text-success" : "text-destructive"}`}>
                        {ev.value > 0 ? `+${ev.value}` : ev.value}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{ev.bal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ترتيب الفريق */}
        <Card className="p-4">
          <div className="font-bold flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" /> ترتيب الفريق
          </div>
          <div className="space-y-2">
            {team.map((t, i) => (
              <div
                key={t.name}
                className={`flex items-center gap-3 rounded-xl p-2.5 ${t.isYou ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/30"}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-warning text-white"
                      : i === 1
                      ? "bg-muted-foreground/30 text-foreground"
                      : i === 2
                      ? "bg-primary/30 text-primary"
                      : "bg-accent text-muted-foreground"
                  }`}
                >
                  {i < 3 ? <Medal className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {t.isYou ? `${t.name} (أنت)` : t.name}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{t.dept}</div>
                </div>
                <div className="text-sm font-bold tabular-nums text-foreground">{t.points}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* مرجع قواعد النقاط */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-1">إزاي تكسب أو تخسر نقاط</h3>
        <p className="text-xs text-muted-foreground mb-4">قائمة مرجعية بس — نقاطك بتتحدث تلقائيًا من المدير حسب أدائك.</p>
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