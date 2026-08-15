// src/app/manager/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/manager/primitives";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  Briefcase,
  MapPin,
} from "lucide-react";
import {
  getMyNotifySettings,
  updateMyNotifySettings,
  changeMyPassword,
  signOutEverywhere,
  type MyNotifySettings,
} from "@/modules/settings/api/settings.api";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from "@/modules/department/api/department.api";
import {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  type Position,
} from "@/modules/position/api/position.api";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch,
} from "@/modules/branch/api/branch.api";

const tabs = ["الأمان", "الإشعارات", "الهيكل التنظيمي"];

const NOTIFY_LABELS: { key: keyof Omit<MyNotifySettings, "id">; label: string }[] = [
  { key: "task_notify", label: "إشعارات المهام" },
  { key: "report_notify", label: "إشعارات التقارير" },
  { key: "attendance_notify", label: "إشعارات الحضور" },
  { key: "cash_notify", label: "إشعارات الخزنة" },
  { key: "system_notify", label: "إشعارات النظام" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" />
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="!p-2 lg:col-span-1 h-fit">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={cn(
                "mb-0.5 block w-full rounded-lg px-3 py-2.5 text-right text-sm transition-colors",
                tab === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {t}
            </button>
          ))}
        </Card>

        <Card className="lg:col-span-3">
          {tab === 0 && <SecurityTab notify={notify} onSignedOutEverywhere={() => router.push("/login")} />}
          {tab === 1 && <NotificationsTab notify={notify} />}
          {tab === 2 && <OrgStructureTab notify={notify} />}
        </Card>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
            toast.type === "success"
              ? "border-teal/30 bg-teal/10 text-teal"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// تبويب الأمان — تغيير باسورد حقيقي + تسجيل خروج من كل الأجهزة
// ============================================================
function SecurityTab({
  notify,
  onSignedOutEverywhere,
}: {
  notify: (m: string, t?: "success" | "error") => void;
  onSignedOutEverywhere: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleUpdatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notify("لازم تملأ كل الحقول", "error");
      return;
    }
    if (newPassword.length < 6) {
      notify("كلمة المرور الجديدة لازم تكون 6 حروف على الأقل", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("كلمة المرور الجديدة والتأكيد مش متطابقين", "error");
      return;
    }
    setSaving(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      notify("تم تحديث كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحديث كلمة المرور", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOutEverywhere() {
    if (!window.confirm("هل تريد تسجيل الخروج من جميع الأجهزة؟")) return;
    setSigningOut(true);
    try {
      await signOutEverywhere();
      onSignedOutEverywhere();
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تسجيل الخروج", "error");
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="font-bold">تغيير كلمة المرور</div>

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">كلمة المرور الحالية</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">كلمة المرور الجديدة</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">تأكيد كلمة المرور</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
      </label>

      <button
        onClick={handleUpdatePassword}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
      >
        {saving && <Loader2 className="size-4 animate-spin" />} تحديث
      </button>

      <div className="border-t border-border pt-4">
        <button
          onClick={handleSignOutEverywhere}
          disabled={signingOut}
          className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-60"
        >
          {signingOut && <Loader2 className="size-4 animate-spin" />} تسجيل الخروج من جميع الأجهزة
        </button>
      </div>
    </div>
  );
}

// ============================================================
// تبويب الإشعارات — notify_settings الحقيقي، مربوط بـ manager_id
// ============================================================
function NotificationsTab({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [settings, setSettings] = useState<MyNotifySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getMyNotifySettings();
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) notify(err instanceof Error ? err.message : "حصل خطأ في تحميل إعدادات الإشعارات", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(key: keyof Omit<MyNotifySettings, "id">) {
    if (!settings) return;
    const prevValue = settings[key];
    const nextValue = !prevValue;

    setSettings((s) => (s ? { ...s, [key]: nextValue } : s));
    setSavingKey(key);
    try {
      const updated = await updateMyNotifySettings({ [key]: nextValue });
      setSettings(updated);
    } catch (err) {
      setSettings((s) => (s ? { ...s, [key]: prevValue } : s));
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء التحديث", "error");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> جاري تحميل إعداداتك...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        مفيش إعدادات إشعارات لحسابك بعد — لازم تتأكد مع الباك إند.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {NOTIFY_LABELS.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between rounded-xl border border-border p-3 cursor-pointer">
          <span className="text-sm">{label}</span>
          <div className="flex items-center gap-2">
            {savingKey === key && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => handleToggle(key)}
              disabled={savingKey === key}
              className="size-5 accent-[oklch(0.62_0.128_42)]"
            />
          </div>
        </label>
      ))}
    </div>
  );
}

// ============================================================
// تبويب الهيكل التنظيمي — الأقسام / الوظائف / الفروع
// ============================================================
type OrgSubTab = "departments" | "positions" | "branches";

function OrgStructureTab({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [subTab, setSubTab] = useState<OrgSubTab>("departments");

  const subTabs: { key: OrgSubTab; label: string; icon: React.ReactNode }[] = [
    { key: "departments", label: "الأقسام", icon: <Building2 className="size-4" /> },
    { key: "positions", label: "الوظائف", icon: <Briefcase className="size-4" /> },
    { key: "branches", label: "الفروع", icon: <MapPin className="size-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {subTabs.map((s) => (
          <button
            key={s.key}
            onClick={() => setSubTab(s.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              subTab === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {subTab === "departments" && <DepartmentsPanel notify={notify} />}
      {subTab === "positions" && <PositionsPanel notify={notify} />}
      {subTab === "branches" && <BranchesPanel notify={notify} />}
    </div>
  );
}

// ---------- الأقسام ----------
function DepartmentsPanel({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getDepartments();
      setItems(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحميل الأقسام", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) {
      notify("لازم تكتب اسم القسم", "error");
      return;
    }
    setAdding(true);
    try {
      const created = await createDepartment(name);
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ar")));
      setNewName("");
      notify("تم إضافة القسم بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء إضافة القسم", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: Department) {
    setEditingId(item.id);
    setEditValue(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleSaveEdit(id: number) {
    const name = editValue.trim();
    if (!name) {
      notify("اسم القسم مينفعش يبقى فاضي", "error");
      return;
    }
    setBusyId(id);
    try {
      const updated = await updateDepartment(id, name);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      cancelEdit();
      notify("تم تحديث القسم بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحديث القسم", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: Department) {
    if (!window.confirm(`هل تريد حذف قسم "${item.name}"؟ لو فيه موظفين أو مهام مرتبطة بيه ممكن العملية تفشل.`)) return;
    setBusyId(item.id);
    try {
      await deleteDepartment(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      notify("تم حذف القسم بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "تعذر حذف القسم — قد يكون مرتبطًا ببيانات أخرى", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="اسم القسم الجديد"
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          مفيش أقسام مضافة لسه
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              {editingId === item.id ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                  autoFocus
                  className="h-9 flex-1 rounded-lg border border-primary/50 bg-background px-2 text-sm outline-none"
                />
              ) : (
                <span className="text-sm font-medium">{item.name}</span>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {busyId === item.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : editingId === item.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="rounded-lg p-2 text-teal hover:bg-teal/10"
                      title="حفظ"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      title="إلغاء"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      title="تعديل"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- الوظائف ----------
function PositionsPanel({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getPositions();
      setItems(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحميل الوظائف", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) {
      notify("لازم تكتب اسم الوظيفة", "error");
      return;
    }
    setAdding(true);
    try {
      const created = await createPosition(title);
      setItems((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title, "ar")));
      setNewTitle("");
      notify("تم إضافة الوظيفة بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء إضافة الوظيفة", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: Position) {
    setEditingId(item.id);
    setEditValue(item.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleSaveEdit(id: number) {
    const title = editValue.trim();
    if (!title) {
      notify("اسم الوظيفة مينفعش يبقى فاضي", "error");
      return;
    }
    setBusyId(id);
    try {
      const updated = await updatePosition(id, title);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      cancelEdit();
      notify("تم تحديث الوظيفة بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحديث الوظيفة", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: Position) {
    if (!window.confirm(`هل تريد حذف وظيفة "${item.title}"؟ لو فيه موظفين مرتبطين بيها ممكن العملية تفشل.`)) return;
    setBusyId(item.id);
    try {
      await deletePosition(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      notify("تم حذف الوظيفة بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "تعذر حذف الوظيفة — قد تكون مرتبطة ببيانات أخرى", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="اسم الوظيفة الجديدة"
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          مفيش وظائف مضافة لسه
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              {editingId === item.id ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                  autoFocus
                  className="h-9 flex-1 rounded-lg border border-primary/50 bg-background px-2 text-sm outline-none"
                />
              ) : (
                <span className="text-sm font-medium">{item.title}</span>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {busyId === item.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : editingId === item.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="rounded-lg p-2 text-teal hover:bg-teal/10"
                      title="حفظ"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      title="إلغاء"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      title="تعديل"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- الفروع ----------
type BranchFormState = { city: string; country: string; address: string };
const EMPTY_BRANCH_FORM: BranchFormState = { city: "", country: "", address: "" };

function BranchesPanel({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newBranch, setNewBranch] = useState<BranchFormState>(EMPTY_BRANCH_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<BranchFormState>(EMPTY_BRANCH_FORM);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getBranches();
      setItems(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحميل الفروع", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    const city = newBranch.city.trim();
    const country = newBranch.country.trim();
    if (!city || !country) {
      notify("المدينة والدولة مطلوبين", "error");
      return;
    }
    setAdding(true);
    try {
      const created = await createBranch({
        city,
        country,
        address: newBranch.address.trim() || null,
      });
      setItems((prev) => [...prev, created].sort((a, b) => a.city.localeCompare(b.city, "ar")));
      setNewBranch(EMPTY_BRANCH_FORM);
      notify("تم إضافة الفرع بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء إضافة الفرع", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: Branch) {
    setEditingId(item.id);
    setEditValue({ city: item.city, country: item.country, address: item.address ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue(EMPTY_BRANCH_FORM);
  }

  async function handleSaveEdit(id: number) {
    const city = editValue.city.trim();
    const country = editValue.country.trim();
    if (!city || !country) {
      notify("المدينة والدولة مطلوبين", "error");
      return;
    }
    setBusyId(id);
    try {
      const updated = await updateBranch(id, {
        city,
        country,
        address: editValue.address.trim() || null,
      });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      cancelEdit();
      notify("تم تحديث الفرع بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء تحديث الفرع", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: Branch) {
    if (!window.confirm(`هل تريد حذف فرع "${item.city}"؟ لو فيه موظفين مرتبطين بيه ممكن العملية تفشل.`)) return;
    setBusyId(item.id);
    try {
      await deleteBranch(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      notify("تم حذف الفرع بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "تعذر حذف الفرع — قد يكون مرتبطًا ببيانات أخرى", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
        <input
          value={newBranch.city}
          onChange={(e) => setNewBranch((s) => ({ ...s, city: e.target.value }))}
          placeholder="المدينة"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={newBranch.country}
          onChange={(e) => setNewBranch((s) => ({ ...s, country: e.target.value }))}
          placeholder="الدولة"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={newBranch.address}
          onChange={(e) => setNewBranch((s) => ({ ...s, address: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="العنوان (اختياري)"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          مفيش فروع مضافة لسه
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              {editingId === item.id ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-center">
                  <input
                    value={editValue.city}
                    onChange={(e) => setEditValue((s) => ({ ...s, city: e.target.value }))}
                    placeholder="المدينة"
                    autoFocus
                    className="h-9 rounded-lg border border-primary/50 bg-background px-2 text-sm outline-none"
                  />
                  <input
                    value={editValue.country}
                    onChange={(e) => setEditValue((s) => ({ ...s, country: e.target.value }))}
                    placeholder="الدولة"
                    className="h-9 rounded-lg border border-primary/50 bg-background px-2 text-sm outline-none"
                  />
                  <input
                    value={editValue.address}
                    onChange={(e) => setEditValue((s) => ({ ...s, address: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                    placeholder="العنوان (اختياري)"
                    className="h-9 rounded-lg border border-primary/50 bg-background px-2 text-sm outline-none"
                  />
                  <div className="flex items-center gap-1 justify-self-start sm:justify-self-end">
                    {busyId === item.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="rounded-lg p-2 text-teal hover:bg-teal/10"
                          title="حفظ"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                          title="إلغاء"
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {item.city}
                      <span className="text-muted-foreground"> — {item.country}</span>
                    </div>
                    {item.address && <div className="mt-0.5 text-xs text-muted-foreground">{item.address}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {busyId === item.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                          title="تعديل"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                          title="حذف"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}