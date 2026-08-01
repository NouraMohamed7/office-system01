// src/app/uploads/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon, Trash2, Download, FolderOpen, Clock3, CheckCircle2, XCircle } from "lucide-react";

type FileCategory = "مستند رسمي" | "فاتورة" | "صورة" | "تقرير" | "أخرى";
type FileStatus = "قيد المراجعة" | "مقبول" | "مرفوض";

type UploadedFile = {
  id: string;
  name: string;
  sizeKb: number;
  category: FileCategory;
  status: FileStatus;
  uploadedAt: string;
};

const INITIAL_FILES: UploadedFile[] = [
  { id: "f1", name: "عقد_العمل.pdf", sizeKb: 842, category: "مستند رسمي", status: "مقبول", uploadedAt: "2026-07-20" },
  { id: "f2", name: "فاتورة_يوليو.pdf", sizeKb: 210, category: "فاتورة", status: "قيد المراجعة", uploadedAt: "2026-07-24" },
  { id: "f3", name: "تقرير_الأداء.docx", sizeKb: 155, category: "تقرير", status: "مقبول", uploadedAt: "2026-07-18" },
  { id: "f4", name: "صورة_البطاقة.jpg", sizeKb: 1320, category: "صورة", status: "مرفوض", uploadedAt: "2026-07-15" },
];

const CATEGORIES: FileCategory[] = ["مستند رسمي", "فاتورة", "صورة", "تقرير", "أخرى"];

function iconForFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") return ImageIcon;
  if (ext === "xlsx" || ext === "csv") return FileSpreadsheet;
  if (ext === "pdf" || ext === "docx") return FileText;
  return FileIcon;
}

export default function UploadsPage() {
  const showToast = useToast();
  const [files, setFiles] = useState<UploadedFile[]>(INITIAL_FILES);
  const [category, setCategory] = useState<FileCategory>("مستند رسمي");
  const [isDragging, setIsDragging] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"الكل" | FileStatus>("الكل");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
      category,
      status: "قيد المراجعة",
      uploadedAt: new Date().toISOString().slice(0, 10),
    }));
    setFiles((prev) => [...newFiles, ...prev]);
    showToast("success", `تم رفع ${newFiles.length} ${newFiles.length === 1 ? "ملف" : "ملفات"} بنجاح`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDelete = (id: string, name: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    showToast("success", `تم حذف ${name}`);
  };

  const filtered = filterStatus === "الكل" ? files : files.filter((f) => f.status === filterStatus);

  const totals = {
    total: files.length,
    pending: files.filter((f) => f.status === "قيد المراجعة").length,
    accepted: files.filter((f) => f.status === "مقبول").length,
    rejected: files.filter((f) => f.status === "مرفوض").length,
  };

  return (
    <PortalLayout title="رفع الملفات" subtitle="ارفعي مستنداتك وتابعي حالة مراجعتها">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="إجمالي الملفات" value={String(totals.total)} tone="primary" icon={FolderOpen} />
        <MetricCard label="قيد المراجعة" value={String(totals.pending)} tone="warning" icon={Clock3} />
        <MetricCard label="مقبولة" value={String(totals.accepted)} tone="success" icon={CheckCircle2} />
        <MetricCard label="مرفوضة" value={String(totals.rejected)} tone="danger" icon={XCircle} />
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-foreground mb-4">رفع ملف جديد</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-foreground">تصنيف الملف</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
        >
          <UploadCloud className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="font-semibold text-foreground">اسحبي الملفات هنا أو دوسي للاختيار</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — حتى 10 ميجا لكل ملف</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-foreground">الملفات المرفوعة</h3>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
            <option>الكل</option>
            <option>قيد المراجعة</option>
            <option>مقبول</option>
            <option>مرفوض</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">مفيش ملفات مطابقة</p>
          )}
          {filtered.map((f) => {
            const Icon = iconForFile(f.name);
            return (
              <div key={f.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 transition">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {f.category} · {f.sizeKb} KB · {f.uploadedAt}
                  </div>
                </div>
                <StatusPill tone={f.status === "مقبول" ? "success" : f.status === "مرفوض" ? "danger" : "warning"}>
                  {f.status}
                </StatusPill>
                <button
                  title="تحميل"
                  className="h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition shrink-0"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(f.id, f.name)}
                  title="حذف"
                  className="h-9 w-9 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10 transition shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
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