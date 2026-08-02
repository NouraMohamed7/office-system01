"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, SectionTitle, StatCard } from "@/components/manager/primitives";
import { Plus, Wallet, MoreVertical, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip, CartesianGrid } from "recharts";

// الأقسام الفعلية في الشركة فقط
const DEPARTMENTS = ["سوشيال ميديا", "تسويق", "داش متابعة مناديب"] as const;
type Department = (typeof DEPARTMENTS)[number];

// التصنيف بقى نص حر بيكتبه المستخدم مش قايمة مقفولة
type Category = string;

// باليتة ألوان ثابتة بتتلف على أي تصنيف يتكتب، عشان كل تصنيف ياخد لون واضح في الرسم البياني
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

type Expense = {
  id: number;
  daysAgo: number; // 0 = اليوم
  cat: Category;
  amount: number;
  who: string;
  dept: Department;
};

const INITIAL_TREASURY = 903120;

function dateFromDaysAgo(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}
function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatAmount(n: number) {
  return n.toLocaleString("en-US");
}

const initialExpenses: Expense[] = [
  { id: 1, daysAgo: 0, cat: "إعلانات", amount: 2400, who: "أحمد", dept: "تسويق" },
  { id: 2, daysAgo: 1, cat: "أدوات مكتبية", amount: 820, who: "دينا", dept: "سوشيال ميديا" },
  { id: 3, daysAgo: 2, cat: "إيجار", amount: 15000, who: "أحمد", dept: "داش متابعة مناديب" },
  { id: 4, daysAgo: 3, cat: "رواتب", amount: 45000, who: "أحمد", dept: "تسويق" },
  { id: 5, daysAgo: 4, cat: "ضيافة", amount: 620, who: "سارة", dept: "سوشيال ميديا" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // فلاتر
  const [fWho, setFWho] = useState("الكل");
  const [fDept, setFDept] = useState("الكل");
  const [fCat, setFCat] = useState("الكل");
  const [fDate, setFDate] = useState("الكل");

  // فورم إضافة مصروف
  const [nCat, setNCat] = useState("");
  const [nAmount, setNAmount] = useState("");
  const [nWho, setNWho] = useState("");
  const [nDept, setNDept] = useState<Department>(DEPARTMENTS[0]);

  const whoOptions = useMemo(() => ["الكل", ...Array.from(new Set(expenses.map(e => e.who)))], [expenses]);
  // قايمة التصنيفات المستخدمة فعليًا، مشتقة من البيانات نفسها بدل ما تكون مقفولة
  const knownCategories = useMemo(() => Array.from(new Set(expenses.map(e => e.cat))), [expenses]);
  const catOptions = useMemo(() => ["الكل", ...knownCategories], [knownCategories]);

  // ---- كل الإحصائيات محسوبة فعليًا من البيانات (كل المصروفات المسجّلة) ----
  const today = expenses.filter(e => e.daysAgo === 0).reduce((s, e) => s + e.amount, 0);
  const week = expenses.filter(e => e.daysAgo <= 6).reduce((s, e) => s + e.amount, 0);
  const month = expenses.filter(e => e.daysAgo <= 29).reduce((s, e) => s + e.amount, 0);
  const year = expenses.filter(e => e.daysAgo <= 365).reduce((s, e) => s + e.amount, 0);
  const balance = INITIAL_TREASURY - expenses.reduce((s, e) => s + e.amount, 0);
  const opsCount = expenses.length;

  // ---- بيانات الرسوم مشتقة من البيانات الفعلية ----
  const pieData = knownCategories.map(c => ({
    name: c,
    value: expenses.filter(e => e.cat === c).reduce((s, e) => s + e.amount, 0),
    c: colorForCategory(c, knownCategories),
  })).filter(p => p.value > 0);

  const weekly = Array.from({ length: 6 }, (_, i) => {
    const from = i * 7, to = from + 6;
    const total = expenses.filter(e => e.daysAgo >= from && e.daysAgo <= to).reduce((s, e) => s + e.amount, 0);
    return { m: `أسبوع ${6 - i}`, v: total };
  }).reverse();

  const daily = Array.from({ length: 20 }, (_, i) => {
    const dAgo = 19 - i;
    const total = expenses.filter(e => e.daysAgo === dAgo).reduce((s, e) => s + e.amount, 0);
    return { d: formatDate(dateFromDaysAgo(dAgo)), v: total };
  });

  // ---- الفلترة الفعلية للجدول ----
  const filteredRows = expenses.filter(e => {
    if (fWho !== "الكل" && e.who !== fWho) return false;
    if (fDept !== "الكل" && e.dept !== fDept) return false;
    if (fCat !== "الكل" && e.cat !== fCat) return false;
    if (fDate === "اليوم" && e.daysAgo !== 0) return false;
    if (fDate === "الأسبوع" && e.daysAgo > 6) return false;
    if (fDate === "الشهر" && e.daysAgo > 29) return false;
    return true;
  }).sort((a, b) => a.daysAgo - b.daysAgo);

  function handleAddExpense() {
    const amt = Number(nAmount);
    if (!amt || amt <= 0 || !nWho.trim() || !nCat.trim()) return;
    setExpenses(prev => [
      { id: Date.now(), daysAgo: 0, cat: nCat.trim(), amount: amt, who: nWho.trim(), dept: nDept },
      ...prev,
    ]);
    setNCat("");
    setNAmount("");
    setNWho("");
    setShowForm(false);
  }

  function deleteExpense(id: number) {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setOpenMenuId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المصروفات"
        subtitle="لوحة مالية لكل مصروفات الشركة."
        actions={
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            <Plus className="size-4" /> إضافة مصروف
          </button>
        }
      />

      {showForm && (
        <Card className="!p-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <input
              value={nCat}
              onChange={e => setNCat(e.target.value)}
              placeholder="اكتب التصنيف"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={nAmount}
              onChange={e => setNAmount(e.target.value)}
              type="number"
              placeholder="القيمة (ج)"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={nWho}
              onChange={e => setNWho(e.target.value)}
              placeholder="المسؤول"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <select value={nDept} onChange={e => setNDept(e.target.value as Department)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={handleAddExpense} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
              حفظ المصروف
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="مصروف اليوم" value={formatAmount(today)} sub="جنيه" icon={Wallet} tone="primary" />
        <StatCard dense label="مصروف الأسبوع" value={formatAmount(week)} sub="جنيه" icon={Wallet} tone="teal" />
        <StatCard dense label="مصروف الشهر" value={formatAmount(month)} sub="جنيه" icon={Wallet} tone="warning" />
        <StatCard dense label="مصروف السنة" value={formatAmount(year)} sub="جنيه" icon={Wallet} tone="danger" />
        <StatCard dense label="الرصيد الحالي" value={formatAmount(balance)} sub="جنيه" icon={Wallet} tone="success" />
        <StatCard dense label="عمليات الصرف" value={String(opsCount)} icon={Wallet} tone="primary" />
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap gap-2">
          <select value={fDate} onChange={e => setFDate(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <option value="الكل">التاريخ: الكل</option>
            <option value="اليوم">اليوم</option>
            <option value="الأسبوع">هذا الأسبوع</option>
            <option value="الشهر">هذا الشهر</option>
          </select>
          <select value={fWho} onChange={e => setFWho(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            {whoOptions.map(w => <option key={w} value={w}>{w === "الكل" ? "المسؤول: الكل" : w}</option>)}
          </select>
          <select value={fDept} onChange={e => setFDept(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <option value="الكل">القسم: الكل</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fCat} onChange={e => setFCat(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            {catOptions.map(c => <option key={c} value={c}>{c === "الكل" ? "التصنيف: الكل" : c}</option>)}
          </select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>التاريخ</th><th>التصنيف</th><th>القيمة (ج)</th><th>المسؤول</th><th>القسم</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">لا توجد مصروفات مطابقة</td></tr>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id} className="row-hover hover:row-hover-active relative">
                  <td className="px-4 py-3 tabular text-xs text-muted-foreground">
                    {r.daysAgo === 0 ? "اليوم" : r.daysAgo === 1 ? "أمس" : formatDate(dateFromDaysAgo(r.daysAgo))}
                  </td>
                  <td className="px-4 py-3">{r.cat}</td>
                  <td className="px-4 py-3 font-bold text-primary tabular">{formatAmount(r.amount)}</td>
                  <td className="px-4 py-3">{r.who}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dept}</td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenuId(v => (v === r.id ? null : r.id))}
                        className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      {openMenuId === r.id && (
                        <div className="absolute left-0 z-10 mt-1 w-40 rounded-xl border border-border bg-background p-1 text-xs shadow-lg">
                          <button
                            onClick={() => deleteExpense(r.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-destructive hover:bg-accent"
                          >
                            <Trash2 className="size-3.5" /> حذف
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    
    </div>
  );
}