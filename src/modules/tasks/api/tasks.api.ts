// src/modules/tasks/api/tasks.api.ts
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

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("مفيش مستخدم مسجل دخول حاليًا");
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
   READ — بيانات مساعدة
============================================================ */

/**
 * خريطة id → اسم/صورة/قسم.
 * ⚠️ راجع الملاحظة في types/tasks.ts بخصوص department_id — لو العمود
 * مش موجود في الـ view، هيرجع undefined لكل مستخدم والفرونت هيعمل fallback.
 */
export async function getUsersMap(): Promise<Record<string, UserLite>> {
  const { data, error } = await supabase
    .from("users_with_email")
    .select("id, name, photo_url, department_id");
  if (error) throw error;

  const map: Record<string, UserLite> = {};
  (data ?? []).forEach((u: any) => {
    if (u.id) {
      map[u.id] = {
        id: u.id,
        name: u.name ?? "—",
        photo_url: u.photo_url ?? null,
        department_id: u.department_id ?? null,
      };
    }
  });
  return map;
}

export async function getUsersList(): Promise<UserLite[]> {
  return Object.values(await getUsersMap());
}

export async function getDepartments(): Promise<DepartmentLite[]> {
  const { data, error } = await supabase.from("department").select("id, name");
  if (error) throw error;
  return data ?? [];
}

/* ============================================================
   CREATE — مدير فقط — multipart/form-data
============================================================ */

// createTask: department_id بقى اختياري في الفورم داتا مش إجباري
export async function createTask(
  payload: CreateTaskPayload
): Promise<{ message: string; task: TaskRow; files: TaskFile[] }> {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.description) formData.append("description", payload.description);
  formData.append("assigned_to", payload.assigned_to);
  if (payload.department_id != null) {
    formData.append("department_id", String(payload.department_id));
  }
  if (payload.start_date) formData.append("start_date", payload.start_date);
  if (payload.end_date) formData.append("end_date", payload.end_date);
  if (payload.priority) formData.append("priority", payload.priority);
  (payload.files ?? []).forEach((f) => formData.append("file", f));
  if (payload.existing_file_ids?.length) {
    formData.append("existing_file_ids", JSON.stringify(payload.existing_file_ids));
  }
  const { data, error } = await supabase.functions.invoke("create-task", { body: formData });
  if (error) throw error;
  return data;
}

/**
 * الموظف بينشئ مهمة لنفسه فقط.
 * ✅ الباك بياخد department_id تلقائيًا من التوكن بتاع الموظف — مبنبعتوش من هنا.
 */
export async function createMyOwnTask(
  payload: Omit<CreateTaskPayload, "assigned_to" | "department_id">
): Promise<{ message: string; task: TaskRow; files: TaskFile[] }> {
  const userId = await getCurrentUserId();
  return createTask({ ...payload, assigned_to: userId });
}

/**
 * ينشئ مهمة منفصلة لكل موظف من قائمة المختارين — نفس المحتوى بالظبط.
 * حل بديل من الفرونت لأن الباك بيدعم assigned_to واحد بس لكل صف مهمة.
 */
export async function createTaskForMultipleAssignees(
  payload: Omit<CreateTaskPayload, "assigned_to"> & { assigned_to: string[] }
): Promise<{ successCount: number; failed: { userId: string; error: string }[] }> {
  const results = await Promise.allSettled(
    payload.assigned_to.map((userId) => createTask({ ...payload, assigned_to: userId }))
  );

  const failed: { userId: string; error: string }[] = [];
  let successCount = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") successCount++;
    else failed.push({ userId: payload.assigned_to[i], error: r.reason?.message ?? "خطأ غير معروف" });
  });

  return { successCount, failed };
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
  (payload.files ?? []).forEach((f) => formData.append("file", f));
  if (payload.existing_file_ids?.length) {
    formData.append("existing_file_ids", JSON.stringify(payload.existing_file_ids));
  }
  if (payload.remove_attachment_ids?.length) {
    formData.append("remove_attachment_ids", JSON.stringify(payload.remove_attachment_ids));
  }
  const { data, error } = await supabase.functions.invoke("update-task", { body: formData });
  if (error) throw error;
  return data;
}

/* ============================================================
   DELETE — مدير فقط — RPC
============================================================ */

export async function deleteTask(taskId: number | string): Promise<void> {
  const { error } = await supabase.rpc("delete_task", { p_task_id: Number(taskId) });
  if (error) throw error;
}

/* ============================================================
   STATUS UPDATE — RPC
============================================================ */

/** الموظف بيحدّث حالته بنفسه — موثقة رسميًا */
export async function updateTaskStatus(taskId: number | string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.rpc("update_task_status", {
    p_task_id: Number(taskId),
    p_status: status,
  });
  if (error) throw error;
}

/** المدير بينقل المهمة بين أعمدة الـ Kanban — بننادي نفس الـ RPC */
export async function updateTaskStatusAsManager(
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

const COMMENT_TYPE_FOR_TASK = "tasks";

export async function getTaskComments(taskId: number | string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("attachable_id", Number(taskId))
    .eq("type", COMMENT_TYPE_FOR_TASK)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTaskComment(taskId: number | string, body: string): Promise<TaskComment> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("comments")
    .insert({ attachable_id: Number(taskId), sender_id: userId, body, type: COMMENT_TYPE_FOR_TASK })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToTaskComments(taskId: number | string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`task-comments-${taskId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments", filter: `attachable_id=eq.${taskId}` },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ============================================================
   REALTIME
============================================================ */

export function subscribeToTasks(onChange: () => void): () => void {
  const channel = supabase
    .channel("tasks-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}