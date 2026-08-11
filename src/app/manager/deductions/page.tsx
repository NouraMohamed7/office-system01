"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { Plus, MinusCircle, PlusCircle, Trash2, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  type DeductionRewardWithEmployee,
  type EmployeeOption,
  createDeductionReward,
  deleteDeductionReward,
  fetchActiveEmployeesForSelect,
  fetchAllDeductionsRewards,
  subscribeDeductionsRewards,
} from "@/modules/deductions/api/deductions.api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function EntryForm({
  tone,
  employees,
  submitting,
  onCancel,
  onSubmit,
}: {
  tone: "danger" | "success";
  employees: EmployeeOption[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (data: { users_id: string; cause: string; value: number; date: string }) => void;
}) {
  const [usersId, setUsersId] = useState("");
  const [cause, setCause] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [localError, setLocalError] = useState<string | null>(null);

  const valid = usersId !== "" && cause.trim().length >= 3 && Number(value) > 0 && date !== "";
  const ring = tone === "danger" ? "focus:ring-destructive/40" : "focus:ring-success/40";
  const btn = tone === "danger" ? "bg-destructive text-white" : "bg-success text-white";

  function handleSubmit() {
    if (!valid) {
      setLocalError("من فضلك أكمل كل الحقول بشكل صحيح");
      return;
    }
    setLocalError(null);
    onSubmit({ users_id: usersId, cause: cause.trim(), value: Number(value), date });
  }

  return (
    <div className="space-y-3 border-b border-border p-4">
      {localError && <p className="text-xs font-semibold text-destructive">{localError}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={usersId}
          onChange={(e) => setUsersId(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ${ring}`}
        >
          <option value="">اختر الموظف</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="السبب"
          value={cause}
          onChange={(e) => setCause(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ${ring}`}
        />
        <input
          type="number"
          placeholder="القيمة (ج)"
          value={value}
          min={1}
          onChange={(e) => setValue(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 ${ring}`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm tabular outline-none focus:ring-2 ${ring}`}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={!valid || submitting}
          onClick={handleSubmit}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${btn}`}
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          تأكيد
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40 transition"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

export default function DeductionsPage() {
  const showToast = useToast();
  const [entries, setEntries] = useState<DeductionRewardWithEmployee[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showDedForm, setShowDedForm] = useState(false);
  const [showRewForm, setShowRewForm] = useState(false);
  const [submittingDed, setSubmittingDed] = useState(false);
  const [submittingRew, setSubmittingRew] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // بيانات السجل: بتتحمل عند mount + كل event realtime
  const loadEntries = useCallback(
    async (silent = false) => {
      try {
        const data = await fetchAllDeductionsRewards();
        setEntries(data);
      } catch (err) {
        if (!silent) {
          showToast("error", err instanceof Error ? err.message : "تعذر تحميل البيانات");
        }
      } finally {
        setLoadingEntries(false);
      }
    },
    [showToast]
  );

  // قائمة الموظفين: بتتحمل مرة واحدة بس عند mount، الريل تايم مش بيلمسها
  useEffect(() => {
    fetchActiveEmployeesForSelect()
      .then(setEmployees)
      .catch((err) => showToast("error", err instanceof Error ? err.message : "تعذر تحميل قائمة الموظفين"))
      .finally(() => setLoadingEmployees(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEntries();
    const unsubscribe = subscribeDeductionsRewards(() => loadEntries(true));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = loadingEntries || loadingEmployees;

  const ded = useMemo(() => entries.filter((e) => e.type === "deduction"), [entries]);
  const rew = useMemo(() => entries.filter((e) => e.type === "reward"), [entries]);
  const totalDed = useMemo(() => ded.reduce((s, d) => s + Number(d.value), 0), [ded]);
  const totalRew = useMemo(() => rew.reduce((s, r) => s + Number(r.value), 0), [rew]);

  async function addDed(data: { users_id: string; cause: string; value: number; date: string }) {
    setSubmittingDed(true);
    try {
      await createDeductionReward({ ...data, type: "deduction" });
      setShowDedForm(false);
      showToast("success", "تم إضافة الخصم بنجاح");
      await loadEntries(true);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إضافة الخصم");
    } finally {
      setSubmittingDed(false);
    }
  }

  async function addRew(data: { users_id: string; cause: string; value: number; date: string }) {
    setSubmittingRew(true);
    try {
      await createDeductionReward({ ...data, type: "reward" });
      setShowRewForm(false);
      showToast("success", "تم إضافة المكافأة بنجاح");
      await loadEntries(true);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إضافة المكافأة");
    } finally {
      setSubmittingRew(false);
    }
  }

  async function removeEntry(id: number, kind: "reward" | "deduction") {
    setDeletingId(id);
    const prevEntries = entries;
    // optimistic update بدل ما نستنى الـ realtime يرجّع كل حاجة
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteDeductionReward(id);
      showToast("success", kind === "reward" ? "تم حذف المكافأة" : "تم حذف الخصم");
    } catch (err) {
      setEntries(prevEntries); // rollback
      showToast("error", err instanceof Error ? err.message : "تعذر الحذف");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الخصومات والمكافآت" subtitle="سجل التحفيز والتحاسب." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="عدد الخصومات" value={String(ded.length)} tone="danger" />
        <StatCard dense label="عدد المكافآت" value={String(rew.length)} tone="success" />
        <StatCard dense label="إجمالي الخصومات" value={`${totalDed.toLocaleString()} ج`} tone="danger" />
        <StatCard dense label="إجمالي المكافآت" value={`${totalRew.toLocaleString()} ج`} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* الخصومات */}
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <MinusCircle className="size-5 text-destructive" />
              <span className="font-bold">سجل الخصومات</span>
            </div>
            <button
              onClick={() => setShowDedForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15"
            >
              {showDedForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showDedForm ? "إلغاء" : "إضافة خصم"}
            </button>
          </div>
          {showDedForm && (
            <EntryForm
              tone="danger"
              employees={employees}
              submitting={submittingDed}
              onCancel={() => setShowDedForm(false)}
              onSubmit={addDed}
            />
          )}
          <ul className="divide-y divide-border">
            {ded.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">لا توجد خصومات مسجّلة</li>
            )}
            {ded.map((d) => (
              <li key={d.id} className="group flex items-center gap-3 bg-destructive/[0.03] p-3">
                <Avatar name={d.employee_name} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.employee_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.cause} · {formatDate(d.date)}
                  </div>
                </div>
                <div className="font-bold text-destructive tabular">
                  -{Number(d.value).toLocaleString()} ج
                </div>
                <button
                  onClick={() => removeEntry(d.id, "deduction")}
                  disabled={deletingId === d.id}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition disabled:opacity-100"
                  title="حذف"
                >
                  {deletingId === d.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* المكافآت */}
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-success" />
              <span className="font-bold">سجل المكافآت</span>
            </div>
            <button
              onClick={() => setShowRewForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15"
            >
              {showRewForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showRewForm ? "إلغاء" : "إضافة مكافأة"}
            </button>
          </div>
          {showRewForm && (
            <EntryForm
              tone="success"
              employees={employees}
              submitting={submittingRew}
              onCancel={() => setShowRewForm(false)}
              onSubmit={addRew}
            />
          )}
          <ul className="divide-y divide-border">
            {rew.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">لا توجد مكافآت مسجّلة</li>
            )}
            {rew.map((r) => (
              <li key={r.id} className="group flex items-center gap-3 bg-success/[0.03] p-3">
                <Avatar name={r.employee_name} tone="success" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.employee_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.cause} · {formatDate(r.date)}
                  </div>
                </div>
                <div className="font-bold text-success tabular">
                  +{Number(r.value).toLocaleString()} ج
                </div>
                <button
                  onClick={() => removeEntry(r.id, "reward")}
                  disabled={deletingId === r.id}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition disabled:opacity-100"
                  title="حذف"
                >
                  {deletingId === r.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}