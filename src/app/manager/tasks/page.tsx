"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import { Plus, Paperclip, MessageCircle, X, Trash2, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ColId = "new" | "doing" | "paused" | "done" | "late" | "cancel";
type PriorityTone = "danger" | "warning" | "muted";

type Task = {
  id: string;
  t: string;
  assignees: string[]; // بدل who بقت مصفوفة أسماء
  pr: string;
  prTone: PriorityTone;
  due: string;
  att: number;
  cm: number;
  col: ColId;
};

// قائمة الموظفين الموجودين فعليًا (ممكن تيجي من الـ API بدل الهاردكود)
const EMPLOYEES = [
  "نورا حسن", "محمود علي", "سارة إبراهيم", "كريم سعيد",
  "دينا فتحي", "خالد يوسف", "ياسر أحمد",
];

const columns: { id: ColId; label: string; tone: string }[] = [
  { id: "new", label: "جديدة", tone: "muted" },
  { id: "doing", label: "جاري التنفيذ", tone: "primary" },
  { id: "paused", label: "متوقفة", tone: "warning" },
  { id: "done", label: "مكتملة", tone: "success" },
  { id: "late", label: "متأخرة", tone: "danger" },
  { id: "cancel", label: "ملغية", tone: "muted" },
];

const PRIORITIES: { label: string; tone: PriorityTone }[] = [
  { label: "منخفضة", tone: "muted" },
  { label: "متوسطة", tone: "warning" },
  { label: "عالية", tone: "danger" },
  { label: "عاجلة", tone: "danger" },
];

const initialTasks: Task[] = [
  { id: "1", t: "تجهيز محتوى الحملة الجديدة", assignees: ["نورا حسن"], pr: "عالية", prTone: "danger", due: "22 يوليو", att: 2, cm: 1, col: "new" },
  { id: "2", t: "مراجعة قائمة الليدز", assignees: ["محمود علي", "كريم سعيد"], pr: "متوسطة", prTone: "warning", due: "23 يوليو", att: 0, cm: 3, col: "new" },
  { id: "3", t: "تصميم كاروسيل انستجرام", assignees: ["دينا فتحي"], pr: "عالية", prTone: "danger", due: "21 يوليو", att: 4, cm: 2, col: "doing" },
  { id: "4", t: "مكالمات متابعة العملاء", assignees: ["محمود علي"], pr: "متوسطة", prTone: "warning", due: "21 يوليو", att: 0, cm: 0, col: "doing" },
  { id: "5", t: "تحديث Brand Guidelines", assignees: ["سارة إبراهيم"], pr: "منخفضة", prTone: "muted", due: "—", att: 1, cm: 0, col: "paused" },
  { id: "6", t: "تقرير المبيعات الشهري", assignees: ["دينا فتحي", "سارة إبراهيم"], pr: "عاجلة", prTone: "danger", due: "18 يوليو", att: 2, cm: 4, col: "done" },
  { id: "7", t: "تدريب مندوبين جدد", assignees: ["كريم سعيد"], pr: "متوسطة", prTone: "warning", due: "17 يوليو", att: 1, cm: 2, col: "done" },
  { id: "8", t: "فيديو الحملة الرمضانية", assignees: ["ياسر أحمد", "دينا فتحي", "محمود علي"], pr: "عاجلة", prTone: "danger", due: "15 يوليو", att: 3, cm: 5, col: "late" },
];

type FormState = { t: string; assignees: string[]; pr: string; due: string; col: ColId };
const emptyForm: FormState = { t: "", assignees: [], pr: "متوسطة", due: "", col: "new" };

