// src/components/library/library-content.tsx
"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import {
  BookOpen,
  Film,
  FileText,
  Link as LinkIcon,
  Plus,
  Search,
  X,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

type ContentType = "فيديو" | "رابط" | "ملف" | "نص إرشادي";
type Dept = "السوشيال ميديا" | "المناديب" | "المبيعات";

type LibraryItem = {
  id: string;
  title: string;
  dept: Dept;
  type: ContentType;
  description: string;
  url: string;
  addedBy: string;
  date: string;
};

type FormValues = Omit<LibraryItem, "id" | "date">;

const DEPTS: Dept[] = ["السوشيال ميديا", "المناديب", "المبيعات"];
const TYPES: ContentType[] = ["فيديو", "رابط", "ملف", "نص إرشادي"];

const TYPE_ICON: Record<ContentType, typeof Film> = {
  "فيديو": Film,
  "رابط": LinkIcon,
  "ملف": FileText,
  "نص إرشادي": BookOpen,
};

const INITIAL_ITEMS: LibraryItem[] = [
  {
    id: "lib-1",
    title: "أساسيات كتابة كابشن يجذب تفاعل",
    dept: "السوشيال ميديا",
    type: "نص إرشادي",
    description: "دليل مختصر لإزاي تكتب كابشن يشد المتابع من أول سطرين.",
    url: "",
    addedBy: "منى (مانجر)",
    date: "2026-07-20",
  },
  {
    id: "lib-2",
    title: "فيديو تدريبي: تصوير ريلز بالموبايل",
    dept: "السوشيال ميديا",
    type: "فيديو",
    description: "خطوات بسيطة لتصوير ريل احترافي بكاميرا الموبايل بس.",
    url: "https://youtube.com/watch?v=example1",
    addedBy: "منى (مانجر)",
    date: "2026-07-18",
  },
  {
    id: "lib-3",
    title: "سكريبت مكالمة مع مندوب جديد",
    dept: "المناديب",
    type: "ملف",
    description: "نموذج جاهز للأسئلة اللي المفروض تتسأل لمندوب جديد قبل التعاقد.",
    url: "https://example.com/files/driver-script.pdf",
    addedBy: "أحمد (مانجر)",
    date: "2026-07-15",
  },
  {
    id: "lib-4",
    title: "إزاي تتعامل مع شكوى عميل غاضب",
    dept: "المبيعات",
    type: "نص إرشادي",
    description: "خطوات عملية للتهدئة والوصول لحل يرضي العميل من غير ما تخسر الصفقة.",
    url: "",
    addedBy: "سارة (موظفة)",
    date: "2026-07-10",
  },
];

/* ------------------------------------------------------------------ */
/*  Shared content — used by both employee & manager portals            */
/* ------------------------------------------------------------------ */

type CardProps = { className?: string; children: React.ReactNode };

export function LibraryContent({
  CardComponent,
}: {
  CardComponent: React.ComponentType<CardProps>;
}) {
  const Card = CardComponent;
  const showToast = useToast();

  const [items, setItems] = useState<LibraryItem[]>(INITIAL_ITEMS);
  const [activeDept, setActiveDept] = useState<"الكل" | Dept>("الكل");
  const [typeFilter, setTypeFilter] = useState<"الكل" | ContentType>("الكل");
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesDept = activeDept === "الكل" || it.dept === activeDept;
      const matchesType = typeFilter === "الكل" || it.type === typeFilter;
      const matchesQuery = it.title.includes(query.trim());
      return matchesDept && matchesType && matchesQuery;
    });
  }, [items, activeDept, typeFilter, query]);

  const handleAdd = (values: FormValues) => {
    const newItem: LibraryItem = {
      ...values,
      id: `lib-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
    };
    setItems((prev) => [newItem, ...prev]);
    setShowAddForm(false);
    showToast("success", "تم إضافة المحتوى للمكتبة");
  };

  const handleUpdate = (id: string, values: FormValues) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...values } : it))
    );
    setEditingId(null);
    showToast("success", "تم تعديل المحتوى");
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConfirmDeleteId(null);
    showToast("success", "تم حذف المحتوى");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
          {(["الكل", ...DEPTS] as const).map((d) => (
            <button
              key={d}
              onClick={() => setActiveDept(d)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeDept === d ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
              }`}
            >
              {d}
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
            onChange={(e) => setTypeFilter(e.target.value as "الكل" | ContentType)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          >
            {["الكل", ...TYPES].map((t) => (
              <option key={t}>{t}</option>
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
                submitLabel="حفظ التعديل"
                onSave={(values) => handleUpdate(it.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <LibraryCard
              key={it.id}
              item={it}
              Card={Card}
              isConfirmingDelete={confirmDeleteId === it.id}
              onEdit={() => {
                setShowAddForm(false);
                setEditingId(it.id);
              }}
              onDeleteClick={() => setConfirmDeleteId(it.id)}
              onDeleteConfirm={() => handleDelete(it.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
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
  Card,
  isConfirmingDelete,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  item: LibraryItem;
  Card: React.ComponentType<CardProps>;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2.5 py-1">
            {item.dept}
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
            className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
      <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{item.addedBy} · {item.date}</span>
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/40 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" /> فتح
        </a>
      )}

      {isConfirmingDelete && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <span className="text-xs font-semibold text-destructive">تأكيد الحذف؟</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteConfirm}
              className="text-xs font-bold text-destructive hover:underline"
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

function ItemForm({
  Card,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  Card: React.ComponentType<CardProps>;
  initial?: LibraryItem;
  submitLabel: string;
  onSave: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const showToast = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dept, setDept] = useState<Dept>(initial?.dept ?? DEPTS[0]);
  const [type, setType] = useState<ContentType>(initial?.type ?? TYPES[0]);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [addedBy, setAddedBy] = useState(initial?.addedBy ?? "");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title.trim() || !addedBy.trim()) {
      setError("العنوان واسمك مطلوبين قبل الحفظ");
      showToast("error", "من فضلك اكمل البيانات المطلوبة");
      return;
    }
    setError("");
    onSave({
      title: title.trim(),
      dept,
      type,
      description: description.trim(),
      url: url.trim(),
      addedBy: addedBy.trim(),
    });
    if (!initial) {
      setTitle("");
      setUrl("");
      setDescription("");
      setAddedBy("");
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
            value={dept}
            onChange={(e) => setDept(e.target.value as Dept)}
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">نوع المحتوى</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ContentType)}
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-foreground">الرابط (اختياري لو المحتوى نص فقط)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full h-11 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm transition"
          />
        </div>
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
            value={addedBy}
            onChange={(e) => { setAddedBy(e.target.value); setError(""); }}
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
          className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          إلغاء
        </button>
      </div>
    </Card>
  );
}