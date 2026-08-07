// src/lib/attendance-labels.ts
// مصدر واحد لترجمة قيم الـ enums الحقيقية من الباك (إنجليزي) لعرض عربي في الواجهة.
// القيم دي مأخوذة من public.attendance_type / public.leave_type / public.leave_status
// زي ما ظاهر في Database > Enumerated Types بالسوبابيز.

// ============================================================
// attendance_type: present, absent, late, on_leave, not_checked_in, leave_early
// ============================================================
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "on_leave"
  | "not_checked_in"
  | "leave_early";

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  on_leave: "إجازة",
  not_checked_in: "لم يسجل",
  leave_early: "انصراف مبكر",
};

export type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";

export const ATTENDANCE_STATUS_TONE: Record<AttendanceStatus, Tone> = {
  present: "success",
  late: "warning",
  absent: "danger",
  on_leave: "teal",
  not_checked_in: "muted",
  leave_early: "warning",
};

// ============================================================
// leave_type: vacation, sick, permission
// ============================================================
export type LeaveType = "vacation" | "sick" | "permission";

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  vacation: "إجازة سنوية",
  sick: "إجازة مرضية",
  permission: "استئذان",
};

export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = (
  Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]
).map((value) => ({ value, label: LEAVE_TYPE_LABEL[value] }));

// ============================================================
// leave_status: pending, accepted, rejected, cancelled, end_leave_early
// ============================================================
export type LeaveStatus = "pending" | "accepted" | "rejected" | "cancelled" | "end_leave_early";

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  cancelled: "ملغية",
  end_leave_early: "انتهت مبكرًا",
};

// المدير بيقدر يغيّر الحالة لـ 3 قيم بس حسب وصف check_leave_status في الدوك
export const MANAGER_LEAVE_DECISIONS: { value: Extract<LeaveStatus, "accepted" | "rejected" | "cancelled">; label: string }[] = [
  { value: "accepted", label: "قبول" },
  { value: "rejected", label: "رفض" },
  { value: "cancelled", label: "إلغاء" },
];