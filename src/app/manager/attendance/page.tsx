"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import {
  Users, UserCheck, Clock, UserX, Palmtree, ClipboardX,
  Download, MoreVertical, LogIn, LogOut, User, Loader2,
} from "lucide-react";

type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";
type Status = "حاضر" | "متأخر" | "غائب" | "إجازة" | "لم يسجل";

type Row = {
  id: string;
  name: string;
  dept: string;
  in: string;
  out: string;
  hrs: string;
  st: Status;
  tone: Tone;
};

const STATUS_TONE: Record<Status, Tone> = {
  "حاضر": "success",
  "متأخر": "warning",
  "غائب": "danger",
  "إجازة": "teal",
  "لم يسجل": "muted",
};

const initialRows: Row[] = [
  { id: "1", name: "نورا حسن", dept: "السوشيال", in: "08:35", out: "17:02", hrs: "8:27", st: "حاضر", tone: "success" },
  { id: "2", name: "محمود علي", dept: "الكول سنتر", in: "09:02", out: "17:10", hrs: "8:08", st: "حاضر", tone: "success" },
  { id: "3", name: "كريم سعيد", dept: "المبيعات", in: "10:22", out: "—", hrs: "—", st: "متأخر", tone: "warning" },
  { id: "4", name: "خالد يوسف", dept: "المبيعات", in: "—", out: "—", hrs: "—", st: "غائب", tone: "danger" },
  { id: "5", name: "سارة إبراهيم", dept: "التسويق", in: "—", out: "—", hrs: "—", st: "إجازة", tone: "teal" },
  { id: "6", name: "دينا فتحي", dept: "التصميم", in: "08:50", out: "17:00", hrs: "8:10", st: "حاضر", tone: "success" },
  { id: "7", name: "ياسر أحمد", dept: "الدعم", in: "—", out: "—", hrs: "—", st: "لم يسجل", tone: "muted" },
];

const DEPARTMENTS = ["السوشيال", "الكول سنتر", "المبيعات", "التسويق", "التصميم", "الدعم"];

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function AttendancePage() {
  const showToast = useToast();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.trim() && !r.name.includes(search.trim())) return false;
      if (deptFilter && r.dept !== deptFilter) return false;
      return true;
    });
  }, [rows, search, deptFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    present: rows.filter((r) => r.st === "حاضر").length,
    late: rows.filter((r) => r.st === "متأخر").length,
    absent: rows.filter((r) => r.st === "غائب").length,
    leave: rows.filter((r) => r.st === "إجازة").length,
    notMarked: rows.filter((r) => r.st === "لم يسجل").length,
  }), [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function markCheckIn(r: Row) {
    updateRow(r.id, { in: nowTime(), st: "حاضر", tone: STATUS_TONE["حاضر"] });
    showToast("success", `تم تسجيل حضور ${r.name}`);
    setOpenMenuId(null);
  }

  function markCheckOut(r: Row) {
    if (r.in === "—") {
      showToast("error", `${r.name} لسه ما سجلش حضور`);
      setOpenMenuId(null);
      return;
    }
    updateRow(r.id, { out: nowTime() });
    showToast("success", `تم تسجيل انصراف ${r.name}`);
    setOpenMenuId(null);
  }

  function markAbsent(r: Row) {
    updateRow(r.id, { in: "—", out: "—", hrs: "—", st: "غائب", tone: STATUS_TONE["غائب"] });
    showToast("success", `تم تسجيل ${r.name} كغائب`);
    setOpenMenuId(null);
  }

  function handleExport() {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      showToast("success", "تم تصدير تقرير الحضور بنجاح");
    }, 900);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور"
        subtitle="حضور الشركة بالكامل — اليوم 20 يوليو 2026."
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-accent active:scale-95 disabled:opacity-70"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? "جاري التصدير..." : "تصدير"}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dense label="إجمالي الموظفين" value={stats.total} icon={Users} tone="primary" />
        <StatCard dense label="حاضرون" value={stats.present} icon={UserCheck} tone="success" />
        <StatCard dense label="متأخرون" value={stats.late} icon={Clock} tone="warning" />
        <StatCard dense label="غائبون" value={stats.absent} icon={UserX} tone="danger" />
        <StatCard dense label="إجازة" value={stats.leave} icon={Palmtree} tone="teal" />
        <StatCard dense label="لم يسجلوا" value={stats.notMarked} icon={ClipboardX} tone="muted" />
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50"
            placeholder="اسم الموظف..."
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-muted-foreground outline-none transition hover:bg-accent"
          >
            <option value="">كل الأقسام</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>القسم</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>ساعات العمل</th><th>الحالة</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className="row-hover hover:row-hover-active animate-in fade-in slide-in-from-bottom-1"
                  style={{ animationDelay: `${i * 40}ms`, animationDuration: "300ms", animationFillMode: "backwards" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      <span className="font-semibold">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dept}</td>
                  <td className="px-4 py-3 tabular">{r.in}</td>
                  <td className="px-4 py-3 tabular">{r.out}</td>
                  <td className="px-4 py-3 tabular">{r.hrs}</td>
                  <td className="px-4 py-3">
                    <span key={r.st} className="inline-block animate-in fade-in zoom-in-95 duration-200">
                      <Pill tone={r.tone}>{r.st}</Pill>
                    </span>
                  </td>
                  <td className="relative px-4 py-3">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                      className="grid size-8 place-items-center rounded-lg transition hover:bg-accent active:scale-90"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuId === r.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute left-4 top-full z-20 mt-1 w-48 origin-top-left overflow-hidden rounded-xl border border-border bg-card shadow-warm animate-in fade-in zoom-in-95 duration-150">
                          <button onClick={() => markCheckIn(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                            <LogIn className="size-4 text-success" /> تسجيل حضور الآن
                          </button>
                          <button onClick={() => markCheckOut(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                            <LogOut className="size-4 text-teal" /> تسجيل انصراف الآن
                          </button>
                          <button onClick={() => markAbsent(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm text-destructive transition hover:bg-destructive/10">
                            <UserX className="size-4" /> تسجيل غياب
                          </button>
                          <button className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                            <User className="size-4 text-primary" /> عرض الملف
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    مفيش نتائج مطابقة للبحث/الفلتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <StatCard label="أيام الحضور" value="22" tone="success" />
        <StatCard label="أيام الغياب" value="1.2" sub="متوسط" tone="danger" />
        <StatCard label="نسبة الالتزام" value="94%" tone="primary" />
        <StatCard label="إجمالي ساعات العمل" value="1,842" tone="teal" />
      </div>
    </div>
  );
}