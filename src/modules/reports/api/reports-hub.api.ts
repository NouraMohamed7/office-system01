// src/modules/reports/api/reports-hub.api.ts
import { supabase } from "@/lib/supabase/client";
import { getUsersNameMap } from "./reports.api";
import { getBranches } from "@/modules/branch/api/branch.api";
import { getDepartments } from "@/modules/department/api/department.api";

// ==========================================================
// Filter options (تتحمل مرة واحدة وتتشارك بين كل الأقسام)
// ==========================================================

export interface FilterOptions {
  departments: { id: number; name: string }[];
  branches: { id: number; city: string; country: string }[];
  employees: { id: string; name: string }[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [departments, branches, { data: employees, error: empErr }] = await Promise.all([
    getDepartments(),
    getBranches(),
    supabase.from("users_with_email").select("id,name").order("name"),
  ]);

  if (empErr) throw empErr;

  return {
    departments,
    branches,
    employees: (employees ?? []).map((e) => ({ id: e.id, name: e.name ?? "—" })),
  };
}

export interface HubFilters {
  departmentId?: number;
  branchId?: number;
  employeeId?: string;
  status?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

// ==========================================================
// Status label maps (enums حقيقية من الباك — القيمة إنجليزي/التخزين،
// اللابل عربي/العرض بس)
// ==========================================================

export const EMP_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "نشط" },
  { value: "on_leave", label: "في إجازة" },
  { value: "resigned", label: "مستقيل" },
  { value: "suspended", label: "موقوف" },
  { value: "pending", label: "معلّق" },
];
const EMP_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  EMP_STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const TASK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "processing", label: "جاري التنفيذ" },
  { value: "completed", label: "مكتملة" },
  { value: "late", label: "متأخرة" },
  { value: "cancelled", label: "ملغاة" },
];
const TASK_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TASK_STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const ATTENDANCE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "present", label: "حاضر" },
  { value: "absent", label: "غائب" },
  { value: "late", label: "متأخر" },
  { value: "on_leave", label: "إجازة" },
  { value: "not_checked_in", label: "لم يسجل دخول" },
  { value: "leave_early", label: "انصراف مبكر" },
];
const ATTENDANCE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  ATTENDANCE_STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const COMPLAINT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "work_env", label: "بيئة العمل" },
  { value: "salary&rewards", label: "الراتب والمكافآت" },
  { value: "co-worker", label: "زميل عمل" },
  { value: "tools&matrials", label: "أدوات وخامات" },
  { value: "else", label: "أخرى" },
];
const COMPLAINT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  COMPLAINT_TYPE_OPTIONS.map((s) => [s.value, s.label])
);

export const COMPLAINT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "جديدة" },
  { value: "in_processing", label: "قيد المعالجة" },
  { value: "done", label: "تم الحل" },
  { value: "rejected", label: "مرفوضة" },
];
const COMPLAINT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  COMPLAINT_STATUS_OPTIONS.map((s) => [s.value, s.label])
);

// ==========================================================
// 1) تقارير الموظفين
// ==========================================================

export interface EmployeeReportRow {
  id: string;
  name: string;
  emp_status: string; // label عربي جاهز للعرض
  departmentName: string | null;
  branchCity: string | null;
  positionTitle: string | null;
}

export async function getEmployeesReport(filters: HubFilters) {
  let query = supabase
    .from("users")
    .select(
      "id,name,emp_status,department_id,branch_id,position_id,department:department_id(name),branch:branch_id(city),position:position_id(title)"
    )
    .order("name", { ascending: true });

  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.status) query = query.eq("emp_status", filters.status);

  const { data, error } = await query;
  if (error) throw error;

  const rows: EmployeeReportRow[] = (data ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    emp_status: EMP_STATUS_LABELS[u.emp_status] ?? u.emp_status,
    departmentName: u.department?.name ?? null,
    branchCity: u.branch?.city ?? null,
    positionTitle: u.position?.title ?? null,
  }));

  const byDept = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.departmentName ?? "بدون قسم";
    byDept.set(key, (byDept.get(key) ?? 0) + 1);
  });

  return {
    rows,
    chart: Array.from(byDept.entries()).map(([label, value]) => ({ label, value })),
  };
}

// ==========================================================
// 2) تقارير الحضور (مجمّعة لكل موظف)
// ==========================================================

export interface AttendanceReportRow {
  users_id: string;
  name: string;
  daysCount: number;
  totalLateMinutes: number;
  totalWorkMinutes: number;
}

