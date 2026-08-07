// src/modules/attendance/api/attendance.api.ts
import { supabase } from "@/lib/supabase/client";
import type {
  AttendanceStatus,
  LeaveType,
  LeaveStatus as LeaveStatusFull,
} from "@/lib/attendance-labels";
import type { LeaveRequest } from "@/types/attendance";

// ============================================================
// Types
// ============================================================

/** صف من الـ view attendance_today (للمدير — كل موظفين اليوم) */
export type AttendanceTodayRow = {
  users_id: string;
  name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  // ⚠️ الدوك بيوصف الفورمات بتاعها كـ "text" مش public.attendance_type
  // مباشرة. لحد ما نتأكد من شكل القيمة الفعلية الراجعة (شغّل select('status') وشوف
  // النتيجة)، بنسيبها string عشان منكسرش لو رجعت حاجة غير متوقعة، وبنعمل
  // narrowing يدوي في mapTodayRowToRow في صفحة المدير.
  status: string | null;
};

/** صف من جدول attendance (سجل يوم واحد لموظف واحد) */
export type AttendanceRecord = {
  id: number;
  created_at: string;
  updated_at: string;
  users_id: string;
  late_minutes: number;
  total_work_minutes: number | null;
  status: AttendanceStatus; // public.attendance_type — القيم الإنجليزية الحقيقية
  check_in_at: string;
  check_out_at: string | null;
  attendance_date: string; // YYYY-MM-DD
};

export type MonthSummary = {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
};

/** ملخص الشركة كلها للشهر الحالي (لصفحة المدير) */
export type CompanyMonthSummary = {
  avgPresentDays: number;
  avgAbsentDays: number;
  compliancePct: number; // نسبة الالتزام = أيام الحضور من إجمالي السجلات
  totalWorkHours: number;
};

/** صف من جدول attendance_settings (إعدادات الحضور لكل فرع) */
export type AttendanceSettings = {
  id: number;
  created_at: string;
  updated_at: string;
  late_tolerance_minutes: number;
  // ⚠️ اختياري مؤقتًا: العمود ده لسه مش موجود فعليًا في جدول
  // attendance_settings عند الباك (PGRST204 - "Could not find the
  // 'notify_manager_on_late' column ... in the schema cache").
  // رجّعه Required (شيل الـ ?) لما الباك يأكد إضافة العمود ويعمل
  // reload للـ schema cache.
  notify_manager_on_late?: boolean;
  branch_id: number;
  effective_from: string; // YYYY-MM-DD
  effective_to: string | null; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  cutoff_time: string; // HH:MM:SS
};

export type AttendanceSettingsInput = {
  branch_id: number;
  late_tolerance_minutes: number;
  // ⚠️ نفس الملاحظة اللي فوق — اختياري مؤقتًا لحد ما الباك يضيف العمود.
  // طول ما الحقل مش موجود في الـ payload، مش هيتبعت في insert/update
  // خالص، فمش هيسبب PGRST204 تاني.
  notify_manager_on_late?: boolean;
  effective_from: string;
  effective_to?: string | null;
  start_time: string;
  end_time: string;
  cutoff_time: string;
};

/** حالة طلب الإجازة اللي المدير بيقدر يحطها عبر check_leave_status (public.leave_status) */
export type LeaveStatus = Extract<LeaveStatusFull, "accepted" | "rejected" | "cancelled">;

/** فلاتر سجل الحضور (مستخدمة في getAttendanceHistory) */
export type AttendanceHistoryFilters = {
  userId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  status?: string; // نص عام عشان نستقبل أي نوع status من فوق من غير تعارض types
  page?: number;
  pageSize?: number;
};

// ============================================================
// Helpers
// ============================================================

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("مفيش مستخدم مسجل دخول حاليًا");
  return data.user.id;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthRange(): { firstDay: string; lastDay: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { firstDay, lastDay };
}

// ============================================================
// Manager: كل موظفين اليوم (attendance_today view)
// filters.userIds اختياري — لو اتبعت، بنفلتر بيه، وإلا بنرجع الكل
// ============================================================

