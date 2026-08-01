"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { Plus, MinusCircle, PlusCircle, Trash2, X } from "lucide-react";

type Entry = {
  id: string;
  emp: string;
  reason: string;
  amt: number;
  date: Date;
};

function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const initialDed: Entry[] = [
  { id: "d1", emp: "خالد يوسف", reason: "تأخير 30 د", amt: 50, date: daysAgo(13) },
  { id: "d2", emp: "كريم سعيد", reason: "عدم تحقيق Target", amt: 200, date: daysAgo(16) },
  { id: "d3", emp: "محمود علي", reason: "غياب بدون إذن", amt: 300, date: daysAgo(19) },
];

const initialRew: Entry[] = [
  { id: "r1", emp: "نورا حسن", reason: "أفضل موظف", amt: 500, date: daysAgo(12) },
  { id: "r2", emp: "دينا فتحي", reason: "تحقيق Target", amt: 300, date: daysAgo(14) },
  { id: "r3", emp: "سارة إبراهيم", reason: "إنهاء مشروع", amt: 400, date: daysAgo(21) },
];

function EntryForm({
  tone,
  onCancel,
  onSubmit,
}: {
  tone: "danger" | "success";
  onCancel: () => void;
  onSubmit: (data: { emp: string; reason: string; amt: number; date: Date }) => void;
}) {
  const [emp, setEmp] = useState("");
  const [reason, setReason] = useState("");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const valid = emp.trim() && reason.trim() && Number(amt) > 0;
  const ring = tone === "danger" ? "focus:ring-destructive/40" : "focus:ring-success/40";
  const btn = tone === "danger" ? "bg-destructive text-white" : "bg-success text-white";

  return (
    <div className="space-y-3 border-b border-border p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="اسم الموظف"
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ${ring}`}
        />
        <input
          type="text"
          placeholder="السبب"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ${ring}`}
        />
        <input
          type="number"
          placeholder="القيمة (ج)"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 ${ring}`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 ${ring}`}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={!valid}
          onClick={() => {
            onSubmit({ emp: emp.trim(), reason: reason.trim(), amt: Number(amt), date: new Date(date) });
            setEmp("");
            setReason("");
            setAmt("");
            setDate(new Date().toISOString().slice(0, 10));
          }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${btn}`}
        >
          تأكيد
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40 transition"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

export default function DeductionsPage() {
  const [ded, setDed] = useState<Entry[]>(initialDed);
  const [rew, setRew] = useState<Entry[]>(initialRew);
  const [showDedForm, setShowDedForm] = useState(false);
  const [showRewForm, setShowRewForm] = useState(false);

  const dedSorted = useMemo(() => [...ded].sort((a, b) => b.date.getTime() - a.date.getTime()), [ded]);
  const rewSorted = useMemo(() => [...rew].sort((a, b) => b.date.getTime() - a.date.getTime()), [rew]);

  const totalDed = useMemo(() => ded.reduce((s, d) => s + d.amt, 0), [ded]);
  const totalRew = useMemo(() => rew.reduce((s, r) => s + r.amt, 0), [rew]);

  function addDed(data: { emp: string; reason: string; amt: number; date: Date }) {
    setDed((prev) => [...prev, { id: `d-${Date.now()}`, ...data }]);
    setShowDedForm(false);
  }
  function addRew(data: { emp: string; reason: string; amt: number; date: Date }) {
    setRew((prev) => [...prev, { id: `r-${Date.now()}`, ...data }]);
    setShowRewForm(false);
  }
  function removeDed(id: string) {
    setDed((prev) => prev.filter((d) => d.id !== id));
  }
  function removeRew(id: string) {
    setRew((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الخصومات والمكافآت" subtitle="سجل التحفيز والتحاسب." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="عدد الخصومات" value={String(ded.length)} tone="danger" />
        <StatCard dense label="عدد المكافآت" value={String(rew.length)} tone="success" />
        <StatCard dense label="إجمالي الخصومات" value={`${totalDed.toLocaleString()} ج`} tone="danger" />
        <StatCard dense label="إجمالي المكافآت" value={`${totalRew.toLocaleString()} ج`} tone="success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* الخصومات */}
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <MinusCircle className="size-5 text-destructive" />
              <span className="font-bold">سجل الخصومات</span>
            </div>
            <button
              onClick={() => setShowDedForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15"
            >
              {showDedForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showDedForm ? "إلغاء" : "إضافة خصم"}
            </button>
          </div>
          {showDedForm && <EntryForm tone="danger" onCancel={() => setShowDedForm(false)} onSubmit={addDed} />}
          <ul className="divide-y divide-border">
            {dedSorted.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">لا توجد خصومات مسجّلة</li>
            )}
            {dedSorted.map((d) => (
              <li key={d.id} className="group flex items-center gap-3 bg-destructive/[0.03] p-3">
                <Avatar name={d.emp} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.emp}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.reason} · {formatDate(d.date)}
                  </div>
                </div>
                <div className="font-bold text-destructive tabular">-{d.amt.toLocaleString()} ج</div>
                <button
                  onClick={() => removeDed(d.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  title="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* المكافآت */}
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-success" />
              <span className="font-bold">سجل المكافآت</span>
            </div>
            <button
              onClick={() => setShowRewForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15"
            >
              {showRewForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showRewForm ? "إلغاء" : "إضافة مكافأة"}
            </button>
          </div>
          {showRewForm && <EntryForm tone="success" onCancel={() => setShowRewForm(false)} onSubmit={addRew} />}
          <ul className="divide-y divide-border">
            {rewSorted.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">لا توجد مكافآت مسجّلة</li>
            )}
            {rewSorted.map((r) => (
              <li key={r.id} className="group flex items-center gap-3 bg-success/[0.03] p-3">
                <Avatar name={r.emp} tone="success" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.emp}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.reason} · {formatDate(r.date)}
                  </div>
                </div>
                <div className="font-bold text-success tabular">+{r.amt.toLocaleString()} ج</div>
                <button
                  onClick={() => removeRew(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  title="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}