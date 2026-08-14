"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, PencilLine, Eye, Send, Download, Loader2, Calendar, Clock } from "lucide-react";
import { Avatar, Card, PageHeader, Pill, ProgressBar, SectionTitle, StatCard } from "@/components/manager/primitives";
import * as XLSX from "xlsx";
import {
  getTodayReportsForManager,
  getReportsHistoryWithNames,
  reviewDailyReport,
  subscribeToDailyReports,
  DailyReportToday,
  DailyReportHistoryWithName,
  ReportBackendStatus,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/modules/reports/api/reports.api";

// شكل موحّد تشتغل بيه الصفحة سواء تقرير "اليوم" أو تقرير من "السجل"
type DailyReport = {
  key: string; // users_id لتقارير اليوم، id لتقارير السجل
  reportId: number | null;
  name: string;
  date: string; // نص جاهز للعرض
  completion_percent: number;
  goal: string;
  issue: string | null;
  need: string | null;
  status: ReportBackendStatus;
  managerNote?: string;
};

type Tone = "success" | "warning" | "danger" | "muted";
type ToastState = { id: number; message: string; tone: Tone };
type ViewMode = "today" | "history";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

function toRow(r: DailyReportToday): DailyReport {
  return {
    key: r.users_id,
    reportId: r.report_id,
    name: r.name,
    date: "اليوم",
    completion_percent: r.completion_percent ?? 0,
    goal: r.goal ?? "",
    issue: r.issue,
    need: r.need,
    status: r.status ?? "pending",
  };
}

function historyToRow(r: DailyReportHistoryWithName): DailyReport {
  return {
    key: String(r.id),
    reportId: r.id,
    name: r.name,
    date: fmtDate(r.report_date),
    completion_percent: r.completion_percent,
    goal: r.goal,
    issue: r.issue,
    need: r.need,
    status: r.status ?? "pending",
  };
}

// Fix 3: تقرير "unsent" (الموظف ما بعتش تقرير خالص، والصف اتحط بمعرفة
// الكرون) مفيهوش محتوى حقيقي يتراجع، فمفيش داعي/معنى لاعتماده أو رفضه أو
// طلب تعديل عليه. هنا مركز القرار الوحيد لتحديد هل التقرير قابل للمراجعة
function isReviewable(r: DailyReport) {
  return !!r.reportId && r.status !== "unsent";
}

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
            <Avatar name={report.name} />
            <div>
              <p className="font-semibold">{report.name}</p>
              <p className="text-xs text-muted-foreground">{report.date}</p>
            </div>
          </div>
          <Pill tone={STATUS_TONE[report.status]}>{STATUS_LABELS[report.status]}</Pill>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-1 font-semibold text-foreground">نسبة الإنجاز</div>
            <div className="flex items-center gap-2">
              <ProgressBar value={report.completion_percent} />
              <span className="w-10 text-xs tabular text-muted-foreground">{report.completion_percent}%</span>
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold text-foreground">الإنجازات</div>
            <p className="text-muted-foreground leading-relaxed">{report.goal || "—"}</p>
          </div>
          {report.issue && (
            <div>
              <div className="mb-1 font-semibold text-foreground">المشاكل</div>
              <p className="text-muted-foreground leading-relaxed">{report.issue}</p>
            </div>
          )}
          {report.need && (
            <div>
              <div className="mb-1 font-semibold text-foreground">الاحتياجات</div>
              <p className="text-muted-foreground leading-relaxed">{report.need}</p>
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
          <Avatar name={report.name} />
          <p className="font-semibold">{report.name}</p>
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

function downloadReportExcel(r: DailyReport) {
  const rows = [
    { الحقل: "الموظف", القيمة: r.name },
    { الحقل: "التاريخ", القيمة: r.date },
    { الحقل: "نسبة الإنجاز", القيمة: `${r.completion_percent}%` },
    { الحقل: "الحالة", القيمة: STATUS_LABELS[r.status] },
    { الحقل: "الإنجازات", القيمة: r.goal || "لا يوجد" },
    { الحقل: "المشاكل", القيمة: r.issue || "لا يوجد" },
    { الحقل: "الاحتياجات", القيمة: r.need || "لا يوجد" },
    ...(r.managerNote ? [{ الحقل: "ملاحظة المدير", القيمة: r.managerNote }] : []),
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 60 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
  XLSX.writeFile(workbook, `تقرير-${r.name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadAllReportsExcel(reports: DailyReport[]) {
  const rows = reports.map((r) => ({
    الموظف: r.name,
    التاريخ: r.date,
    "نسبة الإنجاز": `${r.completion_percent}%`,
    الحالة: STATUS_LABELS[r.status],
    الإنجازات: r.goal || "—",
    المشاكل: r.issue || "—",
    الاحتياجات: r.need || "—",
    "ملاحظة المدير": r.managerNote || "—",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "كل التقارير");
  XLSX.writeFile(workbook, `كل-التقارير-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [reports, setReports] = useState<DailyReport[] | null>(null);
  const loading = reports === null;

  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editTarget, setEditTarget] = useState<DailyReport | null>(null);
  const [viewTarget, setViewTarget] = useState<DailyReport | null>(null);

  // فلاتر السجل التاريخي
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const showToast = useCallback((message: string, tone: Tone) => setToast({ id: Date.now(), message, tone }), []);

  const loadToday = useCallback(async () => {
    const data = await getTodayReportsForManager();
    setReports((prev) =>
      data.map((r) => {
        const row = toRow(r);
        const existing = (prev ?? []).find((p) => p.key === row.key);
        return existing ? { ...row, managerNote: existing.managerNote } : row;
      })
    );
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await getReportsHistoryWithNames({
      from: fromDate || undefined,
      to: toDate || undefined,
    });
    setReports(data.map(historyToRow));
  }, [fromDate, toDate]);

 // تحميل البيانات عند تبديل التاب أو تغيير الفلتر
useEffect(() => {
  let ignore = false;

  const run = async () => {
    setReports(null); // إظهار اللودينج فورًا — دلوقتي جوه nested function مش في جسم الـ effect مباشرة
    try {
      if (viewMode === "today") await loadToday();
      else await loadHistory();
    } catch (err) {
      if (!ignore) {
        console.error(err);
        showToast("حصل خطأ في تحميل التقارير", "danger");
        setReports([]);
      }
    }
  };
  run();

  return () => {
    ignore = true;
  };
}, [viewMode, loadToday, loadHistory, showToast]);
  // الـ Realtime بيفيد بس تبويب "اليوم"
  useEffect(() => {
    if (viewMode !== "today") return;
    const unsubscribe = subscribeToDailyReports(() => loadToday());
    return unsubscribe;
  }, [viewMode, loadToday]);

  const flashRow = (id: string) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 700);
  };

  async function updateStatus(r: DailyReport, status: "accepted" | "rejected" | "edit_requested", note?: string) {
    // Fix 3: خط دفاع تاني بجانب تعطيل الأزرار — حتى لو الفانكشن دي اتنادت
    // من مكان تاني، منمنعش مراجعة تقرير مفيش له محتوى حقيقي
    if (!isReviewable(r)) {
      showToast(
        r.status === "unsent" ? "الموظف ده ما بعتش تقرير اليوم ده" : "الموظف ده لسه ما بعتش تقرير اليوم ده",
        "muted"
      );
      return;
    }
    try {
      await reviewDailyReport({ reportId: r.reportId as number, status, comment: note });
      setReports((prev) =>
        (prev ?? []).map((x) => (x.key === r.key ? { ...x, status, managerNote: note ?? x.managerNote } : x))
      );
      flashRow(r.key);
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ أثناء تحديث حالة التقرير", "danger");
    }
  }

  const handleApprove = (r: DailyReport) => {
    if (!isReviewable(r)) return;
    updateStatus(r, "accepted");
    showToast(`تم اعتماد تقرير ${r.name}`, "success");
  };
  const handleReject = (r: DailyReport) => {
    if (!isReviewable(r)) return;
    updateStatus(r, "rejected");
    showToast(`تم رفض تقرير ${r.name}`, "danger");
  };
  const handleView = (r: DailyReport) => setViewTarget(r);
  const handleDownload = (r: DailyReport) => {
    downloadReportExcel(r);
    showToast(`تم تنزيل تقرير ${r.name} كملف إكسل`, "muted");
  };
  const handleDownloadAll = () => {
    const current = reports ?? [];
    if (current.length === 0) return;
    downloadAllReportsExcel(current);
    showToast("تم تنزيل كل التقارير كملف إكسل", "muted");
  };
  const handleEditSubmit = async (note: string) => {
    if (!editTarget) return;
    await updateStatus(editTarget, "edit_requested", note);
    showToast(`تم إرسال طلب التعديل إلى ${editTarget.name}`, "warning");
    setEditTarget(null);
  };
  const openEditTarget = (r: DailyReport) => {
    if (!isReviewable(r)) return;
    setEditTarget(r);
  };

  const currentReports = reports ?? [];
  const count = (status: ReportBackendStatus) => currentReports.filter((r) => r.status === status).length;

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

      {/* التابات */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("today")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            viewMode === "today" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" /> تقارير اليوم
        </button>
        <button
          onClick={() => setViewMode("history")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            viewMode === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" /> السجل التاريخي
        </button>
      </div>

      {/* فلتر التاريخ (السجل بس) */}
      {viewMode === "history" && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline mb-2"
            >
              مسح الفلتر
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارِ التحميل...
        </div>
      ) : (
        <>
          {/* Fix 2: كانت تقارير "unsent" (لم تُرسل) مش متعدودة في أي كارت،
              فبتختفي من ملخص الحالات رغم إنها ظاهرة في الجدول */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard dense label="قيد الانتظار" value={String(count("pending"))} tone="muted" />
            <StatCard dense label="المعتمدة" value={String(count("accepted"))} tone="success" />
            <StatCard dense label="المرفوضة" value={String(count("rejected"))} tone="danger" />
            <StatCard dense label="تحتاج تعديل" value={String(count("edit_requested"))} tone="warning" />
            <StatCard dense label="لم تُرسل" value={String(count("unsent"))} tone="danger" />
          </div>

          <Card className="p-0! overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent/40 text-xs text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                    <th>الموظف</th>
                    {viewMode === "history" && <th>التاريخ</th>}
                    <th>نسبة الإنجاز</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        مفيش تقارير في الفترة دي
                      </td>
                    </tr>
                  ) : (
                    currentReports.map((r) => {
                      const reviewable = isReviewable(r);
                      const actionBtnClass = (color: string) =>
                        `rounded-lg p-1.5 transition-all active:scale-95 ${
                          reviewable
                            ? `${color} hover:scale-110`
                            : "text-muted-foreground/30 cursor-not-allowed"
                        }`;

                      return (
                        <tr
                          key={r.key}
                          className={`row-hover hover:row-hover-active transition-colors duration-500 ${
                            flashId === r.key
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
                              <Avatar name={r.name} />
                              <span className="font-semibold">{r.name}</span>
                            </div>
                          </td>
                          {viewMode === "history" && (
                            <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 w-40">
                              <ProgressBar value={r.completion_percent} />
                              <span className="w-8 text-xs tabular text-muted-foreground">{r.completion_percent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABELS[r.status]}</Pill>
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
                                disabled={!reviewable}
                                title={reviewable ? "اعتماد" : "لا يوجد تقرير لاعتماده"}
                                className={`${actionBtnClass("text-emerald-600 hover:bg-emerald-500/10")}`}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(r)}
                                disabled={!reviewable}
                                title={reviewable ? "رفض" : "لا يوجد تقرير لرفضه"}
                                className={`${actionBtnClass("text-red-600 hover:bg-red-500/10")}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditTarget(r)}
                                disabled={!reviewable}
                                title={reviewable ? "طلب تعديل" : "لا يوجد تقرير لطلب تعديله"}
                                className={`${actionBtnClass("text-amber-600 hover:bg-amber-500/10")}`}
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div>
            <SectionTitle sub="Analytics">تحليل الأداء</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="متوسط نسبة الإنجاز"
                value={`${currentReports.length ? Math.round(currentReports.reduce((s, r) => s + r.completion_percent, 0) / currentReports.length) : 0}%`}
                tone="primary"
              />
              <StatCard label="عدد التقارير" value={String(currentReports.length)} tone="teal" />
            </div>
          </div>
        </>
      )}

      {viewTarget && <ViewReportModal report={viewTarget} onClose={() => setViewTarget(null)} />}
      {editTarget && <EditRequestModal report={editTarget} onClose={() => setEditTarget(null)} onSubmit={handleEditSubmit} />}
      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}
    </div>
  );
}