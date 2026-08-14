// src/components/library/library-content.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  BookOpen,
  Film,
  FileText,
  Link as LinkIcon,
  Plus,
  Search,
  X,
  ExternalLink,
  Download,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { LibraryDepartment, LibraryContentType, LibraryItem } from "@/types/library";
import {
  fetchLibraryItems,
  fetchUsersNameMap,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
} from "@/modules/library/api/library.api";
import { openOrDownloadFile } from "@/lib/file-download";

/* ------------------------------------------------------------------ */
/*  Labels (enums الحقيقية من الباك)                                   */
/* ------------------------------------------------------------------ */

const DEPTS: LibraryDepartment[] = ["social_media", "representative", "sells", "else"];
const TYPES: LibraryContentType[] = ["video", "link", "file", "text_guide", "else"];

const DEPT_LABELS: Record<LibraryDepartment, string> = {
  social_media: "السوشيال ميديا",
  representative: "المناديب",
  sells: "المبيعات",
  else: "أخرى",
};

const TYPE_LABELS: Record<LibraryContentType, string> = {
  video: "فيديو",
  link: "رابط",
  file: "ملف",
  text_guide: "نص إرشادي",
  else: "أخرى",
};

const TYPE_ICON: Record<LibraryContentType, typeof Film> = {
  video: Film,
  link: LinkIcon,
  file: FileText,
  text_guide: BookOpen,
  else: FileText,
};

// الأنواع اللي بتتطلب ملف أو رابط فعليًا (النص الإرشادي ممكن يعتمد على الوصف بس)
const REQUIRES_ATTACHMENT: Record<LibraryContentType, boolean> = {
  video: true,
  file: true,
  link: true,
  text_guide: false,
  else: false,
};

type CardProps = { className?: string; children: React.ReactNode };

/* ------------------------------------------------------------------ */
/*  Main content — مشترك بين بورتال الموظف والمدير، بنفس الصلاحيات      */
/* ------------------------------------------------------------------ */

