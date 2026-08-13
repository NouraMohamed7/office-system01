/**
 * Centralized constants, labels, and tone mappings.
 * 
 * This file consolidates all feature-specific labels, status-to-UI-tone mappings,
 * and other shared constants used across pages and modules.
 * 
 * Organization:
 * 1. Role identifiers
 * 2. Attendance constants (status, leave type, leave status)
 * 3. Employee status constants
 * 4. Task constants (status, priority)
 * 5. Complaint constants
 * 6. File approval constants
 * 7. UI tone type definition
 */

/* ========== Role IDs ========== */

/**
 * Role identifiers mapped to database role_id enum.
 * Used to determine user permissions and layout (employee vs. manager portal).
 */
export const ROLE_ID = {
  MANAGER: 3,
  EMPLOYEE: 2,
} as const;

/* ========== Attendance Constants ========== */

/**
 * Attendance status on a given day.
 * Maps to public.attendance_status enum.
 * Database source: public.attendance
 */
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "on_leave"
  | "not_checked_in"
  | "leave_early";

/**
 * Arabic display labels for AttendanceStatus values.
 * Used in attendance tables, dropdowns, and status badges.
 */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  on_leave: "إجازة",
  not_checked_in: "لم يسجل",
  leave_early: "انصراف مبكر",
};

/**
 * UI tone (color) for each AttendanceStatus.
 * Used in Pill components and status badges.
 */
export const ATTENDANCE_STATUS_TONE: Record<AttendanceStatus, "success" | "warning" | "danger" | "teal" | "muted"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  on_leave: "teal",
  not_checked_in: "muted",
  leave_early: "warning",
};

/**
 * Leave request type.
 * Maps to public.leave_type enum.
 * Database source: public.leave_requests
 */
export type LeaveType = "vacation" | "sick" | "permission";

/**
 * Arabic display labels for LeaveType values.
 * Used in leave request forms and display lists.
 */
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  vacation: "إجازة سنوية",
  sick: "إجازة مرضية",
  permission: "استئذان",
};

/**
 * Array of leave type options for dropdowns and form inputs.
 * Generated from LEAVE_TYPE_LABEL to keep labels in one place.
 */
export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = (
  Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]
).map((value) => ({ value, label: LEAVE_TYPE_LABEL[value] }));

/**
 * Leave request approval status.
 * Maps to public.leave_status enum.
 * Database source: public.leave_requests
 */
export type LeaveStatus = "pending" | "accepted" | "rejected" | "cancelled" | "end_leave_early";

/**
 * Arabic display labels for LeaveStatus values.
 * Used in leave request detail views and approval workflows.
 */
export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  cancelled: "ملغية",
  end_leave_early: "انتهت مبكرًا",
};

/**
 * UI tone (color) for each LeaveStatus.
 * 
 * ⚠️ **Bug fix applied**: Previous versions had inconsistent tone mapping across pages.
 * Manager attendance page used a local LEAVE_STATUS_TONE (incomplete, missing cancelled/end_leave_early).
 * Employee pages had no tone map and used ad-hoc ternaries (also incomplete).
 * Now consolidated in one place — all 5 statuses have consistent colors everywhere.
 */
export const LEAVE_STATUS_TONE: Record<LeaveStatus, "success" | "warning" | "danger" | "teal" | "muted"> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  cancelled: "muted",
  end_leave_early: "teal",
};

/**
 * Options for manager decisions on leave requests.
 * Managers can only approve, reject, or cancel — not modify to "pending" or "end_leave_early".
 * 
 * Database: Enforced by check_leave_status RPC on backend.
 */
export const MANAGER_LEAVE_DECISIONS: {
  value: Extract<LeaveStatus, "accepted" | "rejected" | "cancelled">;
  label: string;
}[] = [
  { value: "accepted", label: "قبول" },
  { value: "rejected", label: "رفض" },
  { value: "cancelled", label: "إلغاء" },
];

/* ========== Employee Status Constants ========== */

/**
 * Employee employment status.
 * Maps to public.emp_status enum.
 * Database source: public.users.emp_status
 * 
 * Enum values in backend: active, on_leave, suspended, resigned, pending
 * (NOT "inactive" — that's a common mistake that caused account suspension bugs)
 */
export type EmpStatus = "active" | "on_leave" | "suspended" | "resigned" | "pending";

/**
 * Arabic display labels for EmpStatus values.
 * Used in employee management UI, profile pages, and status badges.
 */
export const EMP_STATUS_LABEL_AR: Record<EmpStatus, string> = {
  active: "نشط",
  on_leave: "في إجازة",
  suspended: "موقوف",
  resigned: "مستقيل",
  pending: "معلّق",
};

/**
 * UI tone (color) for each EmpStatus.
 * Used in employee list and profile display.
 */
export const EMP_STATUS_TONE: Record<EmpStatus, "success" | "warning" | "danger" | "teal" | "muted"> = {
  active: "success",
  on_leave: "teal",
  suspended: "warning",
  resigned: "danger",
  pending: "muted",
};

/**
 * List of all valid EmpStatus values.
 * Used for form dropdowns and validation.
 */
export const EMP_STATUS_OPTIONS: EmpStatus[] = [
  "active",
  "on_leave",
  "suspended",
  "resigned",
  "pending",
];

/**
 * Normalize employee status from backend (which may send unexpected values).
 * If the value is not a recognized EmpStatus, defaults to "active".
 * 
 * Defensive coding: prevents UI crashes from unknown status values.
 */
