// src/app/tasks/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { Calendar, Paperclip, MessageCircle, X, Upload, LayoutGrid, List, Plus } from "lucide-react";
import { useState } from "react";

type Priority = "low" | "med" | "high";
type Status = "new" | "progress" | "done" | "late";

interface Comment { name: string; text: string; time: string; }
interface Task {
  id: number; title: string; desc: string; priority: Priority; due: string;
  attachments: number; status: Status; comments: Comment[];
}

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "تصميم بوست إطلاق حملة الصيف", desc: "إعداد 3 نماذج للبوست الرئيسي بمقاسات Instagram وFacebook.", priority: "high", due: "20 يوليو", attachments: 2, status: "new",
    comments: [
      { name: "أحمد", text: "من فضلك راجع الألوان في النموذج الثاني.", time: "منذ ساعة" },
      { name: "سارة", text: "تم التعديل حسب الملاحظات ✅", time: "منذ 20 دقيقة" },
    ] },
  { id: 2, title: "مراجعة سكربت المكالمات الجديد", desc: "قراءة الإصدار الأخير ومراجعة النقاط الأساسية.", priority: "med", due: "19 يوليو", attachments: 1, status: "new", comments: [] },
  { id: 3, title: "إعداد شيت ليدز الأسبوع", desc: "تجميع الليدز من قنوات التواصل مع فلترة.", priority: "med", due: "18 يوليو", attachments: 0, status: "progress", comments: [] },
  { id: 4, title: "تسجيل ريلز عن العروض", desc: "تصوير ومونتاج ريل مدته 30 ثانية.", priority: "high", due: "18 يوليو", attachments: 3, status: "progress", comments: [] },
  { id: 5, title: "تقرير أداء يونيو", desc: "تجهيز التقرير الشهري والإرسال للمدير.", priority: "low", due: "15 يوليو", attachments: 1, status: "done", comments: [] },
  { id: 6, title: "متابعة مقابلات المناديب", desc: "تأكيد مواعيد 5 مندوبين للأسبوع القادم.", priority: "med", due: "16 يوليو", attachments: 0, status: "done", comments: [] },
  { id: 7, title: "رد على شكاوى العملاء", desc: "معالجة 12 شكوى معلقة في نظام الدعم.", priority: "high", due: "14 يوليو", attachments: 0, status: "late", comments: [] },
];

const COLS: { key: Status; ar: string; tone: string }[] = [
  { key: "new", ar: "جديدة", tone: "bg-muted text-muted-foreground" },
  { key: "progress", ar: "جاري التنفيذ", tone: "bg-warning/20 text-[oklch(0.48_0.11_82)]" },
  { key: "done", ar: "مكتملة", tone: "bg-success/15 text-success" },
  { key: "late", ar: "متأخرة", tone: "bg-destructive/15 text-destructive" },
];

const PRIORITIES: { key: Priority; ar: string }[] = [
  { key: "low", ar: "منخفضة" },
  { key: "med", ar: "متوسطة" },
  { key: "high", ar: "عالية" },
];

