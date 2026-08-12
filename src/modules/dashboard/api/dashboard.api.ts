import { supabase } from "@/lib/supabase/client";

/* ==========================================================================
   EMPLOYEE DASHBOARD (existing — untouched)
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

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
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
  if (notifRes.error) throw notifRes.error;

  return {
    newTasksCount: newTasksRes.count ?? 0,
    completedTasksCount: completedTasksRes.count ?? 0,
    targetPercent: Number(perfRes.data?.percent ?? 0),
    unreadNotificationsCount: notifRes.count ?? 0,
  };
}

export async function getAttendanceToday(userId: string): Promise<AttendanceTodayRow | null> {
  const { data, error } = await supabase
    .from("attendance_today")
    .select("*")
    .eq("users_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceTodayRow | null;
}

export async function getDailyReportToday(userId: string): Promise<DailyReportTodayRow | null> {
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

export function subscribeToNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications-${userId}`)
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

/* ==========================================================================
   MANAGER DASHBOARD (new)
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

async function getManagerReportsStats(): Promise<ManagerReportsStats> {
  const [totalRes, receivedRes, needsReviewRes] = await Promise.all([
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }),
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }).not("report_id", "is", null),
    supabase.from("daily_reports_today").select("users_id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  for (const r of [totalRes, receivedRes, needsReviewRes]) {
    if (r.error) throw r.error;
  }

  const totalToday = totalRes.count ?? 0;
  const received = receivedRes.count ?? 0;

  return {
    totalToday,
    received,
    notSent: Math.max(0, totalToday - received),
    needsReview: needsReviewRes.count ?? 0,
  };
}

async function getManagerFilesStats(): Promise<ManagerFilesStats> {
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
// `representative_work` (active/absent/violation), scoped to today's entries.
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
// ============================================================
// أضيفي الكود ده في src/modules/dashboard/api/dashboard.api.ts
// (تحت subscribeToNotifications اللي موجودة عندك بالفعل — قبل قسم
// MANAGER DASHBOARD، أو بعده، مش فارقة، المهم يكون داخل نفس الملف
// عشان يستخدم نفس supabase import اللي فوق)
// ============================================================

// عدد الإشعارات الغير مقروءة بس — أخف من getDashboardStats اللي بتجيب
// حاجات تانية (tasks, performance) مش محتاجينها هنا (مستخدمة في الـ topbar)
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
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
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("users_id", userId);

  if (error) throw error;
}