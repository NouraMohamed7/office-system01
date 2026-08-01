"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, PencilLine, Eye, Send, Download } from "lucide-react";
import { Avatar, Card, PageHeader, Pill, ProgressBar, SectionTitle, StatCard } from "@/components/manager/primitives";
import * as XLSX from "xlsx";

type ReportStatus = "قيد الانتظار" | "معتمد" | "مرفوض" | "تحتاج مراجعة";

type DailyReport = {
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
};

const STATUS_TONE: Record<ReportStatus, "success" | "warning" | "danger" | "muted"> = {
  "قيد الانتظار": "muted",
  "معتمد": "success",
  "مرفوض": "danger",
  "تحتاج مراجعة": "warning",
};

function daysAgoLabel(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

const initialReports: DailyReport[] = [
  {
    id: "r1",
    employeeName: "نورا حسن",
    dept: "السوشيال ميديا",
    date: daysAgoLabel(0),
    pct: 90,
    achievements: "نشر 3 بوستات، الرد على تعليقات العملاء، تجهيز خطة المحتوى للأسبوع القادم",
    problems: "تأخر تصميم الجرافيك من فريق التصميم",
    needs: "الموافقة على ميزانية الإعلانات الممولة",
    status: "قيد الانتظار",
  },
  {
    id: "r2",
    employeeName: "محمود علي",
    dept: "الكول سنتر",
    date: daysAgoLabel(1),
    pct: 75,
    achievements: "التعامل مع 42 مكالمة، حل 5 شكاوى",
    problems: "بطء في النظام أثناء المكالمات",
    needs: "",
    status: "معتمد",
  },
  {
    id: "r3",
    employeeName: "سارة إبراهيم",
    dept: "التسويق",
    date: daysAgoLabel(2),
    pct: 60,
    achievements: "إعداد تقرير المنافسين",
    problems: "",
    needs: "بيانات مبيعات الشهر الماضي",
    status: "تحتاج مراجعة",
    managerNote: "من فضلك وضّحي أرقام المنافسين بشكل أدق",
  },
  {
    id: "r4",
    employeeName: "كريم سعيد",
    dept: "المبيعات",
    date: daysAgoLabel(1),
    pct: 55,
    achievements: "عمل 8 زيارات ميدانية لعملاء جدد",
    problems: "عدم توفر عينات المنتج الجديد",
    needs: "شحنة عينات إضافية",
    status: "قيد الانتظار",
  },
  {
    id: "r5",
    employeeName: "دينا فتحي",
    dept: "التصميم",
    date: daysAgoLabel(3),
    pct: 40,
    achievements: "تصميم بوستر الحملة الجديدة (لسه مسودة)",
    problems: "لخبطة في متطلبات العميل",
    needs: "اجتماع سريع مع فريق التسويق للتوضيح",
    status: "مرفوض",
  },
];

type Tone = "success" | "warning" | "danger" | "muted";
type ToastState = { id: number; message: string; tone: Tone };

function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    const leave = window.setTimeout(() => setVisible(false), 2000);
    const remove = window.setTimeout(onDone, 2350);
    return () => {
      cancelAnimationFrame(enter);
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, [onDone]);

  const toneClasses =
    toast.tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : toast.tone === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-700"
      : toast.tone === "warning"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
      : "border-border bg-card text-foreground";

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition-all duration-300 ${toneClasses} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {toast.message}
    </div>
  );
}