export default function TasksPage() {
  const showToast = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColId | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ t?: string; assignees?: string }>({});

  const tasksByCol = useMemo(() => {
    const map: Record<ColId, Task[]> = { new: [], doing: [], paused: [], done: [], late: [], cancel: [] };
    tasks.forEach((task) => map[task.col].push(task));
    return map;
  }, [tasks]);

  const stats = useMemo(() => ({
    total: tasks.length,
    new: tasksByCol.new.length,
    doing: tasksByCol.doing.length,
    done: tasksByCol.done.length,
    late: tasksByCol.late.length,
    paused: tasksByCol.paused.length,
  }), [tasks, tasksByCol]);

  function moveTask(id: string, col: ColId) {
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, col } : t)));
    const task = tasks.find((t) => t.id === id);
    const colLabel = columns.find((c) => c.id === col)?.label;
    if (task) showToast("success", `تم نقل "${task.t}" إلى ${colLabel}`);
  }

  function handleDrop(col: ColId) {
    if (dragTaskId) moveTask(dragTaskId, col);
    setDragTaskId(null);
    setDragOverCol(null);
  }

  function openCreateModal() {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function toggleAssignee(name: string) {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(name)
        ? f.assignees.filter((a) => a !== name)
        : [...f.assignees, name],
    }));
    setErrors((er) => ({ ...er, assignees: undefined }));
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.t.trim()) next.t = "اكتب عنوان المهمة";
    if (form.assignees.length === 0) next.assignees = "اختر موظف واحد على الأقل";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const prTone = PRIORITIES.find((p) => p.label === form.pr)?.tone ?? "muted";
    const newTask: Task = {
      id: String(Date.now()),
      t: form.t.trim(),
      assignees: form.assignees,
      pr: form.pr,
      prTone,
      due: form.due || "—",
      att: 0,
      cm: 0,
      col: form.col,
    };
    setTasks((list) => [newTask, ...list]);
    showToast("success", `تم إنشاء المهمة "${newTask.t}"`);
    setModalOpen(false);
  }

  function deleteTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!window.confirm(`متأكد إنك عايز تحذف "${task.t}"؟`)) return;
    setTasks((list) => list.filter((t) => t.id !== id));
    showToast("success", "تم حذف المهمة");
    setActiveTask(null);
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
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(c.id); }}
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
                {tasksByCol[c.id].map((t, i) => (
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
                    <div className="font-semibold leading-snug">{t.t}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <AssigneeStack names={t.assignees} />
                      <Pill tone={t.prTone}>{t.pr}</Pill>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                      <span>📅 {t.due}</span>
                      <span className="flex gap-2">
                        {t.att > 0 && <span className="flex items-center gap-0.5"><Paperclip className="size-3" />{t.att}</span>}
                        {t.cm > 0 && <span className="flex items-center gap-0.5"><MessageCircle className="size-3" />{t.cm}</span>}
                      </span>
                    </div>
                  </div>
                ))}
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
                  <th>المهمة</th><th>المسؤولون</th><th>الأولوية</th><th>الموعد</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((t, i) => (
                  <tr
                    key={t.id}
                    onClick={() => setActiveTask(t)}
                    className="row-hover hover:row-hover-active cursor-pointer animate-in fade-in slide-in-from-bottom-1"
                    style={{ animationDelay: `${i * 30}ms`, animationDuration: "250ms", animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-3 font-semibold">{t.t}</td>
                    <td className="px-4 py-3"><AssigneeStack names={t.assignees} showLabel /></td>
                    <td className="px-4 py-3"><Pill tone={t.prTone}>{t.pr}</Pill></td>
                    <td className="px-4 py-3 tabular text-muted-foreground">{t.due}</td>
                    <td className="px-4 py-3">
                      <Pill tone="muted">{columns.find((c) => c.id === t.col)?.label}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
                        className="grid size-8 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* مودال إنشاء مهمة */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in duration-150"
          onClick={() => setModalOpen(false)}
        >
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
                  value={form.t}
                  onChange={(e) => { setForm((f) => ({ ...f, t: e.target.value })); setErrors((er) => ({ ...er, t: undefined })); }}
                  className={cn(
                    "h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition",
                    errors.t ? "border-destructive" : "border-border focus:border-primary/50"
                  )}
                  placeholder="مثال: تجهيز محتوى الحملة"
                />
                {errors.t && <p className="mt-1 text-[11px] text-destructive">{errors.t}</p>}
              </div>

              {/* اختيار عدة موظفين */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span>يشتغل عليها *</span>
                  {form.assignees.length > 0 && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {form.assignees.length} محدد
                    </span>
                  )}
                </label>

                <div className={cn(
                  "max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2",
                  errors.assignees ? "border-destructive" : "border-border"
                )}>
                  {EMPLOYEES.map((name) => {
                    const checked = form.assignees.includes(name);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleAssignee(name)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-sm transition",
                          checked ? "bg-primary/10" : "hover:bg-accent"
                        )}
                      >
                        <span className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border transition",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}>
                          {checked && <Check className="size-3.5" />}
                        </span>
                        <Avatar name={name} size={24} />
                        <span className="flex-1">{name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Chips للمختارين */}
                {form.assignees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.assignees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex animate-in fade-in zoom-in-95 items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-2.5 text-xs font-medium text-primary duration-150"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => toggleAssignee(name)}
                          className="grid size-4 place-items-center rounded-full hover:bg-primary/20"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {errors.assignees && <p className="mt-1 text-[11px] text-destructive">{errors.assignees}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">الأولوية</label>
                  <select
                    value={form.pr}
                    onChange={(e) => setForm((f) => ({ ...f, pr: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  >
                    {PRIORITIES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">العمود</label>
                  <select
                    value={form.col}
                    onChange={(e) => setForm((f) => ({ ...f, col: e.target.value as ColId }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  >
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">الموعد النهائي (اختياري)</label>
                <input
                  value={form.due}
                  onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary/50"
                  placeholder="مثال: 25 يوليو"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-95">
                  إنشاء المهمة
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in duration-150"
          onClick={() => setActiveTask(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-warm-lg animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold leading-snug">{activeTask.t}</h2>
              <button onClick={() => setActiveTask(null)} className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">يشتغل عليها</span>
                <div className="flex flex-wrap gap-2">
                  {activeTask.assignees.map((name) => (
                    <div key={name} className="flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-1">
                      <Avatar name={name} size={22} />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" /> {activeTask.due}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">الأولوية:</span>
                <Pill tone={activeTask.prTone}>{activeTask.pr}</Pill>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">نقل المهمة إلى</label>
                <select
                  value={activeTask.col}
                  onChange={(e) => {
                    const col = e.target.value as ColId;
                    moveTask(activeTask.id, col);
                    setActiveTask((t) => (t ? { ...t, col } : t));
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                >
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => deleteTask(activeTask.id)}
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

// كومبوننت صغير بيعرض أفاتارات متراكبة لكل الموظفين المسؤولين عن المهمة
function AssigneeStack({ names, showLabel }: { names: string[]; showLabel?: boolean }) {
  if (names.length === 0) return <span className="text-[11px] text-muted-foreground">—</span>;

  const visible = names.slice(0, 3);
  const extra = names.length - visible.length;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2 [direction:ltr]">
        {visible.map((name) => (
          <div key={name} className="rounded-full ring-2 ring-background" title={name}>
            <Avatar name={name} size={22} />
          </div>
        ))}
        {extra > 0 && (
          <div className="grid size-[22px] place-items-center rounded-full bg-muted text-[9px] font-semibold ring-2 ring-background">
            +{extra}
          </div>
        )}
      </div>
      {showLabel && names.length === 1 && (
        <span className="text-[11px] text-muted-foreground">{names[0]}</span>
      )}
    </div>
  );
}