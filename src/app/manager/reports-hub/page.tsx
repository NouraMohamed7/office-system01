"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/manager/primitives";
import {
  Users, Clock, ListChecks, TrendingUp, Files,
  MessageSquare, Truck, Wallet, Loader2, Lock, Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import {
  getFilterOptions,
  getEmployeesReport,
  getAttendanceReport,
  getTasksReport,
  getFilesReport,
  getComplaintsReport,
  FilterOptions,
  HubFilters,
  EMP_STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  ATTENDANCE_STATUS_OPTIONS,
  COMPLAINT_STATUS_OPTIONS,
} from "@/modules/reports/api/reports-hub.api";

type CategoryId = "emp" | "att" | "tsk" | "files" | "cmp";

const CATS: { id: CategoryId; label: string; icon: any }[] = [
  { id: "emp", label: "تقارير الموظفين", icon: Users },
  { id: "att", label: "تقارير الحضور", icon: Clock },
  { id: "tsk", label: "تقارير المهام", icon: ListChecks },
  { id: "files", label: "تقارير الملفات", icon: Files },
  { id: "cmp", label: "تقارير الشكاوى", icon: MessageSquare },
];

// دول محتاجين دوكيومنتيشن للباك بتاعهم قبل ما نقدر نربطهم فعليًا
const COMING_SOON: { id: string; label: string; icon: any }[] = [
  { id: "perf", label: "تقارير الأداء", icon: TrendingUp },
  { id: "reps", label: "تقارير المناديب", icon: Truck },
  { id: "fin", label: "التقارير المالية", icon: Wallet },
];

const CAT_LABELS: Record<CategoryId, string> = {
  emp: "تقارير الموظفين",
  att: "تقارير الحضور",
  tsk: "تقارير المهام",
  files: "تقارير الملفات",
  cmp: "تقارير الشكاوى",
};

// أسماء الشيتات في ملف الإكسل الموحّد (Excel بيرفض أسماء شيتات أطول من 31 حرف)
const SHEET_NAMES: Record<CategoryId, string> = {
  emp: "الموظفين",
  att: "الحضور",
  tsk: "المهام",
  files: "الملفات",
  cmp: "الشكاوى",
};

// كل قسم وقيم الحالة الخاصة بيه (من enums الباك)
const STATUS_OPTIONS_BY_CAT: Partial<Record<CategoryId, { value: string; label: string }[]>> = {
  emp: EMP_STATUS_OPTIONS,
  att: ATTENDANCE_STATUS_OPTIONS,
  tsk: TASK_STATUS_OPTIONS,
  cmp: COMPLAINT_STATUS_OPTIONS,
};

const COLUMNS: Record<CategoryId, { key: string; label: string }[]> = {
  emp: [
    { key: "name", label: "الاسم" },
    { key: "departmentName", label: "القسم" },
    { key: "branchCity", label: "الفرع" },
    { key: "positionTitle", label: "الوظيفة" },
    { key: "emp_status", label: "الحالة" },
  ],
  att: [
    { key: "name", label: "الموظف" },
    { key: "daysCount", label: "عدد الأيام" },
    { key: "totalLateMinutes", label: "دقائق التأخير" },
    { key: "totalWorkMinutes", label: "دقائق العمل" },
  ],
  tsk: [
    { key: "title", label: "المهمة" },
    { key: "assignedName", label: "الموظف" },
    { key: "status", label: "الحالة" },
    { key: "priority", label: "الأولوية" },
    { key: "start_date", label: "من" },
    { key: "end_date", label: "إلى" },
  ],
  files: [
    { key: "name", label: "اسم الملف" },
    { key: "ownerName", label: "الموظف" },
    { key: "mime_type", label: "النوع" },
    { key: "size_bytes", label: "الحجم (بايت)" },
    { key: "created_at", label: "تاريخ الرفع" },
  ],
  cmp: [
    { key: "employeeName", label: "الموظف" },
    { key: "title", label: "العنوان" },
    { key: "type", label: "النوع" },
    { key: "status", label: "الحالة" },
    { key: "created_at", label: "التاريخ" },
  ],
};

interface ReportResult {
  rows: any[];
  chart: { label: string; value: number }[];
}

async function loadCategoryData(cat: CategoryId, filters: HubFilters): Promise<ReportResult> {
  switch (cat) {
    case "emp":
      return getEmployeesReport(filters);
    case "att":
      return getAttendanceReport(filters);
    case "tsk":
      return getTasksReport(filters);
    case "files": {
      const r = await getFilesReport(filters);
      return { rows: r.rows, chart: r.chart };
    }
    case "cmp":
      return getComplaintsReport(filters);
  }
}

function rowsToSheetData(cat: CategoryId, rows: any[]) {
  const cols = COLUMNS[cat];
  return rows.map((r) => {
    const o: Record<string, any> = {};
    cols.forEach((c) => (o[c.label] = r[c.key] ?? "—"));
    return o;
  });
}

function exportExcel(cat: CategoryId, rows: any[]) {
  if (!rows.length) return;
  const cols = COLUMNS[cat];
  const worksheet = XLSX.utils.json_to_sheet(rowsToSheetData(cat, rows));
  worksheet["!cols"] = cols.map(() => ({ wch: 20 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير");
  XLSX.writeFile(workbook, `${CAT_LABELS[cat]}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** بتجيب بيانات كل الأقسام (بنفس الفلاتر الحالية) وتحطهم في ملف إكسل واحد، كل قسم شيت منفصل */
async function exportAllCategoriesExcel(filters: HubFilters) {
  const workbook = XLSX.utils.book_new();
  let hasAnyData = false;

  for (const cat of CATS) {
    const { rows } = await loadCategoryData(cat.id, filters);
    const cols = COLUMNS[cat.id];
    const sheetData = rows.length ? rowsToSheetData(cat.id, rows) : [{ [cols[0].label]: "لا توجد بيانات" }];
    if (rows.length) hasAnyData = true;

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    worksheet["!cols"] = cols.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAMES[cat.id]);
  }

  if (!hasAnyData) return false;
  XLSX.writeFile(workbook, `كل-التقارير-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return true;
}

export default function ReportsHubPage() {
  const [sel, setSel] = useState<CategoryId>("emp");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [branchId, setBranchId] = useState<number | undefined>();
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [result, setResult] = useState<ReportResult | null>(null);
  const loading = result === null;
  const [error, setError] = useState<string | null>(null);

  const [downloadingAll, setDownloadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  useEffect(() => {
    getFilterOptions().then(setFilterOptions).catch((e) => console.error(e));
  }, []);

  // لما تبدّلي القسم، امسحي فلتر الحالة (القيم مختلفة لكل قسم)
  const handleSelectCat = (id: CategoryId) => {
    setSel(id);
    setStatus(undefined);
  };

  const filters: HubFilters = useMemo(
    () => ({ departmentId, branchId, employeeId, status, from: from || undefined, to: to || undefined }),
    [departmentId, branchId, employeeId, status, from, to]
  );

  const load = useCallback(async () => {
    setResult(null);
    setError(null);
    try {
      const data = await loadCategoryData(sel, filters);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("حصل خطأ في تحميل التقرير، حاول تاني");
      setResult({ rows: [], chart: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setAllError(null);
    try {
      // فلاتر الحالة والقسم/الفرع مش هتتطبق كلها بنفس المعنى على كل الأقسام،
      // فبنستخدم بس الفلاتر المشتركة (الموظف والتاريخ) عند التصدير الشامل
      const sharedFilters: HubFilters = { employeeId, from: filters.from, to: filters.to };
      const ok = await exportAllCategoriesExcel(sharedFilters);
      if (!ok) setAllError("مفيش بيانات في أي قسم عشان تتصدّر");
    } catch (e) {
      console.error(e);
      setAllError("حصل خطأ أثناء تجهيز ملف التقارير الشامل");
    } finally {
      setDownloadingAll(false);
    }
  };

  // فلاتر معينة مش منطقية لكل قسم
  const showDept = sel === "emp" || sel === "tsk";
  const showBranch = sel === "emp";
  const showEmployee = sel !== "emp";
  const statusOptions = STATUS_OPTIONS_BY_CAT[sel];
  const showDates = sel !== "emp";

  const rows = result?.rows ?? [];
  const chart = result?.chart ?? [];
  const cols = COLUMNS[sel];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="التقارير" subtitle="مركز التقارير الشامل." />
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition disabled:opacity-60"
          >
            {downloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تنزيل كل التقارير (إكسل)
          </button>
          {allError && <span className="text-xs text-destructive">{allError}</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="!p-2 lg:col-span-1">
          <div className="mb-2 px-2 pt-2 text-xs font-bold text-muted-foreground">الأقسام</div>
          {CATS.map((c) => {
            const Icon = c.icon;
            const active = sel === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCat(c.id)}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" /> {c.label}
              </button>
            );
          })}

          <div className="mt-3 border-t border-border pt-2">
            {COMING_SOON.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  title="محتاج دوكيومنتيشن الباك بتاع القسم ده الأول"
                  className="mb-0.5 flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/50"
                >
                  <Icon className="size-4" /> {c.label}
                  <Lock className="size-3 mr-auto" />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {/* الفلاتر */}
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-2">
              {showDept && (
                <select
                  value={departmentId ?? ""}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <option value="">كل الأقسام</option>
                  {filterOptions?.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}

              {showBranch && (
                <select
                  value={branchId ?? ""}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <option value="">كل الفروع</option>
                  {filterOptions?.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.city}</option>
                  ))}
                </select>
              )}

              {showEmployee && (
                <select
                  value={employeeId ?? ""}
                  onChange={(e) => setEmployeeId(e.target.value || undefined)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <option value="">كل الموظفين</option>
                  {filterOptions?.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}

              {statusOptions && (
                <select
                  value={status ?? ""}
                  onChange={(e) => setStatus(e.target.value || undefined)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <option value="">كل الحالات</option>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}

              {showDates && (
                <>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                  />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                  />
                </>
              )}

              <div className="mr-auto flex gap-2">
                <button
                  onClick={() => exportExcel(sel, rows)}
                  disabled={!rows.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal text-teal px-3 py-2 text-xs font-semibold hover:bg-teal/10 disabled:opacity-40"
                >
                  📊 تنزيل هذا القسم
                </button>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارِ التحميل...
            </div>
          ) : error ? (
            <Card className="p-6 text-center text-sm text-destructive">{error}</Card>
          ) : (
            <>
              {chart.length > 0 && (
                <Card>
                  <div className="mb-3 font-bold">معاينة التقرير</div>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 12 }} />
                        <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-accent/40 text-xs text-muted-foreground">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                        {cols.map((c) => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={cols.length} className="px-4 py-10 text-center text-muted-foreground">
                            مفيش بيانات مطابقة للفلاتر دي
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={r.id ?? r.users_id ?? i} className="row-hover">
                            {cols.map((c) => (
                              <td key={c.key} className="px-4 py-2.5 tabular">
                                {r[c.key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}