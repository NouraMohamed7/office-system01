// src/app/library/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useMemo, useState } from "react";
import {
  BookOpen, Search, FileText, Video, FileSpreadsheet, Presentation,
  Star, Download, Clock, Eye, X, Play,
} from "lucide-react";

type ResourceType = "مستند" | "فيديو" | "عرض تقديمي" | "شيت";
type ResourceCategory = "سياسات الشركة" | "تدريب" | "تسويق" | "مبيعات" | "عام";

type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  category: ResourceCategory;
  sizeOrDuration: string;
  addedAt: string;
  views: number;
  description: string;
};

const INITIAL_RESOURCES: Resource[] = [
  { id: "l1", title: "دليل سياسات الشركة 2026", type: "مستند", category: "سياسات الشركة", sizeOrDuration: "2.4 MB", addedAt: "2026-06-01", views: 312, description: "دليل شامل يوضح كل سياسات الشركة الخاصة بالإجازات، الحضور، والسلوك المهني." },
  { id: "l2", title: "أساسيات خدمة العملاء", type: "فيديو", category: "تدريب", sizeOrDuration: "18 دقيقة", addedAt: "2026-06-10", views: 189, description: "فيديو تدريبي يشرح أساسيات التعامل مع العملاء وحل المشكلات الشائعة." },
  { id: "l3", title: "استراتيجية المحتوى Q3", type: "عرض تقديمي", category: "تسويق", sizeOrDuration: "5.1 MB", addedAt: "2026-07-05", views: 94, description: "عرض تقديمي بخطة المحتوى للربع الثالث، شامل الأهداف والمنصات المستهدفة." },
  { id: "l4", title: "قالب تقرير المبيعات الشهري", type: "شيت", category: "مبيعات", sizeOrDuration: "180 KB", addedAt: "2026-07-12", views: 67, description: "قالب جاهز لتسجيل تقرير المبيعات الشهري بشكل موحد لكل الفريق." },
  { id: "l5", title: "لائحة الحضور والانصراف", type: "مستند", category: "سياسات الشركة", sizeOrDuration: "640 KB", addedAt: "2026-05-20", views: 245, description: "اللائحة الرسمية لمواعيد الحضور والانصراف والغياب والتأخير." },
  { id: "l6", title: "مهارات التفاوض مع العملاء", type: "فيديو", category: "تدريب", sizeOrDuration: "27 دقيقة", addedAt: "2026-07-18", views: 132, description: "فيديو تدريبي عن أساليب التفاوض الفعّال وإغلاق الصفقات." },
  { id: "l7", title: "دليل استخدام منصة التوصيل", type: "مستند", category: "عام", sizeOrDuration: "1.1 MB", addedAt: "2026-07-22", views: 58, description: "شرح خطوة بخطوة لاستخدام منصة تتبع المناديب والتوصيل." },
  { id: "l8", title: "عرض تعريفي بالشركة للعملاء الجدد", type: "عرض تقديمي", category: "مبيعات", sizeOrDuration: "8.3 MB", addedAt: "2026-06-28", views: 176, description: "عرض تقديمي رسمي يُستخدم في اجتماعات التعريف بالشركة مع عملاء جدد." },
];

const CATEGORIES: ("الكل" | ResourceCategory)[] = ["الكل", "سياسات الشركة", "تدريب", "تسويق", "مبيعات", "عام"];

function iconForType(type: ResourceType) {
  switch (type) {
    case "فيديو": return Video;
    case "عرض تقديمي": return Presentation;
    case "شيت": return FileSpreadsheet;
    default: return FileText;
  }
}

function colorForType(type: ResourceType) {
  switch (type) {
    case "فيديو": return "bg-destructive/10 text-destructive";
    case "عرض تقديمي": return "bg-warning/20 text-[oklch(0.48_0.11_82)]";
    case "شيت": return "bg-success/15 text-success";
    default: return "bg-primary/10 text-primary";
  }
}

function extensionForType(type: ResourceType) {
  switch (type) {
    case "فيديو": return "txt"; // placeholder — لا يوجد فيديو حقيقي فبنولد وصف نصي
    case "عرض تقديمي": return "txt";
    case "شيت": return "csv";
    default: return "txt";
  }
}

