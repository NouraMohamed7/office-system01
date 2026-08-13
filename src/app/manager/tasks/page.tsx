"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { Plus, X, Trash2, Calendar, Check, Loader2, Upload, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllTasks, getUsersList, getDepartments, createTaskForMultipleAssignees, deleteTask,
  updateTaskStatusAsManager, subscribeToTasks, getTaskComments, addTaskComment, subscribeToTaskComments,
} from "@/modules/tasks/api/tasks.api";
import type { TaskRow, TaskStatus, TaskPriority, UserLite, DepartmentLite, TaskComment } from "@/types/tasks";
import { TASK_PRIORITY_LABEL_AR } from "@/types/tasks";

// أعمدة الـ Kanban = enum task_status الحقيقي بالظبط
const columns: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "pending", label: "جديدة", tone: "muted" },
  { id: "processing", label: "جاري التنفيذ", tone: "primary" },
  { id: "completed", label: "مكتملة", tone: "success" },
  { id: "late", label: "متأخرة", tone: "danger" },
  { id: "cancelled", label: "ملغية", tone: "muted" },
];

const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "muted"> = {
  urgent: "danger", high: "danger", medium: "warning", low: "muted",
};

function formatDue(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 🔧 FIX (Issue 1 & 5): زرار priority بيلبس أيقونة/تمييز إضافي لو "عاجلة" —
// عشان متبقاش متطابقة بصريًا مع "عالية" رغم إن اللون نفسه (danger) لسه
// مستخدم من الـ Pill component الأساسي.
function PriorityPill({ p }: { p: TaskPriority }) {
  return (
    <Pill tone={PRIORITY_TONE[p]}>
      <span className="inline-flex items-center gap-1">
        {p === "urgent" && <Zap className="size-3" />}
        {TASK_PRIORITY_LABEL_AR[p]}
      </span>
    </Pill>
  );
}

type FormState = {
  title: string; description: string; assignedTo: string[]; departmentId: string;
  priority: TaskPriority; startDate: string; endDate: string; files: File[];
};

const emptyForm: FormState = {
  title: "", description: "", assignedTo: [], departmentId: "",
  priority: "medium", startDate: todayInputValue(), endDate: "", files: [],
};

export default function TasksPage() {
  const showToast = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);

  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ title?: string; assignedTo?: string; departmentId?: string; endDate?: string }>({});

  const usersById = useMemo(() => {
    const map: Record<string, UserLite> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  const departmentsById = useMemo(() => {
    const map: Record<number, string> = {};
    departments.forEach((d) => (map[d.id] = d.name));
    return map;
  }, [departments]);

  const load = useCallback(async () => {
    try {
      setTasks(await getAllTasks());
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تحميل المهام");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    getUsersList().then(setUsers).catch(() => {});
    getDepartments().then(setDepartments).catch(() => {});
    return subscribeToTasks(() => load());
  }, [load]);

  // 🔧 FIX (Issue 4): المودال المفتوح (activeTask) كان نسخة "مجمّدة" — لو
  // الـ tasks اتحدثت (من realtime أو من moveTask) والمودال فاتح على نفس
  // المهمة، لازم يتزامن بدل ما يفضل يعرض الحالة القديمة.
  useEffect(() => {
    if (!activeTask) return;
    const fresh = tasks.find((t) => t.id === activeTask.id);
    if (fresh && fresh !== activeTask) setActiveTask(fresh);
  }, [tasks, activeTask]);

  const tasksByCol = useMemo(() => {
    const map: Record<TaskStatus, TaskRow[]> = { pending: [], processing: [], completed: [], late: [], cancelled: [] };
    tasks.forEach((t) => map[t.status].push(t));
    return map;
  }, [tasks]);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasksByCol.pending.length,
    processing: tasksByCol.processing.length,
    completed: tasksByCol.completed.length,
    late: tasksByCol.late.length,
  }), [tasks, tasksByCol]);

  const filteredUsers = useMemo(() => {
    if (!form.departmentId) return [];
    const hasDeptInfo = users.some((u) => u.department_id != null);
    if (!hasDeptInfo) return users;
    return users.filter((u) => String(u.department_id) === form.departmentId);
  }, [users, form.departmentId]);

  async function moveTask(taskId: number, status: TaskStatus) {
    const prevTasks = tasks;
    setMovingTaskId(taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await updateTaskStatusAsManager(taskId, status);
      showToast("success", `تم نقل المهمة إلى "${columns.find((c) => c.id === status)?.label}"`);
    } catch (err) {
      setTasks(prevTasks); // rollback لو الباك رفض — راجع updateTaskStatusAsManager للسبب المحتمل
      showToast("error", err instanceof Error ? err.message : "تعذر تحديث حالة المهمة");
    } finally {
      setMovingTaskId(null);
    }
  }

  function handleDrop(col: TaskStatus) {
    if (dragTaskId != null) moveTask(dragTaskId, col);
    setDragTaskId(null);
    setDragOverCol(null);
  }

  function openCreateModal() {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function selectDepartment(deptId: string) {
    setForm((f) => ({ ...f, departmentId: deptId, assignedTo: [] }));
    setErrors((er) => ({ ...er, departmentId: undefined }));
  }

  function toggleAssignee(userId: string) {
    setForm((f) => ({
      ...f,
      assignedTo: f.assignedTo.includes(userId)
        ? f.assignedTo.filter((id) => id !== userId)
        : [...f.assignedTo, userId],
    }));
    setErrors((er) => ({ ...er, assignedTo: undefined }));
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "اكتب عنوان المهمة";
    if (!form.departmentId) next.departmentId = "اختر القسم الأول";
    if (form.assignedTo.length === 0) next.assignedTo = "اختر موظف واحد على الأقل";
    if (!form.endDate) next.endDate = "حدد الموعد النهائي للمهمة";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { successCount, failed, files } = await createTaskForMultipleAssignees({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        department_id: Number(form.departmentId),
        start_date: form.startDate,
        end_date: form.endDate,
        priority: form.priority,
        files: form.files,
        assigned_to: form.assignedTo,
      });

      if (successCount > 0) {
        const filesNote = files.length ? ` مع ${files.length} ملف` : "";
        showToast(
          "success",
          `تم إنشاء ${successCount} مهمة بنجاح${filesNote}${failed.length ? ` — تعذر إنشاء ${failed.length}` : ""}`
        );
        setModalOpen(false);
        load();
      } else {
        showToast("error", failed[0]?.error || "تعذر إنشاء المهمة");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إنشاء المهمة");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTask(id: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!window.confirm(`متأكد إنك عايز تحذف "${task.title}"؟`)) return;
    try {
      await deleteTask(id);
      showToast("success", "تم حذف المهمة");
      setActiveTask(null);
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر حذف المهمة");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المهام"
        subtitle="لوحة المهام لكامل الشركة."
        actions={
          <>
            <div className="flex items-center rounded-xl border border-border bg-background p-1">
              {(["kanban", "list"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
                  {v === "kanban" ? "Kanban" : "قائمة"}
                </button>
              ))}
            </div>
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm transition-all duration-200 hover:bg-primary-dark active:scale-95">
              <Plus className="size-4" /> إنشاء مهمة جديدة
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل المهام...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard dense label="إجمالي" value={stats.total} tone="primary" />
            <StatCard dense label="جديدة" value={stats.pending} tone="teal" />
            <StatCard dense label="جارية" value={stats.processing} tone="primary" />
            <StatCard dense label="مكتملة" value={stats.completed} tone="success" />
            <StatCard dense label="متأخرة" value={stats.late} tone="danger" />
          </div>

          {view === "kanban" ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {columns.map((c) => (
                <div key={c.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(c.id); }}
                  onDragLeave={() => setDragOverCol((cur) => (cur === c.id ? null : cur))}
                  onDrop={() => handleDrop(c.id)}
                  className={cn("flex min-h-[400px] flex-col rounded-2xl bg-card border transition-all duration-150", dragOverCol === c.id ? "border-primary ring-2 ring-primary/30" : "border-border")}>
                  <div className={cn("flex items-center justify-between rounded-t-2xl border-b border-border px-3 py-2.5 text-xs font-bold", `pill-${c.tone}`)}>
                    <span>{c.label}</span>
                    <span className="tabular">{tasksByCol[c.id].length}</span>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {tasksByCol[c.id].map((t, i) => {
                      const assignee = usersById[t.assigned_to];
                      return (
                        <div key={t.id} draggable onDragStart={() => setDragTaskId(t.id)} onDragEnd={() => setDragTaskId(null)} onClick={() => setActiveTask(t)}
                          className={cn("cursor-pointer rounded-xl border border-border bg-background p-3 text-sm transition-all duration-200 hover:border-primary/40 hover:shadow-warm active:scale-[0.98] animate-in fade-in slide-in-from-bottom-1",
                            dragTaskId === t.id && "opacity-40", movingTaskId === t.id && "opacity-60 pointer-events-none")}
                          style={{ animationDelay: `${i * 40}ms`, animationDuration: "250ms", animationFillMode: "backwards" }}>
                          <div className="font-semibold leading-snug">{t.title}</div>
                          <div className="mt-2 flex items-center justify-between">
                            {assignee ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar name={assignee.name} size={22} />
                                <span className="text-[11px] text-muted-foreground">{assignee.name}</span>
                              </div>
                            ) : <span className="text-[11px] text-muted-foreground">—</span>}
                            <PriorityPill p={t.priority} />
                          </div>
                          {typeof t.completion_percent === "number" && (
                            <div className="mt-2 h-1 w-full rounded-full bg-secondary overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${t.completion_percent}%` }} />
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                            <span>📅 {formatDue(t.end_date)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {tasksByCol[c.id].length === 0 && (
                      <div className="grid h-20 place-items-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">اسحب مهمة هنا</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-accent/40 text-xs text-muted-foreground">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                      <th>المهمة</th><th>المسؤول</th><th>الأولوية</th><th>الموعد</th><th>الحالة</th><th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tasks.map((t, i) => {
                      const assignee = usersById[t.assigned_to];
                      return (
                        <tr key={t.id} onClick={() => setActiveTask(t)} className="row-hover hover:row-hover-active cursor-pointer animate-in fade-in slide-in-from-bottom-1"
                          style={{ animationDelay: `${i * 30}ms`, animationDuration: "250ms", animationFillMode: "backwards" }}>
                          <td className="px-4 py-3 font-semibold">{t.title}</td>
                          <td className="px-4 py-3">
                            {assignee ? (
                              <div className="flex items-center gap-1.5"><Avatar name={assignee.name} size={22} /><span className="text-xs">{assignee.name}</span></div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3"><PriorityPill p={t.priority} /></td>
                          <td className="px-4 py-3 tabular text-muted-foreground">{formatDue(t.end_date)}</td>
                          <td className="px-4 py-3"><Pill tone="muted">{columns.find((c) => c.id === t.status)?.label}</Pill></td>
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id); }} className="grid size-8 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10">
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* مودال إنشاء مهمة */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in duration-150" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-warm-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">إنشاء مهمة جديدة</h2>
              <button onClick={() => setModalOpen(false)} className="grid size-8 place-items-center rounded-lg transition hover:bg-accent"><X className="size-4" /></button>
            </div>

            <form onSubmit={submitTask} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">عنوان المهمة *</label>
                <input value={form.title} onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: undefined })); }}
                  className={cn("h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition", errors.title ? "border-destructive" : "border-border focus:border-primary/50")}
                  placeholder="مثال: تجهيز محتوى الحملة" />
                {errors.title && <p className="mt-1 text-[11px] text-destructive">{errors.title}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">الوصف (اختياري)</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/50 resize-none" placeholder="تفاصيل أكتر عن المهمة" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">القسم *</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => selectDepartment(e.target.value)}
                  className={cn("h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none", errors.departmentId ? "border-destructive" : "border-border focus:border-primary/50")}
                >
                  <option value="">اختر القسم</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.departmentId && <p className="mt-1 text-[11px] text-destructive">{errors.departmentId}</p>}
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span>يشتغل عليها * (تقدر تختار أكتر من موظف)</span>
                </label>
                {!form.departmentId ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    اختر القسم الأول عشان تظهر قايمة الموظفين
                  </p>
                ) : (
                  <div className={cn("max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2", errors.assignedTo ? "border-destructive" : "border-border")}>
                    {filteredUsers.length === 0 && (
                      <p className="px-2 py-2 text-xs text-muted-foreground">لا يوجد موظفين في هذا القسم</p>
                    )}
                    {filteredUsers.map((u) => {
                      const checked = form.assignedTo.includes(u.id);
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => toggleAssignee(u.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-sm transition",
                            checked ? "bg-primary/10" : "hover:bg-accent"
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-md border transition",
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            )}
                          >
                            {checked && <Check className="size-3.5" />}
                          </span>
                          <Avatar name={u.name} size={24} />
                          <span className="flex-1">{u.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.assignedTo && <p className="mt-1 text-[11px] text-destructive">{errors.assignedTo}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  {/* 🔧 FIX (Issue 1 & 5): dropdown بيعرض كل الخيارات الأربعة كاملة
                      دايمًا (مفيش تزنيق)، فـ"عاجلة" ظاهرة زي بقية الخيارات */}
                  <label className="mb-1.5 block text-xs font-semibold">الأولوية</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50">
                    {(Object.keys(TASK_PRIORITY_LABEL_AR) as TaskPriority[]).map((key) => (
                      <option key={key} value={key}>
                        {key === "urgent" ? `⚡ ${TASK_PRIORITY_LABEL_AR[key]}` : TASK_PRIORITY_LABEL_AR[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">تاريخ البداية</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">الموعد النهائي *</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => { setForm((f) => ({ ...f, endDate: e.target.value })); setErrors((er) => ({ ...er, endDate: undefined })); }}
                  className={cn("h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition", errors.endDate ? "border-destructive" : "border-border focus:border-primary/50")}
                />
                {errors.endDate && <p className="mt-1 text-[11px] text-destructive">{errors.endDate}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">مرفقات (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 p-4 text-xs text-muted-foreground transition hover:bg-primary/5">
                  <Upload className="size-4 text-primary" />
                  {form.files.length > 0 ? `${form.files.length} ملف مختار` : "اضغط لاختيار ملفات"}
                  <input type="file" multiple className="hidden" onChange={(e) => setForm((f) => ({ ...f, files: Array.from(e.target.files ?? []) }))} />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submitting} className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-95 disabled:opacity-60">
                  {submitting ? "جاري الإنشاء..." : `إنشاء المهمة${form.assignedTo.length > 1 ? ` (${form.assignedTo.length} موظفين)` : ""}`}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-accent">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تفاصيل المهمة */}
      {activeTask && (
        <TaskDetailsModal
          task={activeTask}
          assignee={usersById[activeTask.assigned_to]}
          departmentName={departmentsById[activeTask.department_id] ?? "—"}
          onClose={() => setActiveTask(null)}
          onMove={(status) => moveTask(activeTask.id, status)}
          onDelete={() => handleDeleteTask(activeTask.id)}
        />
      )}
    </div>
  );
}

/**
 * 🔧 FIX (Issue 2 & 8): مودال تفاصيل المهمة عند المدير كان من غير أي تعليقات
 * ولا start_date ولا نسبة إنجاز. اتفصل هنا كـ component مستقل عشان يقدر
 * يدير state التعليقات بتاعته (تحميل + إرسال + realtime) لوحده.
 */
function TaskDetailsModal({
  task, assignee, departmentName, onClose, onMove, onDelete,
}: {
  task: TaskRow;
  assignee?: UserLite;
  departmentName: string;
  onClose: () => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
}) {
  const showToast = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    getTaskComments(task.id)
      .then((rows) => { if (active) setComments(rows); })
      .catch(() => {})
      .finally(() => { if (active) setCommentsLoading(false); });
    const unsubscribe = subscribeToTaskComments(task.id, () => {
      getTaskComments(task.id).then((rows) => { if (active) setComments(rows); }).catch(() => {});
    });
    return () => { active = false; unsubscribe(); };
  }, [task.id]);

  const handleSend = async () => {
    if (!commentText.trim()) { showToast("error", "من فضلك اكتب تعليقًا قبل الإرسال"); return; }
    try {
      const newComment = await addTaskComment(task.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إرسال التعليق");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-warm-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold leading-snug">{task.title}</h2>
          <button onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-accent"><X className="size-4" /></button>
        </div>

        <div className="space-y-3 text-sm">
          {task.description && <p className="text-muted-foreground">{task.description}</p>}
          <div>
            <span className="mb-1.5 block text-xs text-muted-foreground">يشتغل عليها</span>
            {assignee ? (
              <div className="flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-1 w-fit">
                <Avatar name={assignee.name} size={22} />
                <span className="text-xs font-medium">{assignee.name}</span>
              </div>
            ) : <span className="text-xs text-muted-foreground">—</span>}
          </div>

          {/* 🔧 FIX (Issue 6 & 8): تاريخ البداية بقى ظاهر جنب النهاية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4" /> من {formatDue(task.start_date)}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4" /> لحد {formatDue(task.end_date)}</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">الأولوية:</span>
            <PriorityPill p={task.priority} />
          </div>

          {typeof task.completion_percent === "number" && (
            <div>
              <span className="mb-1.5 block text-xs text-muted-foreground">نسبة الإنجاز</span>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${task.completion_percent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{task.completion_percent}%</span>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs text-muted-foreground">القسم</span>
            <span>{departmentName}</span>
          </div>

          {/* ⚠️ ISSUE 9 — backend gap: نفس الملحوظة في صفحة الموظف */}
          <div>
            <span className="mb-1.5 block text-xs text-muted-foreground">المرفقات</span>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              عرض مرفقات المهمة مش متاح حاليًا — محتاج endpoint من الباك لقراءة الملفات المرتبطة بالمهمة بعد إنشائها.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">نقل المهمة إلى</label>
            <select value={task.status} onChange={(e) => onMove(e.target.value as TaskStatus)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50">
              {columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">"متأخرة" بتتحدد تلقائيًا حسب الموعد، بس تقدر تغيّرها يدويًا هنا لو محتاج.</p>
          </div>

          {/* 🔧 FIX (Issue 2): سكشن التعليقات كان مش موجود خالص عند المدير */}
          <div className="border-t border-border pt-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">التعليقات</div>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {commentsLoading && <p className="text-xs text-muted-foreground">جاري تحميل التعليقات...</p>}
              {!commentsLoading && comments.length === 0 && <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-secondary/60 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{usersById_placeholder(c.sender_id, assignee)}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-EG")}</span>
                  </div>
                  <div className="text-xs">{c.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="اكتب تعليقاً..."
                className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50 outline-none"
              />
              <button onClick={handleSend} className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition">إرسال</button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onDelete} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive transition hover:bg-destructive/10 active:scale-95">
            <Trash2 className="size-4" /> حذف المهمة
          </button>
          <button onClick={onClose} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-accent">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

/**
 * ⚠️ الاسم مؤقت — لسه ملناش usersMap كامل جوه المودال ده (المكوّن مستقل
 * ومش مستقبِل usersById كله، بس الـ assignee). لو عايز اسم المُعلّق الحقيقي
 * لأي شخص غير assignee (مثلاً مدير تاني)، مرّر usersById كـ prop للمودال
 * بدل الاعتماد على السطر ده.
 */
function usersById_placeholder(senderId: string, assignee?: UserLite): string {
  if (assignee && assignee.id === senderId) return assignee.name;
  return "مستخدم";
}