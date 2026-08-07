// src/app/manager/tasks/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { Plus, Paperclip, MessageCircle, X, Trash2, Calendar, Check, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllTasks,
  getUsersList,
  getDepartments,
  createTask,
  deleteTask,
  subscribeToTasks,
} from "@/modules/tasks/api/tasks.api";
import type {
  TaskRow,
  TaskStatus,
  TaskPriority,
  UserLite,
  DepartmentLite,
} from "@/types/tasks";
import { TASK_STATUS_LABEL_AR, TASK_PRIORITY_LABEL_AR } from "@/types/tasks";

// ⚠️ الأعمدة دي بتعتمد على TaskStatus + عمود "late" محسوب محليًا (زي بورتال
// الموظف) بدل ما يكون status حقيقي. المشكلة: نقل مهمة بين الأعمدة (Kanban
// drag&drop أو "نقل المهمة إلى" في المودال) محتاج endpoint يغيّر حالة المهمة
// من جانب المدير — والدوك اللي وصلني فيه RPC واحد بس اسمه update_task_status
// وموصوف إنه "(emp)" بس. يعني حاليًا مفيش endpoint موثق للمدير يغيّر بيه
// الحالة. فسايبت النقل شغال محليًا (Optimistic UI) زي ما كان في النسخة القديمة
// من غير حفظ فعلي على السيرفر، ومحطوط توست يوضح كده. لما الباك يوفر RPC
// مخصص للمدير (أو يسمح لل RPC الحالي)، غيّر moveTaskLocalOnly في الملف ده
// عشان تنادي الباك فعليًا.
type ColId = "new" | "in_progress" | "paused" | "done" | "late" | "cancelled";

const columns: { id: ColId; label: string; tone: string }[] = [
  { id: "new", label: "جديدة", tone: "muted" },
  { id: "in_progress", label: "جاري التنفيذ", tone: "primary" },
  { id: "paused", label: "متوقفة", tone: "warning" },
  { id: "done", label: "مكتملة", tone: "success" },
  { id: "late", label: "متأخرة", tone: "danger" },
  { id: "cancelled", label: "ملغية", tone: "muted" },
];

