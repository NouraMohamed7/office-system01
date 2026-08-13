// src/types/attendance.ts
/**
 * Attendance types and models.
 * Database source: public.attendance, public.leave_requests, public.attendance_settings
 */

/**
 * Employee attendance status on a given day.
 * Maps to public.attendance_status enum.
 */
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'on_leave'
  | 'not_checked_in'
  | 'leave_early';

/**
 * Type of leave request (used when marking on_leave in attendance).
 * Maps to public.leave_type enum.
 */
export type LeaveType = 'vacation' | 'sick' | 'permission';

/**
 * Leave request approval status.
 * Maps to public.leave_status enum.
 */
export type LeaveStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'end_leave_early';

/**
 * Single attendance record for an employee on a specific date.
 * 
 * Database source: public.attendance
 */
export interface AttendanceRecord {
  id: number;
  created_at: string;
  updated_at: string;
  users_id: string;
  /** Minutes late after cutoff time */
  late_minutes: number;
  /** Total worked minutes on this day (if tracked). Null if unknown */
  total_work_minutes: number | null;
  status: AttendanceStatus;
  check_in_at: string;
  check_out_at: string | null;
  attendance_date: string;
}

/**
 * Today's attendance snapshot for a single employee.
 * Used in "Live Attendance" or "Today's Roster" views.
 * 
 * Database source: public.attendance (filtered for today's date)
 */
export interface AttendanceToday {
  users_id: string;
  name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  status: string | null;
}

/**
 * Attendance policy settings per branch.
 * Defines work hours, late tolerance, and notification rules.
 * 
 * ⚠️ **Backend Assumption**: The field `notify_manager_on_late` is NOT currently
 * present in the public.attendance_settings table (not mentioned in backend docs,
 * and insert/update operations returned PGRST204 errors when attempted).
 * Kept as optional here for forward compatibility — if backend adds it,
 * the frontend will use it without code changes.
 * Currently, the frontend does not send or display this field.
 * 
 * Database source: public.attendance_settings
 */
export interface AttendanceSettings {
  id: number;
  created_at: string;
  updated_at: string;
  late_tolerance_minutes: number;
  notify_manager_on_late?: boolean;
  branch_id: number;
  effective_from: string;
  effective_to: string | null;
  start_time: string;
  end_time: string;
  cutoff_time: string;
}

/**
 * Leave request record.
 * 
 * ⚠️ **Backend Assumption**: The fields `reviewed_by` and `reviewed_at` are inferred
 * from the daily_reports table pattern (which has both fields for manager review tracking).
 * If the public.leave_requests table in the backend uses different column names
 * (e.g., approved_by / approved_at), update this interface AND the corresponding
 * attendance.api.ts getLeaveRequests() call.
 * 
 * Database source: public.leave_requests
 */
export interface LeaveRequest {
  id: number;
  users_id: string;
  leave_type: LeaveType;
  status: LeaveStatus;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
  updated_at: string;
  /** UUID of manager who reviewed/approved this request */
  reviewed_by?: string | null;
  /** Timestamp when review was completed */
  reviewed_at?: string | null;
}

/**
 * Query filters for attendance records.
 * Passed to getAttendance() or similar API functions.
 */
export interface AttendanceFilters {
  userId?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}