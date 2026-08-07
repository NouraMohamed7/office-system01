// src/modules/tasks/api/tasks.api.ts
//
// طبقة الاتصال بالباك اند (Supabase) الخاصة بالمهام.
// كل الـ endpoints هنا مبنية بالظبط على الدوكيومنتيشن اللي اتبعتت:
//   - tasks (table)                → read
//   - create-task (edge function)  → FormData, manager only
//   - update-task (edge function)  → FormData, manager only
//   - delete_task (rpc)            → manager
//   - update_task_status (rpc)     → "emp" فقط حسب الدوك
//   - comments (table)             → read/insert/realtime
//
// ⚠️ فجوات في الباك (مش موجودة في الدوك اللي وصلني، لسه محتاجة توضيح):
//   1) مفيش endpoint موثّق للمدير عشان يغيّر حالة المهمة (update_task_status
//      موثقة "emp" بس). يعني بورتال المدير مينفعش يحفظ نقل عمود Kanban فعليًا
//      دلوقتي — سيبته شغال محليًا (UI بس) لحد ما الباك يوضح الـ RPC بتاعت المدير.
//   2) مفيش جدول/علاقة موثقة تربط "tasks" بـ "files" وقت القراءة (جدول files
//      مفيهوش عمود بيربطه بمهمة معينة، غير اللي بيرجع في رد create-task/
//      update-task مباشرة). يعني مش قادر أجيب مرفقات مهمة قديمة تاني من الداتابيز.
//      سيبت عرض المرفقات زي ما هو (Placeholder) لحد ما يوصل جدول ربط (زي
//      task_attachments) أو endpoint مخصص لده.
//   3) الباك بيدعم "assigned_to" كموظف واحد بس (uuid مفرد)، مش array. بورتال
//      المدير في الفرونت كان بيسمح باختيار أكتر من موظف لنفس المهمة — سيبت
//      شكل الاختيار المتعدد في الواجهة زي ما هو، لكن بنبعت أول موظف مختار بس
//      فعليًا للباك (assigned_to) لحد ما الباك يدعم تعدد المكلفين.

import { supabase } from "@/lib/supabase/client";
import type {
  TaskRow,
  TaskComment,
  TaskFile,
  TaskStatus,
  UserLite,
  DepartmentLite,
  CreateTaskPayload,
  UpdateTaskPayload,
} from "@/types/tasks";

/* ============================================================
   Helpers
============================================================ */

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("مفيش مستخدم مسجل دخول حاليًا");
  }
  return data.user.id;
}

/* ============================================================
   READ — المهام
============================================================ */

/** مهام الموظف الحالي فقط — لبورتال الموظف */
export async function getMyTasks(): Promise<TaskRow[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** كل المهام — لبورتال المدير (RLS المفروض تمنع غير المدير) */
export async function getAllTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* ============================================================
   READ — بيانات مساعدة (أسماء الموظفين / الأقسام)
============================================================ */

/** خريطة id → اسم/صورة، بتتبنى من view users_with_email */
export async function getUsersMap(): Promise<Record<string, UserLite>> {
  const { data, error } = await supabase
    .from("users_with_email")
    .select("id, name, photo_url");

  if (error) throw error;

  const map: Record<string, UserLite> = {};
  (data ?? []).forEach((u) => {
    if (u.id) {
      map[u.id] = {
        id: u.id,
        name: u.name ?? "—",
        photo_url: u.photo_url ?? null,
      };
    }
  });
  return map;
}

export async function getUsersList(): Promise<UserLite[]> {
  const map = await getUsersMap();
  return Object.values(map);
}

export async function getDepartments(): Promise<DepartmentLite[]> {
  const { data, error } = await supabase.from("department").select("id, name");
  if (error) throw error;
  return data ?? [];
}

/* ============================================================
   CREATE — مدير فقط — multipart/form-data
============================================================ */

export async function createTask(
  payload: CreateTaskPayload
): Promise<{ message: string; task: TaskRow; files: TaskFile[] }> {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.description) formData.append("description", payload.description);
  if (payload.assigned_to) formData.append("assigned_to", payload.assigned_to);
  if (payload.department_id != null) {
    formData.append("department_id", String(payload.department_id));
  }
  if (payload.start_date) formData.append("start_date", payload.start_date);
  if (payload.end_date) formData.append("end_date", payload.end_date);
  if (payload.priority) formData.append("priority", payload.priority);
  (payload.files ?? []).forEach((file) => formData.append("file", file));
  if (payload.existing_file_ids?.length) {
    formData.append("existing_file_ids", JSON.stringify(payload.existing_file_ids));
  }

  const { data, error } = await supabase.functions.invoke("create-task", {
    body: formData,
  });

  if (error) throw error;
  return data;
}

/* ============================================================
   UPDATE — مدير فقط — multipart/form-data
============================================================ */

export async function updateTask(
  payload: UpdateTaskPayload
): Promise<{ message: string; task: TaskRow; files: TaskFile[] }> {
  const formData = new FormData();
  formData.append("task_id", String(payload.task_id));
  if (payload.title != null) formData.append("title", payload.title);
  if (payload.description != null) formData.append("description", payload.description);
  if (payload.start_date != null) formData.append("start_date", payload.start_date);
  if (payload.end_date != null) formData.append("end_date", payload.end_date);
  if (payload.priority != null) formData.append("priority", payload.priority);
  (payload.files ?? []).forEach((file) => formData.append("file", file));
  if (payload.existing_file_ids?.length) {
    formData.append("existing_file_ids", JSON.stringify(payload.existing_file_ids));
  }
  if (payload.remove_attachment_ids?.length) {
    formData.append(
      "remove_attachment_ids",
      JSON.stringify(payload.remove_attachment_ids)
    );
  }

  const { data, error } = await supabase.functions.invoke("update-task", {
    body: formData,
  });

  if (error) throw error;
  return data;
}

/* ============================================================
   DELETE — مدير فقط — RPC
============================================================ */

export async function deleteTask(taskId: number | string): Promise<void> {
  const { error } = await supabase.rpc("delete_task", {
    p_task_id: Number(taskId),
  });
  if (error) throw error;
}

/* ============================================================
   STATUS UPDATE — موظف فقط حسب الدوك — RPC
============================================================ */

export async function updateTaskStatus(
  taskId: number | string,
  status: TaskStatus
): Promise<void> {
  const { error } = await supabase.rpc("update_task_status", {
    p_task_id: Number(taskId),
    p_status: status,
  });
  if (error) throw error;
}

/* ============================================================
   COMMENTS
============================================================ */

// القيمة المفترضة لعمود type — راجع الملاحظة في أعلى الملف
const COMMENT_TYPE_FOR_TASK = "task";

export async function getTaskComments(
  taskId: number | string
): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("attachable_id", Number(taskId))
    .eq("type", COMMENT_TYPE_FOR_TASK)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addTaskComment(
  taskId: number | string,
  body: string
): Promise<TaskComment> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      attachable_id: Number(taskId),
      sender_id: userId,
      body,
      type: COMMENT_TYPE_FOR_TASK,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToTaskComments(
  taskId: number | string,
  onChange: () => void
): () => void {
  const channel = supabase
    .channel(`task-comments-${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `attachable_id=eq.${taskId}`,
      },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* ============================================================
   REALTIME — تحديث لحظي لقائمة المهام (مفيدة خصوصًا لبورتال المدير)
============================================================ */

export function subscribeToTasks(onChange: () => void): () => void {
  const channel = supabase
    .channel("tasks-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}