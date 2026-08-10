"use client";

import { useEffect, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import {
  ComplaintStatus,
  ComplaintWithUser,
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  getAllComplaints,
  reviewComplaint,
} from "@/modules/complaints/api/complaints.api";

const statusTone: Record<ComplaintStatus, "teal" | "success" | "warning" | "danger"> = {
  new: "teal",
  in_processing: "warning",
  done: "success",
  rejected: "danger",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadComplaints() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllComplaints();
      setComplaints(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError("حصل خطأ أثناء تحميل الشكاوى");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  const selected = complaints.find((c) => c.id === selectedId) ?? null;

  const stats = {
    total: complaints.length,
    new: complaints.filter((c) => c.status === "new").length,
    inProgress: complaints.filter((c) => c.status === "in_processing").length,
    resolved: complaints.filter((c) => c.status === "done").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  async function handleStatusChange(status: ComplaintStatus) {
    if (!selected || selected.status === status) return;
    setUpdating(true);
    try {
      await reviewComplaint(selected.id, status);
      setComplaints((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, status } : c))
      );
    } catch (err) {
      console.error(err);
      setError("حصل خطأ أثناء تحديث حالة الشكوى");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الشكاوى" subtitle="متابعة شكاوى الموظفين وحالتها." />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard dense label="إجمالي الشكاوى" value={String(stats.total)} tone="primary" />
        <StatCard dense label="جديدة" value={String(stats.new)} tone="teal" />
        <StatCard dense label="قيد المراجعة" value={String(stats.inProgress)} tone="warning" />
        <StatCard dense label="تم الحل" value={String(stats.resolved)} tone="success" />
        <StatCard dense label="مرفوضة" value={String(stats.rejected)} tone="danger" />
      </div>

      {loading ? (
        <Card className="!p-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : complaints.length === 0 ? (
        <Card className="!p-10 text-center text-sm text-muted-foreground">لا توجد شكاوى حاليًا</Card>
      ) : (
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
                    <Avatar name={c.users?.name ?? "غير معروف"} />
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-semibold block">{c.title}</span>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.users?.name ?? "غير معروف"} · {COMPLAINT_TYPE_LABELS[c.type]} · {c.created_at.slice(0, 10)}
                      </div>
                    </div>
                    <Pill tone={statusTone[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {selected && (
            <Card className="!p-6 lg:col-span-3 space-y-5">
              <div>
                <div className="text-base font-bold">{selected.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {COMPLAINT_TYPE_LABELS[selected.type]} · {selected.created_at.slice(0, 10)}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Avatar name={selected.users?.name ?? "غير معروف"} size={36} />
                <div>
                  <div className="text-[11px] text-muted-foreground">مقدّم الشكوى</div>
                  <div className="text-sm font-bold">{selected.users?.name ?? "غير معروف"}</div>
                </div>
              </div>

              <p className="rounded-xl bg-secondary/50 p-4 text-sm leading-relaxed text-foreground">
                {selected.description}
              </p>

              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">حالة الشكوى</div>
                <div className="inline-flex overflow-hidden rounded-lg border border-border">
                  {COMPLAINT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={selected.status === s || updating}
                      className={`px-3 py-2 text-xs font-semibold transition ${
                        selected.status === s
                          ? "bg-primary text-primary-foreground cursor-default"
                          : "bg-background text-muted-foreground hover:bg-accent disabled:opacity-60"
                      }`}
                    >
                      {COMPLAINT_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}