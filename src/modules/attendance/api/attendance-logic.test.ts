import assert from "node:assert/strict";
import { test } from "node:test";
import {
  breakDurationMinutes,
  pickLatestByCheckIn,
  getBreaksSummaryByAttendanceIdsPure,
  isLeaveStarted,
  summarizeBreaks,
  formatBreakCell,
  formatMinutesAsHours,
  resolveStatus,
  dedupeAttendanceTodayByUser,
  ATTENDANCE_STATUS_TONE,
  LEAVE_STATUS_TONE,
  type BreakRecord,
  type AttendanceTodayRow,
} from "./attendance-logic.ts";

// ============================================================
// Issue #3: "فين وقت البريك؟" — تجميع البريكات صح
// ============================================================

test("Issue 3 — breakDurationMinutes: بيفضّل break_mins الجاهز لو موجود", () => {
  const b: BreakRecord = {
    id: 1, created_at: "", updated_at: "", attendance_id: 10,
    start_time: "2026-08-13T10:00:00Z", end_time: "2026-08-13T10:20:00Z", break_mins: 15,
  };
  assert.equal(breakDurationMinutes(b), 15, "المفروض يرجع break_mins مباشرة مش يحسبها من الفرق");
});

test("Issue 3 — breakDurationMinutes: بيحسب من الفرق لو break_mins = null", () => {
  const b: BreakRecord = {
    id: 2, created_at: "", updated_at: "", attendance_id: 10,
    start_time: "2026-08-13T10:00:00Z", end_time: "2026-08-13T10:25:00Z", break_mins: null,
  };
  assert.equal(breakDurationMinutes(b), 25);
});

test("Issue 3 — breakDurationMinutes: بريك مفتوح (end_time=null) بيرجع null", () => {
  const b: BreakRecord = {
    id: 3, created_at: "", updated_at: "", attendance_id: 10,
    start_time: "2026-08-13T10:00:00Z", end_time: null, break_mins: null,
  };
  assert.equal(breakDurationMinutes(b), null);
});

test("Issue 3 — summarizeBreaks: بيجمع أكتر من بريك لنفس الموظف في نفس اليوم (مش بريك واحد بس)", () => {
  const breaks: BreakRecord[] = [
    { id: 1, created_at: "", updated_at: "", attendance_id: 10, start_time: "2026-08-13T09:00:00Z", end_time: "2026-08-13T09:10:00Z", break_mins: 10 },
    { id: 2, created_at: "", updated_at: "", attendance_id: 10, start_time: "2026-08-13T12:00:00Z", end_time: "2026-08-13T12:20:00Z", break_mins: 20 },
    { id: 3, created_at: "", updated_at: "", attendance_id: 10, start_time: "2026-08-13T15:00:00Z", end_time: "2026-08-13T15:05:00Z", break_mins: 5 },
  ];
  const { totalMinutes, isOnBreakNow } = summarizeBreaks(breaks);
  assert.equal(totalMinutes, 35, "المفروض 10+20+5=35 دقيقة مش آخر بريك بس (5)");
  assert.equal(isOnBreakNow, false);
});

test("Issue 3 — summarizeBreaks: بيعلّم isOnBreakNow لو فيه بريك مفتوح، ومش بيوقف حساب الباقي", () => {
  const breaks: BreakRecord[] = [
    { id: 1, created_at: "", updated_at: "", attendance_id: 10, start_time: "2026-08-13T09:00:00Z", end_time: "2026-08-13T09:10:00Z", break_mins: 10 },
    { id: 2, created_at: "", updated_at: "", attendance_id: 10, start_time: "2026-08-13T15:00:00Z", end_time: null, break_mins: null },
  ];
  const { totalMinutes, isOnBreakNow } = summarizeBreaks(breaks);
  assert.equal(totalMinutes, 10);
  assert.equal(isOnBreakNow, true);
});

test("Issue 3 — formatBreakCell: كل الحالات الأربعة", () => {
  assert.equal(formatBreakCell(0, false), "—");
  assert.equal(formatBreakCell(0, true), "جاري الآن...");
  assert.equal(formatBreakCell(65, false), "1:05");
  assert.equal(formatBreakCell(65, true), "1:05 (+ جارية الآن)");
});

test("Issue 3 — formatMinutesAsHours: صفر دقيقة يتحطلها padding", () => {
  assert.equal(formatMinutesAsHours(5), "0:05");
  assert.equal(formatMinutesAsHours(125), "2:05");
});