const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "muted"> = {
  urgent: "danger",
  high: "danger",
  medium: "warning",
  low: "muted",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isLate(task: TaskRow) {
  return task.status !== "done" && new Date(task.end_date).getTime() < startOfToday().getTime();
}

function colOf(task: TaskRow): ColId {
  if (isLate(task)) return "late";
  return task.status as ColId;
}

function formatDue(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type FormState = {
  title: string;
  description: string;
  assignedTo: string; // uuid واحد بس — الباك بيدعم موظف واحد لكل مهمة
  departmentId: string;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  files: File[];
};

const emptyForm: FormState = {
  title: "",
  description: "",
  assignedTo: "",
  departmentId: "",
  priority: "medium",
  startDate: todayInputValue(),
  endDate: "",
  files: [],
};

export default function TasksPage() {
  const showToast = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [localColOverride, setLocalColOverride] = useState<Record<number, ColId>>({});
  const [users, setUsers] = useState<UserLite[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColId | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ title?: string; assignedTo?: string }>({});

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
      const rows = await getAllTasks();
      setTasks(rows);
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
    const unsubscribe = subscribeToTasks(() => load());
    return unsubscribe;
  }, [load]);

  // العمود الفعلي المعروض للمهمة = الحالة الحقيقية من السيرفر، إلا لو
  // المدير عمل نقل محلي (لسه مش متصل بالباك — راجع الملاحظة فوق)
  const colFor = useCallback(
    (task: TaskRow): ColId => localColOverride[task.id] ?? colOf(task),
    [localColOverride]
  );

  const tasksByCol = useMemo(() => {
    const map: Record<ColId, TaskRow[]> = { new: [], in_progress: [], paused: [], done: [], late: [], cancelled: [] };
    tasks.forEach((t) => map[colFor(t)].push(t));
    return map;
  }, [tasks, colFor]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      new: tasksByCol.new.length,
      doing: tasksByCol.in_progress.length,
      done: tasksByCol.done.length,
      late: tasksByCol.late.length,
      paused: tasksByCol.paused.length,
    }),
    [tasks, tasksByCol]
  );

  // نقل محلي فقط — راجع الملاحظة أعلى الملف ليه الحفظ الفعلي مش موصول بعد
  function moveTaskLocalOnly(taskId: number, col: ColId) {
    setLocalColOverride((prev) => ({ ...prev, [taskId]: col }));
    const task = tasks.find((t) => t.id === taskId);
    const colLabel = columns.find((c) => c.id === col)?.label;
    if (task) {
      showToast(
        "info",
        `تم النقل في الواجهة بس لسه مش متصل بالباك (${colLabel}) — محتاج endpoint من المدير`
      );
    }
  }

  function handleDrop(col: ColId) {
    if (dragTaskId != null) moveTaskLocalOnly(dragTaskId, col);
    setDragTaskId(null);
    setDragOverCol(null);
  }

  function openCreateModal() {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function selectAssignee(userId: string) {
    setForm((f) => ({ ...f, assignedTo: f.assignedTo === userId ? "" : userId }));
    setErrors((er) => ({ ...er, assignedTo: undefined }));
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "اكتب عنوان المهمة";
    if (!form.assignedTo) next.assignedTo = "اختر موظف مسؤول عن المهمة";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assigned_to: form.assignedTo,
        department_id: form.departmentId ? Number(form.departmentId) : undefined,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
        priority: form.priority,
        files: form.files,
      });
      showToast("success", res.message || `تم إنشاء المهمة "${form.title}"`);
      setModalOpen(false);
      load();
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
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {v === "kanban" ? "Kanban" : "قائمة"}
                </button>
              ))}
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm transition-all duration-200 hover:bg-primary-dark active:scale-95"
            >
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard dense label="إجمالي" value={stats.total} tone="primary" />
            <StatCard dense label="جديدة" value={stats.new} tone="teal" />
            <StatCard dense label="جارية" value={stats.doing} tone="primary" />
            <StatCard dense label="مكتملة" value={tasksByCol.done.length} tone="success" />
            <StatCard dense label="متأخرة" value={stats.late} tone="danger" />
            <StatCard dense label="متوقفة" value={stats.paused} tone="warning" />
          </div>

          {view === "kanban" ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {columns.map((c) => (
                <div
                  key={c.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(c.id);
                  }}
                  onDragLeave={() => setDragOverCol((cur) => (cur === c.id ? null : cur))}
                  onDrop={() => handleDrop(c.id)}
                  className={cn(
                    "flex min-h-[400px] flex-col rounded-2xl bg-card border transition-all duration-150",
                    dragOverCol === c.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                  )}
                >
                  <div className={cn("flex items-center justify-between rounded-t-2xl border-b border-border px-3 py-2.5 text-xs font-bold", `pill-${c.tone}`)}>
                    <span>{c.label}</span>
                    <span className="tabular">{tasksByCol[c.id].length}</span>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {tasksByCol[c.id].map((t, i) => {
                      const assignee = usersById[t.assigned_to];
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => setDragTaskId(t.id)}
                          onDragEnd={() => setDragTaskId(null)}
                          onClick={() => setActiveTask(t)}
                          className={cn(
                            "cursor-pointer rounded-xl border border-border bg-background p-3 text-sm transition-all duration-200 hover:border-primary/40 hover:shadow-warm active:scale-[0.98] animate-in fade-in slide-in-from-bottom-1",
                            dragTaskId === t.id && "opacity-40"
                          )}
                          style={{ animationDelay: `${i * 40}ms`, animationDuration: "250ms", animationFillMode: "backwards" }}
                        >
                          <div className="font-semibold leading-snug">{t.title}</div>
                          <div className="mt-2 flex items-center justify-between">
                            {assignee ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar name={assignee.name} size={22} />
                                <span className="text-[11px] text-muted-foreground">{assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                            <Pill tone={PRIORITY_TONE[t.priority]}>{TASK_PRIORITY_LABEL_AR[t.priority]}</Pill>
                          </div>
                          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                            <span>📅 {formatDue(t.end_date)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {tasksByCol[c.id].length === 0 && (
                      <div className="grid h-20 place-items-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">
                        اسحب مهمة هنا
                      </div>
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
                      <th>المهمة</th>
                      <th>المسؤول</th>
                      <th>الأولوية</th>
                      <th>الموعد</th>
                      <th>الحالة</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tasks.map((t, i) => {
                      const assignee = usersById[t.assigned_to];
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setActiveTask(t)}
                          className="row-hover hover:row-hover-active cursor-pointer animate-in fade-in slide-in-from-bottom-1"
                          style={{ animationDelay: `${i * 30}ms`, animationDuration: "250ms", animationFillMode: "backwards" }}
                        >
                          <td className="px-4 py-3 font-semibold">{t.title}</td>
                          <td className="px-4 py-3">
                            {assignee ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar name={assignee.name} size={22} />
                                <span className="text-xs">{assignee.name}</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={PRIORITY_TONE[t.priority]}>{TASK_PRIORITY_LABEL_AR[t.priority]}</Pill>
                          </td>
                          <td className="px-4 py-3 tabular text-muted-foreground">{formatDue(t.end_date)}</td>
                          <td className="px-4 py-3">
                            <Pill tone="muted">{columns.find((c) => c.id === colFor(t))?.label}</Pill>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(t.id);
                              }}
                              className="grid size-8 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10"
                            >
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
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-warm-lg animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">إنشاء مهمة جديدة</h2>
              <button onClick={() => setModalOpen(false)} className="grid size-8 place-items-center rounded-lg transition hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submitTask} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">عنوان المهمة *</label>
                <input
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));
                    setErrors((er) => ({ ...er, title: undefined }));
                  }}
                  className={cn(
                    "h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition",
                    errors.title ? "border-destructive" : "border-border focus:border-primary/50"
                  )}
                  placeholder="مثال: تجهيز محتوى الحملة"
                />
                {errors.title && <p className="mt-1 text-[11px] text-destructive">{errors.title}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">الوصف (اختياري)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/50 resize-none"
                  placeholder="تفاصيل أكتر عن المهمة"
                />
              </div>

              {/* ⚠️ الباك بيدعم موظف واحد بس لكل مهمة (assigned_to uuid مفرد)،
                  فسايبت شكل القائمة زي الاختيار المتعدد القديم بس فعليًا
                  بتسمح باختيار موظف واحد بس */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span>يشتغل عليها *</span>
                </label>
                <div className={cn("max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2", errors.assignedTo ? "border-destructive" : "border-border")}>
                  {users.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">جاري تحميل الموظفين...</p>}
                  {users.map((u) => {
                    const checked = form.assignedTo === u.id;
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => selectAssignee(u.id)}
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
                {errors.assignedTo && <p className="mt-1 text-[11px] text-destructive">{errors.assignedTo}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">القسم (اختياري)</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                >
                  <option value="">بدون قسم محدد</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">الأولوية</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  >
                    {(Object.keys(TASK_PRIORITY_LABEL_AR) as TaskPriority[]).map((key) => (
                      <option key={key} value={key}>
                        {TASK_PRIORITY_LABEL_AR[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">تاريخ البداية</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">الموعد النهائي</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">مرفقات (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 p-4 text-xs text-muted-foreground transition hover:bg-primary/5">
                  <Upload className="size-4 text-primary" />
                  {form.files.length > 0 ? `${form.files.length} ملف مختار` : "اضغط لاختيار ملفات"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setForm((f) => ({ ...f, files: Array.from(e.target.files ?? []) }))}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-95 disabled:opacity-60"
                >
                  {submitting ? "جاري الإنشاء..." : "إنشاء المهمة"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-accent">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تفاصيل المهمة */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in duration-150" onClick={() => setActiveTask(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-warm-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold leading-snug">{activeTask.title}</h2>
              <button onClick={() => setActiveTask(null)} className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {activeTask.description && <p className="text-muted-foreground">{activeTask.description}</p>}
              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">يشتغل عليها</span>
                {usersById[activeTask.assigned_to] ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-1 w-fit">
                    <Avatar name={usersById[activeTask.assigned_to].name} size={22} />
                    <span className="text-xs font-medium">{usersById[activeTask.assigned_to].name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" /> {formatDue(activeTask.end_date)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">الأولوية:</span>
                <Pill tone={PRIORITY_TONE[activeTask.priority]}>{TASK_PRIORITY_LABEL_AR[activeTask.priority]}</Pill>
              </div>
              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">القسم</span>
                <span>{departmentsById[activeTask.department_id] ?? "—"}</span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  نقل المهمة إلى (محليًا فقط — راجع الملاحظة في تعليقات الكود)
                </label>
                <select
                  value={colFor(activeTask)}
                  onChange={(e) => moveTaskLocalOnly(activeTask.id, e.target.value as ColId)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => handleDeleteTask(activeTask.id)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive transition hover:bg-destructive/10 active:scale-95"
              >
                <Trash2 className="size-4" /> حذف المهمة
              </button>
              <button onClick={() => setActiveTask(null)} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-accent">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}