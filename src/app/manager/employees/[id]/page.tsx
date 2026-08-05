// src/app/manager/employees/[id]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { Avatar, Card, PageHeader, Pill, SectionTitle, StatCard } from "@/components/manager/primitives";
import { Mail, Phone, MapPin, Briefcase, Building2, Calendar, MoreVertical, Loader2 } from "lucide-react";
import { getEmployeeById, type EmployeeRow } from "@/modules/employees/api/employees.api";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "teal" | "muted" | "primary"> = {
  "نشط": "success",
  "معطل": "muted",
  "في إجازة": "teal",
  "متأخر": "warning",
  "غائب": "danger",
};

function formatJoinDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function EmployeeProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const emp = await getEmployeeById(id);
        setEmployee(emp);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الموظف");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> جاري تحميل بيانات الموظف...
      </div>
    );
  }

  if (loadError) {
    return <div className="p-6 text-sm text-destructive">خطأ: {loadError}</div>;
  }

  if (!employee) {
    return <div className="p-6 text-sm text-muted-foreground">الموظف غير موجود</div>;
  }

  const status = employee.emp_status || "نشط";
  const tone = STATUS_TONE[status] ?? "muted";
  const phone = employee.personalPhone || employee.workPhone || employee.saudiPhone || "—";
  const location = [employee.branch?.city, employee.branch?.address].filter(Boolean).join(" — ") || "—";

  return (
    <div className="space-y-6">
      <PageHeader title={`ملف الموظف · ${employee.full_name}`} subtitle={`رقم الموظف: ${id}`} />

      <Card>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={employee.full_name} size={72} />
          <div className="flex-1 min-w-[240px]">
            <div className="text-xl font-bold">{employee.full_name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{employee.position?.title ?? "—"}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div className="flex items-center gap-1.5"><Mail className="size-3.5" /> {employee.email || "—"}</div>
              <div className="flex items-center gap-1.5" dir="ltr"><Phone className="size-3.5" /> {phone}</div>
              <div className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {location}</div>
              <div className="flex items-center gap-1.5"><Building2 className="size-3.5" /> {employee.department?.name ?? "—"}</div>
              <div className="flex items-center gap-1.5"><Briefcase className="size-3.5" /> {employee.branch?.city ?? "—"}</div>
              <div className="flex items-center gap-1.5"><Calendar className="size-3.5" /> عُيّن {formatJoinDate(employee.created_at)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={tone}>{status}</Pill>
            <button className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent"><MoreVertical className="size-4" /></button>
          </div>
        </div>
      </Card>

      {/* الإحصائيات دي لسه بيانات وهمية — مفيش endpoint للمهام/التقارير/الأداء متاح دلوقتي */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard dense label="المهام" value="87" tone="primary" />
        <StatCard dense label="المكتملة" value="72" tone="success" />
        <StatCard dense label="المتأخرة" value="4" tone="danger" />
        <StatCard dense label="التقارير" value="38" tone="teal" />
        <StatCard dense label="الملفات" value="21" tone="warning" />
        <StatCard dense label="النقاط" value="940" tone="primary" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard dense label="أيام حضور" value="22" tone="success" />
        <StatCard dense label="غياب" value="1" tone="danger" />
        <StatCard dense label="تأخير" value="3" tone="warning" />
        <StatCard dense label="الشكاوى" value="0" tone="muted" />
        <StatCard dense label="تحقيق Target" value="112%" tone="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle sub="Timeline">سجل النشاط</SectionTitle>
          {/* التايم لاين ده لسه بيانات وهمية — مفيش endpoint له متاح دلوقتي */}
          <ol className="space-y-3">
            {[
              { d: "20 يوليو", t: "رفعت تقرير اليوم", tone: "teal" },
              { d: "19 يوليو", t: "أنهت مهمة تصميم كاروسيل", tone: "success" },
              { d: "18 يوليو", t: "رفعت شيت ليدز — تم الاعتماد", tone: "success" },
              { d: "17 يوليو", t: "حصلت على مكافأة (150 ج)", tone: "warning" },
              { d: "12 يوليو", t: "خصم بسبب تأخير 20 دقيقة", tone: "danger" },
            ].map((x, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: `var(--${x.tone === "teal" ? "teal" : x.tone === "success" ? "success" : x.tone === "warning" ? "warning" : "destructive"})` }} />
                <div className="flex-1">
                  <div className="text-sm">{x.t}</div>
                  <div className="text-[11px] text-muted-foreground">{x.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}