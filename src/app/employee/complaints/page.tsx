// src/app/employee/complaints/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, X, Trash2, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ComplaintRow,
  ComplaintStatus,
  ComplaintType,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  COMPLAINT_TYPES,
  createComplaint,
  deleteComplaint,
  getMyComplaints,
} from "@/modules/complaints/api/complaints.api";

const statusTone: Record<ComplaintStatus, "teal" | "success" | "warning" | "danger"> = {
  new: "teal",
  in_processing: "warning",
  done: "success",
  rejected: "danger",
};

export default function ComplaintsPage() {
  const showToast = useToast();

  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<{ subject: string; category: ComplaintType; description: string }>({
    subject: "",
    category: "work_env",
    description: "",
  });
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});

  async function loadComplaints() {
    setLoading(true);
    try {
      const data = await getMyComplaints();
      setComplaints(data);
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء تحميل الشكاوى");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  const totals = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "new" || c.status === "in_processing").length,
    done: complaints.filter((c) => c.status === "done").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  const openComplaint = complaints.find((c) => c.id === openId) ?? null;

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!form.subject.trim()) newErrors.subject = "عنوان الشكوى مطلوب";
    if (!form.description.trim()) newErrors.description = "تفاصيل الشكوى مطلوبة";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await createComplaint({
        title: form.subject.trim(),
        description: form.description.trim(),
        type: form.category,
      });
      setForm({ subject: "", category: "work_env", description: "" });
      setShowForm(false);
      showToast("success", "تم إرسال شكواك بنجاح، هيتم مراجعتها قريبًا");
      await loadComplaints();
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء إرسال الشكوى");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteComplaint(id);
      showToast("success", "تم حذف الشكوى");
      setOpenId(null);
      await loadComplaints();
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء حذف الشكوى");
    }
  };

  return (
    <PortalLayout title="الشكاوى" subtitle="قدّمي شكوى أو تابعي حالة شكاواك السابقة">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={LifeBuoy} label="إجمالي الشكاوى" value={String(totals.total)} tone="primary" />
        <MetricCard icon={Clock3} label="قيد المراجعة" value={String(totals.pending)} tone="warning" />
        <MetricCard icon={CheckCircle2} label="تم الحل" value={String(totals.done)} tone="success" />
        <MetricCard icon={AlertCircle} label="مرفوضة" value={String(totals.rejected)} tone="danger" />
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
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ComplaintType }))}
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm"
              >
                {COMPLAINT_TYPES.map((t) => (
                  <option key={t} value={t}>{COMPLAINT_TYPE_LABELS[t]}</option>
                ))}
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
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition disabled:opacity-60"
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال الشكوى"}
          </button>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">شكاواي السابقة</h3>
        <div className="space-y-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-6">جارٍ التحميل...</p>
          )}
          {!loading && complaints.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">لسه معملتيش أي شكوى</p>
          )}
          {!loading && complaints.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className="w-full text-right flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {COMPLAINT_TYPE_LABELS[c.type]} · {c.created_at.slice(0, 10)}
                </div>
              </div>
              <StatusPill tone={statusTone[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</StatusPill>
            </button>
          ))}
        </div>
      </Card>

      {openComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20" onClick={() => setOpenId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-warm-lg w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">{openComplaint.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {COMPLAINT_TYPE_LABELS[openComplaint.type]} · {openComplaint.created_at.slice(0, 10)}
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-secondary transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">
              <div className="rounded-xl bg-secondary/60 p-3 text-sm text-foreground">{openComplaint.description}</div>
              <div className="flex items-center justify-between">
                <StatusPill tone={statusTone[openComplaint.status]}>
                  {COMPLAINT_STATUS_LABELS[openComplaint.status]}
                </StatusPill>
              </div>
            </div>

            {openComplaint.status === "new" && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => handleDelete(openComplaint.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/30 text-destructive px-4 py-2.5 text-sm font-semibold hover:bg-destructive/10 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الشكوى
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