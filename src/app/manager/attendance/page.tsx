// src/app/manager/attendance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import {
  Users, UserCheck, Clock, UserX, Palmtree, ClipboardX,
  Download, MoreVertical, LogIn, LogOut, User, Loader2,
  Settings, Save, CheckCircle2, XCircle, Ban, Coffee, CupSoda,
} from "lucide-react";
import {
  getAttendanceToday,
  getCompanyMonthSummary,
  getAttendanceSettings,
  createAttendanceSettings,
  updateAttendanceSettings,
  checkLeaveStatus,
  type AttendanceTodayRow,
  type CompanyMonthSummary,
  type AttendanceSettings,
  type LeaveStatus,
} from "@/modules/attendance/api/attendance.api";
import { getEmployees } from "@/modules/employees/api/employees.api";
import { getDepartments, type Department } from "@/modules/department/api/department.api";
import { getBranches, type Branch } from "@/modules/branch/api/branch.api";
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  MANAGER_LEAVE_DECISIONS,
  type AttendanceStatus,
  type Tone,
} from "@/lib/attendance-labels";

type Status = AttendanceStatus;

// ============================================================
// [محلي] شكل الصف اللي الجدول بيعرضه — in/out نص للعرض بالعربي،
// inISO/outISO القيم الخام اللي بنحسب بيها الوقت (عشان منقعش في NaN)
// ============================================================
type Row = {
  id: string;
  name: string;
  dept: string;
  in: string;      // نص معروض (عربي)
  out: string;      // نص معروض (عربي)
  inISO: string | null;   // خام — ده اللي بنحسب بيه
  outISO: string | null;  // خام — ده اللي بنحسب بيه
  hrs: string;
  st: Status;
  tone: Tone;
  // ============================================================
  // [محلي بالكامل — Mock] البريك
  // الباك لسه معندوش أي جدول/عمود لتخزين بداية/نهاية البريك.
  // القيم دي بتتصفر أول ما تعمل refresh للصفحة، ومش بتوصل لأي
  // موظف تاني أو تتخزن في حاجة حقيقية — دي واجهة جاهزة بس عشان
  // نربطها بالباك بسهولة لما يوفر endpoint حقيقي (مثلاً:
  // break_started_at / break_ended_at في جدول attendance، أو
  // جدول attendance_breaks منفصل لو ممكن ياخد أكتر من بريك في اليوم).
  // ============================================================
  breakStartISO: string | null;
  breakEndISO: string | null;
};

// [محلي] بيرجع الوقت الحالي كنص عربي — مستخدمة بس لعرض تقريبي، مش للحساب
function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// [محلي] تنسيق وقت ISO كنص عربي للعرض فقط — لا يُستخدم في أي حساب
function formatTimeAr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// [محلي] الحساب الحقيقي لساعات العمل — بيشتغل على ISO timestamps خام
// (مش على النص العربي)، عشان كده بيتفادى مشكلة NaN:NaN
function computeMinutesBetween(startISO: string | null, endISO: string | null): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  let mins = Math.round((end - start) / 60000);
  if (mins < 0) mins += 24 * 60; // احتياطي لو الانصراف عدى منتصف الليل
  return mins;
}

