"use client";

import { useSyncExternalStore } from "react";

export type ReportStatus = "قيد الانتظار" | "معتمد" | "مرفوض" | "تحتاج مراجعة";

export type DailyReport = {
  id: string;
  employeeName: string;
  dept: string;
  date: string;
  pct: number;
  achievements: string;
  problems: string;
  needs: string;
  status: ReportStatus;
  managerNote?: string;
  createdAt: number;
};

export const STATUS_TONE: Record<ReportStatus, "success" | "warning" | "danger" | "muted"> = {
  "قيد الانتظار": "muted",
  "معتمد": "success",
  "مرفوض": "danger",
  "تحتاج مراجعة": "warning",
};

// قائمة الموظفين الفعليين — نفس الموظفين المستخدمين في باقي الصفحات
export const EMPLOYEES = [
  { name: "نورا حسن", dept: "السوشيال ميديا" },
  { name: "محمود علي", dept: "الكول سنتر" },
  { name: "سارة إبراهيم", dept: "التسويق" },
  { name: "كريم سعيد", dept: "المبيعات" },
  { name: "دينا فتحي", dept: "التصميم" },
];

function daysAgoLabel(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

// بيانات بداية واقعية لعدة موظفين، عشان تشوف الصفحة شغالة فورًا
let reports: DailyReport[] = [
  {
    id: "seed-1",
    employeeName: "نورا حسن",
    dept: "السوشيال ميديا",
    date: daysAgoLabel(0),
    pct: 90,
    achievements: "نشر 3 بوستات، الرد على تعليقات العملاء، تجهيز خطة المحتوى للأسبوع القادم",
    problems: "تأخر تصميم الجرافيك من فريق التصميم",
    needs: "الموافقة على ميزانية الإعلانات الممولة",
    status: "قيد الانتظار",
    createdAt: Date.now() - 1000 * 60 * 60,
  },
  {
    id: "seed-2",
    employeeName: "محمود علي",
    dept: "الكول سنتر",
    date: daysAgoLabel(1),
    pct: 75,
    achievements: "التعامل مع 42 مكالمة، حل 5 شكاوى",
    problems: "بطء في النظام أثناء المكالمات",
    needs: "",
    status: "معتمد",
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: "seed-3",
    employeeName: "سارة إبراهيم",
    dept: "التسويق",
    date: daysAgoLabel(2),
    pct: 60,
    achievements: "إعداد تقرير المنافسين",
    problems: "",
    needs: "بيانات مبيعات الشهر الماضي",
    status: "تحتاج مراجعة",
    managerNote: "من فضلك وضّحي أرقام المنافسين بشكل أدق",
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return reports;
}

export function addReport(data: Omit<DailyReport, "id" | "status" | "createdAt">) {
  const newReport: DailyReport = {
    id: `r-${Date.now()}`,
    status: "قيد الانتظار",
    createdAt: Date.now(),
    ...data,
  };
  reports = [newReport, ...reports];
  emitChange();
}

export function updateReportStatus(id: string, status: ReportStatus, note?: string) {
  reports = reports.map((r) => (r.id === id ? { ...r, status, managerNote: note ?? r.managerNote } : r));
  emitChange();
}

export function downloadReport(r: DailyReport) {
  const content = `تقرير يوم ${r.date}
الموظف: ${r.employeeName}
القسم: ${r.dept}
نسبة الإنجاز: ${r.pct}%
الحالة: ${r.status}

الإنجازات:
${r.achievements}

المشاكل:
${r.problems || "لا يوجد"}

الاحتياجات:
${r.needs || "لا يوجد"}
${r.managerNote ? `\nملاحظة المدير:\n${r.managerNote}` : ""}`;

  const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `تقرير-${r.employeeName}-${r.date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// hook: بيرجع كل التقارير، أو تقارير موظف معين لو بعتّله اسمه
export function useReportsStore(employeeName?: string): DailyReport[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
  if (employeeName) return sorted.filter((r) => r.employeeName === employeeName);
  return sorted;
}