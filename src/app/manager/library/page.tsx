"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Card, PageHeader, StatCard } from "@/components/manager/primitives";
import {
  Plus,
  FileText,
  Image as ImageIcon,
  Film,
  FileArchive,
  MoreVertical,
  Trash2,
  Pencil,
  Download,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["الكول سنتر", "السوشيال ميديا", "التسويق", "متابعة الداش"];
const categories = ["Scripts", "التدريب", "القوالب", "الأدلة"] as const;
type Category = (typeof categories)[number];

type FileItem = {
  id: string;
  name: string;
  size: number; // bytes, real
  mime: string; // real mime type
  section: number; // index into tabs
  category: Category;
  addedAt: Date;
  url: string; // object URL pointing to the real file blob
  file: File; // the actual File object
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "FILE";
}

function iconFor(mime: string, ext: string) {
  if (mime.startsWith("image/")) return { icon: ImageIcon, tone: "success" };
  if (mime.startsWith("video/")) return { icon: Film, tone: "teal" };
  if (["ZIP", "RAR", "7Z"].includes(ext)) return { icon: FileArchive, tone: "warning" };
  if (["PDF"].includes(ext)) return { icon: FileText, tone: "danger" };
  return { icon: FileText, tone: "primary" };
}

export default function LibraryPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingCategory, setPendingCategory] = useState<Category>("Scripts");
  const [dragOver, setDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // clean up object URLs when files are removed or on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const newItems: FileItem[] = Array.from(fileList).map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        section: tab,
        category: pendingCategory,
        addedAt: new Date(),
        url: URL.createObjectURL(file),
        file,
      }));
      setFiles((prev) => [...newItems, ...prev]);
    },
    [tab, pendingCategory]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const visibleFiles = useMemo(() => {
    return files.filter((f) => {
      if (f.section !== tab) return false;
      if (activeCategory && f.category !== activeCategory) return false;
      if (search.trim() && !f.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [files, tab, activeCategory, search]);

  const stats = useMemo(() => {
    const total = files.length;
    const training = files.filter((f) => f.category === "التدريب").length;
    const pdf = files.filter((f) => extOf(f.name) === "PDF").length;
    const videos = files.filter((f) => f.mime.startsWith("video/")).length;
    const templates = files.filter((f) => f.category === "القوالب").length;
    const weekAgo = daysAgo(7).getTime();
    const recent = files.filter((f) => f.addedAt.getTime() >= weekAgo).length;
    return { total, training, pdf, videos, templates, recent };
  }, [files]);

  function deleteFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
    setOpenMenuId(null);
  }

  function downloadFile(f: FileItem) {
    const a = document.createElement("a");
    a.href = f.url;
    a.download = f.name;
    a.click();
  }

  function startRename(f: FileItem) {
    setRenamingId(f.id);
    setRenameValue(f.name);
    setOpenMenuId(null);
  }

  function confirmRename(id: string) {
    if (renameValue.trim()) {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: renameValue.trim() } : f)));
    }
    setRenamingId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المكتبة"
        subtitle="إدارة ملفات ومراجع الأقسام."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={pendingCategory}
              onChange={(e) => setPendingCategory(e.target.value as Category)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              title="الفئة اللي هتتحفظ فيها الملفات المرفوعة"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
            >
              <Plus className="size-4" /> رفع ملف
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        }
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/20"
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <div className="text-sm font-semibold">اسحب الملفات هنا أو اضغط للرفع</div>
        <div className="text-xs text-muted-foreground">
          {`هيتم رفع الملفات في قسم "${tabs[tab]}" · فئة "${pendingCategory}"`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="إجمالي الملفات" value={String(stats.total)} tone="primary" />
        <StatCard dense label="ملفات تدريب" value={String(stats.training)} tone="teal" />
        <StatCard dense label="ملفات PDF" value={String(stats.pdf)} tone="danger" />
        <StatCard dense label="الفيديوهات" value={String(stats.videos)} tone="warning" />
        <StatCard dense label="قوالب العمل" value={String(stats.templates)} tone="success" />
        <StatCard dense label="آخر إضافات" value={String(stats.recent)} tone="primary" />
      </div>

      <div className="card-warm p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                tab === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              قسم {t}
              <span className="ms-1.5 text-[11px] opacity-70">
                ({files.filter((f) => f.section === i).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4!">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث..."
            className="h-10 min-w-55 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary/50"
          />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory((prev) => (prev === c ? null : c))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                activeCategory === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {visibleFiles.length === 0 ? (
        <Card className="p-10! text-center text-sm text-muted-foreground">
          لا توجد ملفات في هذا القسم بعد — ارفع ملف من الأعلى
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visibleFiles.map((f) => {
            const ext = extOf(f.name);
            const { icon: Icon, tone } = iconFor(f.mime, ext);
            const isImage = f.mime.startsWith("image/");
            return (
              <div
                key={f.id}
                onClick={() => downloadFile(f)}
                className="card-warm group relative cursor-pointer p-4 hover:shadow-warm-lg"
              >
                <div className={`grid aspect-video place-items-center overflow-hidden rounded-xl pill-${tone}`}>
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object URL from an in-memory File, not a static asset
                    <img src={f.url} alt={f.name} className="size-full object-cover" />
                  ) : (
                    <Icon className="size-10" strokeWidth={1.5} />
                  )}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {renamingId === f.id ? (
                      <input
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(f.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => confirmRename(f.id)}
                        className="w-full rounded border border-primary/40 bg-background px-1.5 py-0.5 text-sm outline-none"
                      />
                    ) : (
                      <div className="truncate text-sm font-semibold">{f.name}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground">
                      {ext} · {formatBytes(f.size)} · {formatDate(f.addedAt)}
                    </div>
                  </div>
                  <div className="relative flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(f);
                      }}
                      className="grid size-7 place-items-center rounded-lg opacity-0 hover:bg-accent group-hover:opacity-100"
                      title="تحميل"
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) => (prev === f.id ? null : f.id));
                      }}
                      className="grid size-7 place-items-center rounded-lg opacity-0 hover:bg-accent group-hover:opacity-100"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuId === f.id && (
                      <div
                        ref={menuRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-8 z-10 w-36 overflow-hidden rounded-lg border border-border bg-background shadow-warm-lg"
                      >
                        <button
                          onClick={() => startRename(f)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50"
                        >
                          <Pencil className="size-3.5" /> تعديل الاسم
                        </button>
                        <button
                          onClick={() => deleteFile(f.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" /> حذف
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}