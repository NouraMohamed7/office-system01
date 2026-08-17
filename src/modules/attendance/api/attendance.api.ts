// src/modules/attendance/api/attendance.api.ts
/**
 * كل نداءات الباك (Supabase) الخاصة بالحضور والانصراف والبريك والإجازات.
 *
 * ⚠️ القاعدة الأساسية لكل حاجة في الملف ده: مفيش أي دالة هنا بتعمل حاجة
 * الباك مش بيدعمها فعليًا. الجداول والـ RPCs المستخدمة هنا هي بالظبط اللي
 * موثقة في Supabase API docs بتاعت المشروع:
 *   - جداول: attendance, attendance_today (view), attendance_settings, breaks, leaves, users
 *   - RPCs: check_in, check_out, start_break, end_break, request_leave,
 *           update_leave, delete_leave, end_leave_early, check_leave_status
 *
 * ⚠️ عدّل مسار عميل supabase تحت لو مختلف عندك في المشروع.
 */
import { supabase } from "@/lib/supabase/client";
import type { AttendanceStatus, LeaveStatus, LeaveType, LeaveRequest } from "@/types/attendance";

// ============================================================
// Types
// ============================================================

/** صف كامل من جدول public.attendance */
export interface AttendanceRecord {
  id: number;
  created_at: string;
  updated_at: string;
  users_id: string;
  late_minutes: number;
  total_work_minutes: number | null;
  status: AttendanceStatus;
  check_in_at: string;
  check_out_at: string | null;
  attendance_date: string;
}

/**
 * صف من الـ view public.attendance_today — بيانات اليوم لكل الموظفين
 * دفعة واحدة. كل الحقول Optional/nullable في التوثيق، يعني على الأرجح
 * الـ view دي LEFT JOIN من الموظفين على attendance بتاع النهاردة —
 * فالموظف اللي لسه ماسجلش حضور بيظهر برضه بس بقيم null.
 *
 * ⚠️ ملاحظة: الـ view دي بترجّع حالة الحضور (present/absent/late/...)،
 * مش حالة البريك. حالة البريك (on_work/break) مصدرها جدول users
 * (شوف getMyBreakStatusRow تحت).
 */
export interface AttendanceTodayRow {
  users_id: string;
  name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  status: AttendanceStatus | null;
}

/** صف من جدول public.breaks */
export interface BreakRecord {
  id: number;
  created_at: string;
  updated_at: string;
  attendance_id: number;
  start_time: string;
  end_time: string | null;
  break_mins: number | null;
}

/** صف من جدول public.attendance_settings */
export interface AttendanceSettings {
  id: number;
  created_at: string;
  updated_at: string;
  late_tolerance_minutes: number;
  branch_id: number;
  effective_from: string;
  effective_to: string | null;
  start_time: string;
  end_time: string;
  cutoff_time: string;
}

export type AttendanceSettingsInput = Omit<AttendanceSettings, "id" | "created_at" | "updated_at">;

/** ملخص شهري محسوب من صفوف attendance بتاعة الموظف الحالي في الشهر ده.
 * مفيش RPC أو view جاهزة لده في الباك، فبنجيب صفوف الشهر ونحسب العد هنا. */
export interface MonthSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  onLeaveDays: number;
}

// ============================================================
// Helpers
// ============================================================

function throwIfError<T>(data: T | null, error: { message: string } | null, fallbackMsg: string): T {
  if (error) throw new Error(error.message || fallbackMsg);
  if (data === null) throw new Error(fallbackMsg);
  return data;
}

async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("تعذر التحقق من هوية المستخدم — سجل الدخول تاني");
  return data.user.id;
}

function todayDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// check_in / check_out (RPC — بدون أي باراميترز)
// ============================================================

export async function checkIn(): Promise<void> {
  const { error } = await supabase.rpc("check_in");
  if (error) throw new Error(error.message);
}

export async function checkOut(): Promise<void> {
  const { error } = await supabase.rpc("check_out");
  if (error) throw new Error(error.message);
}

// ============================================================
// جدول attendance — سجل الموظف الحالي
// ============================================================

/**
 * آخر سجل حضور للمستخدم الحالي النهاردة (لو المستخدم عمل check-in أكتر
 * من مرة النهاردة — بيرجع الأحدث). null لو مفيش تسجيل حضور اليوم خالص.
 */
export async function getMyAttendanceToday(): Promise<AttendanceRecord | null> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .eq("attendance_date", todayDateISO())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AttendanceRecord) ?? null;
}

/**
 * كل صفوف الحضور بتاعة المستخدم الحالي النهاردة (مش بس الأحدث) — لازمة
 * لتجميع بريكات أي صف قديم النهاردة (لو حصل أكتر من check-in بالغلط).
 */
