// src/types/attendance.ts

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'on_leave'
  | 'not_checked_in'
  | 'leave_early'

export type LeaveType = 'vacation' | 'sick' | 'permission'

export type LeaveStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'end_leave_early'

export interface AttendanceRecord {
  id: number
  created_at: string
  updated_at: string
  users_id: string
  late_minutes: number
  total_work_minutes: number | null
  status: AttendanceStatus
  check_in_at: string
  check_out_at: string | null
  attendance_date: string
}

export interface AttendanceToday {
  users_id: string
  name: string
  check_in_at: string | null
  check_out_at: string | null
  late_minutes: number | null
  status: string | null
}

export interface AttendanceSettings {
  id: number
  created_at: string
  updated_at: string
  late_tolerance_minutes: number
  notify_manager_on_late: boolean
  branch_id: number
  effective_from: string
  effective_to: string | null
  start_time: string
  end_time: string
  cutoff_time: string
}

export interface LeaveRequest {
  id: number
  users_id: string
  leave_type: LeaveType
  status: LeaveStatus
  start_date: string
  end_date: string
  reason: string
  created_at: string
  updated_at: string
}

export interface AttendanceFilters {
  userId?: string
  from?: string
  to?: string
  status?: AttendanceStatus
  page?: number
  pageSize?: number
}