export function LibraryContent({
  CardComponent,
}: {
  CardComponent: React.ComponentType<CardProps>;
}) {
  const Card = CardComponent;
  const showToast = useToast();
  const { user } = useCurrentUser();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeDept, setActiveDept] = useState<"الكل" | LibraryDepartment>("الكل");
  const [typeFilter, setTypeFilter] = useState<"الكل" | LibraryContentType>("الكل");
  const [query, setQuery] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [libraryItems, names] = await Promise.all([
        fetchLibraryItems(),
        fetchUsersNameMap().catch(() => ({} as Record<string, string>)),
      ]);
      setItems(libraryItems);
      setUsersMap(names);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المكتبة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesDept = activeDept === "الكل" || it.department === activeDept;
      const matchesType = typeFilter === "الكل" || it.content === typeFilter;
      const matchesQuery = it.title.includes(query.trim());
      return matchesDept && matchesType && matchesQuery;
    });
  }, [items, activeDept, typeFilter, query]);

  const handleAdd = async (values: FormValues) => {
    try {
      const res = await createLibraryItem(values);
      setItems((prev) => [res.library, ...prev]);
      setShowAddForm(false);
      showToast("success", res.message || "تم إضافة المحتوى للمكتبة");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إضافة المحتوى");
    }
  };

  const handleUpdate = async (id: number, values: FormValues) => {
    try {
      const res = await updateLibraryItem({ library_id: id, ...values });
      setItems((prev) => prev.map((it) => (it.id === id ? res.library : it)));
      setEditingId(null);
      showToast("success", res.message || "تم تعديل المحتوى");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تعديل المحتوى");
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await deleteLibraryItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setConfirmDeleteId(null);
      showToast("success", res.message || "تم حذف المحتوى");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر حذف المحتوى");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenFile = async (item: LibraryItem) => {
    if (!item.file_path) return;
    setOpeningId(item.id);
    try {
      await openOrDownloadFile(item.file_path, item.title);
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">جاري تحميل المكتبة...</span>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{loadError}</p>
        <button
          onClick={loadData}
          className="text-sm font-semibold text-primary hover:underline"
        >
          إعادة المحاولة
        </button>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
          <button
            onClick={() => setActiveDept("الكل")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeDept === "الكل" ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
            }`}
          >
            الكل
          </button>
          {DEPTS.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDept(d)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeDept === d ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
              }`}
            >
              {DEPT_LABELS[d]}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setShowAddForm((s) => !s);
          }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-primary-dark transition shadow-warm"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "إلغاء" : "إضافة محتوى"}
        </button>
      </div>

      {showAddForm && (
        <ItemForm
          Card={Card}
          defaultName={user?.name ?? ""}
          submitLabel="حفظ المحتوى"
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بعنوان المحتوى..."
              className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "الكل" | LibraryContentType)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="الكل">الكل</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-10">
            لا يوجد محتوى مطابق للفلاتر
          </p>
        )}
        {filtered.map((it) =>
          editingId === it.id ? (
            <div key={it.id} className="md:col-span-2 lg:col-span-3">
              <ItemForm
                Card={Card}
                initial={it}
                defaultName={it.name}
                submitLabel="حفظ التعديل"
                onSave={(values) => handleUpdate(it.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <LibraryCard
              key={it.id}
              item={it}
              creatorName={usersMap[it.created_by]}
              Card={Card}
              isConfirmingDelete={confirmDeleteId === it.id}
              isDeleting={deletingId === it.id}
              isOpening={openingId === it.id}
              onEdit={() => {
                setShowAddForm(false);
                setEditingId(it.id);
              }}
              onDeleteClick={() => setConfirmDeleteId(it.id)}
              onDeleteConfirm={() => handleDelete(it.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              onOpenFile={() => handleOpenFile(it)}
            />
          )
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                                */
/* ------------------------------------------------------------------ */

function LibraryCard({
  item,
  creatorName,
  Card,
  isConfirmingDelete,
  isDeleting,
  isOpening,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onOpenFile,
}: {
  item: LibraryItem;
  creatorName?: string;
  Card: React.ComponentType<CardProps>;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  isOpening: boolean;
  onEdit: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onOpenFile: () => void;
}) {
  const Icon = TYPE_ICON[item.content];
  const dateLabel = item.created_at ? item.created_at.slice(0, 10) : "";
  const isLink = !!item.link;
  const isFile = !!item.file_path;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2.5 py-1">
            {DEPT_LABELS[item.department]}
          </span>
          <button
            onClick={onEdit}
            title="تعديل"
            className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDeleteClick}
            title="حذف"
            disabled={isDeleting}
            className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
      {item.description && (
        <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {creatorName || item.name} {dateLabel && `· ${dateLabel}`}
        </span>
      </div>

      {isLink && (
        <a
          href={item.link!}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/40 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" /> فتح الرابط
        </a>
      )}

      {isFile && (
        <button
          onClick={onOpenFile}
          disabled={isOpening}
          className="mt-3 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/40 transition disabled:opacity-60"
        >
          {isOpening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isOpening ? "جاري الفتح..." : "فتح / تنزيل الملف"}
        </button>
      )}

      {isConfirmingDelete && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <span className="text-xs font-semibold text-destructive">تأكيد الحذف؟</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="text-xs font-bold text-destructive hover:underline disabled:opacity-50"
            >
              حذف
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-xs font-semibold text-muted-foreground hover:underline"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Add / Edit form                                                     */
/* ------------------------------------------------------------------ */

type FormValues = {
  title: string;
  name: string;
  department: LibraryDepartment;
  content: LibraryContentType;
  description?: string;
  link?: string;
  file?: File | null;
};

function ItemForm({
  Card,
  initial,
  defaultName,
  submitLabel,
  onSave,
  onCancel,
}: {
  Card: React.ComponentType<CardProps>;
  initial?: LibraryItem;
  defaultName: string;
  submitLabel: string;
  onSave: (values: FormValues) => Promise<void> | void;
  onCancel: () => void;
}) {
  const showToast = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [department, setDepartment] = useState<LibraryDepartment>(initial?.department ?? DEPTS[0]);
  const [content, setContent] = useState<LibraryContentType>(initial?.content ?? TYPES[0]);
  const [link, setLink] = useState(initial?.link ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLinkType = content === "link";
  const needsAttachment = REQUIRES_ATTACHMENT[content];

  const handleSubmit = async () => {
    if (!title.trim() || !name.trim()) {
      setError("العنوان والاسم مطلوبين قبل الحفظ");
      showToast("error", "من فضلك اكمل البيانات المطلوبة");
      return;
    }
    if (isLinkType && !link.trim() && !initial?.link) {
      setError("محتوى من نوع رابط لازم تحط رابط");
      showToast("error", "من فضلك أضف الرابط");
      return;
    }
    if (needsAttachment && !isLinkType && !file && !initial?.file_path) {
      setError("المحتوى ده محتاج ترفع ملف");
      showToast("error", "من فضلك ارفع ملف");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        name: name.trim(),
        department,
        content,
        description: description.trim(),
        link: link.trim(),
        file,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">
          {initial ? "تعديل المحتوى" : "إضافة محتوى جديد"}
        </h3>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition"
       >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-foreground">العنوان</label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="مثال: دليل التصوير بالموبايل"
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm transition"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">القسم</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as LibraryDepartment)}
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {DEPTS.map((d) => (
              <option key={d} value={d}>{DEPT_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">نوع المحتوى</label>
          <select
            value={content}
            onChange={(e) => { setContent(e.target.value as LibraryContentType); setError(""); }}
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {isLinkType ? (
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-foreground">الرابط</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full h-11 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm transition"
            />
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-foreground">
              الملف {initial?.file_path ? "(اختيار ملف جديد يستبدل الحالي)" : needsAttachment ? "" : "(اختياري)"}
            </label>
            <input
              type="file"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }}
              className="mt-2 w-full text-sm text-muted-foreground file:ml-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground"
            />
            {initial?.file_path && !file && (
               <a 
                href={initial.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                عرض الملف الحالي
              </a>
            )}
          </div>
        )}

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-foreground">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="وصف مختصر للمحتوى..."
            className="mt-2 w-full rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 py-2 text-sm transition resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">اسمك</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="اسمك"
            className={`mt-2 w-full h-11 rounded-xl border bg-background focus:ring-2 outline-none px-3 text-sm transition
              ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
          />
          {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          إلغاء
        </button>
      </div>
    </Card>
  );
}