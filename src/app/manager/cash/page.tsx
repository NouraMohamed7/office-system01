"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { Plus, Wallet, MoreVertical, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// ============================================================
// الخزنة — صفحة واحدة موحّدة لإدارة كل حركة الفلوس (دخل ومصروف)
// دمج صفحتي "الخزنة" و"المصروفات" القديمتين في صفحة واحدة.
// مفيش أي علاقة بالموظفين هنا، الصفحة دي بتنظم الفلوس بس.
// ============================================================

type Kind = "دخل" | "مصروف";

type Tx = {
  id: string;
  date: Date;
  kind: Kind;
  amount: number; // رقم موجب دايمًا، الإشارة بتتحدد من kind
  category?: string; // تصنيف حر (غالبًا للمصروفات)
  who?: string; // المسؤول عن العملية
  spentOn?: string; // اتصرف على ايه
};

const STARTING_BALANCE = 855940;

const CATEGORY_PALETTE = [
  "var(--primary)",
  "var(--teal)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
];
function colorForCategory(cat: string, knownCats: string[]) {
  const idx = knownCats.indexOf(cat);
  return CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
}

function daysAgo(n: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

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

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

const initialTx: Tx[] = [
  { id: "seed-1", date: daysAgo(4), kind: "مصروف", amount: 45000, category: "إيجار", who: "أحمد", spentOn: "إيجار المحل" },
  { id: "seed-2", date: daysAgo(3), kind: "دخل", amount: 12000, spentOn: "مبيعات نقدي" },
  { id: "seed-3", date: daysAgo(2, 10), kind: "مصروف", amount: 820, category: "ضيافة", who: "سارة", spentOn: "مياه وحاجات ضيافة للمكتب" },
  { id: "seed-4", date: daysAgo(2, 18), kind: "مصروف", amount: 4820, category: "توريد بضاعة", who: "دينا", spentOn: "توريد بضاعة جديدة" },
  { id: "seed-5", date: daysAgo(1), kind: "دخل", amount: 25000, spentOn: "مبيعات أونلاين" },
  { id: "seed-6", date: daysAgo(0), kind: "مصروف", amount: 2400, category: "إعلانات", who: "أحمد", spentOn: "حملة إعلانات فيسبوك" },
  { id: "seed-7", date: daysAgo(3), kind: "مصروف", amount: 45000, category: "رواتب", who: "أحمد", spentOn: "رواتب الشهر" },
];

export default function CashPage() {
  const [txs, setTxs] = useState<Tx[]>(initialTx);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // فلاتر الجدول
  const [search, setSearch] = useState("");
  const [fKind, setFKind] = useState<"all" | Kind>("all");
  const [fWho, setFWho] = useState("الكل");
  const [fCat, setFCat] = useState("الكل");
  const [fDate, setFDate] = useState<"all" | "today" | "week" | "month">("all");

  // فورم إضافة عملية
  const [formKind, setFormKind] = useState<Kind>("دخل");
  const [formAmount, setFormAmount] = useState("");
  const [formCat, setFormCat] = useState("");
  const [formWho, setFormWho] = useState("");
  const [formSpentOn, setFormSpentOn] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));

  // ---- ترتيب زمني تصاعدي + حساب الرصيد الجاري بعد كل عملية ----
  const chronological = useMemo(() => {
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const { list } = sorted.reduce<{ list: (Tx & { bal: number })[]; running: number }>(
      (acc, t) => {
        const running = acc.running + (t.kind === "دخل" ? t.amount : -t.amount);
        return { list: [...acc.list, { ...t, bal: running }], running };
      },
      { list: [], running: STARTING_BALANCE }
    );
    return list;
  }, [txs]);

  const ledgerDesc = useMemo(() => [...chronological].reverse(), [chronological]);

  const currentBalance = chronological.length ? chronological[chronological.length - 1].bal : STARTING_BALANCE;
  const lastTx = ledgerDesc[0];

  const totalIn = useMemo(() => txs.filter((t) => t.kind === "دخل").reduce((s, t) => s + t.amount, 0), [txs]);
  const totalOut = useMemo(() => txs.filter((t) => t.kind === "مصروف").reduce((s, t) => s + t.amount, 0), [txs]);

  const expenses = useMemo(() => txs.filter((t) => t.kind === "مصروف"), [txs]);
  const daysSince = (d: Date) => Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const expToday = expenses.filter((e) => daysSince(e.date) === 0).reduce((s, e) => s + e.amount, 0);
  const expWeek = expenses.filter((e) => daysSince(e.date) <= 6).reduce((s, e) => s + e.amount, 0);
  const expMonth = expenses.filter((e) => daysSince(e.date) <= 29).reduce((s, e) => s + e.amount, 0);

  const whoOptions = useMemo(() => ["الكل", ...Array.from(new Set(txs.map((t) => t.who).filter(Boolean) as string[]))], [txs]);
  const knownCategories = useMemo(() => Array.from(new Set(expenses.map((e) => e.category).filter(Boolean) as string[])), [expenses]);
  const catOptions = useMemo(() => ["الكل", ...knownCategories], [knownCategories]);

  const pieData = knownCategories
    .map((c) => ({
      name: c,
      value: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
      c: colorForCategory(c, knownCategories),
    }))
    .filter((p) => p.value > 0);

  const weekly = Array.from({ length: 6 }, (_, i) => {
    const from = i * 7,
      to = from + 6;
    const inSum = txs.filter((t) => t.kind === "دخل" && daysSince(t.date) >= from && daysSince(t.date) <= to).reduce((s, t) => s + t.amount, 0);
    const outSum = txs.filter((t) => t.kind === "مصروف" && daysSince(t.date) >= from && daysSince(t.date) <= to).reduce((s, t) => s + t.amount, 0);
    return { w: `أسبوع ${6 - i}`, دخل: inSum, مصروف: outSum };
  }).reverse();

  const filteredLedger = useMemo(() => {
    return ledgerDesc.filter((l) => {
      if (fKind !== "all" && l.kind !== fKind) return false;
      if (fWho !== "الكل" && l.who !== fWho) return false;
      if (fCat !== "الكل" && l.category !== fCat) return false;
      const dAgo = daysSince(l.date);
      if (fDate === "today" && dAgo !== 0) return false;
      if (fDate === "week" && dAgo > 6) return false;
      if (fDate === "month" && dAgo > 29) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = `${l.spentOn ?? ""} ${l.category ?? ""} ${l.who ?? ""} ${l.kind} ${formatDate(l.date)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledgerDesc, fKind, fWho, fCat, fDate, search]);

  function addTransaction() {
    const amt = Number(formAmount);
    if (!amt || amt <= 0) return;
    const newTx: Tx = {
      id: `tx-${Date.now()}`,
      date: new Date(formDate),
      kind: formKind,
      amount: amt,
      category: formCat.trim() || undefined,
      who: formWho.trim() || undefined,
      spentOn: formSpentOn.trim() || undefined,
    };
    setTxs((prev) => [...prev, newTx]);
    setFormAmount("");
    setFormCat("");
    setFormWho("");
    setFormSpentOn("");
    setFormKind("دخل");
    setFormDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  }

  function deleteTransaction(id: string) {
    setTxs((prev) => prev.filter((t) => t.id !== id));
    setOpenMenuId(null);
  }

  function exportCsv() {
    const header = "التاريخ,نوع العملية,القيمة,الرصيد بعد العملية,التصنيف,المسؤول,اتصرف على ايه\n";
    const rows = ledgerDesc
      .map((l) =>
        [
          formatDate(l.date),
          l.kind,
          l.kind === "دخل" ? l.amount : -l.amount,
          l.bal,
          l.category ?? "",
          l.who ?? "",
          (l.spentOn ?? "").replace(/,/g, " "),
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
      <PageHeader
        title="الخزنة"
        subtitle="كل حركة الفلوس، الدخل والمصروفات، والرصيد الجاري في مكان واحد."
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/40 transition"
            >
              تصدير CSV
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="size-4" /> {showForm ? "إلغاء" : "إضافة عملية"}
            </button>
          </div>
        }
      />

      {showForm && (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">إضافة عملية جديدة</div>
          <div className="flex gap-2">
            <button
              onClick={() => setFormKind("دخل")}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                formKind === "دخل" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:bg-accent/40"
              }`}
            >
              دخل
            </button>
            <button
              onClick={() => setFormKind("مصروف")}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                formKind === "مصروف" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:bg-accent/40"
              }`}
            >
              مصروف
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              placeholder="التصنيف (اختياري)"
              value={formCat}
              onChange={(e) => setFormCat(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="المسؤول (اختياري)"
              value={formWho}
              onChange={(e) => setFormWho(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <input
            type="text"
            placeholder="اتصرف على ايه؟ (اختياري)"
            value={formSpentOn}
            onChange={(e) => setFormSpentOn(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={addTransaction}
            disabled={!formAmount || Number(formAmount) <= 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تأكيد العملية
          </button>
        </Card>
      )}

      {/* ستات سريعة */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="الرصيد الحالي" value={formatMoney(currentBalance)} sub="جنيه" icon={Wallet} tone="primary" />
        <StatCard dense label="إجمالي الدخل" value={`+${formatMoney(totalIn)}`} sub="جنيه" icon={Wallet} tone="success" />
        <StatCard dense label="إجمالي المصروفات" value={`-${formatMoney(totalOut)}`} sub="جنيه" icon={Wallet} tone="danger" />
        <StatCard dense label="مصروف اليوم" value={formatMoney(expToday)} sub="جنيه" icon={Wallet} tone="warning" />
        <StatCard dense label="مصروف الأسبوع" value={formatMoney(expWeek)} sub="جنيه" icon={Wallet} tone="teal" />
        <StatCard dense label="مصروف الشهر" value={formatMoney(expMonth)} sub="جنيه" icon={Wallet} tone="primary" />
      </div>

      <div className="text-xs text-muted-foreground">
        آخر عملية: <span className="text-foreground">{lastTx ? timeAgo(lastTx.date) : "لا توجد عمليات"}</span>
      </div>

      {/* الرسوم البيانية */}
      {(pieData.length > 0 || weekly.some((w) => w.دخل || w.مصروف)) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {pieData.length > 0 && (
            <Card>
              <div className="mb-3 text-sm font-semibold">المصروفات حسب التصنيف</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((p) => (
                      <Cell key={p.name} fill={p.c} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() : v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card>
            <div className="mb-3 text-sm font-semibold">حركة الفلوس أسبوعيًا</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly}>
                <XAxis dataKey="w" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() : v)} />
                <Bar dataKey="دخل" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="مصروف" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* الجدول والفلاتر */}
      <Card className="p-0! overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFKind("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                fKind === "all" ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFKind("دخل")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                fKind === "دخل" ? "bg-success text-white" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              دخل
            </button>
            <button
              onClick={() => setFKind("مصروف")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                fKind === "مصروف" ? "bg-destructive text-white" : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              مصروف
            </button>
            <select value={fDate} onChange={(e) => setFDate(e.target.value as typeof fDate)} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent">
              <option value="all">التاريخ: الكل</option>
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
            </select>
            <select value={fWho} onChange={(e) => setFWho(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent">
              {whoOptions.map((w) => (
                <option key={w} value={w}>
                  {w === "الكل" ? "المسؤول: الكل" : w}
                </option>
              ))}
            </select>
            <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent">
              {catOptions.map((c) => (
                <option key={c} value={c}>
                  {c === "الكل" ? "التصنيف: الكل" : c}
                </option>
              ))}
            </select>
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
                <th>التصنيف</th>
                <th>المسؤول</th>
                <th>اتصرف على ايه</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    لا توجد عمليات مطابقة
                  </td>
                </tr>
              )}
              {filteredLedger.map((l) => {
                const signedAmt = l.kind === "دخل" ? l.amount : -l.amount;
                return (
                  <tr key={l.id} className="row-hover hover:row-hover-active">
                    <td className="px-4 py-3 tabular text-muted-foreground">{formatDate(l.date)}</td>
                    <td className="px-4 py-3">
                      <Pill tone={l.kind === "دخل" ? "success" : "danger"}>{l.kind}</Pill>
                    </td>
                    <td className={`px-4 py-3 font-bold tabular ${signedAmt >= 0 ? "text-success" : "text-destructive"}`}>
                      {signedAmt > 0 ? `+${signedAmt.toLocaleString()}` : signedAmt.toLocaleString()} ج
                    </td>
                    <td className="px-4 py-3 tabular font-semibold">{l.bal.toLocaleString()} ج</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.category ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.who ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.spentOn ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId((v) => (v === l.id ? null : l.id))}
                          className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        {openMenuId === l.id && (
                          <div className="absolute left-0 z-10 mt-1 w-40 rounded-xl border border-border bg-background p-1 text-xs shadow-lg">
                            <button
                              onClick={() => deleteTransaction(l.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-destructive hover:bg-accent"
                            >
                              <Trash2 className="size-3.5" /> حذف
                            </button>
                          </div>
                        )}
                      </div>
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