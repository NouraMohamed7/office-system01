"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { Plus, Megaphone, Users, Building2, Eye, Trash2 } from "lucide-react";

type Audience =
  | "كل الموظفين"
  | "قسم السوشيال ميديا"
  | "قسم الكول سنتر"
  | "قسم التسويق"
  | "قسم المبيعات"
  | "قسم التصميم";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  date: Date;
  views: number;
  tone: "primary" | "warning" | "success" | "teal";
};

const audiences: Audience[] = [
  "كل الموظفين",
  "قسم السوشيال ميديا",
  "قسم الكول سنتر",
  "قسم التسويق",
  "قسم المبيعات",
  "قسم التصميم",
];

const toneByAudience: Record<Audience, Announcement["tone"]> = {
  "كل الموظفين": "success",
  "قسم السوشيال ميديا": "primary",
  "قسم الكول سنتر": "teal",
  "قسم التسويق": "warning",
  "قسم المبيعات": "primary",
  "قسم التصميم": "teal",
};

function daysAgo(n: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function timeAgo(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

const initialAnnouncements: Announcement[] = [
  {
    id: "a1",
    title: "اجتماع فريق التسويق غدًا الساعة 11",
    body: "",
    audience: "قسم التسويق",
    date: daysAgo(0, new Date().getHours() - 1),
    views: 14,
    tone: "primary",
  },
  {
    id: "a2",
    title: "تحديث سياسة الحضور والانصراف",
    body: "",
    audience: "كل الموظفين",
    date: daysAgo(1),
    views: 128,
    tone: "warning",
  },
  {
    id: "a3",
    title: "إجازة رسمية يوم الخميس القادم",
    body: "",
    audience: "كل الموظفين",
    date: daysAgo(2),
    views: 140,
    tone: "success",
  },
  {
    id: "a4",
    title: "ورشة تدريبية لفريق الكول سنتر",
    body: "",
    audience: "قسم الكول سنتر",
    date: daysAgo(3),
    views: 32,
    tone: "teal",
  },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("كل الموظفين");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...announcements].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [announcements]
  );

  const stats = useMemo(() => {
    const total = announcements.length;
    const now = new Date();
    const thisMonth = announcements.filter(
      (a) => a.date.getMonth() === now.getMonth() && a.date.getFullYear() === now.getFullYear()
    ).length;
    const forAll = announcements.filter((a) => a.audience === "كل الموظفين").length;
    const forSpecific = total - forAll;
    return { total, thisMonth, forAll, forSpecific };
  }, [announcements]);

  function resetForm() {
    setTitle("");
    setBody("");
    setAudience("كل الموظفين");
  }

  function publish() {
    if (!title.trim()) return;
    const newAnnouncement: Announcement = {
      id: `a-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      audience,
      date: new Date(),
      views: 0,
      tone: toneByAudience[audience],
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    resetForm();
    setOpen(false);
  }

  function deleteAnnouncement(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function toggleExpand(a: Announcement) {
    setExpandedId((prev) => {
      const isOpening = prev !== a.id;
      if (isOpening) {
        // زيادة حقيقية لعدد المشاهدات عند فتح الإعلان لأول مرة في هذه الجلسة
        setAnnouncements((all) => all.map((x) => (x.id === a.id ? { ...x, views: x.views + 1 } : x)));
      }
      return isOpening ? a.id : null;
    });
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

      <Card className="!p-0 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">لا توجد إعلانات بعد</div>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((a) => (
              <li key={a.id} className="group">
                <div
                  onClick={() => toggleExpand(a)}
                  className="row-hover flex flex-wrap items-center gap-4 p-4 hover:row-hover-active cursor-pointer"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl pill-primary">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <div className="font-semibold">{a.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.audience} · {timeAgo(a.date)}
                    </div>
                  </div>
                  <Pill tone={a.tone === "success" ? "success" : a.tone === "warning" ? "warning" : "primary"}>
                    {a.audience === "كل الموظفين" ? "عام" : "قسم محدد"}
                  </Pill>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="size-3.5" /> {a.views}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnouncement(a.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                    title="حذف الإعلان"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {expandedId === a.id && a.body && (
                  <div className="px-4 pb-4 pe-[4.75rem]">
                    <div className="rounded-xl bg-accent/30 p-3 text-sm text-muted-foreground">{a.body}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
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
                  onChange={(e) => setAudience(e.target.value as Audience)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                >
                  {audiences.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                إلغاء
              </button>
              <button
                onClick={publish}
                disabled={!title.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                نشر الإعلان
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}