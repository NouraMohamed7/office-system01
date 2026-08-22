// src/app/employee/uploads/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Trash2,
  Download,
  FolderOpen,
  Clock3,
  CheckCircle2,
  XCircle,
  PencilLine,
  Loader2,
} from "lucide-react";
import {
  UnifiedFile,
  FileApprovalStatus,
  FILE_STATUS_LABELS,
  MAX_APPROVAL_FILE_SIZE_MB,
  getMyFiles,
  uploadApprovalFile,
  deleteApprovalFile,
} from "@/modules/uploads/api/uploads.api";

type FilterValue = "الكل" | FileApprovalStatus;

const statusTone: Record<FileApprovalStatus, "teal" | "success" | "warning" | "danger"> = {
  pending: "teal",
  accepted: "success",
  rejected: "danger",
  edit_requested: "warning",
};

function iconForFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") return ImageIcon;
  if (ext === "xlsx" || ext === "csv") return FileSpreadsheet;
  if (ext === "pdf" || ext === "docx") return FileText;
  return FileIcon;
}

export default function UploadsPage() {
  const showToast = useToast();
  const [files, setFiles] = useState<UnifiedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [filterValue, setFilterValue] = useState<FilterValue>("الكل");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setLoading(true);
    try {
      const data = await getMyFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء تحميل الملفات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  // upload-file-approval بياخد ملف واحد بس لكل استدعاء، فبنرفعهم واحد ورا التاني
  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const tooBig: string[] = [];
    const validFiles: File[] = [];

    Array.from(fileList).forEach((f) => {
      const sizeMb = f.size / (1024 * 1024);
      if (sizeMb > MAX_APPROVAL_FILE_SIZE_MB) {
        tooBig.push(f.name);
        return;
      }
      validFiles.push(f);
    });

    if (tooBig.length > 0) {
      showToast("error", `الحجم أكبر من ${MAX_APPROVAL_FILE_SIZE_MB} ميجا: ${tooBig.join("، ")}`);
    }
    if (validFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const failed: string[] = [];
    try {
      for (const f of validFiles) {
        try {
          await uploadApprovalFile(f);
          successCount += 1;
        } catch (err) {
          console.error(err);
          failed.push(f.name);
        }
      }
      if (successCount > 0) showToast("success", `تم رفع ${successCount} ${successCount === 1 ? "ملف" : "ملفات"} للمراجعة`);
      if (failed.length > 0) showToast("error", `فشل رفع: ${failed.join("، ")}`);
    } finally {
      setUploading(false);
      await loadFiles();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // الحذف مسموح في أي حالة للموظف بردو، بس لملفاته هو بس (الباك بيتحقق من كده)
  const handleDelete = async (f: UnifiedFile) => {
    setDeletingId(f.id);
    try {
      await deleteApprovalFile(f.id);
      showToast("success", `تم حذف ${f.name}`);
      await loadFiles();
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء حذف الملف");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (f: UnifiedFile) => {
    window.open(f.url, "_blank", "noopener,noreferrer");
  };

  const filtered = files.filter((f) => {
    if (filterValue === "الكل") return true;
    return f.status === filterValue;
  });

  const totals = {
    total: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    accepted: files.filter((f) => f.status === "accepted").length,
    editRequested: files.filter((f) => f.status === "edit_requested").length,
    rejected: files.filter((f) => f.status === "rejected").length,
  };

  return (
    <PortalLayout title="رفع الملفات" subtitle="ارفعي ملفاتك للمراجعة وتابعي حالتها">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label="إجمالي الملفات" value={String(totals.total)} tone="primary" icon={FolderOpen} />
        <MetricCard label="قيد المراجعة" value={String(totals.pending)} tone="warning" icon={Clock3} />
        <MetricCard label="مقبولة" value={String(totals.accepted)} tone="success" icon={CheckCircle2} />
        <MetricCard label="تحتاج تعديل" value={String(totals.editRequested)} tone="warning" icon={PencilLine} />
        <MetricCard label="مرفوضة" value={String(totals.rejected)} tone="danger" icon={XCircle} />
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-foreground mb-4">رفع ملف جديد</h3>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition
            ${uploading ? "opacity-60 cursor-wait" : "cursor-pointer"}
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
          ) : (
            <UploadCloud className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          )}
          <p className="font-semibold text-foreground">
            {uploading ? "جارٍ الرفع..." : "اسحبي الملفات هنا أو دوسي للاختيار"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            هيتراجع من المدير قبل ما يتقبل — حتى {MAX_APPROVAL_FILE_SIZE_MB} ميجا لكل ملف
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-foreground">الملفات المرفوعة</h3>
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value as FilterValue)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="الكل">الكل</option>
            {(["pending", "accepted", "edit_requested", "rejected"] as FileApprovalStatus[]).map((s) => (
              <option key={s} value={s}>{FILE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-6">جارٍ التحميل...</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">مفيش ملفات مطابقة</p>
          )}
          {!loading && filtered.map((f) => {
            const Icon = iconForFile(f.name);
            return (
              <div key={f.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 transition">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.created_at.slice(0, 10)}</div>
                </div>

                <StatusPill tone={statusTone[f.status]}>{FILE_STATUS_LABELS[f.status]}</StatusPill>

                <button
                  onClick={() => handleDownload(f)}
                  title="تحميل"
                  className="h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition shrink-0"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(f)}
                  disabled={deletingId === f.id}
                  title="حذف"
                  className="h-9 w-9 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10 transition shrink-0 disabled:opacity-50"
                >
                  {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </PortalLayout>
  );
}

function MetricCard({ label, value, tone, icon: Icon }: {
  label: string; value: string; tone: "primary" | "warning" | "success" | "danger";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    success: "bg-success/15 text-success",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}