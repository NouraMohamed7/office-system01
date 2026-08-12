"use client";

// src/app/manager/announcements/page.tsx
//
// قائمة الأقسام بتتجاب من جدول department (مش هارد كودد).
// "كل الموظفين" = department_id = null.
// النشر والحذف بيحصل فعليًا على جدول announcements.
// عمود "المشاهدات" بيجيب العدد الحقيقي من announcement_seen.
// realtime: أي تعديل (من أي جهاز/مستخدم مدير تاني) بيحدّث القائمة فورًا.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { Plus, Megaphone, Users, Building2, Eye, Trash2, Loader2 } from "lucide-react";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getDepartments,
  getAnnouncementViewsMap,
  subscribeAnnouncements,
  type AnnouncementRow,
  type DepartmentRow,
} from "@/modules/announcements/api/announcements.api";
import { useToast } from "@/components/toast";

const ALL_EMPLOYEES_VALUE = "all"; // يمثل department_id = null في الفورم

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

// نلوّن حسب كون الإعلان عام أو لقسم محدد
function toneFor(departmentId: number | null): "primary" | "success" {
  return departmentId === null ? "success" : "primary";
}

export default function AnnouncementsPage() {
  const showToast = useToast();

  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [viewsMap, setViewsMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string>(ALL_EMPLOYEES_VALUE);
  const [publishing, setPublishing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of departments) map.set(d.id, d.name);
    return map;
  }, [departments]);

  const loadAll = useCallback(async () => {
    try {
      const [rows, deps] = await Promise.all([getAnnouncements(), getDepartments()]);
      setAnnouncements(rows);
      setDepartments(deps);

      const views = await getAnnouncementViewsMap(rows.map((r) => r.id));
      setViewsMap(views);
    } catch (err) {
      console.error(err);
      showToast("error", "تعذر تحميل الإعلانات");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount + realtime subscribe، الـ setState بيحصل جوه دالة async بعد await
    loadAll();
    const unsubscribe = subscribeAnnouncements(() => loadAll());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...announcements].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [announcements]
  );

  const stats = useMemo(() => {
    const total = announcements.length;
    const now = new Date();
    const thisMonth = announcements.filter((a) => {
      const d = new Date(a.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const forAll = announcements.filter((a) => a.department_id === null).length;
    const forSpecific = total - forAll;
    return { total, thisMonth, forAll, forSpecific };
  }, [announcements]);

  function resetForm() {
    setTitle("");
    setBody("");
    setAudience(ALL_EMPLOYEES_VALUE);
  }

  async function publish() {
    if (!title.trim() || publishing) return;
    setPublishing(true);
    try {
      const department_id = audience === ALL_EMPLOYEES_VALUE ? null : Number(audience);
      await createAnnouncement({
        title: title.trim(),
        details: body.trim(),
        department_id,
      });
      showToast("success", "تم نشر الإعلان بنجاح");
      resetForm();
      setOpen(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("error", "حدث خطأ أثناء نشر الإعلان");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast("success", "تم حذف الإعلان");
    } catch (err) {
      console.error(err);
      showToast("error", "تعذر حذف الإعلان");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpand(a: AnnouncementRow) {
    setExpandedId((prev) => (prev === a.id ? null : a.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإعلانات"
        subtitle="إرسال ومتابعة إعلانات الشركة لكل الموظفين أو أقسام محددة."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:bg-primary-dark"
          >
            <Plus className="size-4" /> إعلان جديد
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="إجمالي الإعلانات" value={String(stats.total)} icon={Megaphone} tone="primary" />
        <StatCard dense label="هذا الشهر" value={String(stats.thisMonth)} tone="teal" />
        <StatCard dense label="لكل الموظفين" value={String(stats.forAll)} icon={Users} tone="success" />
        <StatCard dense label="لأقسام محددة" value={String(stats.forSpecific)} icon={Building2} tone="warning" />
      </div>

      <Card className="p-0! overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري التحميل...
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">لا توجد إعلانات بعد</div>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((a) => {
              const isGeneral = a.department_id === null;
              const audienceLabel = isGeneral
                ? "كل الموظفين"
                : departmentNameById.get(a.department_id!) ?? "قسم غير معروف";

              return (
                <li key={a.id} className="group">
                  <div
                    onClick={() => toggleExpand(a)}
                    className="row-hover flex flex-wrap items-center gap-4 p-4 hover:row-hover-active cursor-pointer"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl pill-primary">
                      <Megaphone className="size-5" />
                    </div>
                    <div className="min-w-55 flex-1">
                      <div className="font-semibold">{a.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {audienceLabel} · {timeAgo(a.created_at)}
                      </div>
                    </div>
                    <Pill tone={toneFor(a.department_id) === "success" ? "success" : "primary"}>
                      {isGeneral ? "عام" : "قسم محدد"}
                    </Pill>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Eye className="size-3.5" /> {viewsMap[a.id] ?? 0}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(a.id);
                      }}
                      disabled={deletingId === a.id}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition disabled:opacity-60"
                      title="حذف الإعلان"
                    >
                      {deletingId === a.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                  {expandedId === a.id && a.details && (
                    <div className="px-4 pb-4 pe-19">
                      <div className="rounded-xl bg-accent/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {a.details}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            if (publishing) return;
            setOpen(false);
            resetForm();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-warm-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">إعلان جديد</h3>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">عنوان الإعلان</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  placeholder="مثال: اجتماع الفريق غدًا"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">نص الإعلان</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                  placeholder="تفاصيل الإعلان..."
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">الجمهور المستهدف</span>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                >
                  <option value={ALL_EMPLOYEES_VALUE}>كل الموظفين</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  if (publishing) return;
                  setOpen(false);
                  resetForm();
                }}
                disabled={publishing}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                onClick={publish}
                disabled={!title.trim() || publishing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing && <Loader2 className="size-4 animate-spin" />}
                نشر الإعلان
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}