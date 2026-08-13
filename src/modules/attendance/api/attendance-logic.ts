// src/modules/attendance/api/attendance-logic.ts
// دوال منطق خالصة (pure functions) لصفحات الحضور — من غير أي Supabase calls
// جواها، عشان تتختبر بسهولة بـ node:test.

import {
  ATTENDANCE_STATUS_TONE,
  LEAVE_STATUS_TONE,
  type AttendanceStatus,
} from "@/lib/attendance-labels";
import type { AttendanceTodayRow, BreakRecord } from "./attendance.api";

export { ATTENDANCE_STATUS_TONE, LEAVE_STATUS_TONE };

// ============================================================
// Issue #3: البريكات
// ============================================================

/** دقايق البريك الفعلية لسجل واحد — بيفضّل break_mins الجاهز من الباك،
 *  ولو مش موجود بيحسبه من الفرق بين start/end. لو البريك لسه مفتوح
 *  (end_time = null) بيرجع null عشان نميّزه عن "صفر". */
export function breakDurationMinutes(b: BreakRecord): number | null {
  if (b.break_mins !== null) return b.break_mins;
  if (!b.end_time) return null; // بريك لسه مفتوح
  const mins = Math.round(
    (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000
  );
  return mins > 0 ? mins : 0;
}

/** بتجمع كل البريكات المرتبطة بسجل حضور واحد، وترجع الإجمالي + هل فيه
 *  بريك مفتوح دلوقتي (isOnBreakNow) عشان نعرض المجموع صح مش آخر بريك بس. */
export function summarizeBreaks(userBreaks: BreakRecord[]): {
  totalMinutes: number;
  isOnBreakNow: boolean;
} {
  let totalMinutes = 0;
  let isOnBreakNow = false;
  for (const b of userBreaks) {
    const mins = breakDurationMinutes(b);
    if (mins === null) {
      isOnBreakNow = true;
    } else {
      totalMinutes += mins;
    }
  }
  return { totalMinutes, isOnBreakNow };
}

/** نسخة pure من getBreaksSummaryByAttendanceIds — بتاخد قايمة الـ breaks
 *  جاهزة (بدل ما تعمل fetch بنفسها) وترجع Map<attendance_id, إجمالي الدقايق>. */
export async function getBreaksSummaryByAttendanceIdsPure(
  attendanceIds: number[],
  allBreaks: BreakRecord[]
): Promise<Map<number, number>> {
  const summary = new Map<number, number>();
  if (attendanceIds.length === 0) return summary;

  const idSet = new Set(attendanceIds);
  for (const b of allBreaks) {
    if (!idSet.has(b.attendance_id)) continue;
    const mins = breakDurationMinutes(b) ?? 0; // بريك مفتوح في سجل سابق بيتحسب صفر بدل ما يكسر المجموع
    summary.set(b.attendance_id, (summary.get(b.attendance_id) ?? 0) + mins);
  }

  return summary;
}

/** بيحوّل إجمالي الدقايق + هل فيه بريك جاري لنص عرض في الجدول */
export function formatBreakCell(totalMinutes: number, isOnBreakNow: boolean): string {
  if (totalMinutes === 0 && !isOnBreakNow) return "—";
  if (totalMinutes === 0 && isOnBreakNow) return "جاري الآن...";
  return isOnBreakNow
    ? `${formatMinutesAsHours(totalMinutes)} (+ جارية الآن)`
    : formatMinutesAsHours(totalMinutes);
}

/** دقايق -> "س:د" مع padding للدقايق */
export function formatMinutesAsHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// ============================================================
// getMyAttendanceToday: بياخد أحدث سجل بدل ما يعتمد على .maybeSingle()
// ============================================================

/** بياخد أحدث سجل من مجموعة سجلات (بالمقارنة بـ check_in_at) */
export function pickLatestByCheckIn<T extends { check_in_at: string | null }>(
  rows: T[]
): T | null {
  if (rows.length === 0) return null;
  let latest = rows[0];
  for (const r of rows) {
    if ((r.check_in_at ?? "") >= (latest.check_in_at ?? "")) latest = r;
  }
  return latest;
}

// ============================================================
// isLeaveStarted — نفس القاعدة المكررة في صفحتي المدير والموظف، بس
// دلوقتي بتاخد "النهاردة" كـ parameter اختياري عشان تتختبر من غير ما
// تعتمد على new Date() الحقيقي.
// ============================================================

export function isLeaveStarted(
  startDate: string,
  today: string = new Date().toISOString().slice(0, 10)
): boolean {
  return startDate <= today;
}

// ============================================================
// Manager page: resolveStatus + dedupeAttendanceTodayByUser
// ============================================================

const KNOWN_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "on_leave",
  "not_checked_in",
  "leave_early",
];

/** بتحدد حالة الموظف النهائية: من الباك لو معروفة، وإلا بتستنتجها من
 *  check_in_at + late_minutes، وإلا not_checked_in. */
export function resolveStatus(r: AttendanceTodayRow): AttendanceStatus {
  if (r.status && (KNOWN_STATUSES as string[]).includes(r.status)) {
    return r.status as AttendanceStatus;
  }
  if (r.check_in_at) {
    return r.late_minutes && r.late_minutes > 0 ? "late" : "present";
  }
  return "not_checked_in";
}

/** لو موظف عنده أكتر من سجل attendance_today في نفس اليوم، بياخد بس
 *  آخر سجل (أحدث check_in_at) لكل users_id. */
export function dedupeAttendanceTodayByUser(
  rows: AttendanceTodayRow[]
): AttendanceTodayRow[] {
  const dedupedByUser = new Map<string, AttendanceTodayRow>();
  for (const r of rows) {
    const existing = dedupedByUser.get(r.users_id);
    if (!existing || (r.check_in_at ?? "") >= (existing.check_in_at ?? "")) {
      dedupedByUser.set(r.users_id, r);
    }
  }
  return Array.from(dedupedByUser.values());
}