export function normalizeEmpStatus(raw: string | null | undefined): EmpStatus {
  if (raw && (EMP_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as EmpStatus;
  }
  return "active";
}

/* ========== Task Constants ========== */

/**
 * Task lifecycle status.
 * Maps to public.task_status enum.
 * Database source: public.tasks
 */
export type TaskStatus = "pending" | "processing" | "completed" | "late" | "cancelled";

/**
 * Arabic display labels for TaskStatus values.
 * Used in task boards, filter dropdowns, and status badges.
 */
export const TASK_STATUS_LABEL_AR: Record<TaskStatus, string> = {
  pending: "لسه هتبدأ",
  processing: "جاري التنفيذ",
  completed: "مكتملة",
  late: "متأخرة",
  cancelled: "ملغية",
};

/**
 * UI tone (color) for each TaskStatus.
 * Consolidates hard-coded COLS/columns from employee/tasks and manager/tasks pages.
 */
export const TASK_STATUS_TONE: Record<TaskStatus, "success" | "warning" | "danger" | "teal" | "muted" | "primary"> = {
  pending: "muted",
  processing: "primary",
  completed: "success",
  late: "danger",
  cancelled: "muted",
};

/**
 * Task priority level.
 * Maps to public.priority_task enum.
 * Database source: public.tasks
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Arabic display labels for TaskPriority values.
 * Used in task forms, filters, and priority indicators.
 */
export const TASK_PRIORITY_LABEL_AR: Record<TaskPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

/**
 * UI tone (color) for each TaskPriority.
 * Consolidates hard-coded PRIORITY_TONE from manager/tasks page.
 * "urgent" and "high" both use "danger" tone, but "urgent" adds additional visual emphasis
 * (pulse animation / halo) in pages to differentiate at first glance.
 */
export const TASK_PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "muted"> = {
  urgent: "danger",
  high: "danger",
  medium: "warning",
  low: "muted",
};

/* ========== Complaint Constants ========== */

/**
 * Complaint type/category.
 * Maps to public.complaint_type enum.
 * Database source: public.complaints
 */
export type ComplaintType = "work_env" | "salary&rewards" | "co-worker" | "tools&matrials" | "else";

/**
 * Arabic display labels for ComplaintType values.
 * Used in complaint form category dropdown and display.
 */
export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  work_env: "بيئة العمل",
  "salary&rewards": "الراتب والمزايا",
  "co-worker": "زميل عمل",
  "tools&matrials": "أدوات وموارد",
  else: "أخرى",
};

/**
 * List of all complaint types for iteration and form validation.
 */
export const COMPLAINT_TYPES: ComplaintType[] = [
  "work_env",
  "salary&rewards",
  "co-worker",
  "tools&matrials",
  "else",
];

/**
 * Complaint approval/review status.
 * Maps to public.complaint_status enum.
 * Database source: public.complaints
 */
export type ComplaintStatus = "new" | "in_processing" | "done" | "rejected";

/**
 * Arabic display labels for ComplaintStatus values.
 * Used in complaint detail views and filter options.
 */
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  new: "جديدة",
  in_processing: "قيد المراجعة",
  done: "تم الحل",
  rejected: "مرفوضة",
};

/**
 * List of all complaint statuses for iteration and form validation.
 */
export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  "new",
  "in_processing",
  "done",
  "rejected",
];

/**
 * UI tone (color) for each ComplaintStatus.
 * Consolidates hard-coded statusTone from employee/complaints and manager/complaints pages.
 */
export const COMPLAINT_STATUS_TONE: Record<ComplaintStatus, "teal" | "success" | "warning" | "danger"> = {
  new: "teal",
  in_processing: "warning",
  done: "success",
  rejected: "danger",
};

/* ========== File Approval Constants ========== */

/**
 * File approval review status.
 * Maps to public.file_approval_status enum (or similar in DB).
 * Database source: public.files_approval
 * 
 * - pending: awaiting manager review
 * - accepted: approved, can download/use
 * - rejected: denied, employee can see rejection reason
 * - edit_requested: manager requested changes before approval
 */
export type FileApprovalStatus = "pending" | "accepted" | "rejected" | "edit_requested";

/**
 * Arabic display labels for FileApprovalStatus values.
 * Used in file approval workflows and status displays.
 */
export const FILE_STATUS_LABELS: Record<FileApprovalStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  edit_requested: "تحتاج تعديل",
};

/**
 * List of all file approval statuses for iteration and form validation.
 */
export const FILE_STATUSES: FileApprovalStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "edit_requested",
];

/**
 * UI tone (color) for each FileApprovalStatus.
 * Consolidates hard-coded STATUS_TONE / statusTone from employee/uploads and manager/uploads pages.
 */
export const FILE_STATUS_TONE: Record<FileApprovalStatus, "teal" | "success" | "warning" | "danger"> = {
  pending: "teal",
  accepted: "success",
  edit_requested: "warning",
  rejected: "danger",
};

/**
 * Max file size for plain file uploads (no approval needed).
 * Database source: Backend configuration or validation rules.
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Max file size for approval-required file uploads.
 * Can be larger than plain files since they undergo review.
 */
export const MAX_APPROVAL_FILE_SIZE_MB = 50;

/* ========== UI Tone Type (shared across all features) ========== */

/**
 * Possible UI tones/colors for status badges, pills, and indicators.
 * Maps to Tailwind CSS color variables and component styling.
 */
export type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";
