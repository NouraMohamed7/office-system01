// src/app/manager/department-work/page.tsx
"use client";

import { Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Building2, Image as ImageIcon, Film, LayoutTemplate,
  User, Truck, Search, X, Download, RotateCcw,
  Link as LinkIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

type DeptKey = "social" | "dash";

const overviewDepts: { key: DeptKey; name: string; en: string; emps: number; tasks: number; target?: number; tone: "success" | "warning" }[] = [
  { key: "social", name: "السوشيال ميديا", en: "Social Media", emps: 6, tasks: 18, tone: "success" },
  { key: "dash", name: "المناديب", en: "Dash", emps: 7, tasks: 22, target: 74, tone: "warning" },
];

const tabs: { k: DeptKey; ar: string }[] = [
  { k: "social", ar: "السوشيال ميديا" },
  { k: "dash", ar: "المناديب / Dash" },
];

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

// السوشيال ميديا دلوقتي بيعرض بس: المنصة، نوع المحتوى، التاريخ، والرابط (لو موجود).
// الستوري مالهاش رابط دائم فبيتعرض بدالها "-"
type SocialItem = { platform: string; type: string; date: string; link: string | null };

const socialContent: SocialItem[] = [
  { platform: "Instagram", type: "بوست", date: "2026-07-28", link: "instagram.com/p/aa1" },
  { platform: "Instagram", type: "ريل", date: "2026-07-26", link: "instagram.com/reel/aa2" },
  { platform: "Instagram", type: "ستوري", date: "2026-07-25", link: null },
  { platform: "TikTok", type: "ريل", date: "2026-07-29", link: "tiktok.com/@y/video/bb1" },
  { platform: "TikTok", type: "ريل", date: "2026-07-27", link: "tiktok.com/@y/video/bb2" },
  { platform: "TikTok", type: "بوست", date: "2026-07-24", link: "tiktok.com/@y/video/bb3" },
  { platform: "Facebook", type: "بوست", date: "2026-07-30", link: "facebook.com/posts/cc1" },
  { platform: "Facebook", type: "ستوري", date: "2026-07-28", link: null },
  { platform: "X (Twitter)", type: "بوست", date: "2026-07-27", link: "x.com/o/status/dd1" },
  { platform: "X (Twitter)", type: "بوست", date: "2026-07-22", link: "x.com/o/status/dd2" },
  { platform: "Instagram", type: "كاروسيل", date: "2026-07-29", link: "instagram.com/p/ee1" },
  { platform: "Instagram", type: "ريل", date: "2026-07-25", link: "instagram.com/reel/ee2" },
  { platform: "TikTok", type: "ريل", date: "2026-07-26", link: "tiktok.com/@a/video/ff1" },
];

type DriverStatus = "نشط" | "متغيب" | "مخالفة";
// المندوب دلوقتي بيعرض بس: الاسم، الحالة، والتعليق اللي الموظف ضايفه
type Driver = { id: string; name: string; status: DriverStatus; comment: string };

// Egypt only for now
const initialDrivers: Driver[] = [
  { id: "eg-1", name: "أحمد صلاح", status: "نشط", comment: "منتظم في المواعيد وسريع في التسليم." },
  { id: "eg-2", name: "محمود جابر", status: "نشط", comment: "أداء جيد، محتاج متابعة في منطقة الزمالك." },
  { id: "eg-3", name: "كريم عادل", status: "متغيب", comment: "غايب من يومين من غير إبلاغ مسبق." },
];

/* ------------------------------------------------------------------ */
/*  Excel export helper                                                 */
/* ------------------------------------------------------------------ */

function exportToExcel(filename: string, rows: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* ------------------------------------------------------------------ */
/*  Page shell + shared keyframes                                       */
/* ------------------------------------------------------------------ */

export default function DepartmentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">جاري التحميل...</div>}>
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        .fade-in { animation: fadeSlideIn .35s ease-out both; }
        .pop-in { animation: popIn .25s ease-out both; }
        .row-in { animation: fadeSlideIn .3s ease-out both; }
      `}</style>
      <DepartmentPageInner />
    </Suspense>
  );
}

function DepartmentPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const deptParam = searchParams.get("dept");
  const activeDept: DeptKey = deptParam === "dash" ? deptParam : "social";

  const setActiveDept = useCallback(
    (dept: DeptKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("dept", dept);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const totalEmps = overviewDepts.reduce((a, d) => a + d.emps, 0);
  const totalTasks = overviewDepts.reduce((a, d) => a + d.tasks, 0);
  const targetDepts = overviewDepts.filter((d) => d.target !== undefined);
  const avgTarget = targetDepts.length
    ? Math.round(targetDepts.reduce((a, d) => a + (d.target ?? 0), 0) / targetDepts.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="شغل القسم" subtitle="متابعة أداء كل قسم وموظفيه أول بأول." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="عدد الأقسام" value={String(overviewDepts.length)} tone="primary" />
        <StatCard dense label="إجمالي الموظفين" value={String(totalEmps)} tone="teal" />
        <StatCard dense label="مهام مفتوحة" value={String(totalTasks)} tone="warning" />
        <StatCard dense label="متوسط تحقيق Target" value={`${avgTarget}%`} tone="success" />
      </div>

      {/* overview cards — click to jump to that department's detail (updates the URL) */}
      <div className="grid gap-4 md:grid-cols-2">
        {overviewDepts.map((d, i) => (
          <button
            key={d.name}
            onClick={() => setActiveDept(d.key)}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`pop-in text-right card-warm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-warm-lg ${
              activeDept === d.key ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`grid size-11 place-items-center rounded-xl pill-${d.tone} transition-transform duration-200`}>
                <Building2 className="size-5" />
              </div>
              {d.target !== undefined && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary tabular">{d.target}%</div>
                  <div className="text-[10px] text-muted-foreground">Target</div>
                </div>
              )}
            </div>
            <div className="mt-3 text-base font-bold">{d.name}</div>
            <div className="text-[11px] text-muted-foreground">{d.en}</div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div><span className="font-bold text-foreground tabular">{d.emps}</span> <span className="text-muted-foreground">موظف</span></div>
              <div><span className="font-bold text-foreground tabular">{d.tasks}</span> <span className="text-muted-foreground">مهمة</span></div>
            </div>
          </button>
        ))}
      </div>

      {/* detail tabs */}
      <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveDept(t.k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeDept === t.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.ar}
          </button>
        ))}
      </div>

      <div key={activeDept} className="fade-in space-y-6">
        {activeDept === "social" && <SocialDetail />}
        {activeDept === "dash" && <DashDetail />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Social detail — flat content table (no employee names)             */
/* ------------------------------------------------------------------ */

function SocialDetail() {
  const showToast = useToast();
  const [platform, setPlatform] = useState("الكل");
  const [contentType, setContentType] = useState("الكل");

  const totals = socialContent.reduce(
    (acc, it) => ({
      posts: acc.posts + (it.type === "بوست" || it.type === "كاروسيل" ? 1 : 0),
      reels: acc.reels + (it.type === "ريل" ? 1 : 0),
      stories: acc.stories + (it.type === "ستوري" ? 1 : 0),
    }),
    { posts: 0, reels: 0, stories: 0 }
  );

  const filtered = socialContent.filter((it) => {
    const matchesPlatform = platform === "الكل" || it.platform === platform;
    const matchesType = contentType === "الكل" || it.type === contentType;
    return matchesPlatform && matchesType;
  });

  const resetFilters = () => {
    setPlatform("الكل");
    setContentType("الكل");
    showToast("success", "تم مسح الفلاتر");
  };

  const handleExport = () => {
    exportToExcel(
      "تقرير-السوشيال-ميديا",
      filtered.map((it) => ({
        المنصة: it.platform,
        "نوع المحتوى": it.type,
        التاريخ: it.date,
        الرابط: it.link ?? "لا يوجد رابط دائم",
      }))
    );
    showToast("success", "تم تنزيل ملف الإكسل");
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={ImageIcon} label="إجمالي البوستات" value={String(totals.posts)} tone="primary" />
        <MetricCard icon={Film} label="إجمالي الريلز" value={String(totals.reels)} tone="teal" />
        <MetricCard icon={LayoutTemplate} label="إجمالي الستوري" value={String(totals.stories)} tone="warning" />
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="font-bold text-foreground">محتوى السوشيال ميديا</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {["الكل", "Instagram", "TikTok", "Facebook", "X (Twitter)"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {["الكل", "بوست", "ريل", "ستوري", "كاروسيل"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              className="h-10 flex items-center gap-1.5 rounded-xl border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> مسح
            </button>
            <button
              onClick={handleExport}
              className="h-10 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> تصدير Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground border-b border-border">
                <th className="pb-2 font-semibold">المنصة</th>
                <th className="pb-2 font-semibold">نوع المحتوى</th>
                <th className="pb-2 font-semibold">التاريخ</th>
                <th className="pb-2 font-semibold">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">لا يوجد نتائج مطابقة للفلاتر</td></tr>
              )}
              {filtered.map((it, i) => (
                <tr
                  key={i}
                  style={{ animationDelay: `${i * 35}ms` }}
                  className="row-in border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                >
                  <td className="py-3 font-semibold text-foreground">{it.platform}</td>
                  <td className="py-3 text-muted-foreground">{it.type}</td>
                  <td className="py-3 tabular-nums text-muted-foreground">{it.date}</td>
                  <td className="py-3">
                    {it.link ? (
                      <a
                        href={`https://${it.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" /> {it.link}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">لا يوجد رابط دائم</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Dash detail (Egypt only)                                            */
/*  يعرض بس: اسم المندوب، حالته، والتعليق اللي الموظف ضايفه              */
/* ------------------------------------------------------------------ */

function DashDetail() {
  const showToast = useToast();
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [query, setQuery] = useState("");

  const list = drivers.filter((d) => d.name.includes(query));

  const handleStatusChange = (id: string, newStatus: DriverStatus) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
    showToast("success", "تم تحديث حالة المندوب");
  };

  const handleExport = () => {
    exportToExcel(
      "تقرير-المناديب",
      list.map((d) => ({ المندوب: d.name, الحالة: d.status, التعليق: d.comment }))
    );
    showToast("success", "تم تنزيل ملف الإكسل");
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="ابحث باسم المندوب..." />
        <button
          onClick={handleExport}
          className="h-10 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> تصدير Excel
        </button>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> قائمة المناديب
        </h3>
        <div className="space-y-2">
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد مناديب مطابقين للبحث</p>
          )}
          {list.map((d, i) => (
            <div
              key={d.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="row-in rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-sm">{d.name}</span>
                </div>
                <select
                  value={d.status}
                  onChange={(e) => handleStatusChange(d.id, e.target.value as DriverStatus)}
                  className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none transition-colors
                    ${d.status === "نشط" ? "border-success/30 bg-success/10 text-success" :
                      d.status === "متغيب" ? "border-border bg-muted text-muted-foreground" :
                      "border-destructive/30 bg-destructive/10 text-destructive"}`}
                >
                  <option>نشط</option>
                  <option>متغيب</option>
                  <option>مخالفة</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {d.comment || "لا يوجد تعليق"}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared small pieces                                                 */
/* ------------------------------------------------------------------ */

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
    <Card className="p-5 pop-in transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-56 rounded-xl border border-border bg-card pr-9 pl-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}