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
 * مش حماية حقيقية. الصلاحية الفعلية بتتقرر من RLS/RPC على السيرفر.
 * حتى لو الفرونت قال "أنت مدير"، الباك هو اللي بيرفض أو يقبل الطلب فعليًا.
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

const COMMENT_TYPE_FOR_TASK = "tasks";

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

/* ============================================================
   ISSUE 9 — تخزين/قراءة ملفات المهمة (حل فرونت-أونلي)
   ------------------------------------------------------------
   ⚠️ الباك حاليًا مفيهوش جدول ربط بين tasks و files (جدول files
   فيه users_id بس، من غير أي عمود يربطه بمهمة). لحد ما يتعمل جدول
   ربط حقيقي على السيرفر، بنستخدم جدول comments الموجود أصلاً (نفس
   attachable_id + type='tasks') كـ"تخزين" لقائمة الملفات، عن طريق
   marker بادئة بنفلترها من عرض التعليقات العادي عشان المستخدم
   ميشوفهاش كتعليق حقيقي.
   ده حل مؤقت مقبول، مش بديل حقيقي عن جدول ربط في الباك — لو حد يوم
   يمسح كل التعليقات بتاعة مهمة ممكن يفقد ربط الملفات بتاعتها.
============================================================ */

const TASK_FILES_MARKER = "__TASK_FILES__:";

async function recordTaskFilesMarker(taskId: number, files: TaskFile[]): Promise<void> {
  if (!files?.length) return;
  try {
    const userId = await getCurrentUserId();
    await supabase.from("comments").insert({
      attachable_id: Number(taskId),
      sender_id: userId,
      type: COMMENT_TYPE_FOR_TASK,
      body: TASK_FILES_MARKER + JSON.stringify(files),
    });
  } catch (err) {
    // مانرميش error هنا — فشل تسجيل الملفات مؤقتًا ميكسرش نجاح إنشاء/تعديل المهمة
    console.error("recordTaskFilesMarker failed", err);
  }
}

export async function getTaskFiles(taskId: number | string): Promise<TaskFile[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("body, created_at")
    .eq("attachable_id", Number(taskId))
    .eq("type", COMMENT_TYPE_FOR_TASK)
    .like("body", `${TASK_FILES_MARKER}%`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data?.length) return [];
  try {
    return JSON.parse(data[0].body.slice(TASK_FILES_MARKER.length)) as TaskFile[];
  } catch {
    return [];
  }
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

  // 🔧 ISSUE 9: نسجل الملفات اللي رجعت في الـ response في marker قابل للاسترجاع بعدين
  if (data?.files?.length && data?.task?.id) {
    recordTaskFilesMarker(data.task.id, data.files);
  }
  return data;
}

/**
 * الموظف بينشئ مهمة لنفسه فقط.
 *
 * ⚠️ ISSUE 7 — endpoint "create-task" موثق رسميًا كـ "Auth: Manager only".
 * الموظف مش هيقدر ينده عليه، فالبديل هنا insert مباشر في جدول tasks،
 * وده معتمد بالكامل على وجود RLS policy على الباك تسمح بـ:
 *   assigned_to = auth.uid()  AND  status = 'pending'
 * لو الـ policy دي مش موجودة، الـ insert هيترفض بخطأ RLS. ده مفيش له
 * حل فرونت حقيقي — لازم الباك يفعّل الـ policy دي (راجع المحادثة).
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
        "مش مسموح لك تضيف مهمة لنفسك دلوقتي — الصلاحية دي لازم تتفعّل من الباك (RLS policy)، مينفعش تتحل من الفرونت."
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

  // 🔧 ISSUE 9: نحدّث marker الملفات بأحدث نسخة رجعت من التعديل
  if (data?.files && payload.task_id) {
    recordTaskFilesMarker(Number(payload.task_id), data.files);
  }
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
 * 🔧 FIX (Issue 4) — حل فرونت-أونلي (fallback):
 * الـ RPC "update_task_status" موثق رسميًا للموظف بس "(emp)"، وممكن يكون
 * فيه check داخلي إن الكولر لازم يكون هو الـ assigned_to. لو المدير
 * اتاخد reject بسبب صلاحيات، بنجرب تحديث مباشر على جدول tasks (ممكن
 * الـ RLS على الجدول نفسه يكون بيسمح للمدير حتى لو الـ RPC مقفول عليه).
 * ⚠️ ده مش ضمان 100% — لو الـ RLS على الجدول نفسه برضو مقفول قدام
 * المدير، هيفشل الاتنين وهتظهر رسالة واضحة بدل ما يفضل الكارت "معلّق"
 * من غير تفسير.
 */
export async function updateTaskStatusAsManager(
  taskId: number | string,
  status: TaskStatus
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("update_task_status", {
    p_task_id: Number(taskId),
    p_status: status,
  });

  if (!rpcError) return;

  const isPermissionError =
    rpcError.code === "42501" || /permission|صلاحي|not allowed/i.test(rpcError.message);

  if (!isPermissionError) throw rpcError;

  // Fallback: تحديث مباشر على الجدول لو الـ RPC رافض المدير تحديدًا
  const { error: directError } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", Number(taskId));

  if (directError) {
    throw new Error(
      "الباك رافض تحديث حالة المهمة من المدير بأي طريقة (RPC ولا تحديث مباشر) — القيد ده في RLS ومحتاج تعديل هناك."
    );
  }
}

/* ============================================================
   COMMENTS
============================================================ */

export async function getTaskComments(taskId: number | string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("attachable_id", Number(taskId))
    .eq("type", COMMENT_TYPE_FOR_TASK)
    .order("created_at", { ascending: true });
  if (error) throw error;
  // 🔧 ISSUE 9: نفلتر marker الملفات بره عرض التعليقات العادي
  return (data ?? []).filter((c) => !c.body?.startsWith(TASK_FILES_MARKER));
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