export async function getAttendanceReport(filters: HubFilters) {
  let query = supabase
    .from("attendance")
    .select("users_id, late_minutes, total_work_minutes, status, attendance_date");

  if (filters.from) query = query.gte("attendance_date", filters.from);
  if (filters.to) query = query.lte("attendance_date", filters.to);
  if (filters.employeeId) query = query.eq("users_id", filters.employeeId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  const records = data ?? [];
  const nameMap = await getUsersNameMap();

  const byUser = new Map<string, AttendanceReportRow>();
  const byStatus = new Map<string, number>();

  for (const r of records) {
    const row =
      byUser.get(r.users_id) ??
      ({
        users_id: r.users_id,
        name: nameMap[r.users_id] ?? "غير معروف",
        daysCount: 0,
        totalLateMinutes: 0,
        totalWorkMinutes: 0,
      } as AttendanceReportRow);
    row.daysCount += 1;
    row.totalLateMinutes += r.late_minutes ?? 0;
    row.totalWorkMinutes += r.total_work_minutes ?? 0;
    byUser.set(r.users_id, row);

    const statusLabel = ATTENDANCE_STATUS_LABELS[r.status] ?? r.status ?? "غير محدد";
    byStatus.set(statusLabel, (byStatus.get(statusLabel) ?? 0) + 1);
  }

  return {
    rows: Array.from(byUser.values()).sort((a, b) => b.daysCount - a.daysCount),
    chart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
  };
}

// ==========================================================
// 3) تقارير المهام
// ==========================================================

export interface TaskReportRow {
  id: number;
  title: string;
  assigned_to: string;
  assignedName: string;
  status: string; // label عربي
  priority: string;
  start_date: string;
  end_date: string;
}

export async function getTasksReport(filters: HubFilters) {
  let query = supabase
    .from("tasks")
    .select("id,title,assigned_to,department_id,status,priority,start_date,end_date")
    .order("start_date", { ascending: false });

  if (filters.from) query = query.gte("start_date", filters.from);
  if (filters.to) query = query.lte("end_date", filters.to);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.employeeId) query = query.eq("assigned_to", filters.employeeId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  const records = data ?? [];
  const nameMap = await getUsersNameMap();

  const byStatus = new Map<string, number>();
  const rows: TaskReportRow[] = records.map((t) => {
    const statusLabel = TASK_STATUS_LABELS[t.status] ?? t.status;
    byStatus.set(statusLabel, (byStatus.get(statusLabel) ?? 0) + 1);
    return {
      ...t,
      status: statusLabel,
      assignedName: nameMap[t.assigned_to] ?? "غير معروف",
    };
  });

  return {
    rows,
    chart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
  };
}

// ==========================================================
// 4) تقارير الملفات
// ==========================================================

export interface FileReportRow {
  id: number;
  name: string;
  mime_type: string;
  size_bytes: number;
  users_id: string;
  ownerName: string;
  created_at: string;
}

export async function getFilesReport(filters: HubFilters) {
  let query = supabase
    .from("files")
    .select("id,name,mime_type,size_bytes,users_id,created_at")
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.employeeId) query = query.eq("users_id", filters.employeeId);

  const { data, error } = await query;
  if (error) throw error;
  const records = data ?? [];
  const nameMap = await getUsersNameMap();

  const rows: FileReportRow[] = records.map((f) => ({
    ...f,
    ownerName: nameMap[f.users_id] ?? "غير معروف",
  }));

  return {
    rows,
    chart: [] as { label: string; value: number }[],
    totalSizeBytes: rows.reduce((s, f) => s + (f.size_bytes ?? 0), 0),
  };
}

// ==========================================================
// 5) تقارير الشكاوى
// ==========================================================

export interface ComplaintReportRow {
  id: number;
  users_id: string;
  employeeName: string;
  title: string;
  type: string; // label عربي
  status: string; // label عربي
  created_at: string;
}

export async function getComplaintsReport(filters: HubFilters) {
  let query = supabase
    .from("complaints")
    .select("id,users_id,title,type,status,created_at")
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.employeeId) query = query.eq("users_id", filters.employeeId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  const records = data ?? [];
  const nameMap = await getUsersNameMap();

  const byStatus = new Map<string, number>();
  const rows: ComplaintReportRow[] = records.map((c) => {
    const statusLabel = COMPLAINT_STATUS_LABELS[c.status] ?? c.status;
    byStatus.set(statusLabel, (byStatus.get(statusLabel) ?? 0) + 1);
    return {
      ...c,
      type: COMPLAINT_TYPE_LABELS[c.type] ?? c.type,
      status: statusLabel,
      employeeName: nameMap[c.users_id] ?? "غير معروف",
    };
  });

  return {
    rows,
    chart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
  };
}