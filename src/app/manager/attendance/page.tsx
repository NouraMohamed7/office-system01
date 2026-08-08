// src/app/manager/attendance/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import {
  Users, UserCheck, Clock, UserX, Palmtree, ClipboardX,
  Download, Loader2,
  Settings, Save, CheckCircle2, XCircle, Ban,
} from "lucide-react";
import {
  getAttendanceToday,
  getTodayAttendanceRecords,
  getBreaksByAttendanceIds,
  subscribeToBreaks,
  subscribeToLeaves,
  getAttendanceSettings,
  createAttendanceSettings,
  updateAttendanceSettings,
  type AttendanceTodayRow,
  type AttendanceSettings,
  type BreakRecord,
} from "@/modules/attendance/api/attendance.api";
import {
  useManagerLeaveRequests,
  useLeaveActions,
} from "@/modules/attendance/api/hooks/useAttendance";
import { getEmployees } from "@/modules/employees/api/employees.api";
import { getDepartments, type Department } from "@/modules/department/api/department.api";
import { getBranches, type Branch } from "@/modules/branch/api/branch.api";
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  type AttendanceStatus,
  type Tone,
  type LeaveType,
  type LeaveStatus,
} from "@/lib/attendance-labels";

type Status = AttendanceStatus;
// قرارات المدير الوحيدة اللي check_leave_status بيقبلها فعليًا
type LeaveDecision = Extract<LeaveStatus, "accepted" | "rejected" | "cancelled">;

const KNOWN_STATUSES: Status[] = ["present", "absent", "late", "on_leave", "not_checked_in", "leave_early"];

type Row = {
  id: string;
  name: string;
  dept: string;
  in: string;
  out: string;
  inISO: string | null;
  outISO: string | null;
  st: Status;
  tone: Tone;
  breakStartISO: string | null;
  breakEndISO: string | null;
};

// جدول طلبات الإجازة الدائم في صفحة المدير — كل الحالات (pending / accepted / rejected / cancelled)
type LeaveRow = {
  id: number;
  employeeName: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
};

const LEAVE_STATUS_TONE: Record<LeaveStatus, Tone> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  cancelled: "muted",
  end_leave_early: "teal",
};

// ⚠️ مؤكد فعليًا من الباك: check_leave_status بالإلغاء (cancelled) بيرفض
// برسالة "Cannot cancel a leave that has already started" لو start_date <=
// النهاردة، حتى لو الحالة لسه pending. القبول/الرفض مش موثقين بنفس القيد.
function isLeaveStarted(startDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return startDate <= today;
}

