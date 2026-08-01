"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, PageHeader, ProgressBar, SectionTitle, StatCard } from "@/components/manager/primitives";
import { Trophy, X, Trash2, Plus, Pencil, Check } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  dept: string;
  rating: number;
  completionPct: number;
};

type PointEvent = {
  id: string;
  empId: string;
  label: string;
  value: number;
  date: Date;
};

type Rule = {
  id: string;
  label: string;
  value: number; // موجب = مكافأة / سالب = خصم
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const employeesData: Employee[] = [
  { id: "e1", name: "نورا حسن", dept: "السوشيال ميديا", rating: 4.8, completionPct: 94 },
  { id: "e2", name: "محمود علي", dept: "الكول سنتر", rating: 4.7, completionPct: 91 },
  { id: "e3", name: "سارة إبراهيم", dept: "التسويق", rating: 4.6, completionPct: 88 },
  { id: "e4", name: "كريم سعيد", dept: "المبيعات", rating: 4.4, completionPct: 84 },
  { id: "e5", name: "دينا فتحي", dept: "التصميم", rating: 4.3, completionPct: 81 },
];

const initialEvents: PointEvent[] = [
  { id: "ev1", empId: "e1", label: "رفع تقرير", value: 8, date: daysAgo(180) },
  { id: "ev2", empId: "e1", label: "تحقيق Target", value: 25, date: daysAgo(150) },
  { id: "ev3", empId: "e2", label: "إنهاء مهمة", value: 10, date: daysAgo(120) },
  { id: "ev4", empId: "e3", label: "حضور يومي", value: 5, date: daysAgo(90) },
  { id: "ev5", empId: "e4", label: "مساعدة الفريق", value: 8, date: daysAgo(60) },
  { id: "ev6", empId: "e5", label: "شيت معتمد", value: 12, date: daysAgo(30) },
  { id: "ev7", empId: "e1", label: "حضور يومي", value: 5, date: daysAgo(5) },
];

const initialRules: Rule[] = [
  { id: "r1", label: "حضور يومي", value: 5 },
  { id: "r2", label: "إنهاء مهمة", value: 10 },
  { id: "r3", label: "رفع تقرير", value: 8 },
  { id: "r4", label: "شيت معتمد", value: 12 },
  { id: "r5", label: "تحقيق Target", value: 25 },
  { id: "r6", label: "بدون تأخير", value: 5 },
  { id: "r7", label: "مساعدة الفريق", value: 8 },
  { id: "r8", label: "مهمة عاجلة", value: 15 },
  { id: "r9", label: "غياب", value: -20 },
  { id: "r10", label: "تأخير", value: -5 },
  { id: "r11", label: "رفض مهمة", value: -15 },
  { id: "r12", label: "مخالفة تعليمات", value: -10 },
  { id: "r13", label: "ملف خاطئ", value: -8 },
  { id: "r14", label: "عدم إرسال تقرير", value: -12 },
];

const seedBase: Record<string, number> = { e1: 895, e2: 897, e3: 867, e4: 812, e5: 795 };

function RuleEditForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Rule;
  onCancel: () => void;
  onSubmit: (data: { label: string; value: number }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [sign, setSign] = useState<"+" | "-">(initial ? (initial.value >= 0 ? "+" : "-") : "+");
  const [amount, setAmount] = useState(initial ? String(Math.abs(initial.value)) : "");

  const valid = label.trim() && Number(amount) > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="اسم القاعدة"
        className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex overflow-hidden rounded-md border border-border">
        <button
          onClick={() => setSign("+")}
          className={`px-2 py-1 text-xs font-bold ${sign === "+" ? "bg-success text-white" : "bg-background text-muted-foreground"}`}
        >
          +
        </button>
        <button
          onClick={() => setSign("-")}
          className={`px-2 py-1 text-xs font-bold ${sign === "-" ? "bg-destructive text-white" : "bg-background text-muted-foreground"}`}
        >
          -
        </button>
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="القيمة"
        className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs tabular outline-none focus:ring-2 focus:ring-primary/40"
      />
      <button
        disabled={!valid}
        onClick={() => onSubmit({ label: label.trim(), value: (sign === "+" ? 1 : -1) * Number(amount) })}
        className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
      >
        <Check className="size-3.5" />
      </button>
      <button onClick={onCancel} className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent/40">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export default function PerformancePage() {
  const [employees] = useState<Employee[]>(employeesData);
  const [events, setEvents] = useState<PointEvent[]>(initialEvents);
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [assigningRule, setAssigningRule] = useState<Rule | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [addingSign, setAddingSign] = useState<"+" | "-" | null>(null);

  const pointsByEmp = useMemo(() => {
    const map: Record<string, number> = {};
    for (const emp of employees) map[emp.id] = seedBase[emp.id] ?? 0;
    for (const ev of events) map[ev.empId] = (map[ev.empId] ?? 0) + ev.value;
    return map;
  }, [employees, events]);

  const leaderboard = useMemo(() => {
    return [...employees].map((e) => ({ ...e, pts: pointsByEmp[e.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
  }, [employees, pointsByEmp]);

  const topEmployee = leaderboard[0];

  const stats = useMemo(() => {
    const count = employees.length;
    const avgCompletion = count ? Math.round(employees.reduce((s, e) => s + e.completionPct, 0) / count) : 0;
    const avgRating = count ? (employees.reduce((s, e) => s + e.rating, 0) / count).toFixed(1) : "0.0";
    const avgPerformance = count
      ? Math.round(employees.reduce((s, e) => s + (e.completionPct * 0.7 + e.rating * 20 * 0.3), 0) / count)
      : 0;
    return { count, avgCompletion, avgRating, avgPerformance };
  }, [employees]);

  function applyRuleToEmployee(empId: string) {
    if (!assigningRule) return;
    setEvents((prev) => [
      ...prev,
      { id: `ev-${Date.now()}`, empId, label: assigningRule.label, value: assigningRule.value, date: new Date() },
    ]);
    setAssigningRule(null);
  }

  function removeLastEvent(empId: string) {
    setEvents((prev) => {
      const idx = [...prev].reverse().findIndex((ev) => ev.empId === empId);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
  }

  function addRule(data: { label: string; value: number }) {
    setRules((prev) => [...prev, { id: `rule-${Date.now()}`, ...data }]);
    setAddingSign(null);
  }

  function updateRule(id: string, data: { label: string; value: number }) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    setEditingRuleId(null);
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (editingRuleId === id) setEditingRuleId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الأداء" subtitle="تقييم شامل للشركة والفرق." />

      {assigningRule && (
        <Card className="space-y-3 border-primary/40">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {`منح "${assigningRule.label}" (${assigningRule.value > 0 ? "+" : ""}${assigningRule.value}) لمين؟`}
            </div>
            <button onClick={() => setAssigningRule(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => applyRuleToEmployee(e.id)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/30 px-3 py-1.5 text-xs font-semibold hover:bg-accent/60"
              >
                <Avatar name={e.name} size={20} /> {e.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard dense label="عدد الموظفين" value={String(stats.count)} tone="primary" />
        <StatCard dense label="أفضل موظف" value={topEmployee ? topEmployee.name.split(" ")[0] : "—"} tone="warning" />
        <StatCard dense label="متوسط الأداء" value={`${stats.avgPerformance}%`} tone="success" />
        <StatCard dense label="متوسط Target" value={`${stats.avgCompletion}%`} tone="primary" />
        <StatCard dense label="متوسط التقييم" value={stats.avgRating} sub="/ 5" tone="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-linear-to-br from-warning/20 to-primary/10">
          <div className="absolute -top-4 -left-4 text-6xl opacity-10">🏆</div>
          {topEmployee && (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-[oklch(0.5_0.128_82)]">
                <Trophy className="size-4" /> موظف الشهر
              </div>
              <Avatar name={topEmployee.name} size={72} tone="warning" />
              <div className="mt-3 text-xl font-bold">{topEmployee.name}</div>
              <div className="text-sm text-muted-foreground">قسم {topEmployee.dept}</div>
              <div className="mt-3 text-3xl font-bold text-primary tabular">{topEmployee.pts} نقطة</div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>✓ نسبة إنجاز {topEmployee.completionPct}%</li>
                <li>✓ تقييم {topEmployee.rating} من 5</li>
                <li>✓ {events.filter((e) => e.empId === topEmployee.id && e.value > 0).length} عملية إيجابية مسجّلة</li>
              </ul>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2 p-0! overflow-hidden">
          <div className="border-b border-border p-4 font-bold">لوحة الترتيب</div>
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>#</th>
                <th>الموظف</th>
                <th>القسم</th>
                <th>النقاط</th>
                <th>التقييم</th>
                <th>نسبة الإنجاز</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.map((r, i) => (
                <tr key={r.id} className="group row-hover hover:row-hover-active">
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
                  <td className="px-4 py-3 text-muted-foreground">{r.dept}</td>
                  <td className="px-4 py-3 font-bold text-primary tabular">{r.pts}</td>
                  <td className="px-4 py-3 tabular">⭐ {r.rating}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-40">
                      <ProgressBar value={r.completionPct} />
                      <span className="text-xs tabular text-muted-foreground">{r.completionPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button
                      onClick={() => removeLastEvent(r.id)}
                      disabled={!events.some((ev) => ev.empId === r.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition disabled:hover:text-muted-foreground disabled:opacity-0"
                      title="تراجع عن آخر عملية نقاط لهذا الموظف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>قواعد النقاط</SectionTitle>
        </div>
        <div className="mb-3 text-[11px] text-muted-foreground">
          اضغط على القاعدة لمنحها لموظف · ✎ لتعديلها · 🗑 لحذفها
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* المكافآت */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold text-success">تُمنح نقاط عند</div>
              <button
                onClick={() => setAddingSign("+")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-success hover:underline"
              >
                <Plus className="size-3" /> إضافة قاعدة
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rules
                .filter((r) => r.value >= 0)
                .map((r) =>
                  editingRuleId === r.id ? (
                    <RuleEditForm
                      key={r.id}
                      initial={r}
                      onCancel={() => setEditingRuleId(null)}
                      onSubmit={(data) => updateRule(r.id, data)}
                    />
                  ) : (
                    <span
                      key={r.id}
                      className="group/rule inline-flex items-center gap-1 rounded-full pill-success px-2.5 py-1 text-[11px] font-semibold"
                    >
                      <button onClick={() => setAssigningRule(r)} className="hover:opacity-80">
                        {r.label} +{r.value}
                      </button>
                      <button
                        onClick={() => setEditingRuleId(r.id)}
                        className="opacity-0 group-hover/rule:opacity-100 transition"
                        title="تعديل"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => deleteRule(r.id)}
                        className="opacity-0 group-hover/rule:opacity-100 transition"
                        title="حذف"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )
                )}
              {addingSign === "+" && (
                <RuleEditForm onCancel={() => setAddingSign(null)} onSubmit={addRule} />
              )}
            </div>
          </div>

          {/* الخصومات */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold text-destructive">تُخصم نقاط عند</div>
              <button
                onClick={() => setAddingSign("-")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
              >
                <Plus className="size-3" /> إضافة قاعدة
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rules
                .filter((r) => r.value < 0)
                .map((r) =>
                  editingRuleId === r.id ? (
                    <RuleEditForm
                      key={r.id}
                      initial={r}
                      onCancel={() => setEditingRuleId(null)}
                      onSubmit={(data) => updateRule(r.id, data)}
                    />
                  ) : (
                    <span
                      key={r.id}
                      className="group/rule inline-flex items-center gap-1 rounded-full pill-danger px-2.5 py-1 text-[11px] font-semibold"
                    >
                      <button onClick={() => setAssigningRule(r)} className="hover:opacity-80">
                        {r.label} {r.value}
                      </button>
                      <button
                        onClick={() => setEditingRuleId(r.id)}
                        className="opacity-0 group-hover/rule:opacity-100 transition"
                        title="تعديل"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => deleteRule(r.id)}
                        className="opacity-0 group-hover/rule:opacity-100 transition"
                        title="حذف"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )
                )}
              {addingSign === "-" && (
                <RuleEditForm onCancel={() => setAddingSign(null)} onSubmit={addRule} />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}