/**
 * src/lib/attendance-labels.ts
 * 
 * ⚠️ DEPRECATED — Re-export shim for backward compatibility.
 * All attendance constants have been consolidated into src/lib/constants.ts
 * 
 * Please update imports to use:
 *   import { ATTENDANCE_STATUS_LABEL, LEAVE_TYPE_LABEL, ... } from "@/lib/constants"
 * 
 * This file will be removed in a future refactor.
 */

export {
  type AttendanceStatus,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  type LeaveType,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_OPTIONS,
  type LeaveStatus,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_TONE,
  MANAGER_LEAVE_DECISIONS,
  type Tone,
} from "@/lib/constants";