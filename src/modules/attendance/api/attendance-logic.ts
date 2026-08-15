// src/modules/attendance/api/attendance-logic.ts
/**
 * دوال منطقية "نقية" (pure) — مفيهاش أي نداء شبكة. مصدر واحد موحّد
 * ومختبَر تستخدمه صفحة الموظف وصفحة المدير مع بعض، بدل ما تتكرر نسخ
 * محلية مختلفة في كل صفحة (وده كان سبب تضارب الفيكسات في الكود الأصلي).
 */
import type { AttendanceTodayRow, BreakRecord } from "./attendance.api";
import type { AttendanceStatus } from "@/types/attendance";

/**
 * أحدث بريك مفتوح (end_time === null) في مصفوفة بريكات — بيتجاهل أي
 * orphan قديم (بريك فاضل مفتوح من باگ سابق) ومبيعتمدش على ترتيب
 * المصفوفة القادمة من الباك.
 */
export function getCurrentOpenBreak(breaks: BreakRecord[]): BreakRecord | null {
  let latest: BreakRecord | null = null;
  for (const b of breaks) {
    if (b.end_time !== null) continue;
    if (!latest || new Date(b.start_time).getTime() > new Date(latest.start_time).getTime()) {
      latest = b;
    }
  }
  return latest;
}

/**
 * إجمالي ثواني البريك النهاردة: كل البريكات المقفولة + البريك المفتوح
 * الحالي (لو موجود) بالثواني المنقضية اللي بتتحسب لايف في الواجهة.
 */
export function computeTotalBreakSeconds(breaks: BreakRecord[], openBreakElapsedSec: number): number {
  let total = 0;
  for (const b of breaks) {
    if (b.end_time === null) continue;
    const mins =
      b.break_mins ?? Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000);
    total += Math.max(0, mins) * 60;
  }
  const hasOpen = breaks.some((b) => b.end_time === null);
  if (hasOpen) total += Math.max(0, openBreakElapsedSec);
  return total;
}

/**
 * هل الإجازة بدأت فعليًا (start_date <= النهاردة)؟ — نفس الشرط بالظبط
 * اللي الباك بيرفض بيه update_leave / delete_leave.
 */
export function isLeaveStarted(startDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return startDate <= today;
}

/**
 * ملخص بريكات موظف (لصفحة المدير): إجمالي الدقايق (المقفولة فقط) + هل
 * هو في بريك دلوقتي.
 */
export function summarizeBreaks(breaks: BreakRecord[]): { totalMinutes: number; isOnBreakNow: boolean } {
  let totalMinutes = 0;
  let isOnBreakNow = false;
  for (const b of breaks) {
    if (b.end_time === null) {
      isOnBreakNow = true;
      continue;
    }
    const mins =
      b.break_mins ?? Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000);
    totalMinutes += Math.max(0, mins);
  }
  return { totalMinutes, isOnBreakNow };
}

export function formatMinutesAsHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}

export function formatBreakCell(totalMinutes: number, isOnBreakNow: boolean): string {
  if (totalMinutes === 0 && !isOnBreakNow) return "—";
  const base = totalMinutes > 0 ? formatMinutesAsHours(totalMinutes) : "0 د";
  return isOnBreakNow ? `${base} (جارية الآن)` : base;
}

/**
 * يحوّل صف attendance_today (اللي فيه status ممكن يكون null لموظف لسه
 * ما سجّلش حضور) لحالة AttendanceStatus صريحة.
 */
export function resolveStatus(row: AttendanceTodayRow): AttendanceStatus {
  if (row.status) return row.status;
  return row.check_in_at ? "present" : "not_checked_in";
}

/**
 * لو موظف عنده أكتر من صف attendance النهاردة (تسجيلات متكررة أثناء
 * الاختبار)، بنسيب بس الأحدث (آخر check_in_at) لكل users_id.
 */
export function dedupeAttendanceTodayByUser(rows: AttendanceTodayRow[]): AttendanceTodayRow[] {
  const byUser = new Map<string, AttendanceTodayRow>();
  for (const r of rows) {
    const existing = byUser.get(r.users_id);
    if (!existing) {
      byUser.set(r.users_id, r);
      continue;
    }
    const existingTime = existing.check_in_at ? new Date(existing.check_in_at).getTime() : -1;
    const currentTime = r.check_in_at ? new Date(r.check_in_at).getTime() : -1;
    if (currentTime > existingTime) byUser.set(r.users_id, r);
  }
  return Array.from(byUser.values());
}