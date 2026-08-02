"use client";

import { useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/*  نفس شكل بيانات الشكوى الموجود في صفحة الموظف بالظبط، وضايف بس        */
/*  اسم الموظف صاحب الشكوى عشان المدير يعرف هي مين                       */
/* ------------------------------------------------------------------ */

type ComplaintStatus = "جديدة" | "قيد التنفيذ" | "تم الحل" | "مرفوضة";
type ComplaintCategory = "بيئة العمل" | "الراتب والمزايا" | "زميل عمل" | "أدوات وموارد" | "أخرى";

type Complaint = {
  id: string;
  emp: string;
  subject: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
};

const statusTone: Record<ComplaintStatus, "teal" | "success" | "warning" | "danger"> = {
  "جديدة": "teal",
  "قيد التنفيذ": "warning",
  "تم الحل": "success",
  "مرفوضة": "danger",
};

const initialComplaints: Complaint[] = [
  {
    id: "c1",
    emp: "دينا فتحي",
    subject: "تأخر صرف مكافأة الأداء",
    category: "الراتب والمزايا",
    description: "مكافأة شهر يونيو لسه ماوصلتش، وحابب أعرف موعدها بالظبط.",
    status: "قيد التنفيذ",
    createdAt: "2026-07-20",
  },
  {
    id: "c2",
    emp: "أحمد رضا",
    subject: "مشكلة في تكييف المكتب",
    category: "بيئة العمل",
    description: "التكييف في الدور التاني مش شغال من يومين وده مؤثر على التركيز.",
    status: "تم الحل",
    createdAt: "2026-07-14",
  },
  {
    id: "c3",
    emp: "ياسمين عادل",
    subject: "طلب جهاز لابتوب بديل",
    category: "أدوات وموارد",
    description: "اللابتوب الحالي بطيء جدًا وبيأثر على سرعة إنجاز المهام.",
    status: "جديدة",
    createdAt: "2026-07-25",
  },
];

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [selectedId, setSelectedId] = useState<string>(initialComplaints[0].id);

  const selected = complaints.find((c) => c.id === selectedId)!;

  const stats = {
    total: complaints.length,
    new: complaints.filter((c) => c.status === "جديدة").length,
    inProgress: complaints.filter((c) => c.status === "قيد التنفيذ").length,
    resolved: complaints.filter((c) => c.status === "تم الحل").length,
    rejected: complaints.filter((c) => c.status === "مرفوضة").length,
  };

  function handleStatusChange(status: ComplaintStatus) {
    setComplaints((prev) => prev.map((c) => (c.id === selectedId ? { ...c, status } : c)));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الشكاوى" subtitle="متابعة شكاوى الموظفين وحالتها." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard dense label="إجمالي الشكاوى" value={String(stats.total)} tone="primary" />
        <StatCard dense label="جديدة" value={String(stats.new)} tone="teal" />
        <StatCard dense label="قيد التنفيذ" value={String(stats.inProgress)} tone="warning" />
        <StatCard dense label="تم الحل" value={String(stats.resolved)} tone="success" />
        <StatCard dense label="مرفوضة" value={String(stats.rejected)} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="!p-0 overflow-hidden lg:col-span-2">
          <ul className="divide-y divide-border">
            {complaints.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`cursor-pointer p-4 hover:bg-primary/5 ${c.id === selectedId ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.emp} />
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm font-semibold block">{c.subject}</span>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.emp} · {c.category} · {c.createdAt}
                    </div>
                  </div>
                  <Pill tone={statusTone[c.status]}>{c.status}</Pill>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="!p-6 lg:col-span-3 space-y-5">
          <div>
            <div className="text-base font-bold">{selected.subject}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {selected.category} · {selected.createdAt}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Avatar name={selected.emp} size={36} />
            <div>
              <div className="text-[11px] text-muted-foreground">مقدّم الشكوى</div>
              <div className="text-sm font-bold">{selected.emp}</div>
            </div>
          </div>

          <p className="rounded-xl bg-secondary/50 p-4 text-sm leading-relaxed text-foreground">
            {selected.description}
          </p>

          <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">حالة الشكوى</div>
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              {(["جديدة", "قيد التنفيذ", "تم الحل", "مرفوضة"] as ComplaintStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={selected.status === s}
                  className={`px-3 py-2 text-xs font-semibold transition ${
                    selected.status === s
                      ? "bg-primary text-primary-foreground cursor-default"
                      : "bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}