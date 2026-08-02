"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, Pill } from "@/components/manager/primitives";

type TxType = "دخل" | "مصروف";
type Tx = {
  id: string;
  date: Date;
  type: TxType;
  amount: number; // positive number, sign determined by type
  note?: string;
};

const STARTING_BALANCE = 855940;

function daysAgo(n: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const initialTx: Tx[] = [
  { id: "seed-1", date: daysAgo(4), type: "مصروف", amount: 45000, note: "إيجار المحل" },
  { id: "seed-2", date: daysAgo(3), type: "دخل", amount: 12000, note: "مبيعات نقدي" },
  { id: "seed-3", date: daysAgo(2, 10), type: "مصروف", amount: 820, note: "مصاريف متنوعة" },
  { id: "seed-4", date: daysAgo(2, 18), type: "مصروف", amount: 4820, note: "توريد بضاعة" },
  { id: "seed-5", date: daysAgo(1), type: "دخل", amount: 25000, note: "مبيعات أونلاين" },
];

function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function timeAgo(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export default function CashPage() {
  const [txs, setTxs] = useState<Tx[]>(initialTx);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [showForm, setShowForm] = useState(false);

  const [formType, setFormType] = useState<TxType>("دخل");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));

  // ledger sorted chronologically ascending, with running balance recomputed
  // built with a pure reduce (no outer-variable reassignment) so it's safe for useMemo
  const chronological = useMemo(() => {
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const { list } = sorted.reduce<{ list: (Tx & { bal: number })[]; running: number }>(
      (acc, t) => {
        const running = acc.running + (t.type === "دخل" ? t.amount : -t.amount);
        return { list: [...acc.list, { ...t, bal: running }], running };
      },
      { list: [], running: STARTING_BALANCE }
    );
    return list;
  }, [txs]);

  // newest first for the table
  const ledgerDesc = useMemo(() => [...chronological].reverse(), [chronological]);

  const filteredLedger = useMemo(() => {
    return ledgerDesc.filter((l) => {
      if (filter !== "all" && l.type !== filter) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = `${l.note ?? ""} ${l.type} ${formatDate(l.date)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledgerDesc, filter, search]);

  const currentBalance = chronological.length ? chronological[chronological.length - 1].bal : STARTING_BALANCE;
  const lastTx = ledgerDesc[0];

  const totalIn = useMemo(
    () => txs.filter((t) => t.type === "دخل").reduce((s, t) => s + t.amount, 0),
    [txs]
  );
  const totalOut = useMemo(
    () => txs.filter((t) => t.type === "مصروف").reduce((s, t) => s + t.amount, 0),
    [txs]
  );

  function formatMoney(n: number) {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  }

  function addTransaction() {
    const amt = Number(formAmount);
    if (!amt || amt <= 0) return;
    const newTx: Tx = {
      id: `tx-${Date.now()}`,
      date: new Date(formDate),
      type: formType,
      amount: amt,
      note: formNote.trim() || undefined,
    };
    setTxs((prev) => [...prev, newTx]);
    setFormAmount("");
    setFormNote("");
    setFormType("دخل");
    setFormDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  }

  function deleteTransaction(id: string) {
    setTxs((prev) => prev.filter((t) => t.id !== id));
  }

  function exportCsv() {
    const header = "التاريخ,نوع العملية,القيمة,الرصيد بعد العملية,ملاحظة\n";
    const rows = ledgerDesc
      .map((l) =>
        [
          formatDate(l.date),
          l.type,
          l.type === "دخل" ? l.amount : -l.amount,
          l.bal,
          (l.note ?? "").replace(/,/g, " "),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `الخزنة-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="الخزنة" subtitle="حركة الأموال والرصيد الجاري." />
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/40 transition"
          >
            تصدير CSV
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {showForm ? "إلغاء" : "+ إضافة عملية"}
          </button>
        </div>
      </div>

      {showForm && (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">إضافة عملية جديدة</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFormType("دخل")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  formType === "دخل"
                    ? "border-success bg-success/10 text-success"
                    : "border-border text-muted-foreground hover:bg-accent/40"
                }`}
              >
                دخل
              </button>
              <button
                onClick={() => setFormType("مصروف")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  formType === "مصروف"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:bg-accent/40"
                }`}
              >
                مصروف
              </button>
            </div>
            <input
              type="number"
              placeholder="القيمة (ج)"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="ملاحظة (اختياري)"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={addTransaction}
            disabled={!formAmount || Number(formAmount) <= 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تأكيد العملية
          </button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-linear-to-br from-primary/10 to-warning/10">
          <div className="text-xs text-muted-foreground">الرصيد الحالي</div>
          <div className="mt-2 text-4xl font-bold text-primary tabular">
            {currentBalance.toLocaleString()} <span className="text-lg text-muted-foreground">ج</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            آخر عملية: <span className="text-foreground">{lastTx ? timeAgo(lastTx.date) : "لا توجد عمليات"}</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted-foreground">إجمالي الأموال الداخلة</div>
          <div className="mt-2 text-2xl font-bold text-success tabular">+ {formatMoney(totalIn)} ج</div>
        </Card>
        <Card>
          <div className="text-xs text-muted-foreground">إجمالي الأموال الخارجة</div>
          <div className="mt-2 text-2xl font-bold text-destructive tabular">- {formatMoney(totalOut)} ج</div>
        </Card>
      </div>

      <Card className="p-0! overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter("دخل")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === "دخل" ? "bg-success text-white" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              دخل
            </button>
            <button
              onClick={() => setFilter("مصروف")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === "مصروف" ? "bg-destructive text-white" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              مصروف
            </button>
          </div>
          <input
            type="text"
            placeholder="بحث في العمليات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>التاريخ</th>
                <th>نوع العملية</th>
                <th>القيمة</th>
                <th>الرصيد بعد العملية</th>
                <th>ملاحظة</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    لا توجد عمليات مطابقة
                  </td>
                </tr>
              )}
              {filteredLedger.map((l) => {
                const signedAmt = l.type === "دخل" ? l.amount : -l.amount;
                return (
                  <tr key={l.id} className="row-hover hover:row-hover-active">
                    <td className="px-4 py-3 tabular text-muted-foreground">{formatDate(l.date)}</td>
                    <td className="px-4 py-3">
                      <Pill tone={l.type === "دخل" ? "success" : "danger"}>{l.type}</Pill>
                    </td>
                    <td className={`px-4 py-3 font-bold tabular ${signedAmt >= 0 ? "text-success" : "text-destructive"}`}>
                      {signedAmt > 0 ? `+${signedAmt.toLocaleString()}` : signedAmt.toLocaleString()} ج
                    </td>
                    <td className="px-4 py-3 tabular font-semibold">{l.bal.toLocaleString()} ج</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.note ?? "—"}</td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => deleteTransaction(l.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}