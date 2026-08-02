// src/app/tasks/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import {
  Calendar,
  Paperclip,
  MessageCircle,
  X,
  Upload,
  LayoutGrid,
  List,
  Circle,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  UserRound,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";

type Priority = "low" | "med" | "high";
// الحالة اللي الموظف نفسه بيحددها — "متأخرة" مش من ضمنها، بتتحسب أوتوماتيك من الديدلاين
type EmployeeStatus = "new" | "progress" | "done";

interface Comment {
  name: string;
  text: string;
  time: string;
}

interface Task {
  id: number;
  title: string;
  desc: string;
  priority: Priority;
  dueDate: Date;
  assignedBy: string;
  assignedByRole: string;
  attachments: number;
  status: EmployeeStatus;
  comments: Comment[];
}

function daysFromToday(n: number) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const MANAGER = { name: "أحمد الشريف", role: "مدير" };

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "تصميم بوست إطلاق حملة الصيف",
    desc: "إعداد 3 نماذج للبوست الرئيسي بمقاسات Instagram وFacebook، مع مراعاة هوية الحملة الجديدة.",
    priority: "high",
    dueDate: daysFromToday(2),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 2,
    status: "progress",
    comments: [
      { name: "أحمد", text: "من فضلك راجع الألوان في النموذج الثاني.", time: "منذ ساعة" },
      { name: "سارة", text: "تم التعديل حسب الملاحظات ✅", time: "منذ 20 دقيقة" },
    ],
  },
  {
    id: 2,
    title: "مراجعة سكربت المكالمات الجديد",
    desc: "قراءة الإصدار الأخير ومراجعة النقاط الأساسية قبل تعميمه على فريق الكول سنتر.",
    priority: "med",
    dueDate: daysFromToday(1),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 1,
    status: "new",
    comments: [],
  },
  {
    id: 3,
    title: "إعداد شيت ليدز الأسبوع",
    desc: "تجميع الليدز من قنوات التواصل مع فلترة حسب الجودة ومصدر العميل.",
    priority: "med",
    dueDate: daysFromToday(0),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 0,
    status: "progress",
    comments: [],
  },
  {
    id: 4,
    title: "تسجيل ريلز عن العروض",
    desc: "تصوير ومونتاج ريل مدته 30 ثانية يعرض عروض الأسبوع الحالية.",
    priority: "high",
    dueDate: daysFromToday(-1),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 3,
    status: "progress",
    comments: [],
  },
  {
    id: 5,
    title: "تقرير أداء يونيو",
    desc: "تجهيز التقرير الشهري والإرسال للمدير قبل بداية الشهر الجديد.",
    priority: "low",
    dueDate: daysFromToday(-5),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 1,
    status: "done",
    comments: [],
  },
  {
    id: 6,
    title: "متابعة مقابلات المناديب",
    desc: "تأكيد مواعيد 5 مندوبين للأسبوع القادم والتنسيق مع قسم الموارد البشرية.",
    priority: "med",
    dueDate: daysFromToday(-3),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 0,
    status: "new",
    comments: [],
  },
  {
    id: 7,
    title: "رد على شكاوى العملاء",
    desc: "معالجة 12 شكوى معلقة في نظام الدعم والرد على العميل خلال 24 ساعة.",
    priority: "high",
    dueDate: daysFromToday(-6),
    assignedBy: MANAGER.name,
    assignedByRole: MANAGER.role,
    attachments: 0,
    status: "new",
    comments: [{ name: "أحمد", text: "المهمة دي متأخرة، محتاجين نقفلها النهاردة.", time: "منذ 3 ساعات" }],
  },
];

const STATUS_OPTIONS: { key: EmployeeStatus; ar: string; icon: typeof Circle }[] = [
  { key: "new", ar: "لسه هبدأ", icon: Circle },
  { key: "progress", ar: "بشتغل عليها", icon: PlayCircle },
  { key: "done", ar: "خلصتها", icon: CheckCircle2 },
];

const PRIORITY_LABEL: Record<Priority, string> = { high: "عالية", med: "متوسطة", low: "منخفضة" };

