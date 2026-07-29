// src/app/representatives/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useMemo, useState } from "react";
import { Truck, Phone, Star, Package, Plus, Search, X } from "lucide-react";

type DriverStatus = "نشط" | "متغيب" | "مخالفة";
type Vehicle = "موتوسيكل" | "عربية" | "تروسيكل";

type Rep = {
  id: string;
  name: string;
  phone: string;
  country: "eg" | "sa" | "ae";
  vehicle: Vehicle;
  status: DriverStatus;
  ordersToday: number;
  rating: number;
};

const INITIAL_REPS: Rep[] = [
  { id: "r1", name: "أحمد صلاح", phone: "01012345678", country: "eg", vehicle: "موتوسيكل", status: "نشط", ordersToday: 14, rating: 4.8 },
  { id: "r2", name: "محمود جابر", phone: "01123456789", country: "eg", vehicle: "عربية", status: "نشط", ordersToday: 9, rating: 4.5 },
  { id: "r3", name: "كريم عادل", phone: "01234567890", country: "eg", vehicle: "موتوسيكل", status: "متغيب", ordersToday: 0, rating: 4.2 },
  { id: "r4", name: "خالد الحربي", phone: "0501234567", country: "sa", vehicle: "عربية", status: "نشط", ordersToday: 11, rating: 4.9 },
  { id: "r5", name: "فهد العتيبي", phone: "0559876543", country: "sa", vehicle: "موتوسيكل", status: "مخالفة", ordersToday: 3, rating: 3.6 },
  { id: "r6", name: "راشد المهيري", phone: "0501112223", country: "ae", vehicle: "تروسيكل", status: "نشط", ordersToday: 7, rating: 4.7 },
];

const COUNTRIES = [
  { k: "all", f: "🌍", ar: "الكل" },
  { k: "eg", f: "🇪🇬", ar: "مصر" },
  { k: "sa", f: "🇸🇦", ar: "السعودية" },
  { k: "ae", f: "🇦🇪", ar: "الإمارات" },
] as const;

export default function RepresentativesPage() {
  const showToast = useToast();
  const [reps, setReps] = useState<Rep[]>(INITIAL_REPS);
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]["k"]>("all");
  const [statusFilter, setStatusFilter] = useState<"الكل" | DriverStatus>("الكل");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", country: "eg" as Rep["country"], vehicle: "موتوسيكل" as Vehicle });
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  const filtered = useMemo(() => {
    return reps.filter((r) => {
      if (country !== "all" && r.country !== country) return false;
      if (statusFilter !== "الكل" && r.status !== statusFilter) return false;
      if (search.trim() && !r.name.includes(search.trim()) && !r.phone.includes(search.trim())) return false;
      return true;
    });
  }, [reps, country, statusFilter, search]);

  const totals = useMemo(() => {
    const scoped = country === "all" ? reps : reps.filter((r) => r.country === country);
    return {
      total: scoped.length,
      active: scoped.filter((r) => r.status === "نشط").length,
      absent: scoped.filter((r) => r.status === "متغيب").length,
      violations: scoped.filter((r) => r.status === "مخالفة").length,
      orders: scoped.reduce((sum, r) => sum + r.ordersToday, 0),
    };
  }, [reps, country]);

  const handleStatusChange = (id: string, status: DriverStatus) => {
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const handleAddRep = () => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "الاسم مطلوب";
    if (!form.phone.trim()) errors.phone = "رقم الهاتف مطلوب";
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setFormErrors({});
    const newRep: Rep = {
      id: `r-${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      country: form.country,
      vehicle: form.vehicle,
      status: "نشط",
      ordersToday: 0,
      rating: 0,
    };
    setReps((prev) => [newRep, ...prev]);
    setForm({ name: "", phone: "", country: "eg", vehicle: "موتوسيكل" });
    setShowForm(false);
    showToast("success", `تم إضافة المندوب ${newRep.name}`);
  };

  return (
    <PortalLayout title="المناديب" subtitle="إدارة مناديب التوصيل ومتابعة أدائهم">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard icon={Truck} label="إجمالي المناديب" value={String(totals.total)} tone="primary" />
        <MetricCard icon={Truck} label="نشطين" value={String(totals.active)} tone="success" />
        <MetricCard icon={Truck} label="متغيبين" value={String(totals.absent)} tone="muted" />
        <MetricCard icon={Truck} label="مخالفات" value={String(totals.violations)} tone="danger" />
        <MetricCard icon={Package} label="طلبات اليوم" value={String(totals.orders)} tone="teal" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
          {COUNTRIES.map((c) => (
            <button key={c.k} onClick={() => setCountry(c.k)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${country === c.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}>
              <span className="text-base">{c.f}</span> {c.ar}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "إغلاق" : "إضافة مندوب"}
        </button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6 border-2 border-primary/20">
          <h3 className="font-bold text-foreground mb-4">مندوب جديد</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="اسم المندوب"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${formErrors.name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1.5">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">الهاتف</label>
              <input
                value={form.phone}
                onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setFormErrors((p) => ({ ...p, phone: undefined })); }}
                placeholder="01xxxxxxxxx"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${formErrors.phone ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {formErrors.phone && <p className="text-xs text-destructive mt-1.5">{formErrors.phone}</p>}
            </div>
            <Select label="الدولة" value={form.country === "eg" ? "مصر" : form.country === "sa" ? "السعودية" : "الإمارات"}
              onChange={(v) => setForm((f) => ({ ...f, country: v === "مصر" ? "eg" : v === "السعودية" ? "sa" : "ae" }))}
              options={["مصر", "السعودية", "الإمارات"]} />
            <Select label="نوع المركبة" value={form.vehicle} onChange={(v) => setForm((f) => ({ ...f, vehicle: v as Vehicle }))}
              options={["موتوسيكل", "عربية", "تروسيكل"]} />
          </div>
          <button onClick={handleAddRep} className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">
            حفظ المندوب
          </button>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف"
              className="w-full h-10 rounded-xl border border-border bg-card pr-9 pl-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
            <option>الكل</option>
            <option>نشط</option>
            <option>متغيب</option>
            <option>مخالفة</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground border-b border-border">
                <th className="pb-3 font-semibold">الاسم</th>
                <th className="pb-3 font-semibold">الهاتف</th>
                <th className="pb-3 font-semibold">الدولة</th>
                <th className="pb-3 font-semibold">المركبة</th>
                <th className="pb-3 font-semibold">طلبات اليوم</th>
                <th className="pb-3 font-semibold">التقييم</th>
                <th className="pb-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">مفيش نتائج مطابقة</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-primary/5 transition">
                  <td className="py-3 font-semibold text-foreground">{r.name}</td>
                  <td className="py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {r.country === "eg" ? "🇪🇬 مصر" : r.country === "sa" ? "🇸🇦 السعودية" : "🇦🇪 الإمارات"}
                  </td>
                  <td className="py-3 text-muted-foreground">{r.vehicle}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground tabular-nums">
                      <Package className="h-3.5 w-3.5 text-primary" /> {r.ordersToday}
                    </span>
                  </td>
                  <td className="py-3">
                    {r.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {r.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">جديد</span>
                    )}
                  </td>
                  <td className="py-3">
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as DriverStatus)}
                      className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none
                        ${r.status === "نشط" ? "border-success/30 bg-success/10 text-success" :
                          r.status === "متغيب" ? "border-border bg-muted text-muted-foreground" :
                          "border-destructive/30 bg-destructive/10 text-destructive"}`}
                    >
                      <option>نشط</option>
                      <option>متغيب</option>
                      <option>مخالفة</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger" | "muted";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary", teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success", warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive", muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}