// [محلي] تنسيق عدد الدقائق كـ "س:د" للعرض
function formatMinutesAsHours(mins: number | null): string {
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// [محلي — Mock] نص عمود "الاستراحة": بيحسب المدة لو البريك خلص،
// وبيوضح "جاري الآن..." لو لسه شغال، و"—" لو مفيش بريك أصلاً
function formatBreakCell(breakStartISO: string | null, breakEndISO: string | null): string {
  if (!breakStartISO) return "—";
  if (!breakEndISO) return "جاري الآن...";
  const mins = computeMinutesBetween(breakStartISO, breakEndISO);
  return formatMinutesAsHours(mins);
}

// ============================================================
// [مربوط بالباك] نحول شكل بيانات attendance_today (من الباك) لشكل
// Row اللي الصفحة متوقعاه. البيانات الأصلية (check_in_at,
// check_out_at, status, late_minutes) جايه من الـ view attendance_today
// deptMap: خريطة users_id -> اسم القسم (جايه من جدول users + department،
// لأن attendance_today مفيهوش قسم)
//
// ⚠️ عمود status في الـ view موثق في الدوك كـ "text" مش public.attendance_type
// مباشرة. بنفترض هنا إنه بيرجّع نفس القيم الإنجليزية بتاعة جدول attendance
// الأصلي (present/absent/late/on_leave/...). لو شغّلت select('status') من
// attendance_today ولقيت شكل مختلف، عدّل المقارنات هنا بس — الباقي كله
// هيفضل شغال زي ما هو.
// ============================================================
function mapTodayRowToRow(r: AttendanceTodayRow, deptMap: Map<string, string>): Row {
  const inTime = formatTimeAr(r.check_in_at);
  const outTime = formatTimeAr(r.check_out_at);
  const workMinutes = computeMinutesBetween(r.check_in_at, r.check_out_at);

  let status: Status = "not_checked_in";
  if (r.status === "absent" || r.status === "on_leave") {
    status = r.status;
  } else if (r.check_in_at) {
    status = r.late_minutes && r.late_minutes > 0 ? "late" : "present";
  }

  return {
    id: r.users_id,
    name: r.name,
    dept: deptMap.get(r.users_id) ?? "-",
    in: inTime,
    out: outTime,
    inISO: r.check_in_at,
    outISO: r.check_out_at,
    hrs: formatMinutesAsHours(workMinutes),
    st: status,
    tone: ATTENDANCE_STATUS_TONE[status],
    // [محلي — Mock] الباك مفيهوش داتا بريك، فبنبدأ دايمًا من صفر عند التحميل
    breakStartISO: null,
    breakEndISO: null,
  };
}

// [محلي] تصدير CSV — بيشتغل على الداتا اللي أصلاً في الذاكرة (state)، مفيهوش نداء للباك
function exportRowsToCsv(rows: Row[]) {
  const header = ["الموظف", "القسم", "وقت الحضور", "وقت الانصراف", "ساعات العمل", "الاستراحة", "الحالة"];
  const csvRows = [header.join(",")].concat(
    rows.map((r) => [
      r.name,
      r.dept,
      r.in,
      r.out,
      r.hrs,
      formatBreakCell(r.breakStartISO, r.breakEndISO),
      ATTENDANCE_STATUS_LABEL[r.st],
    ].join(","))
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

// شكل فورم إعدادات الحضور — [مربوط بالباك] عبر attendance_settings API
type SettingsForm = {
  branch_id: string;
  late_tolerance_minutes: string;
  // ⚠️ notify_manager_on_late اتشالت مؤقتًا من الفورم — الباك لسه مضافهاش
  // كعمود حقيقي في attendance_settings (PGRST204: schema cache مش شايفها).
  // لما الباك يأكد إضافتها، رجّع الحقل هنا وفي EMPTY_SETTINGS_FORM
  // وفي startEditSettings وفي payload بتاع saveSettings تحت.
  effective_from: string;
  effective_to: string;
  start_time: string;
  end_time: string;
  cutoff_time: string;
};

const EMPTY_SETTINGS_FORM: SettingsForm = {
  branch_id: "",
  late_tolerance_minutes: "15",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
  start_time: "09:00",
  end_time: "17:00",
  cutoff_time: "12:00",
};

function branchLabel(b: Branch) {
  return `${b.city}${b.address ? " — " + b.address : ""}`;
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

  // ---- إعدادات الحضور (attendance_settings) — [مربوط بالباك] ----
  const [settingsList, setSettingsList] = useState<AttendanceSettings[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(EMPTY_SETTINGS_FORM);
  const [editingSettingsId, setEditingSettingsId] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ---- الفروع (لاختيار branch_id بدل ما يتكتب يدوي) — [مربوط بالباك] ----
  const [branches, setBranches] = useState<Branch[]>([]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  // ---- أداة يدوية للموافقة/رفض إجازة — [مربوط بالباك عبر RPC] ----
  // ⚠️ مؤقتة: لسه معندناش endpoint لعرض قائمة الطلبات المعلقة،
  // فالمدير بيدخل رقم الطلب يدويًا لحد ما يتوفر جدول/view قراءة.
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveId, setLeaveId] = useState("");
  const [leaveStatus, setLeaveStatus] = useState<LeaveStatus>("accepted");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // [مربوط بالباك] تحميل بيانات الحضور، الموظفين، الأقسام، وملخص الشهر
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

  // [محلي] فلترة/بحث على الداتا اللي أصلاً محملة في الذاكرة
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.trim() && !r.name.includes(search.trim())) return false;
      if (deptFilter && r.dept !== deptFilter) return false;
      return true;
    });
  }, [rows, search, deptFilter]);

  // [محلي] إحصائيات مبنية على الداتا الموجودة في الذاكرة
  const stats = useMemo(() => ({
    total: rows.length,
    present: rows.filter((r) => r.st === "present").length,
    late: rows.filter((r) => r.st === "late").length,
    absent: rows.filter((r) => r.st === "absent").length,
    leave: rows.filter((r) => r.st === "on_leave").length,
    notMarked: rows.filter((r) => r.st === "not_checked_in").length,
  }), [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // ============================================================
  // [محلي بالكامل] — الأزرار دي لسه محلية بس؛ الباك لسه مفيهوش endpoint
  // يسمح للمدير يعدّل حضور موظف تاني نيابة عنه. لما تتوفر، هنستبدل
  // الكود جوا كل دالة بنداء API حقيقي.
  // ============================================================

  function markCheckIn(r: Row) {
    const nowISO = new Date().toISOString();
    updateRow(r.id, {
      in: formatTimeAr(nowISO),
      inISO: nowISO,
      out: "—",
      outISO: null,
      hrs: "—",
      st: "present",
      tone: ATTENDANCE_STATUS_TONE.present,
      breakStartISO: null,
      breakEndISO: null,
    });
    showToast("success", `تم تسجيل حضور ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function markCheckOut(r: Row) {
    if (!r.inISO) {
      showToast("error", `${r.name} لسه ما سجلش حضور`);
      setOpenMenuId(null);
      return;
    }
    const nowISO = new Date().toISOString();
    const mins = computeMinutesBetween(r.inISO, nowISO);
    updateRow(r.id, {
      out: formatTimeAr(nowISO),
      outISO: nowISO,
      hrs: formatMinutesAsHours(mins),
    });
    showToast("success", `تم تسجيل انصراف ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function markAbsent(r: Row) {
    updateRow(r.id, {
      in: "—",
      out: "—",
      inISO: null,
      outISO: null,
      hrs: "—",
      st: "absent",
      tone: ATTENDANCE_STATUS_TONE.absent,
      breakStartISO: null,
      breakEndISO: null,
    });
    showToast("success", `تم تسجيل ${r.name} كغائب (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  // ============================================================
  // [محلي بالكامل — Mock] بداية/نهاية البريك
  // TODO: لما الباك يوفر endpoint (RPC أو update على عمود حقيقي)،
  // استبدل الـ updateRow جوا الدالتين دول بنداء API، بنفس الشكل
  // اللي اتعمل بيه markCheckIn/markCheckOut فوق.
  // ============================================================

  function startBreak(r: Row) {
    if (!r.inISO || r.outISO) {
      showToast("error", `${r.name} لازم يكون حاضر عشان يبدأ استراحة`);
      setOpenMenuId(null);
      return;
    }
    if (r.breakStartISO && !r.breakEndISO) {
      showToast("error", `${r.name} أصلاً في استراحة دلوقتي`);
      setOpenMenuId(null);
      return;
    }
    const nowISO = new Date().toISOString();
    updateRow(r.id, { breakStartISO: nowISO, breakEndISO: null });
    showToast("success", `تم تسجيل بداية استراحة ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  function endBreak(r: Row) {
    if (!r.breakStartISO || r.breakEndISO) {
      showToast("error", `${r.name} مش في استراحة دلوقتي`);
      setOpenMenuId(null);
      return;
    }
    const nowISO = new Date().toISOString();
    updateRow(r.id, { breakEndISO: nowISO });
    showToast("success", `تم تسجيل نهاية استراحة ${r.name} (محليًا فقط — لسه مش متصل بالباك)`);
    setOpenMenuId(null);
  }

  // [محلي بالكامل] لسه مفيهوش صفحة ملف شخصي فعلية
  function viewProfile(r: Row) {
    showToast("success", `الملف الشخصي لـ ${r.name} — قريباً`);
    setOpenMenuId(null);
  }

  // [محلي] بيصدّر الداتا الموجودة في الذاكرة، مفيش نداء للباك هنا
  function handleExport() {
    setExporting(true);
    setTimeout(() => {
      exportRowsToCsv(rows);
      setExporting(false);
      showToast("success", "تم تصدير تقرير الحضور بنجاح");
    }, 600);
  }

  // ============================================================
  // إعدادات الحضور — [مربوط بالباك بالكامل: CRUD حقيقي]
  // ============================================================

  async function openSettings() {
    setSettingsOpen(true);
    setSettingsLoading(true);
    try {
      const [list, branchList] = await Promise.all([
        getAttendanceSettings(),
        getBranches(),
      ]);
      setSettingsList(list);
      setBranches(branchList);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تحميل إعدادات الحضور");
    } finally {
      setSettingsLoading(false);
    }
  }

  function startNewSettings() {
    setEditingSettingsId(null);
    setSettingsForm(EMPTY_SETTINGS_FORM);
  }

  function startEditSettings(s: AttendanceSettings) {
    setEditingSettingsId(s.id);
    setSettingsForm({
      branch_id: String(s.branch_id),
      late_tolerance_minutes: String(s.late_tolerance_minutes),
      effective_from: s.effective_from,
      effective_to: s.effective_to ?? "",
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      cutoff_time: s.cutoff_time.slice(0, 5),
    });
  }

  async function saveSettings() {
    if (!settingsForm.branch_id) {
      showToast("error", "اختار الفرع الأول");
      return;
    }
    setSavingSettings(true);
    try {
      const payload = {
        branch_id: Number(settingsForm.branch_id),
        late_tolerance_minutes: Number(settingsForm.late_tolerance_minutes),
        effective_from: settingsForm.effective_from,
        effective_to: settingsForm.effective_to || null,
        start_time: settingsForm.start_time,
        end_time: settingsForm.end_time,
        cutoff_time: settingsForm.cutoff_time,
      };

      if (editingSettingsId) {
        const updated = await updateAttendanceSettings(editingSettingsId, payload);
        setSettingsList((list) => list.map((s) => (s.id === editingSettingsId ? updated : s)));
        showToast("success", "تم تحديث إعدادات الحضور");
      } else {
        const created = await createAttendanceSettings(payload);
        setSettingsList((list) => [created, ...list]);
        showToast("success", "تم إضافة إعدادات حضور جديدة");
      }
      startNewSettings();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر حفظ إعدادات الحضور");
    } finally {
      setSavingSettings(false);
    }
  }

  // ============================================================
  // أداة يدوية: موافقة/رفض إجازة برقم الطلب — [مربوط بالباك عبر RPC]
  // ============================================================

  async function submitLeaveDecision() {
    const id = Number(leaveId);
    if (!id) {
      showToast("error", "دخّل رقم طلب صحيح");
      return;
    }
    setLeaveSubmitting(true);
    try {
      await checkLeaveStatus({ p_leave_id: id, p_new_status: leaveStatus });
      showToast("success", `تم تحديث حالة طلب الإجازة رقم ${id}`);
      setLeaveId("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تحديث حالة الإجازة");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  const todayLabel = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور"
        subtitle={`حضور الشركة بالكامل — اليوم ${todayLabel}.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeaveOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-accent active:scale-95"
            >
              <Palmtree className="size-4" />
              طلبات الإجازة
            </button>
            <button
              onClick={openSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-accent active:scale-95"
            >
              <Settings className="size-4" />
              إعدادات الحضور
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-accent active:scale-95 disabled:opacity-70"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "جاري التصدير..." : "تصدير"}
            </button>
          </div>
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
                <th>الموظف</th><th>القسم</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>ساعات العمل</th><th>الاستراحة</th><th>الحالة</th><th></th>
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
                  <td className="px-4 py-3 tabular text-muted-foreground">
                    {formatBreakCell(r.breakStartISO, r.breakEndISO)}
                  </td>
                  <td className="px-4 py-3">
                    <span key={r.st} className="inline-block animate-in fade-in zoom-in-95 duration-200">
                      <Pill tone={r.tone}>{ATTENDANCE_STATUS_LABEL[r.st]}</Pill>
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
                          {r.breakStartISO && !r.breakEndISO ? (
                            <button onClick={() => endBreak(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                              <CupSoda className="size-4 text-warning" /> إنهاء الاستراحة
                            </button>
                          ) : (
                            <button onClick={() => startBreak(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm transition hover:bg-accent">
                              <Coffee className="size-4 text-warning" /> بدء استراحة
                            </button>
                          )}
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
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
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

      {/* ============================================================
          مودال: إعدادات الحضور
      ============================================================ */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-2xl -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-warm max-h-[85vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings className="size-5 text-primary" /> إعدادات الحضور
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            {settingsLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">جاري التحميل...</p>
            ) : (
              <div className="space-y-6">
                {settingsList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">الإعدادات الحالية</p>
                    {settingsList.map((s) => {
                      const b = branchMap.get(s.branch_id);
                      return (
                        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                          <div>
                            <div className="font-semibold">
                              {b ? branchLabel(b) : `فرع #${s.branch_id}`} — من {s.effective_from} {s.effective_to ? `إلى ${s.effective_to}` : "(مفتوح)"}
                            </div>
                            <div className="text-muted-foreground text-xs tabular">
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} | مهلة تأخير {s.late_tolerance_minutes} د | cutoff {s.cutoff_time.slice(0, 5)}
                            </div>
                          </div>
                          <button
                            onClick={() => startEditSettings(s)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                          >
                            تعديل
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {editingSettingsId ? `تعديل الإعداد #${editingSettingsId}` : "إضافة إعداد جديد"}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">الفرع</span>
                      <select
                        value={settingsForm.branch_id}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, branch_id: e.target.value }))}
                        disabled={branches.length === 0}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60"
                      >
                        <option value="" disabled>
                          {branches.length === 0 ? "لا توجد فروع" : "اختار الفرع"}
                        </option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {branchLabel(b)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">مهلة التأخير (دقيقة)</span>
                      <input
                        type="number"
                        value={settingsForm.late_tolerance_minutes}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, late_tolerance_minutes: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">وقت بداية الدوام</span>
                      <input
                        type="time"
                        value={settingsForm.start_time}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, start_time: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">وقت نهاية الدوام</span>
                      <input
                        type="time"
                        value={settingsForm.end_time}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, end_time: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">وقت الـ cutoff</span>
                      <input
                        type="time"
                        value={settingsForm.cutoff_time}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, cutoff_time: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">ساري من</span>
                      <input
                        type="date"
                        value={settingsForm.effective_from}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, effective_from: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-muted-foreground">ساري إلى (اختياري)</span>
                      <input
                        type="date"
                        value={settingsForm.effective_to}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, effective_to: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    {/* ⚠️ "إشعار المدير عند التأخير" اتشالت مؤقتًا لحد ما الباك
                        يضيف عمود notify_manager_on_late فعليًا في attendance_settings */}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {editingSettingsId ? "حفظ التعديل" : "إضافة"}
                    </button>
                    {editingSettingsId && (
                      <button
                        onClick={startNewSettings}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          مودال: طلبات الإجازة (أداة يدوية مؤقتة)
      ============================================================ */}
      {leaveOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setLeaveOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-warm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Palmtree className="size-5 text-teal" /> طلبات الإجازة
              </h3>
              <button onClick={() => setLeaveOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="mb-4 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground/80 leading-relaxed">
              ⚠️ لسه معندناش endpoint لعرض قائمة الطلبات المعلقة تلقائيًا.
              دخّل رقم الطلب (leave_id) يدويًا لحد ما يتوفر جدول/view قراءة من الباك.
            </div>

            <div className="space-y-3">
              <label className="text-xs space-y-1 block">
                <span className="text-muted-foreground">رقم طلب الإجازة</span>
                <input
                  type="number"
                  value={leaveId}
                  onChange={(e) => setLeaveId(e.target.value)}
                  placeholder="مثال: 13"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                />
              </label>

              <label className="text-xs space-y-1 block">
                <span className="text-muted-foreground">القرار</span>
                <select
                  value={leaveStatus}
                  onChange={(e) => setLeaveStatus(e.target.value as LeaveStatus)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                >
                  {MANAGER_LEAVE_DECISIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <button
                onClick={submitLeaveDecision}
                disabled={leaveSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {leaveSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : leaveStatus === "accepted" ? (
                  <CheckCircle2 className="size-4" />
                ) : leaveStatus === "rejected" ? (
                  <XCircle className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )}
                تأكيد القرار
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}