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

/**
 * ⚠️ للعرض في الـ UI بس (تظهر/تخفي زرار، توجيه لصفحة تانية...) —
 * مش حماية حقيقية. الصلاحية الفعلية بتتقرر من RLS/RPC على السيرفر
 * زي ما موضح في الملاحظات فوق (Issue 4 / Issue 7). حتى لو الفرونت
 * قال "أنت مدير"، الباك هو اللي بيرفض أو يقبل الطلب فعليًا.
 */
export async function getCurrentUserRoleId(): Promise<number | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("users_with_email")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as any)?.role_id ?? null;
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

/**
 * 🔧 ISSUE 9 — placeholder.
 * لا يوجد حاليًا في الباك أي endpoint/جدول موثق لقراءة الملفات المرتبطة
 * بمهمة موجودة بالفعل — create-task و update-task بيرجعوا الملفات وقت
 * الإنشاء/التعديل بس (في الـ response)، من غير أي طريقة لإعادة جلبها بعد كده.
 * الدالة دي موجودة كـ "عقد" ثابت (contract) عشان الـ UI ينادي عليها بشكل
 * موحّد الآن، وتتحول لطلب Supabase حقيقي أول ما الباك يوفر الجدول/الـ RPC
 * (غالبًا هيبقى join على attachment_type = 'tasks').
 */
export async function getTaskFiles(_taskId: number | string): Promise<TaskFile[]> {
  return [];
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
  formData.append("assigned_to", payload.assigned_to);
  if (payload.department_id != null) {
    formData.append("department_id", String(payload.department_id));
  }
  if (payload.start_date) formData.append("start_date", payload.start_date);
  formData.append("end_date", payload.end_date || payload.start_date);
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
 *
 * ⚠️ ISSUE 7 — endpoint "create-task" موثق رسميًا كـ "Auth: Manager only".
 * الموظف مش هيقدر ينده عليه، فالبديل هنا insert مباشر في جدول tasks،
 * وده معتمد بالكامل على وجود RLS policy على الباك تسمح بـ:
 *   assigned_to = auth.uid()  AND  status = 'pending'
 * لو الـ policy دي مش موجودة، الـ insert هيترفض بخطأ RLS — وده على الأغلب
 * هو سبب "error in create task" المُبلّغ عنه. لحد ما يتأكد الباك، بنلتقط
 * الخطأ ده تحديدًا ونطلع رسالة مفهومة بدل الخطأ الخام من Postgres.
 *
 * كمان: مفيش رفع ملفات في المسار ده (insert مباشر مش بيمر على منطق رفع
 * الملفات اللي في الـ Edge Function) — مرتبط بـ ISSUE 9.
 */
export async function createMyOwnTask(
  payload: Omit<CreateTaskPayload, "assigned_to" | "department_id">
): Promise<{ message: string; task: TaskRow; files: TaskFile[] }> {
  const userId = await getCurrentUserId();

  const { data: me, error: meError } = await supabase
    .from("users_with_email")
    .select("department_id")
    .eq("id", userId)
    .maybeSingle();
  if (meError) throw meError;

  const departmentId = (me as any)?.department_id;
  if (!departmentId) {
    throw new Error("تعذر تحديد قسمك — تواصل مع المدير لضبط بيانات حسابك أولًا");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      assigned_to: userId,
      department_id: departmentId,
      start_date: payload.start_date,
      end_date: payload.end_date || payload.start_date, // NOT NULL في الداتابيز
      priority: payload.priority ?? "medium",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // 🔧 FIX (Issue 7): رسالة مفهومة بدل خطأ Postgres الخام لو المشكلة صلاحيات RLS
    if (error.code === "42501" || /row-level security|permission denied/i.test(error.message)) {
      throw new Error(
        "مش مسموح لك تضيف مهمة لنفسك دلوقتي — الصلاحية دي محتاجة تفعيل من الباك (RLS) أولًا، كلم فريق التقني."
      );
    }
    throw error;
  }
  return { message: "تم إضافة المهمة بنجاح", task: data as TaskRow, files: [] };
}

/**
 * ينشئ مهمة منفصلة لكل موظف من قائمة المختارين — نفس المحتوى بالظبط.
 */
export async function createTaskForMultipleAssignees(
  payload: Omit<CreateTaskPayload, "assigned_to"> & { assigned_to: string[] }
): Promise<{ successCount: number; failed: { userId: string; error: string }[]; files: TaskFile[] }> {
  const results = await Promise.allSettled(
    payload.assigned_to.map((userId) => createTask({ ...payload, assigned_to: userId }))
  );

  const failed: { userId: string; error: string }[] = [];
  let successCount = 0;
  let files: TaskFile[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      successCount++;
      if (r.value.files?.length) files = r.value.files; // نفس الملفات بترفق لكل نسخة
    } else {
      failed.push({ userId: payload.assigned_to[i], error: r.reason?.message ?? "خطأ غير معروف" });
    }
  });

  return { successCount, failed, files };
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

/** الموظف بيحدّث حالته بنفسه — موثقة رسميًا باسم update_task_status (emp) */
export async function updateTaskStatus(taskId: number | string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.rpc("update_task_status", {
    p_task_id: Number(taskId),
    p_status: status,
  });
  if (error) throw error;
}

/**
 * المدير بينقل المهمة بين أعمدة الـ Kanban.
 *
 * ⚠️ ISSUE 4 — بننادي نفس الـ RPC "update_task_status" اللي موثق في الدوك
 * باسم "(emp)" بس. لو فيه check داخلي إن الكولر لازم يكون هو الـ assigned_to،
 * نداء المدير هيترفض والـ optimistic update في الصفحة هيعمل rollback —
 * وده سبب إحساس "الكارت مبيتحدثش". بنلتقط خطأ الصلاحيات هنا تحديدًا
 * ونطلع رسالة واضحة بدل ما تفضل ظاهرة كباگ غامض في الفرونت.
 */
export async function updateTaskStatusAsManager(
  taskId: number | string,
  status: TaskStatus
): Promise<void> {
  const { error } = await supabase.rpc("update_task_status", {
    p_task_id: Number(taskId),
    p_status: status,
  });
  if (error) {
    if (error.code === "42501" || /permission|صلاحي|not allowed/i.test(error.message)) {
      throw new Error(
        "الباك مش بيسمح للمدير يغيّر حالة المهمة بالـ RPC الحالي (update_task_status موثق للموظف بس) — محتاج تعديل من الباك."
      );
    }
    throw error;
  }
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