"use client";

import { useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { Send } from "lucide-react";

type Priority = "عالية" | "متوسطة" | "منخفضة";
type Status = "جديدة" | "قيد التنفيذ" | "تم الحل";

type Message = { from: "emp" | "manager"; text: string; time: string };

type Complaint = {
  id: number;
  emp: string;
  title: string;
  dept: string;
  pr: Priority;
  date: string;
  st: Status;
  timeline: string[];
  messages: Message[];
};

const priorityTone: Record<Priority, "danger" | "warning" | "success"> = {
  "عالية": "danger",
  "متوسطة": "warning",
  "منخفضة": "success",
};

const statusTone: Record<Status, "teal" | "warning" | "success"> = {
  "جديدة": "teal",
  "قيد التنفيذ": "warning",
  "تم الحل": "success",
};

const priorityCycle: Priority[] = ["منخفضة", "متوسطة", "عالية"];
const departments = ["الكول سنتر", "السوشيال", "المبيعات", "الدعم الفني", "الموارد البشرية"];

const initialComplaints: Complaint[] = [
  {
    id: 1,
    emp: "محمود علي",
    title: "مشكلة في نظام CRM",
    dept: "الكول سنتر",
    pr: "عالية",
    date: "اليوم 09:20",
    st: "جديدة",
    timeline: ["9:30 تم إنشاء الشكوى", "10:15 رد المدير", "11:20 تحويل للدعم"],
    messages: [
      { from: "emp", text: "النظام بطيء جدًا في التنقل بين الشاشات منذ الصباح — استغرق فتح كل عميل حوالي 8 ثوانٍ.", time: "09:20" },
      { from: "manager", text: "شكرًا للإبلاغ — تم تحويل الشكوى لفريق الدعم الفني وسنعود إليك خلال ساعة.", time: "10:15" },
    ],
  },
  {
    id: 2,
    emp: "نورا حسن",
    title: "طلب أدوات تصميم إضافية",
    dept: "السوشيال",
    pr: "متوسطة",
    date: "أمس",
    st: "قيد التنفيذ",
    timeline: ["أمس 14:00 تم إنشاء الشكوى"],
    messages: [
      { from: "emp", text: "محتاجة نسخة إضافية من برنامج التصميم للفريق الجديد.", time: "14:00" },
    ],
  },
  {
    id: 3,
    emp: "خالد يوسف",
    title: "لم يتم صرف المكافأة",
    dept: "المبيعات",
    pr: "منخفضة",
    date: "قبل يومين",
    st: "تم الحل",
    timeline: ["قبل يومين تم إنشاء الشكوى", "قبل يوم تم الصرف"],
    messages: [
      { from: "emp", text: "المكافأة الخاصة بشهر الماضي لسه ما اتصرفتش.", time: "10:00" },
      { from: "manager", text: "تم التأكد من الحساب وتم صرف المبلغ اليوم.", time: "قبل يوم" },
    ],
  },
];

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [selectedId, setSelectedId] = useState<number>(initialComplaints[0].id);
  const [draft, setDraft] = useState("");

  const selected = complaints.find(c => c.id === selectedId)!;

  const stats = {
    total: complaints.length,
    new: complaints.filter(c => c.st === "جديدة").length,
    inProgress: complaints.filter(c => c.st === "قيد التنفيذ").length,
    resolved: complaints.filter(c => c.st === "تم الحل").length,
    highRisk: complaints.filter(c => c.pr === "عالية" && c.st !== "تم الحل").length,
  };

  function updateSelected(patch: Partial<Complaint>, timelineEntry?: string) {
    setComplaints(prev =>
      prev.map(c =>
        c.id === selectedId
          ? {
              ...c,
              ...patch,
              timeline: timelineEntry ? [...c.timeline, timelineEntry] : c.timeline,
            }
          : c
      )
    );
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const time = nowLabel();
    setComplaints(prev =>
      prev.map(c =>
        c.id === selectedId
          ? {
              ...c,
              messages: [...c.messages, { from: "manager", text, time }],
              timeline: [...c.timeline, `${time} رد المدير`],
              st: c.st === "جديدة" ? "قيد التنفيذ" : c.st,
            }
          : c
      )
    );
    setDraft("");
  }

  function handlePriorityCycle() {
    const idx = priorityCycle.indexOf(selected.pr);
    const next = priorityCycle[(idx + 1) % priorityCycle.length];
    updateSelected({ pr: next }, `${nowLabel()} تغيير الأولوية إلى ${next}`);
  }

  function handleTransfer() {
    const currentIdx = departments.indexOf(selected.dept);
    const next = departments[(currentIdx + 1) % departments.length];
    updateSelected({ dept: next, st: selected.st === "جديدة" ? "قيد التنفيذ" : selected.st }, `${nowLabel()} تحويل إلى ${next}`);
  }

  function handleClose() {
    updateSelected({ st: "تم الحل" }, `${nowLabel()} تم إغلاق الشكوى`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الشكاوى" subtitle="مركز الشكاوى الداخلي — أشبه بصندوق دعم فني." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard dense label="إجمالي" value={String(stats.total)} tone="primary" />
        <StatCard dense label="جديدة" value={String(stats.new)} tone="teal" />
        <StatCard dense label="قيد التنفيذ" value={String(stats.inProgress)} tone="warning" />
        <StatCard dense label="تم الحل" value={String(stats.resolved)} tone="success" />
        <StatCard dense label="عالية الخطورة" value={String(stats.highRisk)} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="!p-0 overflow-hidden lg:col-span-2">
          <ul className="divide-y divide-border">
            {complaints.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`cursor-pointer p-4 hover:bg-primary/5 ${c.id === selectedId ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.emp} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: `var(--${priorityTone[c.pr] === "danger" ? "destructive" : priorityTone[c.pr] === "warning" ? "warning" : "success"})` }}
                      />
                      <span className="truncate text-sm font-semibold">{c.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.emp} · {c.dept} · {c.date}
                    </div>
                  </div>
                  <Pill tone={statusTone[c.st]}>{c.st}</Pill>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="!p-0 flex flex-col lg:col-span-3">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold">{selected.title}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.emp} · {selected.dept} · {selected.date}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => document.getElementById("reply-input")?.focus()}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                >
                  الرد
                </button>
                <button
                  onClick={handlePriorityCycle}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                >
                  تغيير الأولوية ({selected.pr})
                </button>
                <button
                  onClick={handleTransfer}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                >
                  تحويل
                </button>
                <button
                  onClick={handleClose}
                  disabled={selected.st === "تم الحل"}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 p-4">
            {selected.messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.from === "emp"
                    ? "rounded-xl bg-accent/40 p-3 text-sm"
                    : "mr-8 rounded-xl bg-primary/10 p-3 text-sm"
                }
              >
                {m.text}
                <div className="mt-1 text-[10px] text-muted-foreground">{m.time}</div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 text-xs">
              {selected.timeline.map((s, i) => (
                <div key={i} className="flex-1 min-w-[100px] rounded-lg border border-border bg-background p-2 text-center">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                id="reply-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب ردًا..."
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
              />
              <button
                onClick={handleSend}
                className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}