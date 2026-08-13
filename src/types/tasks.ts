// src/types/tasks.ts
/**
 * Task types and constants.
 * Database source: Enums on public.task_status, public.priority_task, public.comment_type
 */

/**
 * Task lifecycle status — maps to public.task_status enum.
 * Based on actual database enums:
 *   task_status: pending, processing, completed, late, cancelled
 */
export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "late"
  | "cancelled";

/** Task urgency level — maps to public.priority_task enum */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Arabic labels for TaskStatus values.
 * Used in UI dropdowns, tables, and status badges.
 */
export const TASK_STATUS_LABEL_AR: Record<TaskStatus, string> = {
  pending: "لسه هتبدأ",
  processing: "جاري التنفيذ",
  completed: "مكتملة",
  late: "متأخرة",
  cancelled: "ملغية",
};

/**
 * Arabic labels for TaskPriority values.
 * Used in UI dropdowns, tables, and priority indicators.
 */
export const TASK_PRIORITY_LABEL_AR: Record<TaskPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

/**
 * Task record as returned from the public.tasks table.
 * Represents a single task assigned to one employee (via assigned_to UUID).
 * 
 * Database source: public.tasks
 */
export interface TaskRow {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  /** UUID of the assigned employee — one task per user */
  assigned_to: string;
  /** Department that owns/manages this task */
  department_id: number;
  /** Completion percentage (0-100). Null if not tracked */
  completion_percent: number | null;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  priority: TaskPriority;
}

/**
 * Task attachment file metadata.
 * Database source: public.task_files (or similar attachment table)
 */
export interface TaskFile {
  id: number;
  name: string;
  file_path: string;
  storage_id: string;
  mime_type: string;
  size_bytes: number;
  users_id?: string;
}

/**
 * Task comment/note entry.
 * Database source: public.comments (or similar)
 */
export interface TaskComment {
  id: number;
  created_at: string;
  updated_at: string;
  attachable_id: number;
  sender_id: string;
  body: string;
  type: string;
}

/**
 * Minimal user info returned when populating task assignees or filters.
 * 
 * ⚠️ **Backend Assumption**: `department_id` is NOT documented in the users_with_email view
 * (which returns only id, name, photo_url, role_id, emp_status, email, phones).
 * If the backend adds it, it will be captured here automatically.
 * If it's missing, it stays undefined, and department-based filtering in manager pages
 * reverts to showing all employees as a fallback.
 * 
 * Database source: public.users_with_email view (with possible department_id from users table)
 */
export interface UserLite {
  id: string;
  name: string;
  photo_url: string | null;
  department_id?: number | null;
}

/**
 * Minimal department info used in task context.
 * Database source: public.department
 */
export interface DepartmentLite {
  id: number;
  name: string;
}

/* ============== Payloads ============== */

/**
 * Payload for creating a new task.
 * Sent from frontend to POST /api/tasks (or similar endpoint).
 */
export interface CreateTaskPayload {
  title: string;
  description?: string;
  /** UUID of employee to assign task to */
  assigned_to: string;
  department_id?: number | string;
  start_date: string;
  end_date?: string;
  priority?: TaskPriority;
  /** New files to upload */
  files?: File[];
  /** IDs of existing files to attach */
  existing_file_ids?: number[];
}

/**
 * Payload for updating an existing task.
 * Sent from frontend to PATCH /api/tasks/:id (or similar endpoint).
 * All fields are optional — only changed fields should be included.
 */
export interface UpdateTaskPayload {
  task_id: number | string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  priority?: TaskPriority;
  /** New files to upload */
  files?: File[];
  /** IDs of existing files to attach */
  existing_file_ids?: number[];
  /** IDs of existing attachments to remove */
  remove_attachment_ids?: number[];
}