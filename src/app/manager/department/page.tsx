// src/app/manager/department/page.tsx
"use client";

import { Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Fragment, Suspense, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Building2, Image as ImageIcon, Film, LayoutTemplate, TrendingUp,
  TrendingDown, User, Truck, Search, X, Download, RotateCcw,
  ChevronDown, Link as LinkIcon,
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

type SocialItem = { type: string; platform: string; date: string; link: string; engagement: number };
type SocialEmployee = { name: string; role: string; posts: number; reels: number; stories: number; items: SocialItem[] };

const socialEmployees: SocialEmployee[] = [
  {
    name: "سارة محمد", role: "Instagram", posts: 4, reels: 2, stories: 6,
    items: [
      { type: "بوست", platform: "Instagram", date: "2026-07-28", link: "instagram.com/p/aa1", engagement: 4.2 },
      { type: "ريل", platform: "Instagram", date: "2026-07-26", link: "instagram.com/reel/aa2", engagement: 6.8 },
      { type: "ستوري", platform: "Instagram", date: "2026-07-25", link: "instagram.com/stories/aa3", engagement: 2.1 },
    ],
  },
  {
    name: "يوسف عبد الله", role: "TikTok", posts: 2, reels: 5, stories: 3,
    items: [
      { type: "ريل", platform: "TikTok", date: "2026-07-29", link: "tiktok.com/@y/video/bb1", engagement: 9.4 },
      { type: "ريل", platform: "TikTok", date: "2026-07-27", link: "tiktok.com/@y/video/bb2", engagement: 7.1 },
      { type: "بوست", platform: "TikTok", date: "2026-07-24", link: "tiktok.com/@y/video/bb3", engagement: 3.5 },
    ],
  },
  {
    name: "منة الله كمال", role: "Facebook", posts: 3, reels: 1, stories: 5,
    items: [
      { type: "بوست", platform: "Facebook", date: "2026-07-30", link: "facebook.com/posts/cc1", engagement: 2.9 },
      { type: "ستوري", platform: "Facebook", date: "2026-07-28", link: "facebook.com/stories/cc2", engagement: 1.4 },
    ],
  },
  {
    name: "عمر شريف", role: "X (Twitter)", posts: 2, reels: 0, stories: 2,
    items: [
      { type: "بوست", platform: "X (Twitter)", date: "2026-07-27", link: "x.com/o/status/dd1", engagement: 1.1 },
      { type: "بوست", platform: "X (Twitter)", date: "2026-07-22", link: "x.com/o/status/dd2", engagement: 0.8 },
    ],
  },
  {
    name: "هدى الشناوي", role: "Instagram", posts: 3, reels: 2, stories: 4,
    items: [
      { type: "كاروسيل", platform: "Instagram", date: "2026-07-29", link: "instagram.com/p/ee1", engagement: 5.3 },
      { type: "ريل", platform: "Instagram", date: "2026-07-25", link: "instagram.com/reel/ee2", engagement: 4.7 },
    ],
  },
  {
    name: "أحمد نبيل", role: "TikTok", posts: 1, reels: 3, stories: 2,
    items: [
      { type: "ريل", platform: "TikTok", date: "2026-07-26", link: "tiktok.com/@a/video/ff1", engagement: 6.2 },
    ],
  },
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
        @keyframes expandIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeSlideIn .35s ease-out both; }
        .pop-in { animation: popIn .25s ease-out both; }
        .row-in { animation: fadeSlideIn .3s ease-out both; }
        .expand-in { animation: expandIn .2s ease-out both; }
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
/*  Social detail                                                       */
/* ------------------------------------------------------------------ */

function SocialDetail() {
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("الكل");
  const [expanded, setExpanded] = useState<string | null>(null);

  const totals = socialEmployees.reduce(
    (acc, e) => ({ posts: acc.posts + e.posts, reels: acc.reels + e.reels, stories: acc.stories + e.stories }),
    { posts: 0, reels: 0, stories: 0 }
  );

  const filtered = socialEmployees.filter((e) => {
    const matchesQuery = e.name.includes(query);
    const matchesPlatform = platform === "الكل" || e.role === platform;
    return matchesQuery && matchesPlatform;
  });

  const resetFilters = () => {
    setQuery("");
    setPlatform("الكل");
    showToast("success", "تم مسح الفلاتر");
  };

  const handleExport = () => {
    exportToExcel(
      "تقرير-السوشيال-ميديا",
      filtered.map((e) => ({
        الموظف: e.name, المنصة: e.role, بوستات: e.posts, ريلز: e.reels, ستوري: e.stories,
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
          <h3 className="font-bold text-foreground">أداء فريق السوشيال ميديا</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="ابحث باسم الموظف..." />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {["الكل", "Instagram", "TikTok", "Facebook", "X (Twitter)"].map((p) => (
                <option key={p}>{p}</option>
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
                <th className="pb-2 font-semibold w-6"></th>
                <th className="pb-2 font-semibold">الموظف</th>
                <th className="pb-2 font-semibold">المنصة</th>
                <th className="pb-2 font-semibold">بوستات</th>
                <th className="pb-2 font-semibold">ريلز</th>
                <th className="pb-2 font-semibold">ستوري</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">لا يوجد نتائج مطابقة لبحثك</td></tr>
              )}
              {filtered.map((e, i) => {
                const isOpen = expanded === e.name;
                return (
                  <Fragment key={e.name}>
                    <tr
                      style={{ animationDelay: `${i * 35}ms` }}
                      onClick={() => setExpanded(isOpen ? null : e.name)}
                      className="row-in border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </td>
                      <td className="py-3 font-semibold text-foreground">{e.name}</td>
                      <td className="py-3 text-muted-foreground">{e.role}</td>
                      <td className="py-3 tabular-nums">{e.posts}</td>
                      <td className="py-3 tabular-nums">{e.reels}</td>
                      <td className="py-3 tabular-nums">{e.stories}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="pb-4">
                          <div className="expand-in rounded-xl bg-secondary/40 p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">آخر المحتوى المنشور</p>
                            {e.items.map((it, idx) => (
                              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-xs border border-border">
                                <span className="font-semibold text-foreground">{it.type} · {it.platform}</span>
                                <span className="text-muted-foreground">{it.date}</span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <LinkIcon className="h-3 w-3" /> {it.link}
                                </span>
                                <span className="font-bold text-success">تفاعل {it.engagement}%</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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
  const current = {
    active: drivers.filter((d) => d.status === "نشط").length,
    absent: drivers.filter((d) => d.status === "متغيب").length,
    violations: drivers.filter((d) => d.status === "مخالفة").length,
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={TrendingUp} label="عدد النشطين" value={String(current.active)} tone="success" />
        <MetricCard icon={TrendingDown} label="عدد المتغيبين" value={String(current.absent)} tone="muted" />
        <MetricCard icon={TrendingDown} label="عدد المخالفات" value={String(current.violations)} tone="danger" />
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