"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { Plus, Phone, X, ChevronDown, CheckCircle2, Info, AlertCircle, UserCheck, Calendar, MessageCircle } from "lucide-react";

type Tone = "teal" | "success" | "warning" | "primary" | "danger";

type Rep = {
  id: string;
  name: string;
  phone: string;
  gov: string;
  country: string;
  st: string;
  tone: Tone;
  appliedAt: string;
  lastContact: string;
  addedBy: string;
};

const STATUSES: { label: string; tone: Tone }[] = [
  { label: "جديد", tone: "teal" },
  { label: "تم التواصل", tone: "teal" },
  { label: "مقابلة", tone: "warning" },
  { label: "تدريب", tone: "primary" },
  { label: "مقبول", tone: "success" },
  { label: "مرفوض", tone: "danger" },
];

const STEPS = ["جديد", "تواصل", "مقابلة", "تدريب", "مقبول"];
const COUNTRIES = ["مصر", "السعودية", "الإمارات"];
const COUNTRY_LABELS: Record<string, string> = { "مصر": "🇪🇬 مصر", "السعودية": "🇸🇦 السعودية", "الإمارات": "🇦🇪 الإمارات" };

const INITIAL_REPS: Rep[] = [
  { id: "r1", name: "أحمد ماهر", phone: "010-2233-4455", gov: "القاهرة", country: "مصر", st: "جديد", tone: "teal", appliedAt: "قبل يومين", lastContact: "لم يتم التواصل بعد", addedBy: "منة الله عادل - موظفة توظيف" },
  { id: "r2", name: "محمد سمير", phone: "010-4455-6677", gov: "الجيزة", country: "مصر", st: "مقبول", tone: "success", appliedAt: "منذ 3 أسابيع", lastContact: "أمس", addedBy: "عمر خالد - مدير المناديب" },
  { id: "r3", name: "علي حسن", phone: "010-3344-5566", gov: "الإسكندرية", country: "مصر", st: "مقابلة", tone: "warning", appliedAt: "منذ أسبوع", lastContact: "منذ يومين", addedBy: "منة الله عادل - موظفة توظيف" },
  { id: "r4", name: "طارق فؤاد", phone: "010-5566-7788", gov: "المنصورة", country: "مصر", st: "تدريب", tone: "primary", appliedAt: "منذ شهر", lastContact: "منذ 3 أيام", addedBy: "سارة يوسف - HR" },
  { id: "r5", name: "خالد نبيل", phone: "010-6677-8899", gov: "طنطا", country: "مصر", st: "تم التواصل", tone: "teal", appliedAt: "منذ 5 أيام", lastContact: "اليوم", addedBy: "عمر خالد - مدير المناديب" },
  { id: "r6", name: "رامي عادل", phone: "010-7788-9900", gov: "أسيوط", country: "مصر", st: "مرفوض", tone: "danger", appliedAt: "منذ أسبوعين", lastContact: "منذ أسبوع", addedBy: "سارة يوسف - HR" },
];

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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function StatusFilter({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition ${
          value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent"
        }`}
      >
        {value ?? "الحالة"} <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="dropdown-in absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-warm-lg">
          <button onClick={() => { onChange(null); setOpen(false); }} className="block w-full px-3 py-2 text-right text-xs text-muted-foreground hover:bg-accent">
            الكل
          </button>
          {STATUSES.map((s) => (
            <button key={s.label} onClick={() => { onChange(s.label); setOpen(false); }} className="block w-full px-3 py-2 text-right text-xs hover:bg-accent">
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RepsPage() {
  const [reps, setReps] = useState<Rep[]>(INITIAL_REPS);
  const [country, setCountry] = useState("مصر");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [form, setForm] = useState({ name: "", phone: "", gov: "", country: "مصر" });
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; gov?: string }>({});

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const filtered = useMemo(() => {
    return reps.filter((r) => r.country === country && (!statusFilter || r.st === statusFilter));
  }, [reps, country, statusFilter]);

  const handleAddRep = () => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "الاسم مطلوب";
    if (!form.phone.trim()) errors.phone = "رقم الهاتف مطلوب";
    if (!form.gov.trim()) errors.gov = "المحافظة مطلوبة";
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      pushToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setFormErrors({});
    const newRep: Rep = {
      id: `r-${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      gov: form.gov.trim(),
      country: form.country,
      st: "جديد",
      tone: "teal",
      appliedAt: "الآن",
      lastContact: "لم يتم التواصل بعد",
      addedBy: "أنت",
    };
    setReps((prev) => [newRep, ...prev]);
    setForm({ name: "", phone: "", gov: "", country: "مصر" });
    setShowForm(false);
    setCountry(newRep.country);
    setStatusFilter(null);
    pushToast("success", `تم إضافة ${newRep.name} بنجاح`);
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 260px; } }
        @keyframes formIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .toast-in { animation: toastIn 0.25s ease-out; }
        .dropdown-in { animation: dropdownIn 0.15s ease-out; }
        .expand-in { animation: expandIn 0.25s ease-out; overflow: hidden; }
        .form-in { animation: formIn 0.2s ease-out; }
      `}</style>

      <PageHeader
        title="المناديب"
        subtitle="إدارة تقديم المناديب من جميع المحافظات."
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="إجمالي" value={String(reps.length)} tone="primary" />
        <StatCard dense label="جدد" value={String(reps.filter((r) => r.st === "جديد").length)} tone="teal" />
        <StatCard dense label="مقبولون" value={String(reps.filter((r) => r.st === "مقبول").length)} tone="success" />
        <StatCard dense label="تحت التدريب" value={String(reps.filter((r) => r.st === "تدريب").length)} tone="warning" />
        <StatCard dense label="مرفوضون" value={String(reps.filter((r) => r.st === "مرفوض").length)} tone="danger" />
        <StatCard dense label="متوقفون" value="4" tone="muted" />
      </div>

      {showForm && (
        <Card className="form-in border-2 border-primary/20 !p-6">
          <h3 className="mb-4 font-bold text-foreground">مندوب جديد</h3>
          <div className="grid gap-4 md:grid-cols-4">
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
              <label className="text-sm font-semibold text-foreground">رقم التليفون</label>
              <input
                value={form.phone}
                onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setFormErrors((p) => ({ ...p, phone: undefined })); }}
                placeholder="010-0000-0000"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.phone ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.phone && <p className="mt-1.5 text-xs text-destructive">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">المحافظة</label>
              <input
                value={form.gov}
                onChange={(e) => { setForm((f) => ({ ...f, gov: e.target.value })); setFormErrors((p) => ({ ...p, gov: undefined })); }}
                placeholder="مثال: القاهرة"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.gov ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.gov && <p className="mt-1.5 text-xs text-destructive">{formErrors.gov}</p>}
            </div>
            <Select label="الدولة" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} options={COUNTRIES} />
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
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                country === c ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/70"
              }`}
            >
              {COUNTRY_LABELS[c]}
            </button>
          ))}
          <div className="mr-auto flex flex-wrap gap-2">
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            {["المحافظة", "الموظف المسؤول"].map((f) => (
              <button key={f} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent">
                {f} ▾
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 !py-14 text-center">
          <div className="text-3xl">📭</div>
          <div className="font-bold">لا يوجد مناديب في {COUNTRY_LABELS[country]}</div>
          <div className="text-sm text-muted-foreground">ابدأ بإضافة أول مندوب لهذه الدولة.</div>
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
                className="card-warm cursor-pointer p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-warm-lg"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={r.name} size={48} />
                  <div className="flex-1">
                    <div className="font-bold">{r.name}</div>
                    
                       <a href={`tel:${r.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
                    >
                      <Phone className="size-3" />
                      <span>{r.phone}</span>
                    </a>
                    <div className="text-xs text-muted-foreground">📍 {r.gov}</div>
                  </div>
                  <Pill tone={r.tone}>{r.st}</Pill>
                </div>

                <div className="mt-4 flex items-center gap-1">
                  {STEPS.map((s, j) => {
                    const stepIndex = STEPS.indexOf(r.st === "تم التواصل" ? "تواصل" : r.st);
                    const active = j <= stepIndex;
                    return (
                      <div key={s} className="flex-1 text-center">
                        <div className={`mx-auto h-1.5 rounded-full transition-colors duration-300 ${active ? "bg-primary" : "bg-border"}`} />
                        <div className="mt-1 text-[9px] text-muted-foreground">{s}</div>
                      </div>
                    );
                  })}
                </div>

                {isOpen && (
                  <div className="expand-in mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span>تاريخ التقديم: {r.appliedAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" />
                      <span>آخر تواصل: {r.lastContact}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="size-3.5" />
                      <span>
                        أُضيف بواسطة: <span className="font-semibold text-foreground">{r.addedBy}</span>
                      </span>
                    </div>
                    <div>🌍 الدولة: {r.country}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}