"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import {
  Download,
  Eye,
  Check,
  X,
  PencilLine,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  UnifiedFile,
  FileApprovalStatus,
  FILE_STATUS_LABELS,
  getAllFiles,
  reviewFileApproval,
  deleteApprovalFile,
} from "@/modules/uploads/api/uploads.api";

type Tone = "teal" | "success" | "warning" | "danger" | "primary";
type ActionKind = "approve" | "reject" | "edit_request";
type FilterValue = "الكل" | FileApprovalStatus;

const STATUS_TONE: Record<FileApprovalStatus, Tone> = {
  pending: "teal",
  accepted: "success",
  edit_requested: "warning",
  rejected: "danger",
};

const FILTERS: FilterValue[] = ["الكل", "pending", "accepted", "edit_requested", "rejected"];

/* ---------- Toast ---------- */
type ToastItem = { id: number; tone: "success" | "error" | "info"; message: string };

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const color = { success: "text-emerald-500", error: "text-destructive", info: "text-primary" };
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = icon[t.tone];
        return (
          <button
            key={t.id}
            onClick={() => onDismiss(t.id)}
            className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-warm-lg transition hover:opacity-90"
          >
            <Icon className={`size-4 ${color[t.tone]}`} />
            {t.message}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Review modal ---------- */
function ReviewModal({
  open,
  action,
  fileName,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  action: ActionKind | null;
  fileName: string;
  loading: boolean;
  onConfirm: (comment: string) => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) setComment("");
  }, [open]);

  if (!open || !action) return null;

  const config = {
    reject: { title: "تأكيد الرفض", confirmLabel: "رفض الملف", danger: true },
    edit_request: { title: "طلب تعديل", confirmLabel: "إرسال طلب التعديل", danger: false },
    approve: { title: "اعتماد الملف", confirmLabel: "اعتماد", danger: false },
  }[action];

  const commentRequired = action === "reject" || action === "edit_request";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0 bg-black/40" onClick={loading ? undefined : onClose} />
      <div className="modal-card relative w-full max-w-sm rounded-2xl bg-background p-5 shadow-warm-lg">
        <h3 className="text-base font-bold">{config.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">الملف: {fileName}</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={commentRequired ? "اكتب سبب القرار (مطلوب)..." : "تعليق اختياري..."}
          className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary/50 resize-none"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(comment)}
            disabled={loading || (commentRequired && !comment.trim())}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
              config.danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Preview modal ---------- */
function PreviewModal({ file, onClose }: { file: UnifiedFile | null; onClose: () => void }) {
  if (!file) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="modal-card relative w-full max-w-md rounded-2xl bg-background p-5 shadow-warm-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">معاينة الملف</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-accent/30 py-10">
          <FileText className="size-10 text-muted-foreground" />
          <div className="text-sm font-semibold">{file.name}</div>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            فتح الملف في نافذة جديدة
          </a>
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <div>الموظف: <span className="font-semibold text-foreground">{file.user_name ?? "غير معروف"}</span></div>
          <div>تاريخ الرفع: <span className="font-semibold text-foreground">{file.created_at.slice(0, 10)}</span></div>
          <div>
            الحالة:{" "}
            <span className="font-semibold text-foreground">{FILE_STATUS_LABELS[file.status]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function UploadsPage() {
  const [files, setFiles] = useState<UnifiedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterValue, setFilterValue] = useState<FilterValue>("الكل");
  const [previewFile, setPreviewFile] = useState<UnifiedFile | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ file: UnifiedFile; action: ActionKind } | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const toastCounter = useRef(0);

  async function loadFiles() {
    setLoading(true);
    try {
      const data = await getAllFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
      pushToast("error", "حصل خطأ أثناء تحميل الملفات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => dismissToast(id), 3000);
  };

  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (search.trim() && !(f.user_name ?? "").includes(search.trim())) return false;
      if (filterValue !== "الكل" && f.status !== filterValue) return false;
      return true;
    });
  }, [files, search, filterValue]);

  const totals = useMemo(() => ({
    total: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    accepted: files.filter((f) => f.status === "accepted").length,
    editRequested: files.filter((f) => f.status === "edit_requested").length,
    rejected: files.filter((f) => f.status === "rejected").length,
  }), [files]);

  const statusToEnum: Record<ActionKind, FileApprovalStatus> = {
    approve: "accepted",
    reject: "rejected",
    edit_request: "edit_requested",
  };

  const openReview = (file: UnifiedFile, action: ActionKind) => {
    if (statusToEnum[action] === file.status) return;
    setReviewTarget({ file, action });
  };

  const confirmReview = async (comment: string) => {
    if (!reviewTarget) return;
    const { file, action } = reviewTarget;
    setReviewLoading(true);
    try {
      await reviewFileApproval(file.id, statusToEnum[action], comment);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: statusToEnum[action] } : f)));
      const msgByAction: Record<ActionKind, string> = {
        approve: `تم اعتماد ملف ${file.user_name ?? ""}`,
        reject: `تم رفض ملف ${file.user_name ?? ""}`,
        edit_request: `تم إرسال طلب تعديل لملف ${file.user_name ?? ""}`,
      };
      pushToast(action === "reject" ? "error" : "success", msgByAction[action]);
      setReviewTarget(null);
    } catch (err) {
      console.error(err);
      pushToast("error", "حصل خطأ أثناء تحديث حالة الملف");
    } finally {
      setReviewLoading(false);
    }
  };

  // الحذف مسموح في أي حالة — المدير يقدر يمسح أي ملف بغض النظر عن حالته
  const handleDelete = async (f: UnifiedFile) => {
    setPendingId(f.id);
    try {
      await deleteApprovalFile(f.id);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
      pushToast("success", `تم حذف ${f.name}`);
    } catch (err) {
      console.error(err);
      pushToast("error", "حصل خطأ أثناء حذف الملف");
    } finally {
      setPendingId(null);
    }
  };

  const handleDownload = (f: UnifiedFile) => {
    window.open(f.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes rowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .toast-in { animation: toastIn 0.25s ease-out; }
        .row-in { animation: rowIn 0.2s ease-out both; }
        .modal-backdrop { animation: backdropIn 0.2s ease-out; }
        .modal-card { animation: modalIn 0.25s ease-out; }
      `}</style>

      <PageHeader title="مركز رفع الملفات" subtitle="مراجعة الملفات المرفوعة من الموظفين واعتمادها." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard dense label="إجمالي" value={String(totals.total)} tone="primary" />
        <StatCard dense label="بانتظار المراجعة" value={String(totals.pending)} tone="teal" />
        <StatCard dense label="معتمدة" value={String(totals.accepted)} tone="success" />
        <StatCard dense label="تحتاج تعديل" value={String(totals.editRequested)} tone="warning" />
        <StatCard dense label="مرفوضة" value={String(totals.rejected)} tone="danger" />
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم الموظف..."
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50"
          />
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value as FilterValue)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "الكل" ? "كل الملفات" : FILE_STATUS_LABELS[f]}
              </option>
            ))}
          </select>
          {(search || filterValue !== "الكل") && (
            <button
              onClick={() => { setSearch(""); setFilterValue("الكل"); }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>اسم الملف</th><th>تاريخ الرفع</th><th>الحالة</th><th>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">مفيش ملفات مطابقة لبحثك</td>
                </tr>
              )}
              {!loading && filtered.map((f, i) => (
                <tr key={f.id} className="row-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.user_name ?? "غير معروف"} />
                      <span className="font-semibold">{f.user_name ?? "غير معروف"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      {f.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{f.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[f.status]}>{FILE_STATUS_LABELS[f.status]}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewFile(f)}
                        title="معاينة"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-90"
                      >
                        <Eye className="size-4" />
                      </button>

                      <button
                        onClick={() => openReview(f, "approve")}
                        disabled={f.status === "accepted"}
                        title="اعتماد"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-success/10 hover:text-success active:scale-90 disabled:opacity-40"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        onClick={() => openReview(f, "edit_request")}
                        disabled={f.status === "edit_requested"}
                        title="طلب تعديل"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-warning/20 hover:text-[oklch(0.48_0.11_82)] active:scale-90 disabled:opacity-40"
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        onClick={() => openReview(f, "reject")}
                        disabled={f.status === "rejected"}
                        title="رفض"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90 disabled:opacity-40"
                      >
                        <X className="size-4" />
                      </button>

                      <button
                        onClick={() => handleDownload(f)}
                        title="تحميل"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-90"
                      >
                        <Download className="size-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(f)}
                        disabled={pendingId === f.id}
                        title="حذف"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90 disabled:opacity-50"
                      >
                        {pendingId === f.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <ReviewModal
        open={!!reviewTarget}
        action={reviewTarget?.action ?? null}
        fileName={reviewTarget?.file.name ?? ""}
        loading={reviewLoading}
        onConfirm={confirmReview}
        onClose={() => setReviewTarget(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}