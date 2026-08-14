import { supabase } from "@/lib/supabase/client";

/* ==========================================================================
   EMPLOYEE DASHBOARD
   ========================================================================== */

export type DashboardStats = {
  newTasksCount: number;
  completedTasksCount: number;
  targetPercent: number;
  unreadNotificationsCount: number;
};

export type AttendanceTodayRow = {
  users_id: string;
  name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  status: string | null;
};

export type DailyReportTodayRow = {
  report_id: number;
  goal: string;
  issue: string | null;
  need: string | null;
  completion_percent: number | null;
  status: string | null;
};

export type ActivityItem = {
  id: string;
  message: string;
  time: string;
  tone: "success" | "primary" | "teal" | "warning" | "destructive";
};

// بداية اليوم بتوقيت المحلي (نفس منطق toDateOnlyString تحت — محتفظين
// بالدالة دي منفصلة لإنها بترجع ISO timestamp كامل مش date-only string،
// ومستخدمة في queries بتفلتر على created_at/timestamp columns)
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  if (!userId) throw new Error("getDashboardStats: userId is required");

  const [newTasksRes, completedTasksRes, perfRes, notifRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .gte("created_at", startOfTodayISO()),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .eq("status", "completed"),
    supabase
      .from("performance_points_summary")
      .select("percent")
      .eq("users_id", userId)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("users_id", userId)
      .eq("is_read", false),
  ]);

  if (newTasksRes.error) throw newTasksRes.error;
  if (completedTasksRes.error) throw completedTasksRes.error;
  if (perfRes.error) throw perfRes.error;
  if (notifRes.error) throw notifRes.error;

  return {
    newTasksCount: newTasksRes.count ?? 0,
    completedTasksCount: completedTasksRes.count ?? 0,
    targetPercent: Number(perfRes.data?.percent ?? 0),
    unreadNotificationsCount: notifRes.count ?? 0,
  };
}

