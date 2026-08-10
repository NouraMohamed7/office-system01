// src/app/manager/department-work/page.tsx
"use client";

import { Card, PageHeader } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Building2, Image as ImageIcon, Film, LayoutTemplate,
  User, Truck, Search, X, Download, RotateCcw,
  Link as LinkIcon, Loader2, Plus, MessageCircle,
} from "lucide-react";
import {
  type SocialWork,
  type MediaType,
  type SocialContentType,
  MEDIA_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  MEDIA_TYPES,
  CONTENT_TYPES,
  getSocialWorks,
  type RepWork,
  type RepWorkStatus,
  type RepWorkComment,
  REP_WORK_STATUSES,
  REP_WORK_STATUS_LABELS,
  getRepWorks,
  createRepWork,
  updateRepWorkStatus,
  getRepWorkComments,
  addRepWorkComment,
  getCurrentUserId,
} from "@/modules/department/api/department-work.api";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

type DeptKey = "social" | "dash";

const overviewDepts: { key: DeptKey; name: string; en: string; tone: "success" | "warning" }[] = [
  { key: "social", name: "السوشيال ميديا", en: "Social Media", tone: "success" },
  { key: "dash", name: "المناديب", en: "Dash", tone: "warning" },
];

const tabs: { k: DeptKey; ar: string }[] = [
  { k: "social", ar: "السوشيال ميديا" },
  { k: "dash", ar: "المناديب / Dash" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "short" });
}

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
  const showToast = useToast();

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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [socialItems, setSocialItems] = useState<SocialWork[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);

  const [repWorks, setRepWorks] = useState<RepWork[]>([]);
  const [loadingRepWorks, setLoadingRepWorks] = useState(true);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId).catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingSocial(true);
    getSocialWorks()
      .then((d) => mounted && setSocialItems(d))
      .catch(() => showToast("error", "تعذر تحميل بيانات السوشيال ميديا"))
      .finally(() => mounted && setLoadingSocial(false));

    setLoadingRepWorks(true);
    getRepWorks()
      .then((d) => mounted && setRepWorks(d))
      .catch(() => showToast("error", "تعذر تحميل بيانات المناديب"))
      .finally(() => mounted && setLoadingRepWorks(false));

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = socialItems.reduce(
    (acc, it) => ({
      posts: acc.posts + (it.content_type === "post" || it.content_type === "carousel" ? 1 : 0),
      reels: acc.reels + (it.content_type === "reel" ? 1 : 0),
      stories: acc.stories + (it.content_type === "story" ? 1 : 0),
    }),
    { posts: 0, reels: 0, stories: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader title="شغل القسم" subtitle="متابعة أداء كل قسم وموظفيه أول بأول." />

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
            <div className={`grid size-11 place-items-center rounded-xl pill-${d.tone} transition-transform duration-200`}>
              <Building2 className="size-5" />
            </div>
            <div className="mt-3 text-base font-bold">{d.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {d.key === "social" ? `${totals.posts + totals.reels + totals.stories} عنصر` : `${repWorks.length} مندوب`}
            </div>
          </button>
        ))}
      </div>

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
        {activeDept === "social" && <SocialDetail items={socialItems} loading={loadingSocial} totals={totals} />}
        {activeDept === "dash" && (
          <DashDetail
            repWorks={repWorks}
            setRepWorks={setRepWorks}
            loading={loadingRepWorks}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Social detail — read-only overview for manager                     */
/* ------------------------------------------------------------------ */

function SocialDetail({
  items,
  loading,
  totals,
}: {
  items: SocialWork[];
  loading: boolean;
  totals: { posts: number; reels: number; stories: number };
}) {
  const showToast = useToast();
  const [platform, setPlatform] = useState<MediaType | "الكل">("الكل");
  const [contentType, setContentType] = useState<SocialContentType | "الكل">("الكل");

  const filtered = items.filter((it) => {
    const matchesPlatform = platform === "الكل" || it.media_type === platform;
    const matchesType = contentType === "الكل" || it.content_type === contentType;
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
        المنصة: MEDIA_TYPE_LABELS[it.media_type] ?? it.media_type,
        "نوع المحتوى": CONTENT_TYPE_LABELS[it.content_type] ?? it.content_type,
        التاريخ: formatDate(it.created_at),
        الرابط: it.link,
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
              onChange={(e) => setPlatform(e.target.value as MediaType | "الكل")}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="الكل">الكل</option>
              {MEDIA_TYPES.map((p) => (
                <option key={p} value={p}>
                  {MEDIA_TYPE_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as SocialContentType | "الكل")}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="الكل">الكل</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPE_LABELS[t]}
                </option>
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
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
                    </span>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">لا يوجد نتائج مطابقة للفلاتر</td></tr>
              )}
              {!loading &&
                filtered.map((it, i) => (
                  <tr
                    key={it.id}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className="row-in border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="py-3 font-semibold text-foreground">{MEDIA_TYPE_LABELS[it.media_type] ?? it.media_type}</td>
                    <td className="py-3 text-muted-foreground">{CONTENT_TYPE_LABELS[it.content_type] ?? it.content_type}</td>
                    <td className="py-3 tabular-nums text-muted-foreground">{formatDate(it.created_at)}</td>
                    <td className="py-3">
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" /> {it.link}
                      </a>
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
/*  Dash detail — representative_work                                   */
/* ------------------------------------------------------------------ */

function DashDetail({
  repWorks,
  setRepWorks,
  loading,
  currentUserId,
}: {
  repWorks: RepWork[];
  setRepWorks: (updater: (prev: RepWork[]) => RepWork[]) => void;
  loading: boolean;
  currentUserId: string | null;
}) {
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RepWorkStatus>("active");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, RepWorkComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  const list = repWorks.filter((d) => d.full_name.includes(query));

  const handleAdd = async () => {
    if (!name.trim()) {
      setFormError("اسم المندوب مطلوب");
      return;
    }
    if (!comment.trim()) {
      setFormError("الملاحظة الأولية مطلوبة");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await createRepWork({ full_name: name.trim(), status, comment: comment.trim() });
      const fresh = await getRepWorks();
      setRepWorks(() => fresh);
      setName("");
      setStatus("active");
      setComment("");
      setShowAddForm(false);
      showToast("success", `تم تسجيل المندوب ${name.trim()}`);
    } catch {
      showToast("error", "حصل خطأ أثناء تسجيل المندوب");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: RepWorkStatus) => {
    const prevStatus = repWorks.find((d) => d.id === id)?.status;
    setStatusUpdatingId(id);
    setRepWorks((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
    try {
      await updateRepWorkStatus(id, newStatus);
      showToast("success", "تم تحديث حالة المندوب");
    } catch {
      setRepWorks((prev) => prev.map((d) => (d.id === id && prevStatus ? { ...d, status: prevStatus } : d)));
      showToast("error", "تعذر تحديث الحالة — تقدر تعدّل بس اللي أنت أضفته");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleToggle = async (id: number) => {
    const willOpen = openId !== id;
    setOpenId(willOpen ? id : null);
    if (willOpen && !comments[id]) {
      setCommentsLoading((prev) => ({ ...prev, [id]: true }));
      try {
        const data = await getRepWorkComments(id);
        setComments((prev) => ({ ...prev, [id]: data }));
      } catch {
        showToast("error", "تعذر تحميل التعليقات");
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleAddComment = async (id: number) => {
    const text = commentDraft.trim();
    if (!text) {
      showToast("error", "اكتب تعليق الأول");
      return;
    }
    setCommentSending(true);
    try {
      await addRepWorkComment(id, text);
      setCommentDraft("");
      const data = await getRepWorkComments(id);
      setComments((prev) => ({ ...prev, [id]: data }));
      showToast("success", "تم إضافة التعليق");
    } catch {
      showToast("error", "تعذر إضافة التعليق");
    } finally {
      setCommentSending(false);
    }
  };

  const handleExport = () => {
    exportToExcel(
      "تقرير-المناديب",
      list.map((d) => ({ المندوب: d.full_name, الحالة: REP_WORK_STATUS_LABELS[d.status] ?? d.status }))
    );
    showToast("success", "تم تنزيل ملف الإكسل");
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="ابحث باسم المندوب..." />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="h-10 flex items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة مندوب
          </button>
          <button
            onClick={handleExport}
            className="h-10 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> تصدير Excel
          </button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6 fade-in">
          <h3 className="font-bold text-foreground mb-4">تسجيل مندوب جديد</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">اسم المندوب</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormError("");
                }}
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RepWorkStatus)}
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none"
              >
                {REP_WORK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REP_WORK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">ملاحظة أولية</label>
              <input
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setFormError("");
                }}
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-destructive mt-2">{formError}</p>}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ
          </button>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> قائمة المناديب
        </h3>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
          </p>
        ) : (
          <div className="space-y-2">
            {list.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد مناديب مطابقين للبحث</p>
            )}
            {list.map((d, i) => {
              const isOwner = currentUserId && d.created_by === currentUserId;
              const isOpen = openId === d.id;
              const c = comments[d.id] || [];
              return (
                <div
                  key={d.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="row-in rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground text-sm">{d.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <select
                          value={d.status}
                          disabled={statusUpdatingId === d.id}
                          onChange={(e) => handleStatusChange(d.id, e.target.value as RepWorkStatus)}
                          className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none transition-colors disabled:opacity-60
                            ${d.status === "active" ? "border-success/30 bg-success/10 text-success" :
                              d.status === "absent" ? "border-border bg-muted text-muted-foreground" :
                              "border-destructive/30 bg-destructive/10 text-destructive"}`}
                        >
                          {REP_WORK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {REP_WORK_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`h-9 grid place-items-center rounded-lg border px-2.5 text-xs font-semibold
                            ${d.status === "active" ? "border-success/30 bg-success/10 text-success" :
                              d.status === "absent" ? "border-border bg-muted text-muted-foreground" :
                              "border-destructive/30 bg-destructive/10 text-destructive"}`}
                        >
                          {REP_WORK_STATUS_LABELS[d.status]}
                        </span>
                      )}
                      <button
                        onClick={() => handleToggle(d.id)}
                        className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        تعليقات {c.length > 0 && `(${c.length})`}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      {commentsLoading[d.id] ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحميل...
                        </p>
                      ) : c.length === 0 ? (
                        <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>
                      ) : (
                        c.map((cm, idx) => (
                          <div key={cm.id ?? idx} className="bg-secondary/50 rounded-lg px-3 py-2">
                            {cm.created_at && (
                              <span className="text-xs text-muted-foreground block mb-0.5">
                                {formatDate(cm.created_at)}
                              </span>
                            )}
                            <p className="text-sm text-foreground">{String(cm.body ?? cm.content ?? "")}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(d.id)}
                          placeholder="اكتب تعليق..."
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleAddComment(d.id)}
                          disabled={commentSending}
                          className="bg-primary text-primary-foreground rounded-lg px-3 text-xs font-semibold hover:bg-primary-dark transition disabled:opacity-60"
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
        )}
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