// src/modules/attendance/api/attendance.api.ts
import { supabase } from "@/lib/supabase/client";

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
  status: string; // "حاضر" | "متأخر" | "غائب" | "إجازة" (public.attendance_type)
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
// ============================================================

export async function getAttendanceToday(): Promise<AttendanceTodayRow[]> {
  const { data, error } = await supabase.from("attendance_today").select("*");
  if (error) throw error;
  return data ?? [];
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
    const attended = r.status === "حاضر" || r.status === "متأخر";
    if (attended) {
      entry.present += 1;
      presentCount += 1;
    } else if (r.status === "غائب") {
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
  const rows = data ?? [];

  return {
    presentDays: rows.filter((r) => r.status === "حاضر").length,
    absentDays: rows.filter((r) => r.status === "غائب").length,
    lateDays: rows.filter((r) => r.status === "متأخر").length,
    totalDays: rows.length,
  };
}