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
  status: AttendanceStatus; // public.attendance_type
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
  compliancePct: number;
  totalWorkHours: number;
};

/** صف من جدول attendance_settings (إعدادات الحضور لكل فرع) */
export type AttendanceSettings = {
  id: number;
  created_at: string;
  updated_at: string;
  late_tolerance_minutes: number;
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
  effective_from: string;
  effective_to?: string | null;
  start_time: string;
  end_time: string;
  cutoff_time: string;
};

/** حالة طلب الإجازة اللي المدير بيقدر يحطها عبر check_leave_status (public.leave_status) */
export type LeaveStatus = Extract<
  LeaveStatusFull,
  "accepted" | "rejected" | "cancelled"
>;

/** فلاتر سجل الحضور (مستخدمة في getAttendanceHistory) */
export type AttendanceHistoryFilters = {
  userId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  status?: string;
  page?: number;
  pageSize?: number;
};

/** صف من جدول breaks (استراحة واحدة مرتبطة بسجل حضور معين) */
export type BreakRecord = {
  id: number;
  created_at: string;
  updated_at: string;
  attendance_id: number;
  start_time: string;
  end_time: string | null;
  break_mins: number | null;
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
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { firstDay, lastDay };
}

/** دقايق البريك الفعلية لسجل واحد — بيفضّل break_mins الجاهز من الباك،
 *  ولو مش موجود (سجل قديم/edge case) بيحسبه من الفرق بين start/end. لو
 *  البريك لسه مفتوح (end_time = null) بيرجع null عشان نميّزه عن "صفر". */