test("Issue 3 — getBreaksSummaryByAttendanceIds (الدالة اللي كانت ناقصة أصلاً): بترجع Map صح لكل سجل", async () => {
  const allBreaks: BreakRecord[] = [
    { id: 1, created_at: "", updated_at: "", attendance_id: 100, start_time: "2026-08-10T09:00:00Z", end_time: "2026-08-10T09:15:00Z", break_mins: 15 },
    { id: 2, created_at: "", updated_at: "", attendance_id: 100, start_time: "2026-08-10T13:00:00Z", end_time: "2026-08-10T13:10:00Z", break_mins: 10 },
    { id: 3, created_at: "", updated_at: "", attendance_id: 101, start_time: "2026-08-11T09:00:00Z", end_time: "2026-08-11T09:30:00Z", break_mins: 30 },
  ];
  const summary = await getBreaksSummaryByAttendanceIdsPure([100, 101], allBreaks);
  assert.equal(summary.get(100), 25, "سجل 100 لازم يبقى 15+10=25");
  assert.equal(summary.get(101), 30);
  assert.equal(summary.size, 2);
});

test("Issue 3 — getBreaksSummaryByAttendanceIds: قايمة IDs فاضية بترجع Map فاضية من غير ما تنفجر", async () => {
  const summary = await getBreaksSummaryByAttendanceIdsPure([], []);
  assert.equal(summary.size, 0);
});

// ============================================================
// Issue #2: error في end_leave_early من غير ما تتمسح — محاكاة busy-state
// ============================================================

test("Issue 2 — محاكاة: أكشن على صف تاني وقت ما صف مشغول لازم يتمنع (busyLeaveId guard)", () => {
  let busyLeaveId: number | null = null;
  const callLog: number[] = [];

  function decide(leaveId: number) {
    if (busyLeaveId !== null) return;
    busyLeaveId = leaveId;
    callLog.push(leaveId);
  }

  decide(1);
  decide(2);
  assert.deepEqual(callLog, [1], "أكشن التاني كان المفروض يترفض لحد ما الأول يخلص");

  busyLeaveId = null;
  decide(2);
  assert.deepEqual(callLog, [1, 2]);
});

test("Issue 2 — كل أكشن بيمسح الـ error بتاعه في try/catch جديد (مفيش error عالق من عملية قبله)", async () => {
  const toasts: { type: string; msg: string }[] = [];
  async function runAction(shouldFail: boolean) {
    try {
      if (shouldFail) throw new Error("Only accepted leaves can be ended early");
      toasts.push({ type: "success", msg: "تم إنهاء الإجازة بدري" });
    } catch (err) {
      toasts.push({ type: "error", msg: err instanceof Error ? err.message : "تعذر إنهاء الإجازة" });
    }
  }

  await runAction(true);
  await runAction(false);

  assert.equal(toasts.length, 2);
  assert.equal(toasts[0].type, "error");
  assert.equal(toasts[1].type, "success", "التوست التاني المفروض يبقى success نضيف، مش error عالق من قبله");
});

// ============================================================
// Issue #1: تفاصيل الإجازة في كارد + توحيد ألوان الحالة
// ============================================================

test("Issue 1 — LEAVE_STATUS_TONE بيغطي كل الـ 5 حالات من enum leave_status (pending/accepted/rejected/cancelled/end_leave_early)", () => {
  const expectedKeys = ["pending", "accepted", "rejected", "cancelled", "end_leave_early"];
  const actualKeys = Object.keys(LEAVE_STATUS_TONE).sort();
  assert.deepEqual(actualKeys, expectedKeys.sort());
});

test("فيكس التناسق — end_leave_early و cancelled لازم يكون لهم لون مميز (مش muted لكل الاتنين زي الكود القديم)", () => {
  assert.equal(LEAVE_STATUS_TONE.end_leave_early, "teal");
  assert.equal(LEAVE_STATUS_TONE.cancelled, "muted");
  assert.notEqual(
    LEAVE_STATUS_TONE.end_leave_early,
    LEAVE_STATUS_TONE.cancelled,
    "المفروض end_leave_early متميزة بصريًا عن cancelled — قبل الفيكس كانوا الاتنين muted"
  );
});

test("ATTENDANCE_STATUS_TONE بيغطي كل الـ 6 حالات من enum attendance_type", () => {
  const expectedKeys = ["present", "absent", "late", "on_leave", "not_checked_in", "leave_early"];
  const actualKeys = Object.keys(ATTENDANCE_STATUS_TONE).sort();
  assert.deepEqual(actualKeys, expectedKeys.sort());
});