export async function getAttendanceToday(userId: string): Promise<AttendanceTodayRow | null> {
  if (!userId) throw new Error("getAttendanceToday: userId is required");

  const { data, error } = await supabase
    .from("attendance_today")
    .select("*")
    .eq("users_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceTodayRow | null;
}

export async function getDailyReportToday(userId: string): Promise<DailyReportTodayRow | null> {
  if (!userId) throw new Error("getDailyReportToday: userId is required");

  const { data, error } = await supabase
    .from("daily_reports_today")
    .select("*")
    .eq("users_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as DailyReportTodayRow | null;
}

export async function checkIn() {
  const { data, error } = await supabase.rpc("check_in");
  if (error) throw error;
  return data;
}

export async function getRecentNotifications(userId: string, limit = 6): Promise<ActivityItem[]> {
  if (!userId) throw new Error("getRecentNotifications: userId is required");

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, created_at")
    .eq("users_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const toneByType: Record<string, ActivityItem["tone"]> = {
    task: "primary",
    report: "teal",
    attendance: "warning",
    cash: "success",
    system: "primary",
  };

  return (data ?? []).map((n) => ({
    id: n.id,
    message: n.title,
    time: n.created_at,
    tone: toneByType[n.type] ?? "primary",
  }));
}

// ⚠️ اسم الـ channel هنا لازم يكون مختلف عن اللي في
// modules/notifications/api/notifications.api.ts (اللي بيستخدمه NotificationsBell).
// لو الاسمين اتساووا، Supabase بيرجّع نفس الـ channel object لأي حد يعمل
// .channel() بنفس الاسم، وأي .on() تاني عليه بعد ما اتعمله subscribe()
// قبل كده بيرمي uncaught error وبيكسر الصفحة كلها (ده كان سبب "This page
// couldn't load" في صفحة الموظف). فالحل: namespace مختلف لكل مستهلك.
export function subscribeToNotifications(userId: string, onChange: () => void) {
  if (!userId) {
    // مفيش user لسه (لسه بيتحمل) — رجّع no-op unsubscribe بدل ما نكسر الاشتراك
    return () => {};
  }

  const channel = supabase
    .channel(`notifications-dashboard-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `users_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// عدد الإشعارات الغير مقروءة بس — أخف من getDashboardStats اللي بتجيب
// حاجات تانية (tasks, performance) مش محتاجينها هنا (مستخدمة في الـ topbar/sidebar)
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  if (!userId) throw new Error("getUnreadNotificationsCount: userId is required");

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("users_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

// ⚠️ تحديث is_read مباشر على الجدول (مفيش RPC موثّق لتعليم إشعار كمقروء).
// لازم تتأكدي إن RLS policy عندك بتسمح للمستخدم يعدّل is_read بس على
// صفوفه هو (فلترة .eq("users_id", userId) هنا بس دفاع إضافي من الفرونت،
// مش بديل عن الـ RLS الحقيقي على الباك).
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  if (!notificationId) throw new Error("markNotificationRead: notificationId is required");
  if (!userId) throw new Error("markNotificationRead: userId is required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("users_id", userId);

  if (error) throw error;
}

/* ==========================================================================
   MANAGER DASHBOARD
   ========================================================================== */

export type ManagerEmployeeStats = {
  total: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
};

export type ManagerReportsStats = {
  totalToday: number;
  received: number;
  notSent: number;
  needsReview: number;
};

export type ManagerFilesStats = {
  pending: number;
  accepted: number;
  rejected: number;
  editRequested: number;
};

export type ManagerComplaintsStats = {
  newCount: number;
  inProcessing: number;
  done: number;
};

export type ManagerRepresentativesStats = {
  total: number;
  active: number;
  absent: number;
  violation: number;
};

export type ManagerCashStats = {
  todayExpenses: number;
  weekExpenses: number;
  monthExpenses: number;
  totalTransactions: number;
};

export type ManagerDashboardData = {
  employees: ManagerEmployeeStats;
  reports: ManagerReportsStats;
  files: ManagerFilesStats;
  complaints: ManagerComplaintsStats;
  representatives: ManagerRepresentativesStats;
  cash: ManagerCashStats;
};

// IMPORTANT: build the YYYY-MM-DD string from LOCAL date parts, not
// toISOString() (which converts to UTC first and can shift the date by a
// day around midnight in timezones ahead of UTC, e.g. Egypt).
function toDateOnlyString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateISO() {
  return toDateOnlyString(new Date());
}

function startOfWeekDateISO() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday as week start
  return toDateOnlyString(d);
}

function startOfMonthDateISO() {
  const d = new Date();
  d.setDate(1);
  return toDateOnlyString(d);
}

async function getManagerEmployeeStats(): Promise<ManagerEmployeeStats> {
  const [totalRes, presentRes, lateRes, absentRes, onLeaveRes] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).neq("emp_status", "resigned"),
    supabase.from("attendance_today").select("users_id", { count: "exact", head: true }).eq("status", "present"),
    supabase.from("attendance_today").select("users_id", { count: "exact", head: true }).eq("status", "late"),
    supabase.from("attendance_today").select("users_id", { count: "exact", head: true }).eq("status", "absent"),
    supabase.from("attendance_today").select("users_id", { count: "exact", head: true }).eq("status", "on_leave"),
  ]);

  for (const r of [totalRes, presentRes, lateRes, absentRes, onLeaveRes]) {
    if (r.error) throw r.error;
  }

  return {
    total: totalRes.count ?? 0,
    present: presentRes.count ?? 0,
    late: lateRes.count ?? 0,
    absent: absentRes.count ?? 0,
    onLeave: onLeaveRes.count ?? 0,
  };
}

// ✅ محدّثة: notSent بقت query مباشر بـ status = 'unsent' (القيمة دي مؤكدة
// موجودة في enum report_type) بدل الحساب بالطرح (totalToday - received)
// اللي كان ممكن ياخد فرق لو فيه صفوف بحالة تانية (accepted/rejected/edit_requested)
// مش received فعليًا ومش unsent كمان.
async function getManagerReportsStats(): Promise<ManagerReportsStats> {
  const [totalRes, receivedRes, notSentRes, needsReviewRes] = await Promise.all([
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }),
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }).not("report_id", "is", null),
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }).eq("status", "unsent"),
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  for (const r of [totalRes, receivedRes, notSentRes, needsReviewRes]) {
    if (r.error) throw r.error;
  }

  return {
    totalToday: totalRes.count ?? 0,
    received: receivedRes.count ?? 0,
    notSent: notSentRes.count ?? 0,
    needsReview: needsReviewRes.count ?? 0,
  };
}

