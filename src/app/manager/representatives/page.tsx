"use client";

import { useMemo, useRef, useState } from "react";
import { Avatar, Card, PageHeader, StatCard } from "@/components/manager/primitives";
import {
  Plus, Phone, X, ChevronDown, CheckCircle2, Info, AlertCircle,
  Search, ImagePlus, UserRound, Bike, Eye,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/*  نفس شكل بيانات المندوب الموجود في صفحة الموظف بالظبط                */
/* ------------------------------------------------------------------ */

type RepDocs = {
  photo?: string;
  idFront?: string;
  idBack?: string;
  licenseFront?: string;
  licenseBack?: string;
};

type Rep = {
  id: string;
  name: string;
  phone1: string;
  phone2: string;
  supervisor: string;
  hasMotorcycle: boolean;
  docs: RepDocs;
};

const INITIAL_REPS: Rep[] = [
  { id: "r1", name: "أحمد صلاح", phone1: "01012345678", phone2: "01512345678", supervisor: "محمد رضا", hasMotorcycle: true, docs: {} },
  { id: "r2", name: "محمود جابر", phone1: "01123456789", phone2: "01223456789", supervisor: "محمد رضا", hasMotorcycle: false, docs: {} },
  { id: "r3", name: "كريم عادل", phone1: "01234567890", phone2: "01034567890", supervisor: "سارة يونس", hasMotorcycle: true, docs: {} },
];

const emptyForm = {
  name: "",
  phone1: "",
  phone2: "",
  supervisor: "",
  hasMotorcycle: true,
  photo: "",
  idFront: "",
  idBack: "",
  licenseFront: "",
  licenseBack: "",
};

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

type ToastItem = { id: number; tone: "success" | "error" | "info"; message: string };

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const color = { success: "text-emerald-500", error: "text-destructive", info: "text-primary" };
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = icon[t.tone];
        return (
          <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-warm-lg">
            <Icon className={`size-4 ${color[t.tone]}`} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function RepsPage() {
  const [reps, setReps] = useState<Rep[]>(INITIAL_REPS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone1?: string; phone2?: string; supervisor?: string }>({});

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return reps;
    return reps.filter(
      (r) => r.name.includes(q) || r.phone1.includes(q) || r.phone2.includes(q) || r.supervisor.includes(q)
    );
  }, [reps, search]);

  const totals = useMemo(
    () => ({
      total: reps.length,
      withMotorcycle: reps.filter((r) => r.hasMotorcycle).length,
      withoutMotorcycle: reps.filter((r) => !r.hasMotorcycle).length,
    }),
    [reps]
  );

  const handleAddRep = () => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "الاسم مطلوب";
    if (!form.phone1.trim()) errors.phone1 = "رقم الهاتف الأول مطلوب";
    if (!form.phone2.trim()) errors.phone2 = "رقم الهاتف الثاني مطلوب";
    if (!form.supervisor.trim()) errors.supervisor = "اسم المشرف مطلوب";
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      pushToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setFormErrors({});
    const newRep: Rep = {
      id: `r-${Date.now()}`,
      name: form.name.trim(),
      phone1: form.phone1.trim(),
      phone2: form.phone2.trim(),
      supervisor: form.supervisor.trim(),
      hasMotorcycle: form.hasMotorcycle,
      docs: {
        photo: form.photo || undefined,
        idFront: form.idFront || undefined,
        idBack: form.idBack || undefined,
        licenseFront: form.licenseFront || undefined,
        licenseBack: form.licenseBack || undefined,
      },
    };
    setReps((prev) => [newRep, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
    pushToast("success", `تم إضافة ${newRep.name} بنجاح`);
  };

  const viewingRep = reps.find((r) => r.id === viewingId) || null;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 260px; } }
        @keyframes formIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .toast-in { animation: toastIn 0.25s ease-out; }
        .expand-in { animation: expandIn 0.25s ease-out; overflow: hidden; }
        .form-in { animation: formIn 0.2s ease-out; }
      `}</style>

      <PageHeader
        title="المناديب"
        subtitle="إدارة بيانات المناديب اللي مضافة من صفحة الموظف."
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-95"
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "إغلاق" : "إضافة مندوب"}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard dense label="إجمالي المناديب" value={String(totals.total)} tone="primary" />
        <StatCard dense label="عندهم موتوسيكل" value={String(totals.withMotorcycle)} tone="success" />
        <StatCard dense label="من غير موتوسيكل" value={String(totals.withoutMotorcycle)} tone="muted" />
      </div>

      {showForm && (
        <Card className="form-in border-2 border-primary/20 !p-6">
          <h3 className="mb-4 font-bold text-foreground">مندوب جديد</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-foreground">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="اسم المندوب"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.name ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.name && <p className="mt-1.5 text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الأول</label>
              <input
                value={form.phone1}
                onChange={(e) => { setForm((f) => ({ ...f, phone1: e.target.value })); setFormErrors((p) => ({ ...p, phone1: undefined })); }}
                placeholder="01xxxxxxxxx"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.phone1 ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.phone1 && <p className="mt-1.5 text-xs text-destructive">{formErrors.phone1}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الثاني</label>
              <input
                value={form.phone2}
                onChange={(e) => { setForm((f) => ({ ...f, phone2: e.target.value })); setFormErrors((p) => ({ ...p, phone2: undefined })); }}
                placeholder="01xxxxxxxxx"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.phone2 ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.phone2 && <p className="mt-1.5 text-xs text-destructive">{formErrors.phone2}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">اسم المشرف</label>
              <div className="relative mt-2">
                <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.supervisor}
                  onChange={(e) => { setForm((f) => ({ ...f, supervisor: e.target.value })); setFormErrors((p) => ({ ...p, supervisor: undefined })); }}
                  placeholder="اسم المشرف المسؤول"
                  className={`w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none transition pr-9 ${
                    formErrors.supervisor ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
              </div>
              {formErrors.supervisor && <p className="mt-1.5 text-xs text-destructive">{formErrors.supervisor}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">عنده موتوسيكل؟</label>
              <div className="mt-2 inline-flex w-full rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hasMotorcycle: true }))}
                  className={`flex flex-1 items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition ${
                    form.hasMotorcycle ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
                  }`}
                >
                  <Bike className="h-4 w-4" /> نعم
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hasMotorcycle: false }))}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold transition ${
                    !form.hasMotorcycle ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
                  }`}
                >
                  لا
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-bold text-foreground mb-3">الصور والمستندات</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <FileInputPreview label="الصورة الشخصية" value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
              <FileInputPreview label="صورة البطاقة (وش)" value={form.idFront} onChange={(v) => setForm((f) => ({ ...f, idFront: v }))} />
              <FileInputPreview label="صورة البطاقة (ضهر)" value={form.idBack} onChange={(v) => setForm((f) => ({ ...f, idBack: v }))} />
              <FileInputPreview label="صورة الرخصة (وش)" value={form.licenseFront} onChange={(v) => setForm((f) => ({ ...f, licenseFront: v }))} />
              <FileInputPreview label="صورة الرخصة (ضهر)" value={form.licenseBack} onChange={(v) => setForm((f) => ({ ...f, licenseBack: v }))} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button onClick={handleAddRep} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark">
              حفظ المندوب
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent">
              إلغاء
            </button>
          </div>
        </Card>
      )}

      <Card className="!p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو المشرف"
            className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 !py-14 text-center">
          <div className="text-3xl">📭</div>
          <div className="font-bold">لا يوجد مناديب مطابقين للبحث</div>
          <div className="text-sm text-muted-foreground">ابدأ بإضافة أول مندوب.</div>
          <button onClick={() => setShowForm(true)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark">
            <Plus className="size-4" /> إضافة مندوب
          </button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const isOpen = expandedId === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setExpandedId(isOpen ? null : r.id)}
                className="card-warm cursor-pointer bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-warm-lg"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={r.name} size={48} />
                  <div className="flex-1">
                    <div className="font-bold">{r.name}</div>
                    <a
                      href={`tel:${r.phone1}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
                    >
                      <Phone className="size-3" />
                      <span>{r.phone1}</span>
                    </a>
                    <div className="text-xs text-muted-foreground">مشرف: {r.supervisor}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      r.hasMotorcycle ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Bike className="size-3" /> {r.hasMotorcycle ? "نعم" : "لا"}
                  </span>
                </div>

                {isOpen && (
                  <div className="expand-in mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <a
                      href={`tel:${r.phone2}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 transition hover:text-primary"
                    >
                      <Phone className="size-3.5" />
                      <span>الهاتف الثاني: {r.phone2}</span>
                    </a>
                    <div className="flex items-center gap-1.5">
                      <UserRound className="size-3.5" />
                      <span>المشرف: <span className="font-semibold text-foreground">{r.supervisor}</span></span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewingId(r.id); }}
                      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                    >
                      <Eye className="size-3.5" /> عرض الصور والمستندات
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewingRep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewingId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-foreground">صور {viewingRep.name}</h3>
              <button onClick={() => setViewingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DocPreview label="الصورة الشخصية" src={viewingRep.docs.photo} />
              <DocPreview label="البطاقة (وش)" src={viewingRep.docs.idFront} />
              <DocPreview label="البطاقة (ضهر)" src={viewingRep.docs.idBack} />
              <DocPreview label="الرخصة (وش)" src={viewingRep.docs.licenseFront} />
              <DocPreview label="الرخصة (ضهر)" src={viewingRep.docs.licenseBack} />
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared small pieces                                                 */
/* ------------------------------------------------------------------ */

function FileInputPreview({ label, value, onChange }: { label: string; value?: string; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-border bg-secondary px-4 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-4 w-4" /> {value ? "تغيير الصورة" : "رفع صورة"}
        </button>
        {value && <img src={value} alt={label} className="h-11 w-11 rounded-lg border border-border object-cover" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      {src ? (
        <img src={src} alt={label} className="h-40 w-full rounded-xl border border-border object-cover" />
      ) : (
        <div className="grid h-40 w-full place-items-center rounded-xl border border-dashed border-border bg-secondary text-xs text-muted-foreground">
          لم يتم الرفع
        </div>
      )}
    </div>
  );
}