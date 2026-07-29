// src/app/department/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useState } from "react";
import { Image as ImageIcon, Film, LayoutTemplate, Phone, TrendingUp, TrendingDown, User, Truck } from "lucide-react";

type Tab = "social" | "call" | "dash";

export default function DepartmentPage() {
  const [tab, setTab] = useState<Tab>("social");
  return (
    <PortalLayout title="شغل القسم" subtitle="بيانات وتسجيل أعمال قسمك">
      <div className="inline-flex rounded-xl bg-secondary p-1 mb-6 flex-wrap">
        {[
          { k: "social", ar: "السوشيال ميديا" },
          { k: "call", ar: "الكول سنتر / التسويق" },
          { k: "dash", ar: "المناديب / Dash" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}>
            {t.ar}
          </button>
        ))}
      </div>

      {tab === "social" && <SocialVariant />}
      {tab === "call" && <CallVariant />}
      {tab === "dash" && <DashVariant />}
    </PortalLayout>
  );
}

function SocialVariant() {
  const showToast = useToast();
  const [platform, setPlatform] = useState("Instagram");
  const [contentType, setContentType] = useState("بوست");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const [counts, setCounts] = useState({ posts: 34, reels: 12, stories: 58 });

  const handleSave = () => {
    if (!link.trim()) {
      setError("من فضلك أدخل رابط المحتوى");
      showToast("error", "الرابط مطلوب قبل الحفظ");
      return;
    }
    setError("");
    setCounts((prev) => ({
      posts: prev.posts + (contentType === "بوست" || contentType === "كاروسيل" ? 1 : 0),
      reels: prev.reels + (contentType === "ريل" ? 1 : 0),
      stories: prev.stories + (contentType === "ستوري" ? 1 : 0),
    }));
    setLink("");
    showToast("success", `تم حفظ ${contentType} على ${platform} بنجاح`);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={ImageIcon} label="عدد البوستات" value={String(counts.posts)} tone="primary" />
        <MetricCard icon={Film} label="عدد الريلز" value={String(counts.reels)} tone="teal" />
        <MetricCard icon={LayoutTemplate} label="عدد الستوري" value={String(counts.stories)} tone="warning" />
      </div>
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">تسجيل محتوى</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Select label="المنصة" value={platform} onChange={setPlatform} options={["Instagram", "TikTok", "Facebook", "X (Twitter)"]} />
          <Select label="نوع المحتوى" value={contentType} onChange={setContentType} options={["بوست", "ريل", "ستوري", "كاروسيل"]} />
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-foreground">الرابط</label>
            <input
              value={link}
              onChange={(e) => { setLink(e.target.value); setError(""); }}
              placeholder="https://..."
              className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        </div>
        <button onClick={handleSave} className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">حفظ المحتوى</button>
      </Card>
    </>
  );
}