const PRIORITY_OPTIONS: { key: Priority; ar: string }[] = [
  { key: "low", ar: "منخفضة" },
  { key: "med", ar: "متوسطة" },
  { key: "high", ar: "عالية" },
];

// "الحالة المعروضة" على البورد بتدمج حالة الموظف مع التأخير المحسوب من الديدلاين
type DisplayStatus = EmployeeStatus | "late";

function isLate(task: Task) {
  return task.status !== "done" && task.dueDate.getTime() < startOfToday().getTime();
}

function displayStatus(task: Task): DisplayStatus {
  return isLate(task) ? "late" : task.status;
}

const COLS: { key: DisplayStatus; ar: string; tone: string }[] = [
  { key: "new", ar: "لسه هيبدأ", tone: "bg-muted text-muted-foreground" },
  { key: "progress", ar: "جاري التنفيذ", tone: "bg-warning/20 text-[oklch(0.48_0.11_82)]" },
  { key: "done", ar: "مكتملة", tone: "bg-success/15 text-success" },
  { key: "late", ar: "متأخرة", tone: "bg-destructive/15 text-destructive" },
];

function formatDue(d: Date) {
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function dueHint(task: Task) {
  const diffDays = Math.round((task.dueDate.getTime() - startOfToday().getTime()) / 86400000);
  if (task.status === "done") return "تم الإنجاز";
  if (diffDays < 0) return `متأخرة ${Math.abs(diffDays)} يوم`;
  if (diffDays === 0) return "الديدلاين النهاردة";
  if (diffDays === 1) return "الديدلاين بكرة";
  return `متبقي ${diffDays} أيام`;
}

// تاريخ اليوم بصيغة YYYY-MM-DD عشان نستخدمه كـ min في حقل التاريخ
function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TasksPage() {
  const showToast = useToast();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [view, setView] = useState<"board" | "list">("board");
  const [selected, setSelected] = useState<Task | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const progress = tasks.filter((t) => t.status === "progress" && !isLate(t)).length;
    const late = tasks.filter((t) => isLate(t)).length;
    const notStarted = total - done - progress - late;
    return { total, done, progress, late, notStarted };
  }, [tasks]);

  const updateStatus = (taskId: number, newStatus: EmployeeStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setSelected((prev) => (prev && prev.id === taskId ? { ...prev, status: newStatus } : prev));
    const label = STATUS_OPTIONS.find((o) => o.key === newStatus)?.ar;
    showToast("success", `تم تحديث حالتك في المهمة: ${label}`);
  };

  const addComment = (taskId: number, text: string) => {
    if (!text.trim()) {
      showToast("error", "من فضلك اكتب تعليقًا قبل الإرسال");
      return;
    }
    const newComment: Comment = { name: "أنت", text: text.trim(), time: "الآن" };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, newComment] } : t)));
    setSelected((prev) => (prev && prev.id === taskId ? { ...prev, comments: [...prev.comments, newComment] } : prev));
    showToast("success", "تم إضافة تعليقك");
  };

  const addTask = (data: { title: string; desc: string; priority: Priority; dueDate: Date }) => {
    const nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const newTask: Task = {
      id: nextId,
      title: data.title.trim(),
      desc: data.desc.trim(),
      priority: data.priority,
      dueDate: data.dueDate,
      assignedBy: "أنت",
      assignedByRole: "مهمة شخصية",
      attachments: 0,
      status: "new",
      comments: [],
    };
    setTasks((prev) => [newTask, ...prev]);
    setIsAddOpen(false);
    showToast("success", "تمت إضافة المهمة بنجاح");
  };

  return (
    <PortalLayout title="المهام" subtitle="المهام الموكلة إليك من المدير، وتحديث حالتك عليها">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">لسه هتبدأ</div>
          <div className="mt-1 text-2xl font-bold text-foreground tabular">{stats.notStarted}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">جاري التنفيذ</div>
          <div className="mt-1 text-2xl font-bold text-[oklch(0.48_0.11_82)] tabular">{stats.progress}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">مكتملة</div>
          <div className="mt-1 text-2xl font-bold text-success tabular">{stats.done}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">متأخرة</div>
          <div className="mt-1 text-2xl font-bold text-destructive tabular">{stats.late}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${view === "board" ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" /> بورد
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${view === "list" ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}
          >
            <List className="h-4 w-4" /> قائمة
          </button>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-primary-dark transition shadow-warm"
        >
          <Plus className="h-4 w-4" /> إضافة مهمة
        </button>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLS.map((col) => {
            const colTasks = tasks.filter((t) => displayStatus(t) === col.key);
            return (
              <div key={col.key} className="bg-secondary/40 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${col.tone}`}>
                    {col.ar} <span className="opacity-70">{colTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-6">لا توجد مهام هنا</div>
                  )}
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onOpen={() => setSelected(t)} onStatusChange={updateStatus} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-6">
          <div className="space-y-2">
            {tasks.map((t) => {
              const ds = displayStatus(t);
              return (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition"
                >
                  <button onClick={() => setSelected(t)} className="flex-1 min-w-0 flex items-center gap-3 text-right">
                    <PriorityDot p={t.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <UserRound className="h-3 w-3" /> من {t.assignedBy} ·{" "}
                        <Calendar className="h-3 w-3" /> {formatDue(t.dueDate)}
                      </div>
                    </div>
                    <StatusPill tone={ds === "done" ? "success" : ds === "late" ? "danger" : ds === "progress" ? "warning" : "muted"}>
                      {COLS.find((c) => c.key === ds)?.ar}
                    </StatusPill>
                  </button>
                  <StatusToggle status={t.status} onChange={(s) => updateStatus(t.id, s)} compact />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {selected && (
        <TaskDrawer
          task={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(s) => updateStatus(selected.id, s)}
          onAddComment={(text) => addComment(selected.id, text)}
        />
      )}

      {isAddOpen && <AddTaskModal onClose={() => setIsAddOpen(false)} onAdd={addTask} />}
    </PortalLayout>
  );
}

function StatusToggle({
  status,
  onChange,
  compact = false,
}: {
  status: EmployeeStatus;
  onChange: (s: EmployeeStatus) => void;
  compact?: boolean;
}) {
  return (
    <div className={`inline-flex rounded-xl bg-secondary p-1 ${compact ? "shrink-0" : "w-full"}`} dir="rtl">
      {STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = status === opt.key;
        return (
          <button
            key={opt.key}
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.key);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold transition ${
              compact ? "px-2.5 py-1.5 text-xs" : "flex-1 px-3 py-2.5 text-sm"
            } ${active ? "bg-card text-primary shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> {opt.ar}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onStatusChange,
}: {
  task: Task;
  onOpen: () => void;
  onStatusChange: (id: number, s: EmployeeStatus) => void;
}) {
  const late = isLate(task);
  return (
    <div className="bg-card rounded-xl p-4 shadow-warm hover:shadow-warm-lg transition-all border border-border">
      <button onClick={onOpen} className="w-full text-right">
        <div className="flex items-start gap-2 mb-1">
          <PriorityDot p={task.priority} />
          <div className="text-sm font-semibold text-foreground leading-snug flex-1">{task.title}</div>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.desc}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-3">
          <UserRound className="h-3 w-3" /> كلّفك بيها {task.assignedBy}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className={`flex items-center gap-1 ${late ? "text-destructive font-semibold" : ""}`}>
            {late && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" /> {dueHint(task)}
          </div>
          <div className="flex items-center gap-3">
            {task.attachments > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {task.attachments}
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {task.comments.length}
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="pt-2 border-t border-border">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">حالتك في المهمة</div>
        <StatusToggle status={task.status} onChange={(s) => onStatusChange(task.id, s)} compact />
      </div>
    </div>
  );
}

function PriorityDot({ p }: { p: Priority }) {
  const map = { high: "bg-destructive", med: "bg-warning", low: "bg-success" };
  return <span className={`h-2.5 w-2.5 rounded-full ${map[p]} shrink-0 mt-1.5`} title={PRIORITY_LABEL[p]} />;
}

function AddTaskModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { title: string; desc: string; priority: Priority; dueDate: Date }) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [dueDateStr, setDueDateStr] = useState(todayInputValue());
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("من فضلك اكتب عنوان المهمة");
      return;
    }
    if (!dueDateStr) {
      setError("من فضلك اختار تاريخ التسليم");
      return;
    }
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(9, 0, 0, 0);
    onAdd({ title, desc, priority, dueDate });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4" dir="rtl" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-warm-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-secondary text-muted-foreground">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-foreground mb-5">إضافة مهمة جديدة</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">عنوان المهمة</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="مثال: تجهيز عرض تقديمي للعميل"
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">الوصف (اختياري)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="تفاصيل أكتر عن المهمة"
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">الأولوية</label>
              <div className="inline-flex w-full rounded-xl bg-secondary p-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPriority(opt.key)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      priority === opt.key ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
                    }`}
                  >
                    {opt.ar}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">تاريخ التسليم</label>
              <input
                type="date"
                value={dueDateStr}
                min={todayInputValue()}
                onChange={(e) => {
                  setDueDateStr(e.target.value);
                  if (error) setError("");
                }}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:bg-primary-dark transition"
          >
            إضافة المهمة
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-3 text-sm font-bold hover:opacity-80 transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDrawer({
  task,
  onClose,
  onStatusChange,
  onAddComment,
}: {
  task: Task;
  onClose: () => void;
  onStatusChange: (s: EmployeeStatus) => void;
  onAddComment: (text: string) => void;
}) {
  const [commentText, setCommentText] = useState("");
  const late = isLate(task);

  const handleSend = () => {
    onAddComment(commentText);
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-full max-w-lg bg-card shadow-warm-lg overflow-y-auto animate-in slide-in-from-left duration-300">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PriorityDot p={task.priority} />
              <span className="text-xs font-semibold text-muted-foreground">{PRIORITY_LABEL[task.priority]}</span>
              {late && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[11px] font-bold">
                  <AlertTriangle className="h-3 w-3" /> متأخرة
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* الجزء الأول: تفاصيل المهمة كما جاءت من المدير — للقراءة فقط */}
          <section className="space-y-4">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" /> المهمة من {task.assignedBy} · {task.assignedByRole}
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">الوصف</div>
              <p className="text-sm text-foreground leading-relaxed">{task.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">تاريخ التسليم</div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  {formatDue(task.dueDate)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">الوقت المتبقي</div>
                <div className={`text-sm ${late ? "text-destructive font-semibold" : "text-foreground"}`}>{dueHint(task)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">المرفقات المرسلة من المدير</div>
              {task.attachments > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: task.attachments }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl bg-secondary border border-border grid place-items-center text-xs text-muted-foreground"
                    >
                      ملف {i + 1}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">لا توجد مرفقات مع هذه المهمة.</p>
              )}
            </div>
          </section>

          <div className="border-t border-dashed border-border" />

          {/* الجزء الثاني: الحالة اللي انت بتحددها بنفسك */}
          <section className="space-y-3">
            <div className="text-xs font-bold text-foreground">حالتك في المهمة</div>
            <p className="text-xs text-muted-foreground -mt-1">حدّث حالتك كل ما تتقدم في الشغل، المدير بيشوفها لحظة بلحظة.</p>
            <StatusToggle status={task.status} onChange={onStatusChange} />
          </section>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">رفع ملف مرتبط بالمهمة</div>
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center text-sm text-muted-foreground hover:bg-primary/5 transition cursor-pointer">
              <Upload className="h-6 w-6 text-primary mx-auto mb-2" />
              اسحب الملف هنا أو انقر للاختيار
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">التعليقات</div>
            <div className="space-y-3 mb-3">
              {task.comments.length === 0 && <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>}
              {task.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-teal text-teal-foreground grid place-items-center text-xs font-bold shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 bg-secondary/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                    </div>
                    <div className="text-sm">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="اكتب تعليقاً..."
                className="flex-1 h-11 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <button
                onClick={handleSend}
                className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-semibold hover:bg-primary-dark transition"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}