export default function LibraryPage() {
  const showToast = useToast();
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"الكل" | ResourceCategory>("الكل");
  const [typeFilter, setTypeFilter] = useState<"الكل" | ResourceType>("الكل");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["l1", "l5"]));
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const toggleFavorite = (id: string, title: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("success", `تمت إزالة "${title}" من المفضلة`);
      } else {
        next.add(id);
        showToast("success", `تمت إضافة "${title}" للمفضلة`);
      }
      return next;
    });
  };

  const bumpViews = (id: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, views: r.views + 1 } : r)));
  };

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (category !== "الكل" && r.category !== category) return false;
      if (typeFilter !== "الكل" && r.type !== typeFilter) return false;
      if (showFavoritesOnly && !favorites.has(r.id)) return false;
      if (search.trim() && !r.title.includes(search.trim())) return false;
      return true;
    });
  }, [resources, category, typeFilter, showFavoritesOnly, favorites, search]);

  const handleDownload = (r: Resource) => {
    const ext = extensionForType(r.type);
    const content =
`${r.title}
التصنيف: ${r.category}
النوع: ${r.type}
الحجم/المدة: ${r.sizeOrDuration}
تاريخ الإضافة: ${r.addedAt}

الوصف:
${r.description}
`;
    const blob = new Blob([content], { type: ext === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    bumpViews(r.id);
    showToast("success", `تم تحميل "${r.title}"`);
  };

  const handlePreview = (id: string) => {
    setPreviewId(id);
    bumpViews(id);
  };

  const previewResource = resources.find((r) => r.id === previewId) ?? null;

  return (
    <PortalLayout title="المكتبة" subtitle="موارد وملفات تدريبية وسياسات الشركة">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={BookOpen} label="إجمالي الموارد" value={String(resources.length)} tone="primary" />
        <MetricCard icon={Video} label="فيديوهات تدريبية" value={String(resources.filter((r) => r.type === "فيديو").length)} tone="danger" />
        <MetricCard icon={FileText} label="مستندات" value={String(resources.filter((r) => r.type === "مستند").length)} tone="teal" />
        <MetricCard icon={Star} label="المفضلة" value={String(favorites.size)} tone="warning" />
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المكتبة..."
              className="w-full h-10 rounded-xl border border-border bg-card pr-9 pl-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
            <option>الكل</option>
            <option>مستند</option>
            <option>فيديو</option>
            <option>عرض تقديمي</option>
            <option>شيت</option>
          </select>
          <button
            onClick={() => setShowFavoritesOnly((s) => !s)}
            className={`inline-flex items-center gap-2 h-10 rounded-xl px-4 text-sm font-semibold transition
              ${showFavoritesOnly ? "bg-warning/25 text-[oklch(0.48_0.11_82)]" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            المفضلة فقط
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition
                ${category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">مفيش موارد مطابقة لبحثك</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const Icon = iconForType(r.type);
            const isFav = favorites.has(r.id);
            return (
              <Card key={r.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl grid place-items-center ${colorForType(r.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <button onClick={() => toggleFavorite(r.id, r.title)} className="p-1.5 -m-1.5 rounded-lg hover:bg-secondary transition">
                    <Star className={`h-4 w-4 ${isFav ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                </div>
                <button onClick={() => handlePreview(r.id)} className="text-right">
                  <h3 className="font-semibold text-foreground text-sm leading-snug mb-1.5 hover:text-primary transition">{r.title}</h3>
                </button>
                <div className="text-xs text-muted-foreground mb-3">{r.category}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.sizeOrDuration}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {r.views}</span>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(r.id)}
                    className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-accent transition"
                  >
                    {r.type === "فيديو" ? <Play className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    معاينة
                  </button>
                  <button
                    onClick={() => handleDownload(r)}
                    className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-[color:var(--primary-dark)] transition"
                  >
                    <Download className="h-3.5 w-3.5" /> تحميل
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20" onClick={() => setPreviewId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-warm-lg w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ${colorForType(previewResource.type)}`}>
                  {(() => { const Icon = iconForType(previewResource.type); return <Icon className="h-5 w-5" />; })()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-sm truncate">{previewResource.title}</h3>
                  <div className="text-xs text-muted-foreground mt-0.5">{previewResource.category} · {previewResource.addedAt}</div>
                </div>
              </div>
              <button onClick={() => setPreviewId(null)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-secondary transition shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
              {previewResource.type === "فيديو" ? (
                <div className="aspect-video rounded-xl bg-secondary grid place-items-center">
                  <div className="text-center">
                    <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center mx-auto mb-2">
                      <Play className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-muted-foreground">معاينة الفيديو غير متاحة الآن — حمّلي الملف للمشاهدة الكاملة</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/60 p-4 flex items-center gap-3">
                  {(() => { const Icon = iconForType(previewResource.type); return <Icon className="h-8 w-8 text-primary shrink-0" />; })()}
                  <div className="text-xs text-muted-foreground">{previewResource.sizeOrDuration}</div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1.5">الوصف</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{previewResource.description}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {previewResource.views} مشاهدة</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {previewResource.sizeOrDuration}</span>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={() => handleDownload(previewResource)}
                className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition"
              >
                <Download className="h-4 w-4" /> تحميل الملف
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary", teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success", warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}