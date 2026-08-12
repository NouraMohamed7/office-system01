// src/app/manager/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, Card, PageHeader } from "@/components/manager/primitives";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  getMyProfile,
  getMyNotifySettings,
  updateMyNotifySettings,
  changeMyPassword,
  signOutEverywhere,
  type MyProfile,
  type MyNotifySettings,
} from "@/modules/profile/api/profile.api";

const tabs = ["البيانات", "الأمان", "الإشعارات"];

const NOTIFY_LABELS: { key: keyof Omit<MyNotifySettings, "id">; label: string }[] = [
  { key: "task_notify", label: "إشعارات المهام" },
  { key: "report_notify", label: "إشعارات التقارير" },
  { key: "comment_settings", label: "إشعارات التعليقات" },
  { key: "attendance_notify", label: "إشعارات الحضور" },
  { key: "cash_notify", label: "إشعارات الخزنة" },
  { key: "system_notify", label: "إشعارات النظام" },
];

function formatJoinDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfilePage() {
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
      <PageHeader title="الملف الشخصي" />
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="!p-2 lg:col-span-1">
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
          {tab === 0 && <DataTab notify={notify} />}
          {tab === 1 && <SecurityTab notify={notify} onSignedOutEverywhere={() => router.push("/login")} />}
          {tab === 2 && <NotificationsTab notify={notify} />}
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
// تبويب البيانات — read-only، جايب من users + department + position + branch + phone
// ⚠️ مفيش endpoint موثّق للمدير يعدّل بياناته هو نفسه (الاسم/الصورة)،
// update-user موثّق كتعديل بيانات موظف تاني. لحد ما نتأكد من الباك،
// السبت فورم "حفظ التغييرات" وخليتها عرض بس.
// ============================================================
function DataTab({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getMyProfile();
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) notify(err instanceof Error ? err.message : "حصل خطأ في تحميل بياناتك", "error");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> جاري تحميل بياناتك...
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-sm text-muted-foreground">مقدرناش نجيب بياناتك، حاول تسجل الدخول تاني</div>;
  }

  const phones = [
    { label: "الرقم الشخصي", value: profile.personalPhone },
    { label: "هاتف العمل — مصر", value: profile.workPhone },
    { label: "هاتف العمل — السعودية", value: profile.saudiPhone },
  ].filter((p) => p.value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {profile.photo_url ? (
          <div className="relative size-[72px] shrink-0">
            <Image
              src={profile.photo_url}
              alt={profile.full_name}
              fill
              sizes="72px"
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <Avatar name={profile.full_name} size={72} />
        )}
        <button
          disabled
          title="تعديل الصورة محتاج تأكيد من الباك إند الأول"
          className="cursor-not-allowed rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground opacity-60"
        >
          تغيير الصورة (قريبًا)
        </button>
      </div>

      {[
        ["الاسم", profile.full_name],
        ["البريد", profile.email],
        ["الوظيفة", profile.position?.title ?? "—"],
        ["القسم", profile.department?.name ?? "—"],
        ["الفرع", [profile.branch?.city, profile.branch?.address].filter(Boolean).join(" — ") || "—"],
        ["تاريخ الالتحاق", formatJoinDate(profile.created_at)],
      ].map(([label, value]) => (
        <label key={label} className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
          <input
            readOnly
            value={value}
            className="h-10 w-full cursor-not-allowed rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none"
          />
        </label>
      ))}

      {phones.length > 0 && (
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">أرقام التواصل</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {phones.map((p) => (
              <div key={p.label} className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{p.label}</div>
                <div className="text-sm font-semibold tabular-nums" dir="ltr">{p.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="pt-2 text-[11px] text-muted-foreground">
        تعديل البيانات دي محتاج endpoint من الباك إند لسه مش موثق — هيتفعل بعد التأكيد.
      </p>
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

    // تحديث متفائل (optimistic) بعدين نرجع لو فشل
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