export default function TasksPage() {
  const showToast = useToast();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [view, setView] = useState<"board" | "list">("board");
  const [selected, setSelected] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const addTask = (newTask: Omit<Task, "id" | "attachments" | "comments">) => {
    setTasks((prev) => [
      { ...newTask, id: prev.length ? Math.max(...prev.map((t) => t.id)) + 1 : 1, attachments: 0, comments: [] },
      ...prev,
    ]);
    setModalOpen(false);
    showToast("success", "تم إنشاء المهمة بنجاح");
  };

  const updateStatus = (taskId: number, newStatus: Status) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setSelected((prev) => prev && prev.id === taskId ? { ...prev, status: newStatus } : prev);
    showToast("success", `تم تحديث حالة المهمة إلى: ${COLS.find((c) => c.key === newStatus)?.ar}`);
  };

  const addComment = (taskId: number, text: string) => {
    if (!text.trim()) {
      showToast("error", "من فضلك اكتب تعليقًا قبل الإرسال");
      return;
    }
    const newComment: Comment = { name: "أنت", text: text.trim(), time: "الآن" };
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, comments: [...t.comments, newComment] } : t));
    setSelected((prev) => prev && prev.id === taskId ? { ...prev, comments: [...prev.comments, newComment] } : prev);
    showToast("success", "تم إضافة تعليقك");
  };

  return (
    <PortalLayout title="المهام" subtitle="تابع مهامك بطريقتك المفضلة">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1">
          <button onClick={() => setView("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${view === "board" ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-4 w-4" /> بورد
          </button>
          <button onClick={() => setView("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${view === "list" ? "bg-card text-primary shadow-warm" : "text-muted-foreground"}`}>
            <List className="h-4 w-4" /> قائمة
          </button>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition shadow-warm">
          <Plus className="h-4 w-4" /> مهمة جديدة
        </button>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="bg-secondary/40 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${col.tone}`}>
                    {col.ar} <span className="opacity-70">{colTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => <TaskCard key={t.id} t={t} onClick={() => setSelected(t)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-6">
          <div className="space-y-2">
            {tasks.map((t) => (
              <button key={t.id} onClick={() => setSelected(t)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition text-right border border-transparent hover:border-primary/20">
                <PriorityDot p={t.priority} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                </div>
                <StatusPill tone={t.status === "done" ? "success" : t.status === "late" ? "danger" : t.status === "progress" ? "warning" : "muted"}>
                  {COLS.find((c) => c.key === t.status)?.ar}
                </StatusPill>
                <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" />{t.due}</div>
              </button>
            ))}
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
      {modalOpen && <NewTaskModal onClose={() => setModalOpen(false)} onSave={addTask} />}
    </PortalLayout>
  );
}

function TaskCard({ t, onClick }: { t: Task; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-right bg-card rounded-xl p-4 shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all border border-border">
      <div className="flex items-start gap-2 mb-2">
        <PriorityDot p={t.priority} />
        <div className="text-sm font-semibold text-foreground leading-snug">{t.title}</div>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.desc}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.due}</div>
        <div className="flex items-center gap-3">
          {t.attachments > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{t.attachments}</span>}
          {t.comments.length > 0 && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{t.comments.length}</span>}
        </div>
      </div>
    </button>
  );
}

function PriorityDot({ p }: { p: Priority }) {
  const map = { high: "bg-destructive", med: "bg-warning", low: "bg-success" };
  const label = { high: "عالية", med: "متوسطة", low: "منخفضة" };
  return <span className={`h-2.5 w-2.5 rounded-full ${map[p]} shrink-0 mt-1.5`} title={label[p]} />;
}

function TaskDrawer({
  task, onClose, onStatusChange, onAddComment,
}: {
  task: Task; onClose: () => void;
  onStatusChange: (s: Status) => void;
  onAddComment: (text: string) => void;
}) {
  const [commentText, setCommentText] = useState("");

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
              <StatusPill tone={task.status === "done" ? "success" : task.status === "late" ? "danger" : task.status === "progress" ? "warning" : "muted"}>
                {COLS.find((c) => c.key === task.status)?.ar}
              </StatusPill>
            </div>
            <h2 className="text-xl font-bold text-foreground">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">الوصف</div>
            <p className="text-sm text-foreground leading-relaxed">{task.desc} تم استلام المهمة من مدير القسم بتاريخ 17 يوليو، ويجب تسليم النسخة النهائية قبل الموعد المحدد.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">تاريخ التسليم</div>
              <div className="flex items-center gap-2 text-sm text-foreground"><Calendar className="h-4 w-4 text-primary" />{task.due}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">الحالة</div>
              <select
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value as Status)}
                className="w-full h-10 rounded-xl border border-border bg-card text-sm px-3"
              >
                {COLS.map((c) => <option key={c.key} value={c.key}>{c.ar}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">المرفقات</div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Math.max(task.attachments, 1) }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-secondary border border-border grid place-items-center text-xs text-muted-foreground">ملف {i + 1}</div>
              ))}
            </div>
          </div>
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
              {task.comments.length === 0 && (
                <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>
              )}
              {task.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-teal text-teal-foreground grid place-items-center text-xs font-bold shrink-0">{c.name[0]}</div>
                  <div className="flex-1 bg-secondary/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold">{c.name}</span><span className="text-xs text-muted-foreground">{c.time}</span></div>
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
              <button onClick={handleSend} className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">إرسال</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({ onClose, onSave }: { onClose: () => void; onSave: (t: Omit<Task, "id" | "attachments" | "comments">) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [status, setStatus] = useState<Status>("new");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("من فضلك اكتب عنوان المهمة");
      return;
    }
    onSave({
      title: title.trim(),
      desc: desc.trim() || "لا يوجد وصف إضافي.",
      priority,
      status,
      due: due || "بدون تاريخ",
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-warm-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">مهمة جديدة</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">عنوان المهمة *</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="مثال: تصميم بوست إطلاق"
              className="mt-2 w-full h-11 rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm"
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">الوصف</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="تفاصيل المهمة..."
              className="mt-2 w-full rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none p-3 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">تاريخ التسليم</label>
            <input
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="مثال: 25 يوليو"
              className="mt-2 w-full h-11 rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">الأولوية</label>
            <div className="mt-2 grid grid-cols-3 rounded-xl bg-secondary p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className={`h-10 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${priority === p.key ? "bg-card shadow-warm" : "text-muted-foreground"}`}
                >
                  <PriorityDot p={p.key} /> {p.ar}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm"
            >
              {COLS.map((c) => <option key={c.key} value={c.key}>{c.ar}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-secondary transition font-semibold">
              إلغاء
            </button>
            <button onClick={handleSubmit} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-[color:var(--primary-dark)] transition font-semibold shadow-warm">
              حفظ المهمة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}