function ViewReportModal({ report, onClose }: { report: DailyReport; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const close = () => {
    setVisible(false);
    window.setTimeout(onClose, 200);
  };
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-200 ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={report.employeeName} />
            <div>
              <p className="font-semibold">{report.employeeName}</p>
              <p className="text-xs text-muted-foreground">
                {report.dept} · {report.date}
              </p>
            </div>
          </div>
          <Pill tone={STATUS_TONE[report.status]}>{report.status}</Pill>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-1 font-semibold text-foreground">نسبة الإنجاز</div>
            <div className="flex items-center gap-2">
              <ProgressBar value={report.pct} />
              <span className="w-10 text-xs tabular text-muted-foreground">{report.pct}%</span>
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold text-foreground">الإنجازات</div>
            <p className="text-muted-foreground leading-relaxed">{report.achievements}</p>
          </div>
          {report.problems && (
            <div>
              <div className="mb-1 font-semibold text-foreground">المشاكل</div>
              <p className="text-muted-foreground leading-relaxed">{report.problems}</p>
            </div>
          )}
          {report.needs && (
            <div>
              <div className="mb-1 font-semibold text-foreground">الاحتياجات</div>
              <p className="text-muted-foreground leading-relaxed">{report.needs}</p>
            </div>
          )}
          {report.managerNote && (
            <div className="rounded-xl bg-amber-500/10 p-3">
              <div className="mb-1 font-semibold text-amber-700">ملاحظة المدير</div>
              <p className="text-amber-700/90 leading-relaxed">{report.managerNote}</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={close}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRequestModal({
  report,
  onClose,
  onSubmit,
}: {
  report: DailyReport;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => {
    setVisible(false);
    window.setTimeout(onClose, 200);
  };
  const submit = () => {
    if (!note.trim()) return;
    onSubmit(note.trim());
    close();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-200 ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
        }`}
      >
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={report.employeeName} />
          <div>
            <p className="font-semibold">{report.employeeName}</p>
            <p className="text-xs text-muted-foreground">
              {report.dept} · {report.date}
            </p>
          </div>
        </div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">اكتب الملاحظة المطلوب تعديلها</label>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: من فضلك وضّح أرقام المبيعات بشكل أدق..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={close} className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent">
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={!note.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-amber-500"
          >
            <Send className="h-3.5 w-3.5" /> إرسال للموظف
          </button>
        </div>
      </div>
    </div>
  );
}

// تنزيل تقرير واحد كملف إكسل
function downloadReportExcel(r: DailyReport) {
  const rows = [
    { الحقل: "الموظف", القيمة: r.employeeName },
    { الحقل: "القسم", القيمة: r.dept },
    { الحقل: "التاريخ", القيمة: r.date },
    { الحقل: "نسبة الإنجاز", القيمة: `${r.pct}%` },
    { الحقل: "الحالة", القيمة: r.status },
    { الحقل: "الإنجازات", القيمة: r.achievements },
    { الحقل: "المشاكل", القيمة: r.problems || "لا يوجد" },
    { الحقل: "الاحتياجات", القيمة: r.needs || "لا يوجد" },
    ...(r.managerNote ? [{ الحقل: "ملاحظة المدير", القيمة: r.managerNote }] : []),
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 60 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
  XLSX.writeFile(workbook, `تقرير-${r.employeeName}-${r.date}.xlsx`);
}

// تنزيل كل التقارير كملف إكسل واحد (جدول شامل)
function downloadAllReportsExcel(reports: DailyReport[]) {
  const rows = reports.map((r) => ({
    الموظف: r.employeeName,
    القسم: r.dept,
    التاريخ: r.date,
    "نسبة الإنجاز": `${r.pct}%`,
    الحالة: r.status,
    الإنجازات: r.achievements,
    المشاكل: r.problems || "—",
    الاحتياجات: r.needs || "—",
    "ملاحظة المدير": r.managerNote || "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "كل التقارير");
  XLSX.writeFile(workbook, `كل-التقارير-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>(initialReports);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editTarget, setEditTarget] = useState<DailyReport | null>(null);
  const [viewTarget, setViewTarget] = useState<DailyReport | null>(null);

  const showToast = useCallback((message: string, tone: Tone) => setToast({ id: Date.now(), message, tone }), []);

  const flashRow = (id: string) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 700);
  };

  function updateStatus(id: string, status: ReportStatus, note?: string) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, managerNote: note ?? r.managerNote } : r)));
  }

  const handleApprove = (r: DailyReport) => {
    updateStatus(r.id, "معتمد");
    flashRow(r.id);
    showToast(`تم اعتماد تقرير ${r.employeeName}`, "success");
  };
  const handleReject = (r: DailyReport) => {
    updateStatus(r.id, "مرفوض");
    flashRow(r.id);
    showToast(`تم رفض تقرير ${r.employeeName}`, "danger");
  };
  const handleView = (r: DailyReport) => setViewTarget(r);
  const handleDownload = (r: DailyReport) => {
    downloadReportExcel(r);
    showToast(`تم تنزيل تقرير ${r.employeeName} كملف إكسل`, "muted");
  };
  const handleDownloadAll = () => {
    if (reports.length === 0) return;
    downloadAllReportsExcel(reports);
    showToast("تم تنزيل كل التقارير كملف إكسل", "muted");
  };

  const handleEditSubmit = (note: string) => {
    if (!editTarget) return;
    updateStatus(editTarget.id, "تحتاج مراجعة", note);
    flashRow(editTarget.id);
    showToast(`تم إرسال طلب التعديل إلى ${editTarget.employeeName}`, "warning");
    setEditTarget(null);
  };

  const count = (status: ReportStatus) => reports.filter((r) => r.status === status).length;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="التقارير اليومية" subtitle="مراجعة تقارير الموظفين واعتمادها." />
        <button
          onClick={handleDownloadAll}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition"
        >
          <Download className="h-4 w-4" /> تنزيل الكل (إكسل)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="قيد الانتظار" value={String(count("قيد الانتظار"))} tone="muted" />
        <StatCard dense label="المعتمدة" value={String(count("معتمد"))} tone="success" />
        <StatCard dense label="المرفوضة" value={String(count("مرفوض"))} tone="danger" />
        <StatCard dense label="تحتاج تعديل" value={String(count("تحتاج مراجعة"))} tone="warning" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th>
                <th>القسم</th>
                <th>التاريخ</th>
                <th>نسبة الإنجاز</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className={`row-hover hover:row-hover-active transition-colors duration-500 ${
                    flashId === r.id
                      ? STATUS_TONE[r.status] === "danger"
                        ? "bg-red-500/10"
                        : STATUS_TONE[r.status] === "warning"
                        ? "bg-amber-500/10"
                        : "bg-emerald-500/10"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.employeeName} />
                      <span className="font-semibold">{r.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dept}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-40">
                      <ProgressBar value={r.pct} />
                      <span className="w-8 text-xs tabular text-muted-foreground">{r.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(r)}
                        title="عرض التقرير"
                        className="rounded-lg p-1.5 text-muted-foreground transition-all hover:scale-110 hover:bg-accent hover:text-foreground active:scale-95"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(r)}
                        title="تنزيل إكسل"
                        className="rounded-lg p-1.5 text-muted-foreground transition-all hover:scale-110 hover:bg-accent hover:text-foreground active:scale-95"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(r)}
                        title="اعتماد"
                        className="rounded-lg p-1.5 text-emerald-600 transition-all hover:scale-110 hover:bg-emerald-500/10 active:scale-95"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(r)}
                        title="رفض"
                        className="rounded-lg p-1.5 text-red-600 transition-all hover:scale-110 hover:bg-red-500/10 active:scale-95"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditTarget(r)}
                        title="طلب تعديل"
                        className="rounded-lg p-1.5 text-amber-600 transition-all hover:scale-110 hover:bg-amber-500/10 active:scale-95"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div>
        <SectionTitle sub="Analytics">تحليل الأداء</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="متوسط نسبة الإنجاز"
            value={`${reports.length ? Math.round(reports.reduce((s, r) => s + r.pct, 0) / reports.length) : 0}%`}
            tone="primary"
          />
          <StatCard label="عدد التقارير" value={String(reports.length)} tone="teal" />
        </div>
      </div>

      {viewTarget && <ViewReportModal report={viewTarget} onClose={() => setViewTarget(null)} />}
      {editTarget && <EditRequestModal report={editTarget} onClose={() => setEditTarget(null)} onSubmit={handleEditSubmit} />}
      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}
    </div>
  );
}