export async function getMyTodayAttendanceRecords(): Promise<AttendanceRecord[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .eq("attendance_date", todayDateISO())
    .order("check_in_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as AttendanceRecord[]) ?? [];
}

/** آخر N يوم من سجل حضور المستخدم الحالي (من غير النهاردة)، الأحدث الأول. */
export async function getMyAttendanceHistory(days = 7): Promise<AttendanceRecord[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("users_id", userId)
    .lt("attendance_date", todayDateISO())
    .order("attendance_date", { ascending: false })
    .limit(days);
  if (error) throw new Error(error.message);
  return (data as AttendanceRecord[]) ?? [];
}

/**
 * ملخص الشهر الحالي (أيام حضور/غياب/تأخير/إجازة) — محسوب من صفوف
 * attendance الفعلية بتاعة المستخدم على الفرونت، لأن مفيش RPC/view جاهزة
 * لده في الباك.
 */
export async function getMyMonthSummary(): Promise<MonthSummary> {
  const userId = await getAuthUserId();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("users_id", userId)
    .gte("attendance_date", monthStart)
    .lte("attendance_date", monthEnd);
  if (error) throw new Error(error.message);

  const rows = (data as { status: AttendanceStatus }[]) ?? [];
  const summary: MonthSummary = { totalDays: rows.length, presentDays: 0, absentDays: 0, lateDays: 0, onLeaveDays: 0 };
  for (const r of rows) {
    if (r.status === "present" || r.status === "leave_early") summary.presentDays += 1;
    else if (r.status === "late") summary.lateDays += 1;
    else if (r.status === "absent") summary.absentDays += 1;
    else if (r.status === "on_leave") summary.onLeaveDays += 1;
  }
  return summary;
}

// ============================================================
// start_break / end_break (RPC — بدون باراميترز)
// ============================================================

/**
 * ⚠️ شكل الـ data الراجعة من start_break/end_break مش موثّق حرفيًا في
 * الباك (التوثيق بيقول بس "console.log(data)"). عشان كده الكود اللي
 * بيستخدم الفانكشنين دول (في page.tsx) بيعتمد على refetch كامل من جدول
 * breaks + عمود users.break_status كمصدر الحقيقة الوحيد، مش على شكل
 * الـ data الراجعة هنا — تجربة فعلية أثبتت إن الاعتماد على شكل غير مؤكد
 * بيسبب حالة "بريك ما بيقفلش". سايبين الدالتين ترجعوا الـ data الخام
 * زي ما هي (من غير أي افتراض على شكلها) لأي استخدام مستقبلي، لكن من
 * غير تطبيع (normalize) بيفترض إنها BreakRecord.
 */
export async function startBreak(): Promise<unknown> {
  const { data, error } = await supabase.rpc("start_break");
  if (error) throw new Error(error.message);
  return data;
}

export async function endBreak(): Promise<unknown> {
  const { data, error } = await supabase.rpc("end_break");
  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// جدول breaks
// ============================================================

export async function getBreaksByAttendanceId(attendanceId: number): Promise<BreakRecord[]> {
  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .eq("attendance_id", attendanceId)
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as BreakRecord[]) ?? [];
}

export async function getBreaksByAttendanceIds(attendanceIds: number[]): Promise<BreakRecord[]> {
  if (attendanceIds.length === 0) return [];
  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .in("attendance_id", attendanceIds)
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as BreakRecord[]) ?? [];
}

/**
 * إجمالي دقايق البريك (المقفولة فقط — end_time not null) لكل
 * attendance_id، مبني على break_mins لو موجودة وإلا محسوبة من
 * start_time/end_time. بترجع Map عشان تتربط بسهولة مع صفوف "سجل الحضور
 * السابق".
 */
export async function getBreaksSummaryByAttendanceIds(attendanceIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (attendanceIds.length === 0) return map;
  const allBreaks = await getBreaksByAttendanceIds(attendanceIds);
  for (const b of allBreaks) {
    if (!b.end_time) continue; // بريك لسه مفتوح — منحسبوش في سجل يوم مقفول
    const mins =
      b.break_mins ?? Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000);
    map.set(b.attendance_id, (map.get(b.attendance_id) ?? 0) + Math.max(0, mins));
  }
  return map;
}

