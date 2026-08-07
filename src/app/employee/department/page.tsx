// src/app/employee/department/page.tsx
"use client";

import type { Dispatch, SetStateAction, ComponentType } from "react";
import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Image as ImageIcon,
  Film,
  LayoutTemplate,
  TrendingUp,
  TrendingDown,
  User,
  Truck,
  MessageCircle,
  Download,
} from "lucide-react";

type Tab = "social" | "dash";

type Counts = { posts: number; reels: number; stories: number };

const INITIAL_COUNTS: Counts = { posts: 34, reels: 12, stories: 58 };

type DriverStatus = "نشط" | "متغيب" | "مخالفة";
type DriverComment = { text: string; time: string };
type Driver = { id: string; name: string; status: DriverStatus; comments: DriverComment[] };

const initialDrivers: Driver[] = [
  { id: "eg-1", name: "أحمد صلاح", status: "نشط", comments: [] },
  { id: "eg-2", name: "محمود جابر", status: "نشط", comments: [] },
  {
    id: "eg-3",
    name: "كريم عادل",
    status: "متغيب",
    comments: [{ text: "متأخر في التسليم يومين ورا بعض", time: "أمس" }],
  },
];

export default function DepartmentPage() {
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>("social");
  const [counts, setCounts] = useState<Counts>(INITIAL_COUNTS);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const socialSheet = XLSX.utils.json_to_sheet([
      { المؤشر: "عدد البوستات", القيمة: counts.posts },
      { المؤشر: "عدد الريلز", القيمة: counts.reels },
      { المؤشر: "عدد الستوري", القيمة: counts.stories },
    ]);
    XLSX.utils.book_append_sheet(wb, socialSheet, "السوشيال ميديا");

    const driversSheet = XLSX.utils.json_to_sheet(
      drivers.map((d) => ({
        "اسم المندوب": d.name,
        الحالة: d.status,
        "عدد التعليقات": d.comments.length,
        "آخر تعليق": d.comments[d.comments.length - 1]?.text || "",
      }))
    );
    XLSX.utils.book_append_sheet(wb, driversSheet, "المناديب");

    const commentsRows = drivers.flatMap((d) =>
      d.comments.map((c) => ({ "اسم المندوب": d.name, التعليق: c.text, التوقيت: c.time }))
    );
    if (commentsRows.length > 0) {
      const commentsSheet = XLSX.utils.json_to_sheet(commentsRows);
      XLSX.utils.book_append_sheet(wb, commentsSheet, "تفاصيل التعليقات");
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `تقرير_شغل_القسم_${dateStr}.xlsx`);
    showToast("success", "تم تصدير التقرير بصيغة إكسيل");
  };

  return (
    <PortalLayout title="شغل القسم" subtitle="بيانات وتسجيل أعمال قسمك">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
          {(
            [
              { k: "social", ar: "السوشيال ميديا" },
              { k: "dash", ar: "المناديب / Dash" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
              }`}
            >
              {t.ar}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-success text-success-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:opacity-90 transition shadow-warm"
        >
          <Download className="h-4 w-4" />
          تصدير إلى إكسيل
        </button>
      </div>

      {tab === "social" && <SocialVariant counts={counts} setCounts={setCounts} />}
      {tab === "dash" && <DashVariant drivers={drivers} setDrivers={setDrivers} />}
    </PortalLayout>
  );
}

function SocialVariant({
  counts,
  setCounts,
}: {
  counts: Counts;
  setCounts: Dispatch<SetStateAction<Counts>>;
}) {
  const showToast = useToast();
  const [platform, setPlatform] = useState("Instagram");
  const [contentType, setContentType] = useState("بوست");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

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
              onChange={(e) => {
                setLink(e.target.value);
                setError("");
              }}
              placeholder="https://..."
              className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                ${
                  error
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-border focus:border-primary focus:ring-primary/20"
                }`}
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        </div>
        <button
          onClick={handleSave}
          className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition"
        >
          حفظ المحتوى
        </button>
      </Card>
    </>
  );
}

function DashVariant({
  drivers,
  setDrivers,
}: {
  drivers: Driver[];
  setDrivers: Dispatch<SetStateAction<Driver[]>>;
}) {
  const showToast = useToast();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<DriverStatus>("نشط");
  const [error, setError] = useState("");

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const current = {
    active: drivers.filter((d) => d.status === "نشط").length,
    absent: drivers.filter((d) => d.status === "متغيب").length,
    violations: drivers.filter((d) => d.status === "مخالفة").length,
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسم المندوب");
      showToast("error", "اسم المندوب مطلوب قبل الحفظ");
      return;
    }
    setError("");
    const newDriver: Driver = { id: `eg-${Date.now()}`, name: name.trim(), status, comments: [] };
    setDrivers((prev) => [newDriver, ...prev]);
    setName("");
    setStatus("نشط");
    showToast("success", `تم تسجيل المندوب ${newDriver.name}`);
  };

  const handleStatusChange = (id: string, newStatus: DriverStatus) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
  };

  const handleAddComment = (id: string) => {
    const text = (commentDrafts[id] || "").trim();
    if (!text) {
      showToast("error", "اكتب تعليق الأول قبل الإضافة");
      return;
    }
    const comment: DriverComment = { text, time: "الآن" };
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, comments: [...d.comments, comment] } : d)));
    setCommentDrafts((prev) => ({ ...prev, [id]: "" }));
    showToast("success", "تم إضافة التعليق");
  };

  return (
    <>
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
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="اسم المندوب"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                  ${
                    error
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-border focus:border-primary focus:ring-primary/20"
                  }`}
              />
              {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
            </div>
            <Select label="الحالة" value={status} onChange={(v) => setStatus(v as DriverStatus)} options={["نشط", "متغيب", "مخالفة"]} />
          </div>
          <button
            onClick={handleSave}
            className="mt-6 w-full bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition"
          >
            حفظ المندوب
          </button>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> قائمة المناديب
          </h3>
          <div className="space-y-2">
            {drivers.length === 0 && <p className="text-sm text-muted-foreground">لسه مفيش مناديب مسجلين</p>}
            {drivers.map((d) => {
              const isOpen = !!openComments[d.id];
              return (
                <div key={d.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.id, e.target.value as DriverStatus)}
                        className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none
                          ${
                            d.status === "نشط"
                              ? "border-success/30 bg-success/10 text-success"
                              : d.status === "متغيب"
                              ? "border-border bg-muted text-muted-foreground"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          }`}
                      >
                        <option>نشط</option>
                        <option>متغيب</option>
                        <option>مخالفة</option>
                      </select>
                      <button
                        onClick={() => setOpenComments((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
                        className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        تعليقات {d.comments.length > 0 && `(${d.comments.length})`}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      {d.comments.length === 0 && <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>}
                      {d.comments.map((c, i) => (
                        <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-muted-foreground">{c.time}</span>
                          </div>
                          <p className="text-sm text-foreground">{c.text}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={commentDrafts[d.id] || ""}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(d.id)}
                          placeholder="اكتب تعليق..."
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleAddComment(d.id)}
                          className="bg-primary text-primary-foreground rounded-lg px-3 text-xs font-semibold hover:bg-primary-dark transition"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  trendUp,
  trendDown,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger" | "muted";
  trendUp?: string;
  trendDown?: string;
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
        <span>{label}</span>
        {trendUp && <span className="text-success text-xs font-bold">↑ {trendUp}</span>}
        {trendDown && <span className="text-destructive text-xs font-bold">↓ {trendDown}</span>}
      </div>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}