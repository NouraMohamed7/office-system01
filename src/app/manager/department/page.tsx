"use client";

import { Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { Building2 } from "lucide-react";

const depts = [
  { name: "السوشيال ميديا", en: "Social Media", emps: 18, tasks: 42, target: 94, tone: "success" as const },
  { name: "الكول سنتر", en: "Call Center", emps: 32, tasks: 128, target: 87, tone: "primary" as const },
  { name: "التسويق", en: "Marketing", emps: 14, tasks: 36, target: 82, tone: "teal" as const },
  { name: "المبيعات", en: "Sales", emps: 28, tasks: 96, target: 76, tone: "warning" as const },
  { name: "التصميم", en: "Design", emps: 10, tasks: 24, target: 91, tone: "success" as const },
  { name: "الدعم", en: "Support", emps: 8, tasks: 18, target: 88, tone: "primary" as const },
];

export default function DepartmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="شغل القسم" subtitle="أداء كل قسم على حدة." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="عدد الأقسام" value="6" tone="primary" />
        <StatCard dense label="إجمالي الموظفين" value="110" tone="teal" />
        <StatCard dense label="مهام مفتوحة" value="344" tone="warning" />
        <StatCard dense label="متوسط تحقيق Target" value="86%" tone="success" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {depts.map(d => (
          <div key={d.name} className="card-warm p-5 hover:shadow-warm-lg cursor-pointer">
            <div className="flex items-start justify-between">
              <div className={`grid size-11 place-items-center rounded-xl pill-${d.tone}`}><Building2 className="size-5" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary tabular">{d.target}%</div>
                <div className="text-[10px] text-muted-foreground">Target</div>
              </div>
            </div>
            <div className="mt-3 text-base font-bold">{d.name}</div>
            <div className="text-[11px] text-muted-foreground">{d.en}</div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div><span className="font-bold text-foreground tabular">{d.emps}</span> <span className="text-muted-foreground">موظف</span></div>
              <div><span className="font-bold text-foreground tabular">{d.tasks}</span> <span className="text-muted-foreground">مهمة</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}