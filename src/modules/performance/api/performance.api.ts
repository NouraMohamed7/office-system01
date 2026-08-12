// src/modules/performance/api/performance.api.ts
import { supabase } from "@/lib/supabase/client";

/**
 * Performance points module — backed by:
 *  - `performance_points`         : append-only ledger, one row per point event
 *  - `performance_points_summary` : per-user aggregated view
 *
 * Points are generated automatically by backend triggers tied to attendance,
 * daily reports, file approvals, and tasks (see PERFORMANCE_POINT_RULES below).
 * There is no RPC to manually grant/edit/delete a point event — this module
 * is read-only by design.
 */

export type PerformancePointSummaryRow = {
  users_id: string;
  present_points: number;
  on_time_points: number;
  report_submitted_points: number;
  report_accepted_points: number;
  file_approved_points: number;
  task_completed_points: number;
  total_points: number;
  avg_rate: number | null;
  percent: number | null;
};

export type PerformancePointEntry = {
  id: number;
  users_id: string;
  points: number;
  reason: string;
  related_id: number | null;
  related_type: string;
  created_at: string;
};

/** A ledger entry with the account balance right after it happened, newest first. */
export type PerformanceLedgerRow = PerformancePointEntry & { balance: number };

export type EmployeeDirectoryEntry = {
  name: string;
  photo_url: string | null;
  department: string | null;
};

export type TeamPerformanceRow = PerformancePointSummaryRow & EmployeeDirectoryEntry;

/** Fixed reference table of how points are earned/lost — system-triggered, read-only. */
export const PERFORMANCE_POINT_RULES: { id: string; label: string; value: number }[] = [
  { id: "present", label: "حضور يومي (Present)", value: 5 },
  { id: "on_time", label: "بدون تأخير (On time)", value: 5 },
  { id: "report_submitted", label: "رفع تقرير يومي", value: 2 },
  { id: "report_accepted", label: "اعتماد التقرير اليومي", value: 8 },
  { id: "file_approved", label: "اعتماد ملف", value: 12 },
  { id: "task_completed", label: "إنهاء مهمة", value: 10 },
  { id: "late", label: "تأخير", value: -5 },
  { id: "absent", label: "غياب", value: -5 },
  { id: "report_unsent", label: "عدم إرسال تقرير يومي", value: -8 },
];

/**
 * Turns a page of ledger rows (newest first) into rows carrying the account
 * balance right after each event. Anchored to `anchorTotal` (the current
 * total_points from the summary view) and walked backward, so the caller can
 * safely `limit()` the query instead of scanning the full ledger history.
 */
function withAnchoredBalance(
  rowsDesc: PerformancePointEntry[],
  anchorTotal: number
): PerformanceLedgerRow[] {
  let running = anchorTotal;
  return rowsDesc.map((r) => {
    const balance = running;
    running -= r.points;
    return { ...r, balance };
  });
}

/* ---------------- Employee-side ---------------- */

/** Logged-in user's own aggregated performance summary. RLS scopes this to self. */
export async function getMyPerformanceSummary(): Promise<PerformancePointSummaryRow | null> {
  const { data, error } = await supabase
    .from("performance_points_summary")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as PerformancePointSummaryRow | null;
}

/**
 * Logged-in user's own point ledger, newest first, capped to `limit` rows.
 * `anchorTotal` should be the `total_points` from getMyPerformanceSummary().
 */
export async function getMyPerformanceLedger(
  anchorTotal: number,
  limit = 200
): Promise<PerformanceLedgerRow[]> {
  const { data, error } = await supabase
    .from("performance_points")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return withAnchoredBalance((data as PerformancePointEntry[]) ?? [], anchorTotal);
}

/* ---------------- Manager-side ---------------- */

/** All employees' performance summaries, sorted highest-first. Cheap — poll this on realtime changes. */
export async function getPerformanceSummaries(): Promise<PerformancePointSummaryRow[]> {
  const { data, error } = await supabase
    .from("performance_points_summary")
    .select("*")
    .order("total_points", { ascending: false });

  if (error) throw error;
  return (data as PerformancePointSummaryRow[]) ?? [];
}

/** Name/photo/department lookup for a set of user ids. Rarely changes — cache this client-side. */
export async function getEmployeeDirectory(
  ids: string[]
): Promise<Map<string, EmployeeDirectoryEntry>> {
  if (ids.length === 0) return new Map();

  const [usersRes, usersDeptRes, deptRes] = await Promise.all([
    supabase.from("users_with_email").select("id,name,photo_url").in("id", ids),
    supabase.from("users").select("id,department_id").in("id", ids),
    supabase.from("department").select("id,name"),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (usersDeptRes.error) throw usersDeptRes.error;
  if (deptRes.error) throw deptRes.error;

  type NameLite = { id: string; name: string; photo_url: string | null };
  type UserDeptLite = { id: string; department_id: number | null };
  type DeptLite = { id: number; name: string };

  const userDeptMap = new Map<string, number | null>(
    ((usersDeptRes.data as UserDeptLite[]) ?? []).map((u) => [u.id, u.department_id])
  );
  const deptMap = new Map<number, string>(
    ((deptRes.data as DeptLite[]) ?? []).map((d) => [d.id, d.name])
  );

  const directory = new Map<string, EmployeeDirectoryEntry>();
  for (const u of (usersRes.data as NameLite[]) ?? []) {
    const deptId = userDeptMap.get(u.id) ?? null;
    directory.set(u.id, {
      name: u.name ?? "موظف غير معروف",
      photo_url: u.photo_url ?? null,
      department: deptId != null ? deptMap.get(deptId) ?? null : null,
    });
  }
  return directory;
}

/** Convenience wrapper for the initial full load: summaries + directory, merged. */
export async function getTeamPerformance(): Promise<TeamPerformanceRow[]> {
  const summaries = await getPerformanceSummaries();
  if (summaries.length === 0) return [];

  const ids = summaries.map((s) => s.users_id);
  const directory = await getEmployeeDirectory(ids);

  return summaries.map((s) => ({
    ...s,
    ...(directory.get(s.users_id) ?? { name: "موظف غير معروف", photo_url: null, department: null }),
  }));
}

/**
 * A specific employee's point ledger (manager view), newest first, capped to `limit`.
 * `anchorTotal` should be that employee's `total_points` from the summary row.
 */
export async function getEmployeePerformanceLedger(
  usersId: string,
  anchorTotal: number,
  limit = 200
): Promise<PerformanceLedgerRow[]> {
  const { data, error } = await supabase
    .from("performance_points")
    .select("*")
    .eq("users_id", usersId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return withAnchoredBalance((data as PerformancePointEntry[]) ?? [], anchorTotal);
}

/** Realtime: notifies on any insert/update/delete in the point ledger (any employee). */
export function subscribeToPerformancePoints(onChange: () => void) {
  const channel = supabase
    .channel("performance-points-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "performance_points" },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}