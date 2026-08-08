// src/types/tasks.ts
// مبني على enums الداتابيز الحقيقية:
//   task_status:    pending, processing, completed, late, cancelled
//   priority_task:  low, medium, high, urgent
//   comment_type:   tasks, files_approval, daily_reports

export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "late"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const TASK_STATUS_LABEL_AR: Record<TaskStatus, string> = {
  pending: "لسه هتبدأ",
  processing: "جاري التنفيذ",
  completed: "مكتملة",
  late: "متأخرة",
  cancelled: "ملغية",
};

export const TASK_PRIORITY_LABEL_AR: Record<TaskPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

/** صف المهمة زي ما هو راجع من جدول tasks */
export interface TaskRow {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  assigned_to: string; // uuid — موظف واحد بس لكل صف
  department_id: number;
  completion_percent: number | null;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface TaskFile {
  id: number;
  name: string;
  file_path: string;
  storage_id: string;
  mime_type: string;
  size_bytes: number;
  users_id?: string;
}

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
 * ⚠️ department_id هنا مش موثق رسميًا في users_with_email view (الدوك بيرجع
 * بس id, name, photo_url, role_id, emp_status, email, phones). لو الباك
 * ضافه هيتلقط تلقائيًا، ولو لسه مش موجود هيفضل undefined والفلترة حسب
 * القسم في صفحة المدير هترجع كل الموظفين كـ fallback.
 */
export interface UserLite {
  id: string;
  name: string;
  photo_url: string | null;
  department_id?: number | null;
}

export interface DepartmentLite {
  id: number;
  name: string;
}

/* ---------------- Payloads ---------------- */

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to: string;
  department_id?: number | string;
  start_date: string;
  end_date?: string;
  priority?: TaskPriority;
  files?: File[];
  existing_file_ids?: number[];
}

export interface UpdateTaskPayload {
  task_id: number | string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  priority?: TaskPriority;
  files?: File[];
  existing_file_ids?: number[];
  remove_attachment_ids?: number[];
}