export async function getManagerFilesStats(): Promise<ManagerFilesStats> {
  const [pendingRes, acceptedRes, rejectedRes, editRequestedRes] = await Promise.all([
    supabase.from("files_approval").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("files_approval").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("files_approval").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("files_approval").select("id", { count: "exact", head: true }).eq("status", "edit_requested"),
  ]);

  for (const r of [pendingRes, acceptedRes, rejectedRes, editRequestedRes]) {
    if (r.error) throw r.error;
  }

  return {
    pending: pendingRes.count ?? 0,
    accepted: acceptedRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    editRequested: editRequestedRes.count ?? 0,
  };
}

async function getManagerComplaintsStats(): Promise<ManagerComplaintsStats> {
  const [newRes, inProcessingRes, doneRes] = await Promise.all([
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "in_processing"),
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "done"),
  ]);

  for (const r of [newRes, inProcessingRes, doneRes]) {
    if (r.error) throw r.error;
  }

  return {
    newCount: newRes.count ?? 0,
    inProcessing: inProcessingRes.count ?? 0,
    done: doneRes.count ?? 0,
  };
}

// NOTE: `representatives` has no status column, so counts below come from
// `representative_work` (active/absent/violation — enum rep_work_type مؤكد
// من الداتابيز)، scoped to today's entries.
// Remove the `.gte("created_at", ...)` filters below if you want all-time totals instead.
async function getManagerRepresentativesStats(): Promise<ManagerRepresentativesStats> {
  const todayStart = startOfTodayISO();

  const [totalRes, activeRes, absentRes, violationRes] = await Promise.all([
    supabase.from("representatives").select("id", { count: "exact", head: true }),
    supabase
      .from("representative_work")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", todayStart),
    supabase
      .from("representative_work")
      .select("id", { count: "exact", head: true })
      .eq("status", "absent")
      .gte("created_at", todayStart),
    supabase
      .from("representative_work")
      .select("id", { count: "exact", head: true })
      .eq("status", "violation")
      .gte("created_at", todayStart),
  ]);

  for (const r of [totalRes, activeRes, absentRes, violationRes]) {
    if (r.error) throw r.error;
  }

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    absent: absentRes.count ?? 0,
    violation: violationRes.count ?? 0,
  };
}

// NOTE: sums are computed client-side from raw rows (no documented shape for
// the get_cash_summary RPC). Fine for moderate row counts; switch to the RPC
// once you confirm its return shape.
async function getManagerCashStats(): Promise<ManagerCashStats> {
  const today = todayDateISO();
  const weekStart = startOfWeekDateISO();
  const monthStart = startOfMonthDateISO();

  const [todayRes, weekRes, monthRes, countRes] = await Promise.all([
    supabase.from("cash").select("value").eq("type", "expenses").eq("date", today),
    supabase.from("cash").select("value").eq("type", "expenses").gte("date", weekStart),
    supabase.from("cash").select("value").eq("type", "expenses").gte("date", monthStart),
    supabase.from("cash").select("id", { count: "exact", head: true }),
  ]);

  for (const r of [todayRes, weekRes, monthRes, countRes]) {
    if (r.error) throw r.error;
  }

  const sum = (rows: { value: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.value), 0);

  return {
    todayExpenses: sum(todayRes.data),
    weekExpenses: sum(weekRes.data),
    monthExpenses: sum(monthRes.data),
    totalTransactions: countRes.count ?? 0,
  };
}

export async function getManagerDashboardData(): Promise<ManagerDashboardData> {
  const [employees, reports, files, complaints, representatives, cash] = await Promise.all([
    getManagerEmployeeStats(),
    getManagerReportsStats(),
    getManagerFilesStats(),
    getManagerComplaintsStats(),
    getManagerRepresentativesStats(),
    getManagerCashStats(),
  ]);

  return { employees, reports, files, complaints, representatives, cash };
}