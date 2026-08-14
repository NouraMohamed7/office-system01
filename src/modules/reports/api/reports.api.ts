// src/modules/reports/api/reports.api.ts
import { supabase } from "@/lib/supabase/client";

// ==========================================================
// Types
// ==========================================================

/**
 * ✅ الفيكس: "unsent" كانت ناقصة من النوع ده تمامًا رغم إنها قيمة enum
 * حقيقية ومؤكدة من الباك (public.report_type: pending, accepted, rejected,
 * edit_requested, unsent). ده كان يعني إن أي تقرير برجع بالحالة دي من
 * daily_reports (خصوصًا الصفوف اللي بيحطها الكرون اليومي لما موظف ميبعتش
 * تقرير) كان بيدوّر على STATUS_LABELS["unsent"]/STATUS_TONE["unsent"]
 * ويلاقيهم undefined — يعني الحالة كانت بتختفي من الجدول بصمت (Issue 2).
 */
export type ReportBackendStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "edit_requested"
  | "unsent";

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

/** تعليق/ملاحظة على تقرير يومي — من جدول comments بـ type = 'daily_reports' */
export interface ReportComment {
  id: number;
  created_at: string;
  updated_at: string;
  attachable_id: number;
  sender_id: string;
  body: string;
  type: string;
}

// ==========================================================
// Status mapping (مصدر وحيد للحقيقة يستخدمه بورتال المدير والموظف)
// ==========================================================

export const STATUS_LABELS: Record<ReportBackendStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "معتمد",
  rejected: "مرفوض",
  edit_requested: "تحتاج مراجعة",
  unsent: "لم يُرسل",
};

export const STATUS_TONE: Record < ReportBackendStatus,
  "success" | "warning" | "danger" | "muted"
> = {
  pending: "muted",
  accepted: "success",
  rejected: "danger",
  edit_requested: "warning",
  unsent: "danger",
};

// ==========================================================
// Employee side
// ==========================================================

/**
 * ✅ الفيكس (Issue 1): الصفحة كانت بتلف أي خطأ من الـ RPC برسالة عامة ثابتة
 * "حاول تاني" حتى لو الموظف بعت تقرير اليوم ده بالفعل (duplicate submission —
 * على الأغلب unique constraint على users_id + report_date في الباك).
 * الدالة دي بتفحص شكل الخطأ القادم من Postgres/الـ RPC وتترجمه لرسالة
 * مفهومة ("قد تم التسليم") لو كانت المشكلة تكرار الإرسال تحديدًا،
 * وترجع رسالة الباك الحقيقية (أو fallback عام) في أي حالة تانية.
 */
export function getSubmitDailyReportErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const code = (err as { code?: string })?.code;

  const isDuplicate =
    code === "23505" ||
    /duplicate key|unique constraint|already (exists|submitted)|مسبق|تم تسليم/i.test(message);

  if (isDuplicate) {
    return "قد تم التسليم — تقرير اليوم ده اتبعت بالفعل";
  }

  return message || "حصل خطأ أثناء إرسال التقرير، حاول تاني";
}

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

/** اشتراك لايف على أي تغيير في جدول daily_reports (يفيد بورتال المدير والموظف) */
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

/** نوع التعليق في جدول comments الخاص بتقارير اليوم — مؤكد من enum comment_type */
const COMMENT_TYPE_FOR_REPORT = "daily_reports";

/**
 * ✅ الفيكس (Issue 6): كان فيه TODO بيقول إن نوع التعليق (comment_type)
 * غير مؤكد فقفلنا الفلترة. اتأكدت القيمة فعليًا من enum comment_type في
 * الباك (tasks, files_approval, daily_reports, rep_works) — فبنفلتر بيها
 * دلوقتي عشان منجيبش تعليقات مهام أو ملفات تانية بالغلط لو attachable_id
 * اتصادف نفس الرقم في جدول تاني.
 */
export async function getReportComments(reportId: number): Promise<ReportComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("attachable_id", reportId)
    .eq("type", COMMENT_TYPE_FOR_REPORT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** اشتراك لايف على تعليقات تقرير معيّن */
export function subscribeToReportComments(reportId: number, onChange: () => void) {
  const channel = supabase
    .channel(`report-comments-${reportId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments", filter: `attachable_id=eq.${reportId}` },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
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

/** خريطة id -> اسم — مستخدمة لعرض أسماء الموظفين (المدير) وأسماء المعلّقين (الموظف) */
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