function breakDurationMinutes(b: BreakRecord): number | null {
  if (b.break_mins !== null) return b.break_mins;
  if (!b.end_time) return null; // بريك لسه مفتوح
  const mins = Math.round(
    (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000,
  );
  return mins > 0 ? mins : 0;
}

/** بياخد أحدث سجل من مجموعة سجلات (بالمقارنة بـ check_in_at)، عشان نستخدمها
 *  في أي مكان محتاج "آخر سجل حضور" بدل ما نعتمد على الداتابيز ترجع صف واحد
 *  بالظبط (اللي مش مضمون، زي ما موثق في dedupedByUser بصفحة المدير). */
function pickLatestByCheckIn<T extends { check_in_at: string | null }>(
  rows: T[],
): T | null {
  if (rows.length === 0) return null;
  let latest = rows[0];
  for (const r of rows) {
    if ((r.check_in_at ?? "") >= (latest.check_in_at ?? "")) latest = r;
  }
  return latest;
}

// ============================================================
// Manager: كل موظفين اليوم (attendance_today view)
// ============================================================

export async function getAttendanceToday(filters?: {
  userIds?: string[];
}): Promise<AttendanceTodayRow[]> {
  let query = supabase.from("attendance_today").select("*");

  if (filters?.userIds && filters.userIds.length > 0) {
    query = query.in("users_id", filters.userIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Manager: سجلات جدول attendance الخام لليوم الحالي (فيها id)
// محتاجينها عشان نربط كل موظف بسجل الحضور بتاعه اليوم ده وبالتالي
// بجدول breaks (اللي بياخد attendance_id مش users_id).
// ============================================================

export async function getTodayAttendanceRecords(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("attendance_date", todayISODate());
  if (error) throw error;
  return (data ?? []) as AttendanceRecord[];
}

// ============================================================
// Manager: سجل الحضور لأي موظف (أو كل الموظفين) بفلاتر ورقم صفحة
// ============================================================

export async function getAttendanceHistory(
  filters: AttendanceHistoryFilters = {},
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
    return {
      avgPresentDays: 0,
      avgAbsentDays: 0,
      compliancePct: 0,
      totalWorkHours: 0,
    };
  }

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
  const totalPresent = Array.from(byUser.values()).reduce(
    (s, v) => s + v.present,
    0,
  );
  const totalAbsent = Array.from(byUser.values()).reduce(
    (s, v) => s + v.absent,
    0,
  );

  return {
    avgPresentDays: Math.round((totalPresent / employeeCount) * 10) / 10,
    avgAbsentDays: Math.round((totalAbsent / employeeCount) * 10) / 10,
    compliancePct: Math.round((presentCount / rows.length) * 100),
    totalWorkHours: Math.round(totalMinutes / 60),
  };
}
// ============================================================
// Employee: تسجيل حضور (RPC)
// ============================================================

export async function checkIn(): Promise<unknown> {
  const { data, error } = await supabase.rpc("check_in");
  if (error) throw error;
  return data;
}
// ============================================================
// Employee: حالة اليوم بتاعي
// ============================================================

// ✅ فيكس: كانت بتستخدم .maybeSingle() اللي بيرمي error (PGRST116) لو رجع
// أكتر من صف واحد لنفس اليوم — وده سيناريو معترف بيه وموثق فعليًا في نفس
// المشروع (نفس المشكلة موجودة ومتعالجة في صفحة المدير عبر dedupedByUser).
// لو حصل هنا، الاستثناء كان بيوقف تحميل الصفحة كلها ويوهم الموظف إن حالته
// "لم يسجل حضور" حتى لو هو بالفعل مسجل فعليًا. دلوقتي بنجيب كل صفوف اليوم
// ونرجّع الأحدث بالمقارنة بـ check_in_at، بدون أي افتراض إن الداتابيز
// هترجع صف واحد بالظبط.
export async function getMyAttendanceToday(): Promise<AttendanceRecord | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .eq("attendance_date", todayISODate());

  if (error) throw error;
  return pickLatestByCheckIn((data ?? []) as AttendanceRecord[]);
}

// ============================================================
// Employee: سجل الحضور السابق
// ============================================================

export async function getMyAttendanceHistory(
  limit = 7,
): Promise<AttendanceRecord[]> {
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

export async function getBreaksByAttendanceId(
  attendanceId: number,
): Promise<BreakRecord[]> {
  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .eq("attendance_id", attendanceId)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBreaksByAttendanceIds(
  attendanceIds: number[],
): Promise<BreakRecord[]> {
  if (attendanceIds.length === 0) return [];
  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .in("attendance_id", attendanceIds)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// دالة موجودة وشغالة — بترجع Map<attendance_id, إجمالي الدقايق> لكل سجلات
// الـ ids الممررة، بضمّ كل البريكات المرتبطة بكل سجل (مش بريك واحد بس).
export async function getBreaksSummaryByAttendanceIds(
  attendanceIds: number[],
): Promise<Map<number, number>> {
  const summary = new Map<number, number>();
  if (attendanceIds.length === 0) return summary;

  const breaks = await getBreaksByAttendanceIds(attendanceIds);

  for (const b of breaks) {
    const mins = breakDurationMinutes(b) ?? 0; // بريك مفتوح في سجل سابق (حالة نادرة) بيتحسب صفر بدل ما يكسر المجموع
    summary.set(b.attendance_id, (summary.get(b.attendance_id) ?? 0) + mins);
  }

  return summary;
}

export function subscribeToBreaks(onChange: () => void) {
  const channel = supabase
    .channel("breaks-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "breaks" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// Manager: إعدادات الحضور (attendance_settings) — CRUD كامل
// ============================================================

export async function getAttendanceSettings(
  branchId?: number,
): Promise<AttendanceSettings[]> {
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
  payload: AttendanceSettingsInput,
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
  patch: Partial<AttendanceSettingsInput>,
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
  const { error } = await supabase
    .from("attendance_settings")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================================
// Employee: طلبات الإجازة (leave) — RPC للكتابة
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
// قراءة طلبات الإجازة — جدول public.leaves
// ============================================================

export async function getLeaveRequests(
  filters: {
    userId?: string;
    status?: LeaveStatusFull;
  } = {},
): Promise<LeaveRequest[]> {
  let query = supabase
    .from("leaves")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.userId) query = query.eq("users_id", filters.userId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeaveRequest[];
}

/** طلبات إجازتي أنا بس (موظف) */
export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  const userId = await getCurrentUserId();
  return getLeaveRequests({ userId });
}

/** كل طلبات الإجازة (مدير) — ممكن تتفلتر بالحالة */
export async function getAllLeaveRequests(
  status?: LeaveStatusFull,
): Promise<LeaveRequest[]> {
  return getLeaveRequests(status ? { status } : {});
}

/** اشتراك لايف على أي تغيير في جدول leaves */
export function subscribeToLeaves(onChange: () => void) {
  const channel = supabase
    .channel("leaves-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leaves" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// Manager: الموافقة/الرفض على طلب إجازة
// ============================================================

export async function checkLeaveStatus(payload: {
  p_leave_id: number;
  p_new_status: LeaveStatus;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc("check_leave_status", payload);
  if (error) throw error;
  return data;
}
// ============================================================
// Employee: إعدادات الحضور الفعّالة لفرع الموظف الحالي (للتحقق قبل check-in)
// ============================================================

export async function getMyActiveAttendanceSettings(): Promise<AttendanceSettings | null> {
  const userId = await getCurrentUserId();

  // 1) هات branch_id بتاع الموظف من جدول users
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("branch_id")
    .eq("id", userId)
    .single();

  if (userErr) throw userErr;
  if (!userRow?.branch_id) return null;

  // 2) هات إعدادات الفرع الفعّالة النهاردة (effective_from <= اليوم <= effective_to أو effective_to = null)
  const today = todayISODate();
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("*")
    .eq("branch_id", userRow.branch_id)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================================
// Helpers جديدة للـ workaround
// ============================================================

async function getMyOpenAttendance(): Promise<{
  attendanceId: number;
  checkInAt: string;
} | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, check_in_at")
    .eq("users_id", userId)
    .eq("attendance_date", todayISODate());
  if (error) throw error;
  const latest = pickLatestByCheckIn(
    (data ?? []) as { id: number; check_in_at: string | null }[],
  );
  return latest
    ? { attendanceId: latest.id, checkInAt: latest.check_in_at! }
    : null;
}

// الباك بيرمي كود 42703 لما يحاول يستخدم عمود مش موجود (v_attendance_id) —
// ده باگ حقيقي جوه دالة SQL، مش حاجة نقدر نصلحها، بس نقدر نلفّ حولها.
function isBrokenRpcColumnError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "42703"
  );
}

// الباك بيرمي الرسالة دي لو فيه بريك مفتوح بالفعل — مش إيرور حقيقي بقدر ما هو
// desync بين حالة الفرونت والداتابيز (عادة بسبب end_break اللي فشل قبل كده
// وسابت البريك مفتوح).
function isAlreadyOnBreakError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { message?: string }).message === "string" &&
    (err as { message: string }).message.includes("استراحة قائمة بالفعل")
  );
}

async function getOpenBreak(attendanceId: number): Promise<BreakRecord | null> {
  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .eq("attendance_id", attendanceId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================================
// startBreak — مع sync + fallback
// ============================================================

export async function startBreak(): Promise<BreakRecord> {
  try {
    const { data, error } = await supabase.rpc("start_break");
    if (error) throw error;
    return data;
  } catch (err) {
    const info = await getMyOpenAttendance();
    if (!info) throw new Error("لم تقم بتسجيل الحضور اليوم بعد");

    // الحالة الأشيع: فيه بريك مفتوح فعلاً من قبل — منرميش إيرور، منرجّع نفس البريك
    if (isAlreadyOnBreakError(err)) {
      const openBreak = await getOpenBreak(info.attendanceId);
      if (openBreak) return openBreak;
    }

    // الـ RPC نفسها مكسورة (باگ SQL) — نعمل insert مباشر بدالها
    if (isBrokenRpcColumnError(err)) {
      const openBreak = await getOpenBreak(info.attendanceId);
      if (openBreak) return openBreak;

      const { data: inserted, error: insertErr } = await supabase
        .from("breaks")
        .insert({
          attendance_id: info.attendanceId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      return inserted;
    }

    throw err;
  }
}

// ============================================================
// endBreak — مع fallback مباشر لو الـ RPC مكسورة
// ============================================================

export async function endBreak(): Promise<BreakRecord> {
  try {
    const { data, error } = await supabase.rpc("end_break");
    if (error) throw error;
    return data;
  } catch (err) {
    if (!isBrokenRpcColumnError(err)) throw err;

    const info = await getMyOpenAttendance();
    if (!info) throw new Error("لم تقم بتسجيل الحضور اليوم بعد");

    const openBreak = await getOpenBreak(info.attendanceId);
    if (!openBreak) throw new Error("لا توجد استراحة قائمة لإنهائها");

    const endTime = new Date();
    const startTime = new Date(openBreak.start_time);
    const breakMins = Math.max(
      0,
      Math.round((endTime.getTime() - startTime.getTime()) / 60000),
    );

    const { data: updated, error: updateErr } = await supabase
      .from("breaks")
      .update({ end_time: endTime.toISOString(), break_mins: breakMins })
      .eq("id", openBreak.id)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }
}

// ============================================================
// checkOut — مع fallback لو نفس نوع الباگ ظهر معاها
// ============================================================

export async function checkOut(): Promise<AttendanceRecord> {
  try {
    const { data, error } = await supabase.rpc("check_out");
    if (error) throw error;
    return data;
  } catch (err) {
    if (!isBrokenRpcColumnError(err)) throw err;

    const info = await getMyOpenAttendance();
    if (!info) throw new Error("لم تقم بتسجيل الحضور اليوم بعد");

    const openBreak = await getOpenBreak(info.attendanceId);
    if (openBreak) throw new Error("لازم تنهي البريك الأول قبل تسجيل الانصراف");

    const { data: allBreaks, error: breaksErr } = await supabase
      .from("breaks")
      .select("break_mins")
      .eq("attendance_id", info.attendanceId);
    if (breaksErr) throw breaksErr;
    const totalBreakMins = (allBreaks ?? []).reduce(
      (s, b) => s + (b.break_mins ?? 0),
      0,
    );

    const checkOutTime = new Date();
    const workedMins = Math.max(
      0,
      Math.round(
        (checkOutTime.getTime() - new Date(info.checkInAt).getTime()) / 60000,
      ) - totalBreakMins,
    );

    const { data: updated, error: updateErr } = await supabase
      .from("attendance")
      .update({
        check_out_at: checkOutTime.toISOString(),
        total_work_minutes: workedMins,
      })
      .eq("id", info.attendanceId)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }
}
