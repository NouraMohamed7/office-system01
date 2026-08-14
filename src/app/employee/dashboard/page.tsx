"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getDashboardStats, getAttendanceToday, getDailyReportToday,
  getRecentNotifications, subscribeToNotifications,
  type DashboardStats, type ActivityItem,
} from "@/modules/dashboard/api/dashboard.api";
import {
  CheckCircle2, ClipboardList, Target, Bell, Check,
  Clock, FileText, Upload, LifeBuoy,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type ChecklistItem = { id: string; ar: string; done: boolean; source: "db" | "local" };

// ✅ فيكس: "تسجيل حضور" بقى بيودّي على صفحة الحضور (/employee/attendance)
// بدل ما يعمل check-in مباشرة من الداشبورد. السبب: الـ check-in فيه قيود
// من الباك (وقت العمل المسموح، حالة البريك، ...إلخ) وصفحة الحضور هي
// المكان اللي فيه كل السياق ده ظاهر للموظف (الوقت الحالي، رينج الدوام،
// حالة اليوم) قبل ما يضغط، فمينفعش يتفاجئ بإيرور تقني من غير سياق
// وهو لسه واقف في الداشبورد. كل الأزرار السريعة بقت من نوع "nav" واحد.
const QUICK_ACTIONS = [
  { icon: Clock, ar: "تسجيل حضور", kind: "nav" as const, href: "/employee/attendance" },
  { icon: FileText, ar: "إضافة تقرير", kind: "nav" as const, href: "/employee/reports" },
  { icon: Upload, ar: "رفع شيت", kind: "nav" as const, href: "/employee/uploads" },
  { icon: LifeBuoy, ar: "فتح شكوى", kind: "nav" as const, href: "/employee/complaints" },
];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

export default function Dashboard() {
  const showToast = useToast();
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useCurrentUser();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: "attendance", ar: "تسجيل الحضور", done: false, source: "db" },
    { id: "review_tasks", ar: "مراجعة المهام", done: false, source: "local" },
    { id: "daily_report", ar: "رفع التقرير اليومي", done: false, source: "db" },
    { id: "work_sheet", ar: "رفع شيت العمل", done: false, source: "local" },
  ]);
  const [loadingData, setLoadingData] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [statsRes, attendanceRes, reportRes, activityRes] = await Promise.all([
        getDashboardStats(user.id),
        getAttendanceToday(user.id),
        getDailyReportToday(user.id),
        getRecentNotifications(user.id),
      ]);

      setStats(statsRes);
      setActivities(activityRes);
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === "attendance") return { ...it, done: !!attendanceRes?.check_in_at };
          if (it.id === "daily_report") return { ...it, done: !!reportRes };
          return it;
        })
      );
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء تحميل بيانات الداشبورد");
    } finally {
      setLoadingData(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.id, () => {
      getRecentNotifications(user.id).then(setActivities).catch(console.error);
      getDashboardStats(user.id).then(setStats).catch(console.error);
    });
    return unsubscribe;
  }, [user]);

  const toggleLocal = (id: string) => {
    setItems((xs) => {
      const updated = xs.map((x) => (x.id === id && x.source === "local" ? { ...x, done: !x.done } : x));
      const target = updated.find((x) => x.id === id);
      if (target?.done) showToast("success", `تم إنجاز: ${target.ar}`);
      return updated;
    });
  };

  // ✅ فيكس: بسيطة دلوقتي — كل الأزرار السريعة بتعمل navigation بس، مفيش
  // أي API call مباشر (خصوصًا check-in) من الداشبورد.
  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    router.push(action.href);
  };

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("")
    : "؟";

  if (userLoading) {
    return (
      <PortalLayout title="الرئيسية" subtitle="نظرة سريعة على يومك">
        <div className="animate-pulse text-sm text-muted-foreground p-6">جاري التحميل...</div>
      </PortalLayout>
    );
  }

  if (userError || !user) {
    return (
      <PortalLayout title="الرئيسية" subtitle="نظرة سريعة على يومك">
        <Card className="p-6 text-sm text-destructive">
          تعذر تحميل بيانات المستخدم{userError ? `: ${userError}` : ""}
        </Card>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="الرئيسية" subtitle="نظرة سريعة على يومك">
      {/* Greeting */}
      <Card className="relative overflow-hidden p-6 mb-6 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent">
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-teal text-teal-foreground grid place-items-center text-xl font-bold shrink-0 ring-4 ring-card overflow-hidden">
            {user.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo_url} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{today}</div>
            <h2 className="text-2xl font-bold text-foreground">صباح الخير، {user.name || "..."} 👋</h2>
            <div className="text-sm text-muted-foreground">
              {[user.department_name, user.position_title, user.branch_country].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-primary font-semibold bg-primary/10 rounded-xl px-4 py-2">
            <Target className="h-4 w-4" /> نسبة إنجازك اليوم {stats?.targetPercent ?? 0}%
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="text-sm font-semibold text-muted-foreground mb-3">ملخص اليوم</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="المهام الجديدة" value={loadingData ? "—" : String(stats?.newTasksCount ?? 0)} tone="primary" />
        <StatCard icon={CheckCircle2} label="المهام المكتملة" value={loadingData ? "—" : String(stats?.completedTasksCount ?? 0)} tone="success" />
        <StatCard icon={Target} label="نسبة تحقيق التارجت" value={loadingData ? "—" : `${stats?.targetPercent ?? 0}%`} tone="primary" percent={stats?.targetPercent ?? 0} />
        <StatCard icon={Bell} label="الإشعارات الجديدة" value={loadingData ? "—" : String(stats?.unreadNotificationsCount ?? 0)} tone="teal" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">التشيك ليست اليومية</h3>
              <span className="text-xs text-muted-foreground">
                {items.filter((i) => i.done).length} / {items.length} مكتمل
              </span>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => it.source === "local" && toggleLocal(it.id)}
                  disabled={it.source === "db"}
                  title={it.source === "db" ? "بيتحدث تلقائيًا من بياناتك" : undefined}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right
                    ${it.done ? "bg-success/5 border-success/20" : "bg-background border-border hover:border-primary/30"}
                    ${it.source === "db" ? "cursor-default opacity-90" : ""}`}
                >
                  <div className={`h-6 w-6 rounded-lg grid place-items-center border-2 transition
                    ${it.done ? "bg-success border-success" : "border-muted-foreground/30"}`}>
                    {it.done && <Check className="h-4 w-4 text-success-foreground" />}
                  </div>
                  <span className={`text-sm font-medium ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {it.ar}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">أزرار سريعة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.ar}
                  onClick={() => handleQuickAction(q)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary transition disabled:opacity-50"
                >
                  <q.icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{q.ar}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">آخر الأنشطة</h3>
          <div className="relative space-y-4">
            <div className="absolute right-1.5 top-2 bottom-2 w-px bg-border" />
            {activities.length === 0 && !loadingData && (
              <div className="text-sm text-muted-foreground">لا يوجد نشاط حديث</div>
            )}
            {activities.map((a) => (
              <div key={a.id} className="relative flex gap-3 pr-6">
                <div className={`absolute right-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-card bg-${a.tone}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{a.message}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <div className="text-sm text-muted-foreground">
          <StatusPill tone="success">مكتملة</StatusPill>{" "}
          <StatusPill tone="warning">جاري التنفيذ</StatusPill>{" "}
          <StatusPill tone="danger">متأخرة</StatusPill>
        </div>
      </div>
    </PortalLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone, percent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone: "primary" | "success" | "teal" | "warning";
  percent?: number;
}) {
  const toneBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    teal: "bg-teal/10 text-teal",
    warning: "bg-warning/15 text-[oklch(0.48_0.11_82)]",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${toneBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof percent === "number" && (
          <div className="relative h-14 w-14">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${Math.min(percent, 100) * 0.94} 100`} className="text-primary" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-bold text-primary tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}