export async function getAttendanceToday(
  filters?: { userIds?: string[] }
): Promise<AttendanceTodayRow[]> {
  let query = supabase.from("attendance_today").select("*");

  if (filters?.userIds && filters.userIds.length > 0) {
    query = query.in("users_id", filters.userIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Manager: سجل الحضور لأي موظف (أو كل الموظفين) بفلاتر ورقم صفحة
// ⚠️ ده استعلام على جدول attendance مباشرة (مش view)، فيحترم RLS
// المطبقة على الجدول ده — لازم يكون عند المدير صلاحية قراءة سجلات
// غير سجلاته الشخصية.
// ============================================================

export async function getAttendanceHistory(
  filters: AttendanceHistoryFilters = {}
): Promise<{ data: AttendanceRecord[]; count: number }> {
  let query = supabase.from("attendance").select("*", { count: "exact" });

  if (filters.userId) query = query.eq("users_id", filters.userId);
  if (filters.from) query = query.gte("attendance_date", filters.from);
  if (filters.to) query = query.lte("attendance_date", filters.to);
  if (filters.status) query = query.eq("status", filters.status);

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await query
    .order("attendance_date", { ascending: false })
    .range(start, end);

  if (error) throw error;
  return { data: (data ?? []) as AttendanceRecord[], count: count ?? 0 };
}

// ============================================================
// Manager: ملخص الشركة كلها للشهر الحالي
// ============================================================

export async function getCompanyMonthSummary(): Promise<CompanyMonthSummary> {
  const { firstDay, lastDay } = currentMonthRange();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .gte("attendance_date", firstDay)
    .lte("attendance_date", lastDay);

  if (error) throw error;
  const rows = (data ?? []) as AttendanceRecord[];

  if (rows.length === 0) {
    return { avgPresentDays: 0, avgAbsentDays: 0, compliancePct: 0, totalWorkHours: 0 };
  }

  // نجمع لكل موظف عدد أيام الحضور/الغياب عشان نحسب المتوسط بشكل صحيح
  const byUser = new Map<string, { present: number; absent: number }>();
  let presentCount = 0;
  let totalMinutes = 0;

  for (const r of rows) {
    const entry = byUser.get(r.users_id) ?? { present: 0, absent: 0 };
    const attended = r.status === "present" || r.status === "late";
    if (attended) {
      entry.present += 1;
      presentCount += 1;
    } else if (r.status === "absent") {
      entry.absent += 1;
    }
    totalMinutes += r.total_work_minutes ?? 0;
    byUser.set(r.users_id, entry);
  }

  const employeeCount = byUser.size || 1;
  const totalPresent = Array.from(byUser.values()).reduce((s, v) => s + v.present, 0);
  const totalAbsent = Array.from(byUser.values()).reduce((s, v) => s + v.absent, 0);

  return {
    avgPresentDays: Math.round((totalPresent / employeeCount) * 10) / 10,
    avgAbsentDays: Math.round((totalAbsent / employeeCount) * 10) / 10,
    compliancePct: Math.round((presentCount / rows.length) * 100),
    totalWorkHours: Math.round(totalMinutes / 60),
  };
}

// ============================================================
// Employee: تسجيل حضور / انصراف (RPC)
// ============================================================

export async function checkIn(): Promise<unknown> {
  const { data, error } = await supabase.rpc("check_in");
  if (error) throw error;
  return data;
}

export async function checkOut(): Promise<unknown> {
  const { data, error } = await supabase.rpc("check_out");
  if (error) throw error;
  return data;
}

// ============================================================
// Employee: حالة اليوم بتاعي (عشان لو عملت refresh للصفحة)
// ============================================================

export async function getMyAttendanceToday(): Promise<AttendanceRecord | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .eq("attendance_date", todayISODate())
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================================
// Employee: سجل الحضور السابق
// ============================================================

export async function getMyAttendanceHistory(limit = 7): Promise<AttendanceRecord[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .neq("attendance_date", todayISODate())
    .order("attendance_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Employee: ملخص الشهر (أيام حضور / غياب / تأخير)
// ============================================================

export async function getMyMonthSummary(): Promise<MonthSummary> {
  const userId = await getCurrentUserId();
  const { firstDay, lastDay } = currentMonthRange();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .gte("attendance_date", firstDay)
    .lte("attendance_date", lastDay);

  if (error) throw error;
  const rows = (data ?? []) as AttendanceRecord[];

  return {
    presentDays: rows.filter((r) => r.status === "present").length,
    absentDays: rows.filter((r) => r.status === "absent").length,
    lateDays: rows.filter((r) => r.status === "late").length,
    totalDays: rows.length,
  };
}

// ============================================================
// Manager: إعدادات الحضور (attendance_settings) — CRUD كامل
// موثقة بالكامل في الدوك (select/insert/update/delete)
// ============================================================

export async function getAttendanceSettings(branchId?: number): Promise<AttendanceSettings[]> {
  let query = supabase
    .from("attendance_settings")
    .select("*")
    .order("effective_from", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createAttendanceSettings(
  payload: AttendanceSettingsInput
): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAttendanceSettings(
  id: number,
  patch: Partial<AttendanceSettingsInput>
): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttendanceSettings(id: number): Promise<void> {
  const { error } = await supabase.from("attendance_settings").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Employee: طلبات الإجازة (leave) — RPC فقط
// ⚠️ ملاحظة مهمة: الباك حاليًا مفيهوش جدول/view نقدر نقرا منه
// طلبات الإجازة (زي attendance_today بالنسبة للحضور). يعني مش
// هنقدر نعرض "طلباتي" أو "الطلبات المعلقة" بعد إعادة تحميل
// الصفحة لحد ما الباك يوفر endpoint قراءة (مثلاً جدول leaves).
// الدوال دي شغالة وبتتصل بالـ RPC الصح، بس الصفحة بتحتفظ
// بنتيجة الطلب محليًا في نفس الجلسة بس عشان تسمح بالتعديل/الإلغاء
// المباشر بعد الإرسال.
// ============================================================

export async function requestLeave(payload: {
  p_start_date: string;
  p_end_date: string;
  p_leave_type: LeaveType;
  p_reason: string;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc("request_leave", payload);
  if (error) throw error;
  return data;
}

export async function updateLeave(payload: {
  p_leave_id: number;
  p_start_date: string;
  p_end_date: string;
  p_reason: string;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc("update_leave", payload);
  if (error) throw error;
  return data;
}

export async function deleteLeave(p_leave_id: number): Promise<unknown> {
  const { data, error } = await supabase.rpc("delete_leave", { p_leave_id });
  if (error) throw error;
  return data;
}

export async function endLeaveEarly(p_leave_id: number): Promise<unknown> {
  const { data, error } = await supabase.rpc("end_leave_early", { p_leave_id });
  if (error) throw error;
  return data;
}

// ============================================================
// Manager: قراءة طلبات الإجازة — ⚠️ [محلي/Mock — لسه مش متاح فعليًا]
// مفيش جدول أو view في الباك دلوقتي نقدر نقرا منه طلبات الإجازة.
// الدالة دي موجودة بس عشان تفضل الأنواع (types) متوافقة مع الـ hook
// اللي بيستخدمها؛ بترمي خطأ واضح لحد ما الباك يوفر endpoint حقيقي
// (مثلاً جدول public.leaves أو view leave_requests). لما يتوفر،
// استبدل جسم الدالة بنداء select حقيقي زي getAttendanceHistory فوق.
// ============================================================

export async function getLeaveRequests(_filters: {
  userId?: string;
  status?: string;
}): Promise<LeaveRequest[]> {
  throw new Error("قراءة طلبات الإجازة مش متاحة من الباك لسه");
}

// ============================================================
// Manager: الموافقة/الرفض على طلب إجازة
// ⚠️ محتاجة p_leave_id — لسه معندناش endpoint لعرض قائمة
// الطلبات المعلقة، فالمدير محتاج يعرف رقم الطلب من مصدر تاني
// (زي الإشعارات) لحد ما نضيف جدول/view قراءة حقيقي.
// ============================================================

export async function checkLeaveStatus(payload: {
  p_leave_id: number;
  p_new_status: LeaveStatus;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc("check_leave_status", payload);
  if (error) throw error;
  return data;
}