function formatTimeAr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function computeMinutesBetween(startISO: string | null, endISO: string | null): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  let mins = Math.round((end - start) / 60000);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function formatMinutesAsHours(mins: number | null): string {
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function formatBreakCell(breakStartISO: string | null, breakEndISO: string | null): string {
  if (!breakStartISO) return "—";
  if (!breakEndISO) return "جاري الآن...";
  const mins = computeMinutesBetween(breakStartISO, breakEndISO);
  return formatMinutesAsHours(mins);
}

function mapTodayRowToRow(
  r: AttendanceTodayRow,
  deptMap: Map<string, string>,
  breakMap: Map<string, BreakRecord>
): Row {
  const inTime = formatTimeAr(r.check_in_at);
  const outTime = formatTimeAr(r.check_out_at);

  let status: Status;
  if (r.status && (KNOWN_STATUSES as string[]).includes(r.status)) {
    status = r.status as Status;
  } else if (r.check_in_at) {
    status = r.late_minutes && r.late_minutes > 0 ? "late" : "present";
  } else {
    status = "not_checked_in";
  }

  const lastBreak = breakMap.get(r.users_id);

  return {
    id: r.users_id,
    name: r.name,
    dept: deptMap.get(r.users_id) ?? "-",
    in: inTime,
    out: outTime,
    inISO: r.check_in_at,
    outISO: r.check_out_at,
    st: status,
    tone: ATTENDANCE_STATUS_TONE[status],
    breakStartISO: lastBreak?.start_time ?? null,
    breakEndISO: lastBreak?.end_time ?? null,
  };
}

function exportRowsToCsv(rows: Row[]) {
  const header = ["الموظف", "القسم", "وقت الحضور", "وقت الانصراف", "الاستراحة", "الحالة"];
  const csvRows = [header.join(",")].concat(
    rows.map((r) => [
      r.name,
      r.dept,
      r.in,
      r.out,
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

function exportLeaveRowsToCsv(rows: LeaveRow[]) {
  const header = ["الموظف", "نوع الإجازة", "من", "إلى", "السبب", "الحالة"];
  const csvRows = [header.join(",")].concat(
    rows.map((l) =>
      [
        l.employeeName,
        LEAVE_TYPE_LABEL[l.leave_type],
        l.start_date,
        l.end_date,
        `"${(l.reason ?? "").replace(/"/g, '""')}"`,
        LEAVE_STATUS_LABEL[l.status],
      ].join(",")
    )
  );
  const csv = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "تقرير_الإجازات.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type SettingsForm = {
  branch_id: string;
  late_tolerance_minutes: string;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  // خريطة اسم الموظف (id -> name) — مستخدمة في جدول الإجازات لعرض اسم صاحب الطلب
  const [employeeNameMap, setEmployeeNameMap] = useState<Map<string, string>>(new Map());

  // ---- إعدادات الحضور (attendance_settings) ----
  const [settingsList, setSettingsList] = useState<AttendanceSettings[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(EMPTY_SETTINGS_FORM);
  const [editingSettingsId, setEditingSettingsId] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ---- الفروع ----
  const [branches, setBranches] = useState<Branch[]>([]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  // ---- طلبات الإجازة — كل الحالات، مباشرة من جدول leaves في الباك ----
  const {
    data: leaves,
    loading: leavesLoading,
    refresh: refreshLeaves,
  } = useManagerLeaveRequests();
  const leaveActions = useLeaveActions();

  const load = useCallback(async () => {
    try {
      const [todayRowsRaw, employees, depts, attendanceRecords] = await Promise.all([
        getAttendanceToday(),
        getEmployees(),
        getDepartments(),
        getTodayAttendanceRecords(),
      ]);

      // ⚠️ dedupe: لو موظف عنده أكتر من سجل attendance في نفس اليوم (مثلاً
      // check-in/check-out متكررين أثناء الاختبار)، view attendance_today
      // بترجع صف لكل سجل، فبيتكرر users_id وده بيكسر الـ key في الجدول.
      // بنسيب بس آخر سجل (أحدث check_in_at) لكل موظف.
      const dedupedByUser = new Map<string, AttendanceTodayRow>();
      for (const r of todayRowsRaw) {
        const existing = dedupedByUser.get(r.users_id);
        if (!existing || (r.check_in_at ?? "") >= (existing.check_in_at ?? "")) {
          dedupedByUser.set(r.users_id, r);
        }
      }
      const todayRows = Array.from(dedupedByUser.values());

      const deptMap = new Map<string, string>();
      const nameMap = new Map<string, string>();
      for (const e of employees) {
        if (e.department?.name) deptMap.set(e.id, e.department.name);
        if (e.full_name) nameMap.set(e.id, e.full_name);
      }
      setEmployeeNameMap(nameMap);

      const attendanceIds = attendanceRecords.map((rec) => rec.id);
      const allBreaks = attendanceIds.length > 0 ? await getBreaksByAttendanceIds(attendanceIds) : [];
      const attendanceIdToUser = new Map<number, string>();
      for (const rec of attendanceRecords) attendanceIdToUser.set(rec.id, rec.users_id);

      const breakMap = new Map<string, BreakRecord>();
      for (const b of allBreaks) {
        const uid = attendanceIdToUser.get(b.attendance_id);
        if (uid) breakMap.set(uid, b);
      }

      setRows(todayRows.map((r) => mapTodayRowToRow(r, deptMap, breakMap)));
      setDepartments(depts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الحضور");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeToBreaks(() => load());
    return unsubscribe;
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeToLeaves(() => refreshLeaves());
    return unsubscribe;
  }, [refreshLeaves]);

  // جدول طلبات الإجازة مبني مباشرة من بيانات الباك (كل الحالات)
  const leaveRows: LeaveRow[] = useMemo(
    () =>
      leaves
        .map((l) => ({
          id: l.id,
          employeeName: employeeNameMap.get(l.users_id) || "—",
          leave_type: l.leave_type,
          start_date: l.start_date,
          end_date: l.end_date,
          reason: l.reason,
          status: l.status,
        }))
        .sort((a, b) => b.id - a.id),
    [leaves, employeeNameMap]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.trim() && !r.name.includes(search.trim())) return false;
      if (deptFilter && r.dept !== deptFilter) return false;
      return true;
    });
  }, [rows, search, deptFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    present: rows.filter((r) => r.st === "present").length,
    late: rows.filter((r) => r.st === "late").length,
    absent: rows.filter((r) => r.st === "absent").length,
    leave: rows.filter((r) => r.st === "on_leave").length,
    notMarked: rows.filter((r) => r.st === "not_checked_in").length,
  }), [rows]);

  function handleExport() {
    setExporting(true);
    setTimeout(() => {
      exportRowsToCsv(rows);
      setExporting(false);
      showToast("success", "تم تصدير تقرير الحضور بنجاح");
    }, 600);
  }

  function handleExportLeaves() {
    if (leaveRows.length === 0) {
      showToast("error", "مفيش طلبات إجازة عشان تتصدّر");
      return;
    }
    exportLeaveRowsToCsv(leaveRows);
    showToast("success", "تم تصدير تقرير الإجازات بنجاح");
  }

  // ============================================================
  // إعدادات الحضور
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
  // طلبات الإجازة — قرار المدير (قبول / رفض / إلغاء)
  // ============================================================

  async function decideOnLeave(leaveId: number, status: LeaveDecision) {
    try {
      await leaveActions.setLeaveStatus(leaveId, status);
      showToast("success", `تم تحديث حالة طلب الإجازة رقم ${leaveId}`);
      await refreshLeaves();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تحديث حالة الإجازة");
    }
  }

  const todayLabel = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  const pendingCount = leaveRows.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور"
        subtitle={`حضور الشركة بالكامل — اليوم ${todayLabel}.`}
        actions={
          <div className="flex items-center gap-2">
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
              {exporting ? "جاري التصدير..." : "تصدير الحضور"}
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

      <Card className="p-4!">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 min-w-55 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50"
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

      <Card className="p-0! overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>القسم</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>الاستراحة</th><th>الحالة</th>
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
                  <td className="px-4 py-3 tabular text-muted-foreground">
                    {formatBreakCell(r.breakStartISO, r.breakEndISO)}
                  </td>
                  <td className="px-4 py-3">
                    <span key={r.st} className="inline-block animate-in fade-in zoom-in-95 duration-200">
                      <Pill tone={r.tone}>{ATTENDANCE_STATUS_LABEL[r.st]}</Pill>
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    مفيش نتائج مطابقة للبحث/الفلتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============================================================
          جدول طلبات الإجازة — مباشرة من جدول leaves في الباك (كل الحالات)
      ============================================================ */}
      <Card className="p-0! overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Palmtree className="size-4 text-teal" /> طلبات الإجازة
            {pendingCount > 0 && (
              <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                {pendingCount} معلّق
              </span>
            )}
          </h3>
          <button
            onClick={handleExportLeaves}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition hover:bg-accent active:scale-95"
          >
            <Download className="size-4" />
            تصدير الإجازات
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>السبب</th><th>الحالة</th><th>إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leavesLoading && leaveRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    جاري تحميل طلبات الإجازة...
                  </td>
                </tr>
              )}
              {!leavesLoading && leaveRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    مفيش طلبات إجازة لسه
                  </td>
                </tr>
              )}
              {leaveRows.map((l) => (
                <tr key={l.id} className="row-hover hover:row-hover-active">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={l.employeeName} />
                      <span className="font-semibold">{l.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{LEAVE_TYPE_LABEL[l.leave_type]}</td>
                  <td className="px-4 py-3 tabular">{l.start_date}</td>
                  <td className="px-4 py-3 tabular">{l.end_date}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-60 truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3">
                    <Pill tone={LEAVE_STATUS_TONE[l.status]}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decideOnLeave(l.id, "accepted")}
                          disabled={leaveActions.loading}
                          className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/25 disabled:opacity-50"
                        >
                          <CheckCircle2 className="size-3.5" /> قبول
                        </button>
                        <button
                          onClick={() => decideOnLeave(l.id, "rejected")}
                          disabled={leaveActions.loading}
                          className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-50"
                        >
                          <XCircle className="size-3.5" /> رفض
                        </button>
                        {/* الإلغاء ممنوع لو الإجازة بدأت فعلاً (رسالة الباك) */}
                        {!isLeaveStarted(l.start_date) && (
                          <button
                            onClick={() => decideOnLeave(l.id, "cancelled")}
                            disabled={leaveActions.loading}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                          >
                            <Ban className="size-3.5" /> إلغاء
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">تم اتخاذ القرار</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
    </div>
  );
}