export function subscribeToBreaks(onChange: () => void): () => void {
  const channel = supabase
    .channel("breaks-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "breaks" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// attendance_today (view) + attendance بتاع كل الموظفين النهاردة
// ============================================================

export async function getAttendanceToday(): Promise<AttendanceTodayRow[]> {
  const { data, error } = await supabase.from("attendance_today").select("*");
  if (error) throw new Error(error.message);
  return (data as AttendanceTodayRow[]) ?? [];
}

/**
 * ✅ مؤكد فعليًا من الباك (اتفحص مباشرة عبر REST API على جدول users
 * الحقيقي، مش الـ view): عمود break_status في جدول public.users هو
 * مصدر الحقيقة الرسمي لحالة البريك — بيرجّع "on_work" أو "break".
 * enum: public.break_status_type.
 *
 * ⚠️ الافتراض القديم إن الحالة دي جايه من attendance_today.status كان
 * غلط — attendance_today.status هي حالة الحضور (present/late/...)،
 * مش حالة البريك. اتأكد الفرق عن طريق فيتش مباشر على REST API لجدول
 * users فرجع فعليًا عمود break_status بقيمة "on_work"/"break".
 */
export interface MyBreakStatusRow {
  id: string;
  break_status: string | null;
}

export async function getMyTodayStatusRow(): Promise<MyBreakStatusRow | null> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("users")
    .select("id, break_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MyBreakStatusRow) ?? null;
}

/**
 * كل صفوف جدول attendance الفعلية النهاردة (مش الـ view) — لازمة لربط
 * attendance_id بالـ users_id عشان نجمع بريكات كل موظف بالاسم الصح.
 */
export async function getTodayAttendanceRecords(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from("attendance").select("*").eq("attendance_date", todayDateISO());
  if (error) throw new Error(error.message);
  return (data as AttendanceRecord[]) ?? [];
}

// ============================================================
// attendance_settings — CRUD كامل، موثق بالكامل في الباك
// ============================================================

export async function getAttendanceSettings(): Promise<AttendanceSettings[]> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("*")
    .order("effective_from", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AttendanceSettings[]) ?? [];
}

export async function createAttendanceSettings(payload: AttendanceSettingsInput): Promise<AttendanceSettings> {
  const { data, error } = await supabase.from("attendance_settings").insert([payload]).select().single();
  return throwIfError(data as AttendanceSettings, error, "تعذر إنشاء إعداد الحضور");
}

export async function updateAttendanceSettings(
  id: number,
  payload: AttendanceSettingsInput
): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return throwIfError(data as AttendanceSettings, error, "تعذر تحديث إعداد الحضور");
}

export async function deleteAttendanceSettings(id: number): Promise<void> {
  const { error } = await supabase.from("attendance_settings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// طلبات الإجازة — جدول leaves + الـ RPCs الموثقة
//
// ⚠️ التوثيق اللي وصلني فيه RPCs الإجازة (request_leave / update_leave /
// delete_leave / end_leave_early / check_leave_status) من غير قسم صريح
// لقراءة جدول الإجازات نفسه. الاسم "leaves" مأخوذ من تعليقات الكود
// الأصلية ("مباشرة من جدول leaves في الباك"). لو الاسم الفعلي مختلف
// (مثلاً leave_requests)، غيّره في السطر ده بس — كل الكود تحت بيعتمد عليه.
// ============================================================

const LEAVES_TABLE = "leaves";

export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from(LEAVES_TABLE)
    .select("*")
    .eq("users_id", userId)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LeaveRequest[]) ?? [];
}

/** كل طلبات الإجازة لكل الموظفين — لصفحة المدير (RLS المدير بتسمح بقراءة الكل). */
export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase.from(LEAVES_TABLE).select("*").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LeaveRequest[]) ?? [];
}

export function subscribeToLeaves(onChange: () => void): () => void {
  const channel = supabase
    .channel("leaves-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: LEAVES_TABLE }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export interface SubmitLeavePayload {
  p_start_date: string;
  p_end_date: string;
  p_leave_type: LeaveType;
  p_reason: string;
}

export async function submitLeave(payload: SubmitLeavePayload): Promise<void> {
  const { error } = await supabase.rpc("request_leave", payload);
  if (error) throw new Error(error.message);
}

export interface EditLeavePayload {
  p_leave_id: number;
  p_start_date: string;
  p_end_date: string;
  p_reason: string;
}

/**
 * ⚠️ update_leave مالهاش p_leave_type — الباك مش بيسمح بتغيير نوع
 * الإجازة بعد إنشائها، عشان كده select نوع الإجازة في مودال التعديل
 * لازم يفضل disabled (زي ما هو في صفحة الموظف أصلًا).
 */
export async function editLeave(payload: EditLeavePayload): Promise<void> {
  const { error } = await supabase.rpc("update_leave", payload);
  if (error) throw new Error(error.message);
}

/**
 * إلغاء نهائي (حذف) لطلب إجازة لسه ما بدأش — يستخدمها الموظف بتاع نفسه
 * فقط (عن طريق RLS). الباك برضه بيرفض لو start_date <= النهاردة.
 */
export async function removeLeave(leaveId: number): Promise<void> {
  const { error } = await supabase.rpc("delete_leave", { p_leave_id: leaveId });
  if (error) throw new Error(error.message);
}

/** قرار المدير: قبول / رفض / إلغاء طلب إجازة موظف. */
export async function setLeaveStatus(
  leaveId: number,
  status: Extract<LeaveStatus, "accepted" | "rejected" | "cancelled">
): Promise<void> {
  const { error } = await supabase.rpc("check_leave_status", {
    p_leave_id: leaveId,
    p_new_status: status,
  });
  if (error) throw new Error(error.message);
}

/**
 * إنهاء إجازة مقبولة (accepted) بدري — الباك بيرفض لو الحالة مش accepted.
 * متاحة هنا جاهزة للاستخدام لو حبيت تضيف زرار "إنهاء الإجازة بدري"
 * لاحقًا؛ حاليًا مش مستخدمة في أي من صفحتي الموظف/المدير.
 */
export async function endLeaveEarly(leaveId: number): Promise<void> {
  const { error } = await supabase.rpc("end_leave_early", { p_leave_id: leaveId });
  if (error) throw new Error(error.message);
}