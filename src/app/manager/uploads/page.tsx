"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import {
  Download,
  Eye,
  Check,
  X,
  Pencil,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  Loader2,
} from "lucide-react";

type Tone = "teal" | "success" | "warning" | "primary" | "danger";
type Status = "بانتظار" | "معتمد" | "تحتاج تعديل" | "مرفوض";
type ActionKind = "download" | "preview" | "approve" | "reject" | "edit";

type UploadFile = {
  id: string;
  emp: string;
  dept: string;
  type: string;
  name: string;
  date: string;
  st: Status;
  tone: Tone;
  viewed: boolean; // بيتحول true أول ما حد يعاين/يحمل الملف
};

const STATUS_TONE: Record<Status, Tone> = {
  "بانتظار": "teal",
  "معتمد": "success",
  "تحتاج تعديل": "warning",
  "مرفوض": "danger",
};

const DEPARTMENTS = ["كل الأقسام", "المبيعات", "السوشيال ميديا", "المناديب"];
const FILE_TYPES = ["كل الأنواع", "شيت ليدز", "نتائج مكالمات", "تقرير مبيعات", "تقرير سوشيال", "بيانات مناديب"];

const INITIAL_FILES: UploadFile[] = [
  { id: "f1", emp: "نورا حسن", dept: "المبيعات", type: "شيت ليدز", name: "leads-jul-20.xlsx", date: "20 يوليو 09:15", st: "بانتظار", tone: "teal", viewed: false },
  { id: "f2", emp: "محمود علي", dept: "المبيعات", type: "نتائج مكالمات", name: "calls-19.pdf", date: "19 يوليو 17:40", st: "معتمد", tone: "success", viewed: true },
  { id: "f3", emp: "كريم سعيد", dept: "المبيعات", type: "تقرير مبيعات", name: "sales-w29.pdf", date: "19 يوليو 16:00", st: "تحتاج تعديل", tone: "warning", viewed: true },
  { id: "f4", emp: "دينا فتحي", dept: "السوشيال ميديا", type: "تقرير سوشيال", name: "social-report.xlsx", date: "18 يوليو 14:30", st: "معتمد", tone: "success", viewed: true },
  { id: "f5", emp: "سارة إبراهيم", dept: "المناديب", type: "بيانات مناديب", name: "reps-list.xlsx", date: "17 يوليو 11:00", st: "مرفوض", tone: "danger", viewed: false },
];