// ============================================================
// Bug إضافي اتصلّح: getMyAttendanceToday مع سجلات مكررة لنفس اليوم
// ============================================================

test("فيكس getMyAttendanceToday — لو فيه أكتر من سجل حضور لنفس اليوم، بياخد الأحدث بدل ما ينفجر", () => {
  const rows = [
    { id: 501, check_in_at: "2026-08-13T09:00:00Z" },
    { id: 502, check_in_at: "2026-08-13T09:05:00Z" },
  ];
  const latest = pickLatestByCheckIn(rows);
  assert.equal(latest?.id, 502, "المفروض ياخد آخر سجل حسب check_in_at مش يرمي error زي .maybeSingle() القديمة");
});

test("فيكس getMyAttendanceToday — سجل واحد بس (الحالة العادية) لسه شغالة صح", () => {
  const rows = [{ id: 501, check_in_at: "2026-08-13T09:00:00Z" }];
  const latest = pickLatestByCheckIn(rows);
  assert.equal(latest?.id, 501);
});

test("فيكس getMyAttendanceToday — مفيش سجلات النهاردة أصلاً → null (لسه مسجلش حضور)", () => {
  const latest = pickLatestByCheckIn([]);
  assert.equal(latest, null);
});

// ============================================================
// Manager page: dedupe + resolveStatus
// ============================================================

test("dedupeAttendanceTodayByUser: بياخد آخر سجل لكل موظف (مش بيكرر users_id في الجدول)", () => {
  const rows: AttendanceTodayRow[] = [
    { users_id: "u1", name: "أحمد", check_in_at: "2026-08-13T08:00:00Z", check_out_at: null, late_minutes: 0, status: "present" },
    { users_id: "u1", name: "أحمد", check_in_at: "2026-08-13T08:30:00Z", check_out_at: null, late_minutes: 30, status: "late" },
    { users_id: "u2", name: "سارة", check_in_at: "2026-08-13T07:55:00Z", check_out_at: null, late_minutes: 0, status: "present" },
  ];
  const deduped = dedupeAttendanceTodayByUser(rows);
  assert.equal(deduped.length, 2, "المفروض صف واحد بس لكل users_id");
  const u1 = deduped.find((r) => r.users_id === "u1");
  assert.equal(u1?.check_in_at, "2026-08-13T08:30:00Z", "المفروض ياخد آخر check_in_at لأحمد");
});

test("resolveStatus: بيرجع status من الباك لو معروف", () => {
  const r: AttendanceTodayRow = { users_id: "u1", name: "أحمد", check_in_at: "2026-08-13T08:00:00Z", check_out_at: null, late_minutes: 0, status: "on_leave" };
  assert.equal(resolveStatus(r), "on_leave");
});

test("resolveStatus: status غير معروف/null بس فيه check_in + تأخير → late", () => {
  const r: AttendanceTodayRow = { users_id: "u1", name: "أحمد", check_in_at: "2026-08-13T09:30:00Z", check_out_at: null, late_minutes: 15, status: null };
  assert.equal(resolveStatus(r), "late");
});

test("resolveStatus: status غير معروف بس فيه check_in وبدون تأخير → present", () => {
  const r: AttendanceTodayRow = { users_id: "u1", name: "أحمد", check_in_at: "2026-08-13T08:00:00Z", check_out_at: null, late_minutes: 0, status: null };
  assert.equal(resolveStatus(r), "present");
});

test("resolveStatus: مفيش check_in خالص ومفيش status → not_checked_in", () => {
  const r: AttendanceTodayRow = { users_id: "u1", name: "أحمد", check_in_at: null, check_out_at: null, late_minutes: null, status: null };
  assert.equal(resolveStatus(r), "not_checked_in");
});

// ============================================================
// isLeaveStarted — القاعدة اللي بتتحكم في إظهار أزرار تعديل/إلغاء
// ============================================================

test("isLeaveStarted: تاريخ البداية = النهاردة بالظبط → started = true (مطابق لرسالة الباك)", () => {
  assert.equal(isLeaveStarted("2026-08-13", "2026-08-13"), true);
});

test("isLeaveStarted: تاريخ البداية في المستقبل → started = false", () => {
  assert.equal(isLeaveStarted("2026-08-20", "2026-08-13"), false);
});

test("isLeaveStarted: تاريخ البداية في الماضي → started = true", () => {
  assert.equal(isLeaveStarted("2026-08-01", "2026-08-13"), true);
});