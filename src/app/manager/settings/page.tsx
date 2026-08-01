"use client";

import { useEffect, useRef, useState } from "react";
import { Card, PageHeader } from "@/components/manager/primitives";
import {
  Plus,
  Trash2,
  Upload,
  Database,
  Pencil,
  Check,
  X,
  Save,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["الشركة", "الفروع", "الأقسام", "الوظائف", "الحضور", "الإشعارات", "النسخ الاحتياطي"];

type ListItem = { id: string; name: string };

type Settings = {
  company: { name: string; address: string; email: string; phone: string; logo: string | null };
  branches: ListItem[];
  departments: ListItem[];
  jobs: ListItem[];
  attendance: { start: string; end: string; grace: string; hours: string };
  notifications: { system: boolean; attendance: boolean; tasks: boolean; expenses: boolean };
  lastBackup: string | null;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultSettings: Settings = {
  company: {
    name: "شركة التسويق",
    address: "القاهرة — مدينة نصر",
    email: "info@company.com",
    phone: "19999 / 010-1234-5678",
    logo: null,
  },
  branches: [{ id: uid(), name: "القاهرة" }, { id: uid(), name: "الإسكندرية" }, { id: uid(), name: "الجيزة" }],
  departments: [
    "السوشيال",
    "الكول سنتر",
    "التسويق",
    "المبيعات",
    "التصميم",
    "الدعم",
  ].map((name) => ({ id: uid(), name })),
  jobs: ["Manager", "Team Leader", "Specialist", "Agent", "Designer"].map((name) => ({ id: uid(), name })),
  attendance: { start: "08:00", end: "17:00", grace: "15 دقيقة", hours: "8 ساعات" },
  notifications: { system: true, attendance: true, tasks: true, expenses: false },
  lastBackup: null,
};

function formatDate(iso: string | null) {
  if (!iso) return "لا يوجد نسخ احتياطي بعد";
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  // ---- company ----
  function updateCompanyField(field: keyof Settings["company"], value: string) {
    setSettings((s) => ({ ...s, company: { ...s.company, [field]: value } }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("الرجاء اختيار ملف صورة صالح", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((s) => ({ ...s, company: { ...s.company, logo: reader.result as string } }));
      notify("تم تحديث الشعار بنجاح");
    };
    reader.readAsDataURL(file);
  }

  function saveCompany() {
    notify("تم حفظ بيانات الشركة بنجاح");
  }

  // ---- generic list (branches / departments / jobs) ----
  function listKeyForTab(t: number): "branches" | "departments" | "jobs" {
    return t === 1 ? "branches" : t === 2 ? "departments" : "jobs";
  }

  function addItem(key: "branches" | "departments" | "jobs", name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings((s) => ({ ...s, [key]: [...s[key], { id: uid(), name: trimmed }] }));
    notify("تمت الإضافة بنجاح");
  }

  function editItem(key: "branches" | "departments" | "jobs", id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings((s) => ({
      ...s,
      [key]: s[key].map((it) => (it.id === id ? { ...it, name: trimmed } : it)),
    }));
    notify("تم حفظ التعديل بنجاح");
  }

  function deleteItem(key: "branches" | "departments" | "jobs", id: string, name: string) {
    if (!window.confirm(`هل تريد حذف "${name}"؟`)) return;
    setSettings((s) => ({ ...s, [key]: s[key].filter((it) => it.id !== id) }));
    notify("تم الحذف بنجاح");
  }

  // ---- attendance ----
  function updateAttendanceField(field: keyof Settings["attendance"], value: string) {
    setSettings((s) => ({ ...s, attendance: { ...s.attendance, [field]: value } }));
  }

  function saveAttendance() {
    notify("تم حفظ إعدادات الحضور بنجاح");
  }

  // ---- notifications ----
  function toggleNotification(key: keyof Settings["notifications"]) {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: !s.notifications[key] } }));
  }

  // ---- backup / restore ----
  function handleBackup() {
    const nowIso = new Date().toISOString();
    const payload = { ...settings, lastBackup: nowIso };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${nowIso.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSettings((s) => ({ ...s, lastBackup: nowIso }));
    notify("تم إنشاء النسخة الاحتياطية وتنزيلها بنجاح");
  }

  function handleRestoreClick() {
    restoreInputRef.current?.click();
  }

  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !parsed.company) {
          throw new Error("invalid");
        }
        setSettings({ ...defaultSettings, ...parsed });
        notify("تم استعادة النسخة الاحتياطية بنجاح");
      } catch {
        notify("ملف النسخة الاحتياطية غير صالح", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const activeList = tab === 1 || tab === 2 || tab === 3 ? settings[listKeyForTab(tab)] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle="إعدادات الشركة والنظام." />

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="p-2! lg:col-span-1">
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
          {tab === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {settings.company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL preview, next/image needs a real host
                  <img
                    src={settings.company.logo}
                    alt="شعار الشركة"
                    className="size-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="grid size-20 place-items-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
                    {settings.company.name.trim().charAt(0) || "م"}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <Upload className="size-3.5" /> تغيير الشعار
                  </button>
                  {settings.company.logo && (
                    <button
                      onClick={() => setSettings((s) => ({ ...s, company: { ...s.company, logo: null } }))}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" /> إزالة الشعار
                    </button>
                  )}
                </div>
              </div>

              {(
                [
                  ["name", "اسم الشركة"],
                  ["address", "العنوان"],
                  ["email", "البريد"],
                  ["phone", "أرقام تواصل"],
                ] as [keyof Settings["company"], string][]
              ).map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
                  <input
                    value={settings.company[field] as string}
                    onChange={(e) => updateCompanyField(field, e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </label>
              ))}

              <button
                onClick={saveCompany}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
              >
                <Save className="size-4" /> حفظ التغييرات
              </button>
            </div>
          )}

          {(tab === 1 || tab === 2 || tab === 3) && (
            <ListSection
              title={tabs[tab]}
              items={activeList}
              onAdd={(name) => addItem(listKeyForTab(tab), name)}
              onEdit={(id, name) => editItem(listKeyForTab(tab), id, name)}
              onDelete={(id, name) => deleteItem(listKeyForTab(tab), id, name)}
            />
          )}

          {tab === 4 && (
            <div className="space-y-4">
              {(
                [
                  ["start", "وقت البداية", "time"],
                  ["end", "وقت النهاية", "time"],
                  ["grace", "مدة السماح بالتأخير", "text"],
                  ["hours", "ساعات العمل", "text"],
                ] as [keyof Settings["attendance"], string, string][]
              ).map(([field, label, type]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
                  <input
                    type={type}
                    value={settings.attendance[field]}
                    onChange={(e) => updateAttendanceField(field, e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </label>
              ))}
              <button
                onClick={saveAttendance}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
              >
                <Save className="size-4" /> حفظ التغييرات
              </button>
            </div>
          )}

          {tab === 5 && (
            <div className="space-y-3">
              {(
                [
                  ["system", "إشعارات النظام"],
                  ["attendance", "إشعارات الحضور"],
                  ["tasks", "إشعارات المهام"],
                  ["expenses", "إشعارات المصروفات"],
                ] as [keyof Settings["notifications"], string][]
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-border p-3 cursor-pointer">
                  <span className="text-sm">{label}</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications[key]}
                    onChange={() => toggleNotification(key)}
                    className="size-5 accent-[oklch(0.62_0.128_42)]"
                  />
                </label>
              ))}
            </div>
          )}

          {tab === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Database className="size-5 text-teal" />
                <div className="flex-1">
                  <div className="font-semibold">النسخ الاحتياطي</div>
                  <div className="text-xs text-muted-foreground">آخر نسخة: {formatDate(settings.lastBackup)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal bg-teal/10 px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/15"
                >
                  <Download className="size-4" /> إنشاء نسخة احتياطية
                </button>
                <button
                  onClick={handleRestoreClick}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal bg-teal/10 px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/15"
                >
                  <UploadCloud className="size-4" /> استعادة نسخة
                </button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
              </div>
            </div>
          )}
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

function ListSection({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  items: ListItem[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function confirmAdd() {
    if (!newValue.trim()) return;
    onAdd(newValue);
    setNewValue("");
    setAdding(false);
  }

  function startEdit(item: ListItem) {
    setEditingId(item.id);
    setEditValue(item.name);
  }

  function confirmEdit(id: string) {
    if (!editValue.trim()) return;
    onEdit(id, editValue);
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold">{title}</div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            <Plus className="size-3.5" /> إضافة
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd();
              if (e.key === "Escape") { setAdding(false); setNewValue(""); }
            }}
            placeholder="اكتب الاسم هنا..."
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
          <button
            onClick={confirmAdd}
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => { setAdding(false); setNewValue(""); }}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {items.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد عناصر بعد. اضغط &quot;إضافة&quot; لإنشاء أول عنصر.
        </div>
      )}

      {items.map((item) =>
        editingId === item.id ? (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmEdit(item.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={() => confirmEdit(item.id)}
              className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              <Check className="size-4" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm">{item.name}</span>
            <div className="flex gap-1">
              <button
                onClick={() => startEdit(item)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <Pencil className="size-3.5" /> تعديل
              </button>
              <button
                onClick={() => onDelete(item.id, item.name)}
                className="grid size-7 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}