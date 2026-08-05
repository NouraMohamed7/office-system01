// src/app/manager/attendance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import {
  Users, UserCheck, Clock, UserX, Palmtree, ClipboardX,
  Download, MoreVertical, LogIn, LogOut, User, Loader2,
} from "lucide-react";
import { getAttendanceToday, getCompanyMonthSummary, type AttendanceTodayRow, type CompanyMonthSummary } from "@/modules/attendance/api/attendance.api";
import { getEmployees } from "@/modules/employees/api/employees.api";
import { getDepartments, type Department } from "@/modules/department/api/department.api";

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

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTimeAr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function computeHours(inTime: string, outTime: string) {
  if (inTime === "—" || outTime === "—") return "—";
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  let mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins < 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
}

// نحول شكل بيانات attendance_today (من الباك) لشكل Row اللي الصفحة متوقعاه
// deptMap: خريطة users_id -> اسم القسم (جايه من جدول users + department، لأن attendance_today مفيهوش قسم)
function mapTodayRowToRow(r: AttendanceTodayRow, deptMap: Map<string, string>): Row {
  const inTime = formatTimeAr(r.check_in_at);
  const outTime = formatTimeAr(r.check_out_at);

  let status: Status = "لم يسجل";
  if (r.status === "غائب" || r.status === "إجازة") {
    status = r.status as Status;
  } else if (r.check_in_at) {
    status = (r.late_minutes && r.late_minutes > 0) ? "متأخر" : "حاضر";
  }

  return {
    id: r.users_id,
    name: r.name,
    dept: deptMap.get(r.users_id) ?? "-",
    in: inTime,
    out: outTime,
    hrs: computeHours(inTime, outTime),
    st: status,
    tone: STATUS_TONE[status],
  };
}

function exportRowsToCsv(rows: Row[]) {
  const header = ["الموظف", "القسم", "وقت الحضور", "وقت الانصراف", "ساعات العمل", "الحالة"];
  const csvRows = [header.join(",")].concat(
    rows.map((r) => [r.name, r.dept, r.in, r.out, r.hrs, r.st].join(","))
  );
  const csv = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "تقرير_الحضور.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const showToast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [monthSummary, setMonthSummary] = useState<CompanyMonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [todayRows, employees, depts, summary] = await Promise.all([
          getAttendanceToday(),
          getEmployees(), // مستخدمينها هنا بس عشان نجيب قسم كل موظف (users_id -> department)
          getDepartments(),
          getCompanyMonthSummary(),
        ]);

        const deptMap = new Map<string, string>();
        for (const e of employees) {
          if (e.department?.name) deptMap.set(e.id, e.department.name);
        }

        setRows(todayRows.map((r) => mapTodayRowToRow(r, deptMap)));
        setDepartments(depts);
        setMonthSummary(summary);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الحضور");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  // --- الأزرار دي لسه محلية بس؛ الباك لسه مفيهوش endpoint يسمح للمدير
  // يعدّل حضور موظف تاني نيابة عنه. لما تتوفر، هنستبدل الكود جوا كل دالة بنداء API حقيقي.
  function markCheckIn(r: Row) {
    updateRow(r.id, { in: nowTime(), out: "—", hrs: "—", st: "حاضر", tone: STATUS_TONE["حاضر"] });
    showToast("success", `تم تسجيل حضور ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function markCheckOut(r: Row) {
    if (r.in === "—") {
      showToast("error", `${r.name} لسه ما سجلش حضور`);
      setOpenMenuId(null);
      return;
    }
    const out = nowTime();
    updateRow(r.id, { out, hrs: computeHours(r.in, out) });
    showToast("success", `تم تسجيل انصراف ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function markAbsent(r: Row) {
    updateRow(r.id, { in: "—", out: "—", hrs: "—", st: "غائب", tone: STATUS_TONE["غائب"] });
    showToast("success", `تم تسجيل ${r.name} كغائب (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function viewProfile(r: Row) {
    showToast("success", `الملف الشخصي لـ ${r.name} — قريباً`);
    setOpenMenuId(null);
  }

  function handleExport() {
    setExporting(true);
    setTimeout(() => {
      exportRowsToCsv(rows);
      setExporting(false);
      showToast("success", "تم تصدير تقرير الحضور بنجاح");
    }, 600);
  }

  const todayLabel = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور"
        subtitle={`حضور الشركة بالكامل — اليوم ${todayLabel}.`}
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

      {loadError && (
        <Card className="p-4 border-2 border-destructive/30 text-destructive text-sm">
          خطأ في تحميل البيانات: {loadError}
        </Card>
      )}

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
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      </Card>

      {loading && <p className="text-sm text-muted-foreground p-4">جاري تحميل بيانات الحضور...</p>}

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
                          <button onClick={() => viewProfile(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                            <User className="size-4 text-primary" /> عرض الملف
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
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
        <StatCard label="أيام الحضور" value={String(monthSummary?.avgPresentDays ?? 0)} sub="متوسط للموظف" tone="success" />
        <StatCard label="أيام الغياب" value={String(monthSummary?.avgAbsentDays ?? 0)} sub="متوسط للموظف" tone="danger" />
        <StatCard label="نسبة الالتزام" value={`${monthSummary?.compliancePct ?? 0}%`} tone="primary" />
        <StatCard label="إجمالي ساعات العمل" value={(monthSummary?.totalWorkHours ?? 0).toLocaleString("ar-EG")} tone="teal" />
      </div>
    </div>
  );
}