// ---------- Toast ----------
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
            className="toast-in toast-out pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-warm-lg transition hover:opacity-90"
          >
            <Icon className={`size-4 ${color[t.tone]}`} />
            {t.message}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Filter dropdown ----------
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== options[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs transition ${
          isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent"
        }`}
      >
        {isActive ? value : label} <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="dropdown-in absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-warm-lg">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full px-3 py-2 text-right text-xs hover:bg-accent ${o === value ? "bg-accent/60 font-semibold text-primary" : ""}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Confirm modal (للرفض بس، لأنه إجراء حساس) ----------
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0 bg-black/40" onClick={loading ? undefined : onClose} />
      <div className="modal-card relative w-full max-w-sm rounded-2xl bg-background p-5 shadow-warm-lg">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-70 ${
              danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Preview modal ----------
function PreviewModal({ file, onClose }: { file: UploadFile | null; onClose: () => void }) {
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
          <div className="text-xs text-muted-foreground">معاينة الملف غير متاحة حاليًا، حمّل الملف لعرضه كاملًا.</div>
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <div>الموظف: <span className="font-semibold text-foreground">{file.emp}</span></div>
          <div>القسم: <span className="font-semibold text-foreground">{file.dept}</span></div>
          <div>نوع الملف: <span className="font-semibold text-foreground">{file.type}</span></div>
          <div>تاريخ الرفع: <span className="font-semibold text-foreground">{file.date}</span></div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function UploadsPage() {
  const [files, setFiles] = useState<UploadFile[]>(INITIAL_FILES);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [fileType, setFileType] = useState(FILE_TYPES[0]);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [rejectTarget, setRejectTarget] = useState<UploadFile | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: ActionKind } | null>(null);

  const toastCounter = useRef(0);

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => dismissToast(id), 3000);
  };

  const dismissToast = (id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (search.trim() && !f.emp.includes(search.trim())) return false;
      if (dept !== DEPARTMENTS[0] && f.dept !== dept) return false;
      if (fileType !== FILE_TYPES[0] && f.type !== fileType) return false;
      return true;
    });
  }, [files, search, dept, fileType]);

  const totals = useMemo(() => ({
    total: files.length,
    fresh: files.filter((f) => !f.viewed).length,
    pending: files.filter((f) => f.st === "بانتظار").length,
    approved: files.filter((f) => f.st === "معتمد").length,
    rejected: files.filter((f) => f.st === "مرفوض").length,
    needsEdit: files.filter((f) => f.st === "تحتاج تعديل").length,
  }), [files]);

  const updateStatus = (id: string, st: Status) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, st, tone: STATUS_TONE[st] } : f)));
  };

  const markViewed = (id: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, viewed: true } : f)));
  };

  const runAction = (id: string, kind: ActionKind, work: () => void, delay = 500) => {
    setPendingAction({ id, kind });
    setTimeout(() => {
      work();
      setPendingAction(null);
    }, delay);
  };

  const isBusy = (id: string, kind: ActionKind) => pendingAction?.id === id && pendingAction?.kind === kind;

  const handleDownload = (f: UploadFile) => {
    if (isBusy(f.id, "download")) return;
    runAction(f.id, "download", () => {
      markViewed(f.id);
      pushToast("success", `تم تحميل ${f.name}`);
    });
  };

  const handlePreview = (f: UploadFile) => {
    markViewed(f.id);
    setPreviewFile(f);
  };

  const handleApprove = (f: UploadFile) => {
    if (f.st === "معتمد" || isBusy(f.id, "approve")) return;
    runAction(f.id, "approve", () => {
      updateStatus(f.id, "معتمد");
      markViewed(f.id);
      pushToast("success", `تم اعتماد ملف ${f.emp}`);
    });
  };

  const handleRequestEdit = (f: UploadFile) => {
    if (f.st === "تحتاج تعديل" || isBusy(f.id, "edit")) return;
    runAction(f.id, "edit", () => {
      updateStatus(f.id, "تحتاج تعديل");
      markViewed(f.id);
      pushToast("info", `تم طلب تعديل من ${f.emp}`);
    });
  };

  const openRejectConfirm = (f: UploadFile) => {
    if (f.st === "مرفوض") return;
    setRejectTarget(f);
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    const f = rejectTarget;
    runAction(f.id, "reject", () => {
      updateStatus(f.id, "مرفوض");
      markViewed(f.id);
      pushToast("error", `تم رفض ملف ${f.emp}`);
      setRejectTarget(null);
    }, 450);
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .toast-in { animation: toastIn 0.25s ease-out; }
        .dropdown-in { animation: dropdownIn 0.15s ease-out; }
        .row-in { animation: rowIn 0.2s ease-out both; }
        .modal-backdrop { animation: backdropIn 0.2s ease-out; }
        .modal-card { animation: modalIn 0.25s ease-out; }
      `}</style>

      <PageHeader title="مركز رفع الشيتات" subtitle="مراجعة واعتماد الملفات المرفوعة من الموظفين." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="إجمالي" value={String(totals.total)} tone="primary" />
        <StatCard dense label="جديدة" value={String(totals.fresh)} tone="teal" />
        <StatCard dense label="بانتظار المراجعة" value={String(totals.pending)} tone="warning" />
        <StatCard dense label="معتمدة" value={String(totals.approved)} tone="success" />
        <StatCard dense label="مرفوضة" value={String(totals.rejected)} tone="danger" />
        <StatCard dense label="تحتاج تعديل" value={String(totals.needsEdit)} tone="warning" />
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم الموظف..."
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50"
          />
          <FilterDropdown label="القسم" value={dept} options={DEPARTMENTS} onChange={setDept} />
          <FilterDropdown label="نوع الملف" value={fileType} options={FILE_TYPES} onChange={setFileType} />
          {(search || dept !== DEPARTMENTS[0] || fileType !== FILE_TYPES[0]) && (
            <button
              onClick={() => { setSearch(""); setDept(DEPARTMENTS[0]); setFileType(FILE_TYPES[0]); }}
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
                <th>الموظف</th><th>نوع الملف</th><th>اسم الملف</th><th>تاريخ الرفع</th><th>الحالة</th><th>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    مفيش ملفات مطابقة لبحثك
                  </td>
                </tr>
              )}
              {filtered.map((f, i) => (
                <tr key={f.id} className="row-in row-hover hover:row-hover-active" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.emp} />
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{f.emp}</span>
                        {!f.viewed && <span className="size-1.5 rounded-full bg-primary" title="ملف جديد" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{f.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-success" />
                      {f.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{f.date}</td>
                  <td className="px-4 py-3">
                    <Pill tone={f.tone}>{f.st}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDownload(f)}
                        disabled={isBusy(f.id, "download")}
                        title="تحميل"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-90 disabled:opacity-50"
                      >
                        {isBusy(f.id, "download") ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </button>
                      <button
                        onClick={() => handlePreview(f)}
                        title="معاينة"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-90"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(f)}
                        disabled={f.st === "معتمد" || isBusy(f.id, "approve")}
                        title="اعتماد"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-success/10 hover:text-success active:scale-90 disabled:opacity-40"
                      >
                        {isBusy(f.id, "approve") ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                      <button
                        onClick={() => openRejectConfirm(f)}
                        disabled={f.st === "مرفوض"}
                        title="رفض"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90 disabled:opacity-40"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        onClick={() => handleRequestEdit(f)}
                        disabled={f.st === "تحتاج تعديل" || isBusy(f.id, "edit")}
                        title="طلب تعديل"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-warning/10 hover:text-[oklch(0.48_0.11_82)] active:scale-90 disabled:opacity-40"
                      >
                        {isBusy(f.id, "edit") ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
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

      <ConfirmModal
        open={!!rejectTarget}
        title="تأكيد الرفض"
        message={rejectTarget ? `متأكد إنك عايز ترفض ملف "${rejectTarget.name}" الخاص بـ ${rejectTarget.emp}؟` : ""}
        confirmLabel="رفض الملف"
        danger
        loading={rejectTarget ? isBusy(rejectTarget.id, "reject") : false}
        onConfirm={confirmReject}
        onClose={() => setRejectTarget(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}