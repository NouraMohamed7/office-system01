"use client";

import { useState } from "react";
import { Card, PageHeader } from "@/components/manager/primitives";
import { FileText, Users, Clock, ListChecks, TrendingUp, Files, MessageSquare, Truck, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const cats = [
  { id: "emp", label: "تقارير الموظفين", icon: Users },
  { id: "att", label: "تقارير الحضور", icon: Clock },
  { id: "tsk", label: "تقارير المهام", icon: ListChecks },
  { id: "perf", label: "تقارير الأداء", icon: TrendingUp },
  { id: "files", label: "تقارير الملفات", icon: Files },
  { id: "cmp", label: "تقارير الشكاوى", icon: MessageSquare },
  { id: "reps", label: "تقارير المناديب", icon: Truck },
  { id: "fin", label: "التقارير المالية", icon: Wallet },
];
const data = Array.from({ length: 8 }, (_, i) => ({ x: `ب${i+1}`, v: 40 + Math.round(Math.random() * 60) }));

export default function ReportsHubPage() {
  const [sel, setSel] = useState("emp");
  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" subtitle="مركز التقارير الشامل." />

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="!p-2 lg:col-span-1">
          <div className="mb-2 px-2 pt-2 text-xs font-bold text-muted-foreground">الأقسام</div>
          {cats.map(c => {
            const Icon = c.icon;
            const active = sel === c.id;
            return (
              <button key={c.id} onClick={() => setSel(c.id)}
                className={cn("mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                <Icon className="size-4" /> {c.label}
              </button>
            );
          })}
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-2">
              {["الموظف","القسم","الفرع","التاريخ","الحالة"].map(f => (
                <button key={f} className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">{f} ▾</button>
              ))}
              <div className="mr-auto flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-dark"><FileText className="size-3.5" /> PDF</button>
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-teal text-teal px-3 py-2 text-xs font-semibold hover:bg-teal/10">📊 Excel</button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 font-bold">معاينة التقرير</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="v" fill="var(--primary)" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-accent/40 text-xs text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right"><th>البند</th><th>القيمة</th><th>النسبة</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {["إجمالي","الأعلى","المتوسط","الأدنى"].map((r, i) => (
                  <tr key={r} className="row-hover">
                    <td className="px-4 py-2.5">{r}</td>
                    <td className="px-4 py-2.5 tabular font-bold text-primary">{(1200 - i * 200).toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular text-muted-foreground">{100 - i * 20}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}