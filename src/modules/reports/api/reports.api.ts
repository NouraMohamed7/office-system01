// src/modules/reports/api/reports.api.ts
import { supabase } from "@/lib/supabase/client";

// ==========================================================
// Types
// ==========================================================

/**
 * قبل ما يتم مراجعة التقرير من المدير. افترضت "pending" هنا.
 */
export type ReportBackendStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "edit_requested";

export interface DailyReportToday {
  users_id: string;
  name: string;
  report_id: number | null;
  goal: string | null;
  issue: string | null;
  need: string | null;
  completion_percent: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: ReportBackendStatus | null;
}

export interface DailyReportHistory {
  id: number;
  users_id: string;
  report_date: string;
  goal: string;
  need: string | null;
  issue: string | null;
  completion_percent: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  status: ReportBackendStatus | null;
}

export interface SubmitDailyReportPayload {
  goal: string;
  issue: string;
  need: string;
  completion_percent: number;
}

export interface ReviewDailyReportPayload {
  reportId: number;
  status: "accepted" | "rejected" | "edit_requested";
  comment?: string;
}

// ==========================================================
// Status mapping (مصدر وحيد للحقيقة يستخدمه بورتال المدير والموظف)
// ==========================================================

export const STATUS_LABELS: Record<ReportBackendStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "معتمد",
  rejected: "مرفوض",
  edit_requested: "تحتاج مراجعة",
};

export const STATUS_TONE: Record<
  ReportBackendStatus,
  "success" | "warning" | "danger" | "muted"
> = {
  pending: "muted",
  accepted: "success",
  rejected: "danger",
  edit_requested: "warning",
};

// ==========================================================
// Employee side
// ==========================================================

/** الموظف بيبعت تقرير اليوم */
export async function submitDailyReport(payload: SubmitDailyReportPayload) {
  const { data, error } = await supabase.rpc("submit_daily_report", {
    p_goal: payload.goal,
    p_issue: payload.issue,
    p_need: payload.need,
    p_completion_percent: payload.completion_percent,
  });
  if (error) throw error;
  return data;
}

/** تاريخ تقارير الموظف الحالي (كل الأيام) */
export async function getMyDailyReports(
  userId: string
): Promise<DailyReportHistory[]> {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("users_id", userId)
    .order("report_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** تقرير اليوم بس للموظف الحالي (لو موجود) */
export async function getMyTodayReport(
  userId: string
): Promise<DailyReportToday | null> {
  const { data, error } = await supabase
    .from("daily_reports_today")
    .select("*")
    .eq("users_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ==========================================================
// Manager side
// ==========================================================

/** كل تقارير اليوم لكل الموظفين (اللي المدير بيراجعهم) */
export async function getTodayReportsForManager(): Promise<DailyReportToday[]>{
  const { data, error } = await supabase
    .from("daily_reports_today")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** تاريخ التقارير لكل الموظفين، مع فلاتر اختيارية */
export async function getReportsHistoryForManager(filters?: {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  userId?: string;
}): Promise<DailyReportHistory[]> {
  let query = supabase
    .from("daily_reports")
    .select("*")
    .order("report_date", { ascending: false });

  if (filters?.from) query = query.gte("report_date", filters.from);
  if (filters?.to) query = query.lte("report_date", filters.to);
  if (filters?.userId) query = query.eq("users_id", filters.userId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** المدير يعتمد / يرفض / يطلب تعديل */
export async function reviewDailyReport(payload: ReviewDailyReportPayload) {
  const { data, error } = await supabase.rpc("review_daily_report", {
    p_report_id: payload.reportId,
    p_status: payload.status,
    p_comment: payload.comment ?? null,
  });
  if (error) throw error;
  return data;
}

// ==========================================================
// Realtime
// ==========================================================

/** اشتراك لايف على أي تغيير في جدول daily_reports (يفيد بورتال المدير) */
export function subscribeToDailyReports(onChange: () => void) {
  const channel = supabase
    .channel("daily-reports-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "daily_reports" },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================================
// Comments (ملاحظة المدير على التقرير)
// ==========================================================
// TODO: الدوكيومنتيشن معرفتش نوع (comment_type) اللي بيتحفظ بيه تعليق
// المراجعة على daily_reports. لما تتأكدي من القيمة (مثلاً "daily_report")
// فعّلي سطر eq("type", ...) تحت.

export async function getReportComments(reportId: number) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("attachable_id", reportId)
    // .eq("type", "daily_report")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
// ==========================================================
// Helpers: ربط اسم الموظف بالتقارير التاريخية
// daily_reports (التاريخي) معندهوش عمود name زي daily_reports_today،
// فبنجيبه من users_with_email ونعمل merge يدوي.
// ==========================================================

export interface DailyReportHistoryWithName extends DailyReportHistory {
  name: string;
}

type UserNameRow = {
  id: string;
  name: string | null;
};

export async function getUsersNameMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("users_with_email").select("id,name");
  if (error) throw error;
  const map: Record<string, string> = {};
  ((data ?? []) as UserNameRow[]).forEach((u) => {
    if (u.id) map[u.id] = u.name ?? "—";
  });
  return map;
}

/** نفس getReportsHistoryForManager بس مع اسم الموظف مدموج فيها */
export async function getReportsHistoryWithNames(filters?: {
  from?: string;
  to?: string;
  userId?: string;
}): Promise<DailyReportHistoryWithName[]> {
  const [reports, nameMap] = await Promise.all([
    getReportsHistoryForManager(filters),
    getUsersNameMap(),
  ]);
  return reports.map((r) => ({ ...r, name: nameMap[r.users_id] ?? "موظف غير معروف" }));
}