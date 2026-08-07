// src/types/tasks.ts
//
// الأنواع الخاصة بالمهام — مبنية على الدوكيومنتيشن اللي وصلت من الباك
// (جدول tasks + edge functions create-task/update-task + RPCs).
//
// ⚠️ ASSUMPTIONS محتاجة تأكيد من الباك (الدوك ماكانش فيه تفاصيلها):
// 1) القيم الفعلية لـ enum: public.task_status  → افتراضيًا حطيت
//    "new" | "in_progress" | "paused" | "done" | "cancelled"
// 2) القيم الفعلية لـ enum: public.priority_task → افتراضيًا حطيت
//    "low" | "medium" | "high" | "urgent"
// 3) القيمة اللي المفروض تتبعت في عمود "type" بجدول comments لما التعليق
//    يكون على مهمة (public.comment_type) → افتراضيًا حطيت "task"
// تقدر تتأكد منها بسرعة بالسؤال ده في الـ SQL editor بتاع Supabase:
//   select enum_range(null::task_status);
//   select enum_range(null::priority_task);
//   select enum_range(null::comment_type);
// وبعدين تظبط القيم في الملف ده + tasks.api.ts.

export type TaskStatus =
  | "new"
  | "in_progress"
  | "paused"
  | "done"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const TASK_STATUS_LABEL_AR: Record<TaskStatus, string> = {
  new: "جديدة",
  in_progress: "جاري التنفيذ",
  paused: "متوقفة",
  done: "مكتملة",
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
  assigned_to: string; // uuid — موظف واحد بس، الباك مبيدعمش تعدد مكلفين حاليًا
  department_id: number;
  completion_percent: number | null;
  start_date: string; // date
  end_date: string; // date
  status: TaskStatus;
  priority: TaskPriority;
}

/** ملف مرفق (من جدول files) */
export interface TaskFile {
  id: number;
  name: string;
  file_path: string;
  storage_id: string;
  mime_type: string;
  size_bytes: number;
  users_id?: string;
}

/** تعليق على مهمة (من جدول comments) */
export interface TaskComment {
  id: number;
  created_at: string;
  updated_at: string;
  attachable_id: number;
  sender_id: string;
  body: string;
  type: string;
}

/** بيانات بسيطة عن المستخدم — بنجيبها من view users_with_email لعرض الأسماء */
export interface UserLite {
  id: string;
  name: string;
  photo_url: string | null;
}

export interface DepartmentLite {
  id: number;
  name: string;
}

/* ---------------- Payloads ---------------- */

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to?: string;
  department_id?: number | string;
  start_date?: string;
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