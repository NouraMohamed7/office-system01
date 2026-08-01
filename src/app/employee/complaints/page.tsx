// src/app/complaints/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useState } from "react";
import { LifeBuoy, Plus, X, MessageSquare, Send, Clock3, CheckCircle2, AlertCircle } from "lucide-react";

type ComplaintStatus = "قيد المراجعة" | "تم الرد" | "مغلقة";
type ComplaintCategory = "بيئة العمل" | "الراتب والمزايا" | "زميل عمل" | "أدوات وموارد" | "أخرى";

type Reply = { from: "أنا" | "الإدارة"; text: string; at: string };
type Complaint = {
  id: string;
  subject: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  replies: Reply[];
};

const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: "c1",
    subject: "تأخر صرف مكافأة الأداء",
    category: "الراتب والمزايا",
    description: "مكافأة شهر يونيو لسه ماوصلتش، وحابب أعرف موعدها بالظبط.",
    status: "تم الرد",
    createdAt: "2026-07-20",
    replies: [
      { from: "الإدارة", text: "تم التحقق، المكافأة هتنزل مع راتب أغسطس بسبب تعديل في السيستم.", at: "2026-07-22" },
    ],
  },
  {
    id: "c2",
    subject: "مشكلة في تكييف المكتب",
    category: "بيئة العمل",
    description: "التكييف في الدور التاني مش شغال من يومين وده مؤثر على التركيز.",
    status: "مغلقة",
    createdAt: "2026-07-14",
    replies: [
      { from: "الإدارة", text: "تم إصلاح التكييف بتاريخ 2026-07-15.", at: "2026-07-15" },
    ],
  },
  {
    id: "c3",
    subject: "طلب جهاز لابتوب بديل",
    category: "أدوات وموارد",
    description: "اللابتوب الحالي بطيء جدًا وبيأثر على سرعة إنجاز المهام.",
    status: "قيد المراجعة",
    createdAt: "2026-07-25",
    replies: [],
  },
];

const CATEGORIES: ComplaintCategory[] = ["بيئة العمل", "الراتب والمزايا", "زميل عمل", "أدوات وموارد", "أخرى"];

export default function ComplaintsPage() {
  const showToast = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [form, setForm] = useState({ subject: "", category: "بيئة العمل" as ComplaintCategory, description: "" });
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});

  const totals = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "قيد المراجعة").length,
    replied: complaints.filter((c) => c.status === "تم الرد").length,
    closed: complaints.filter((c) => c.status === "مغلقة").length,
  };

  const openComplaint = complaints.find((c) => c.id === openId) ?? null;

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!form.subject.trim()) newErrors.subject = "عنوان الشكوى مطلوب";
    if (!form.description.trim()) newErrors.description = "تفاصيل الشكوى مطلوبة";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setErrors({});
    const newComplaint: Complaint = {
      id: `c-${Date.now()}`,
      subject: form.subject.trim(),
      category: form.category,
      description: form.description.trim(),
      status: "قيد المراجعة",
      createdAt: new Date().toISOString().slice(0, 10),
      replies: [],
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    setForm({ subject: "", category: "بيئة العمل", description: "" });
    setShowForm(false);
    showToast("success", "تم إرسال شكواك بنجاح، هيتم مراجعتها قريبًا");
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !openComplaint) return;
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === openComplaint.id
          ? { ...c, replies: [...c.replies, { from: "أنا", text: replyText.trim(), at: new Date().toISOString().slice(0, 10) }] }
          : c
      )
    );
    setReplyText("");
    showToast("success", "تم إرسال ردك");
  };

  return (
    <PortalLayout title="الشكاوى" subtitle="قدّمي شكوى أو تابعي حالة شكاواك السابقة">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={LifeBuoy} label="إجمالي الشكاوى" value={String(totals.total)} tone="primary" />
        <MetricCard icon={Clock3} label="قيد المراجعة" value={String(totals.pending)} tone="warning" />
        <MetricCard icon={MessageSquare} label="تم الرد عليها" value={String(totals.replied)} tone="teal" />
        <MetricCard icon={CheckCircle2} label="مغلقة" value={String(totals.closed)} tone="success" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "إغلاق" : "تقديم شكوى جديدة"}
        </button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6 border-2 border-primary/20">
          <h3 className="font-bold text-foreground mb-4">شكوى جديدة</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">عنوان الشكوى</label>
              <input
                value={form.subject}
                onChange={(e) => { setForm((f) => ({ ...f, subject: e.target.value })); setErrors((p) => ({ ...p, subject: undefined })); }}
                placeholder="مثال: تأخر صرف الراتب"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${errors.subject ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {errors.subject && <p className="text-xs text-destructive mt-1.5">{errors.subject}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">التصنيف</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ComplaintCategory }))}
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-foreground">تفاصيل الشكوى</label>
              <textarea
                value={form.description}
                onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setErrors((p) => ({ ...p, description: undefined })); }}
                rows={4}
                placeholder="اشرحي المشكلة بالتفصيل..."
                className={`mt-2 w-full rounded-xl border bg-card focus:ring-2 outline-none p-3 text-sm resize-none
                  ${errors.description ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {errors.description && <p className="text-xs text-destructive mt-1.5">{errors.description}</p>}
            </div>
          </div>
          <button onClick={handleSubmit} className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition">
            إرسال الشكوى
          </button>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">شكاواي السابقة</h3>
        <div className="space-y-2">
          {complaints.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">لسه معملتيش أي شكوى</p>
          )}
          {complaints.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className="w-full text-right flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">{c.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.category} · {c.createdAt}
                  {c.replies.length > 0 && ` · ${c.replies.length} رد`}
                </div>
              </div>
              <StatusPill tone={c.status === "تم الرد" ? "teal" : c.status === "مغلقة" ? "success" : "warning"}>
                {c.status}
              </StatusPill>
            </button>
          ))}
        </div>
      </Card>

      {openComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20" onClick={() => setOpenId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-warm-lg w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">{openComplaint.subject}</h3>
                <div className="text-xs text-muted-foreground mt-1">{openComplaint.category} · {openComplaint.createdAt}</div>
              </div>
              <button onClick={() => setOpenId(null)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-secondary transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">
              <div className="rounded-xl bg-secondary/60 p-3 text-sm text-foreground">{openComplaint.description}</div>

              {openComplaint.replies.map((r, i) => (
                <div key={i} className={`flex ${r.from === "أنا" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl p-3 text-sm ${r.from === "أنا" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    <div>{r.text}</div>
                    <div className={`text-[11px] mt-1 ${r.from === "أنا" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{r.from} · {r.at}</div>
                  </div>
                </div>
              ))}

              {openComplaint.status === "مغلقة" && (
                <p className="text-xs text-center text-muted-foreground py-2">تم إغلاق هذه الشكوى</p>
              )}
            </div>

            {openComplaint.status !== "مغلقة" && (
              <div className="p-4 border-t border-border flex items-center gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  placeholder="اكتبي ردًا أو استفسارًا إضافيًا..."
                  className="flex-1 h-11 rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3 text-sm"
                />
                <button onClick={handleSendReply} className="h-11 w-11 grid place-items-center rounded-xl bg-primary text-primary-foreground hover:bg-[color:var(--primary-dark)] transition shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary", teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success", warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}