function CallVariant() {
  const showToast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState("لم يرد");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const [stats, setStats] = useState({ calls: 248, leads: 87, interested: 34, meetings: 9 });

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "الاسم مطلوب";
    if (!phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setErrors({});
    setStats((prev) => ({
      calls: prev.calls + 1,
      leads: prev.leads + (result === "مهتم" || result === "متابعة" ? 1 : 0),
      interested: prev.interested + (result === "مهتم" ? 1 : 0),
      meetings: prev.meetings + (result === "مقابلة" ? 1 : 0),
    }));
    setName(""); setPhone(""); setNotes(""); setResult("لم يرد");
    showToast("success", `تم حفظ المكالمة مع ${name || "العميل"}`);
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={Phone} label="عدد المكالمات" value={String(stats.calls)} tone="primary" trendUp="+12%" />
        <MetricCard icon={TrendingUp} label="عدد الليدز" value={String(stats.leads)} tone="teal" trendUp="+8%" />
        <MetricCard icon={TrendingUp} label="عدد المهتمين" value={String(stats.interested)} tone="success" trendUp="+3" />
        <MetricCard icon={TrendingDown} label="عدد المقابلات" value={String(stats.meetings)} tone="warning" trendDown="-1" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold text-foreground mb-4">تسجيل مكالمة</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">الاسم</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="اسم العميل"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${errors.name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {errors.name && <p className="text-xs text-destructive mt-1.5">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">الهاتف</label>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                placeholder="+20 ..."
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${errors.phone ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1.5">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">النتيجة</label>
              <select value={result} onChange={(e) => setResult(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
                <option>لم يرد</option><option>مهتم</option><option>غير مهتم</option><option>متابعة</option><option>مقابلة</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-foreground">الملاحظات</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none p-3 text-sm resize-none" />
            </div>
          </div>
          <button onClick={handleSave} className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">حفظ المكالمة</button>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">توزيع النتائج</h3>
          <Donut />
          <div className="mt-4 space-y-2 text-sm">
            {[
              { ar: "مهتم", pct: 38, color: "var(--primary)" },
              { ar: "متابعة", pct: 26, color: "var(--teal)" },
              { ar: "مقابلة", pct: 14, color: "var(--success)" },
              { ar: "لم يرد", pct: 22, color: "var(--warning)" },
            ].map((s) => (
              <div key={s.ar} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-muted-foreground">{s.ar}</span>
                <span className="font-bold tabular-nums">{s.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

type DriverStatus = "نشط" | "متغيب" | "مخالفة";
type Driver = { id: string; name: string; status: DriverStatus };

const initialDrivers: Record<string, Driver[]> = {
  eg: [
    { id: "eg-1", name: "أحمد صلاح", status: "نشط" },
    { id: "eg-2", name: "محمود جابر", status: "نشط" },
    { id: "eg-3", name: "كريم عادل", status: "متغيب" },
  ],
  sa: [
    { id: "sa-1", name: "خالد الحربي", status: "نشط" },
    { id: "sa-2", name: "فهد العتيبي", status: "مخالفة" },
  ],
  ae: [
    { id: "ae-1", name: "راشد المهيري", status: "نشط" },
  ],
};

function DashVariant() {
  const showToast = useToast();
  const [country, setCountry] = useState("eg");
  const [drivers, setDrivers] = useState<Record<string, Driver[]>>(initialDrivers);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<DriverStatus>("نشط");
  const [error, setError] = useState("");

  const list = drivers[country];
  const current = {
    active: list.filter((d) => d.status === "نشط").length,
    absent: list.filter((d) => d.status === "متغيب").length,
    violations: list.filter((d) => d.status === "مخالفة").length,
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسم المندوب");
      showToast("error", "اسم المندوب مطلوب قبل الحفظ");
      return;
    }
    setError("");
    const newDriver: Driver = { id: `${country}-${Date.now()}`, name: name.trim(), status };
    setDrivers((prev) => ({ ...prev, [country]: [newDriver, ...prev[country]] }));
    setName("");
    setStatus("نشط");
    showToast("success", `تم تسجيل المندوب ${newDriver.name}`);
  };

  const handleStatusChange = (id: string, newStatus: DriverStatus) => {
    setDrivers((prev) => ({
      ...prev,
      [country]: prev[country].map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
    }));
  };

  return (
    <>
      <div className="inline-flex rounded-xl bg-secondary p-1 mb-6">
        {[{ k: "eg", f: "🇪🇬", ar: "مصر" }, { k: "sa", f: "🇸🇦", ar: "السعودية" }, { k: "ae", f: "🇦🇪", ar: "الإمارات" }].map((c) => (
          <button key={c.k} onClick={() => setCountry(c.k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${country === c.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}>
            <span className="text-base">{c.f}</span> {c.ar}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={TrendingUp} label="عدد النشطين" value={String(current.active)} tone="success" />
        <MetricCard icon={TrendingDown} label="عدد المتغيبين" value={String(current.absent)} tone="muted" />
        <MetricCard icon={TrendingDown} label="عدد المخالفات" value={String(current.violations)} tone="danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> تسجيل مندوب
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">اسم المندوب</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="اسم المندوب"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                  ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
            </div>
            <Select label="الحالة" value={status} onChange={(v) => setStatus(v as DriverStatus)} options={["نشط", "متغيب", "مخالفة"]} />
          </div>
          <button onClick={handleSave} className="mt-6 w-full bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">
            حفظ المندوب
          </button>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> قائمة المناديب
          </h3>
          <div className="space-y-2">
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground">لسه مفيش مناديب مسجلين في الدولة دي</p>
            )}
            {list.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="font-semibold text-foreground text-sm">{d.name}</span>
                <select
                  value={d.status}
                  onChange={(e) => handleStatusChange(d.id, e.target.value as DriverStatus)}
                  className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none
                    ${d.status === "نشط" ? "border-success/30 bg-success/10 text-success" :
                      d.status === "متغيب" ? "border-border bg-muted text-muted-foreground" :
                      "border-destructive/30 bg-destructive/10 text-destructive"}`}
                >
                  <option>نشط</option>
                  <option>متغيب</option>
                  <option>مخالفة</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Donut() {
  const segs = [{ p: 38, c: "var(--primary)" }, { p: 26, c: "var(--teal)" }, { p: 14, c: "var(--success)" }, { p: 22, c: "var(--warning)" }];
  let offset = 25;
  return (
    <svg viewBox="0 0 36 36" className="mx-auto h-40 w-40 -rotate-90">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="3.5" />
      {segs.map((s, i) => {
        const el = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={s.c} strokeWidth="3.5"
          strokeDasharray={`${s.p} ${100 - s.p}`} strokeDashoffset={-offset + 25} />;
        offset += s.p;
        return el;
      })}
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, tone, trendUp, trendDown }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger" | "muted"; trendUp?: string; trendDown?: string;
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary", teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success", warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive", muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
        <span>{label}</span>
        {trendUp && <span className="text-success text-xs font-bold">↑ {trendUp}</span>}
        {trendDown && <span className="text-destructive text-xs font-bold">↓ {trendDown}</span>}
      </div>
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