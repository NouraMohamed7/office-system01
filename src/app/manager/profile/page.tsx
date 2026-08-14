// src/app/manager/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, Card, PageHeader } from "@/components/manager/primitives";
import { Loader2, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { getMyProfile, updateMyProfile, type MyProfile } from "@/modules/profile/api/profile.api";

function formatJoinDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getMyProfile();
        if (!cancelled && data) {
          setProfile(data);
          setName(data.full_name);
        }
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

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const hasChanges = !!profile && (name.trim() !== profile.full_name || !!photoFile);

  async function handleSave() {
    if (!profile || !hasChanges) return;
    if (!name.trim()) {
      notify("الاسم مينفعش يكون فاضي", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        name: name.trim() !== profile.full_name ? name.trim() : undefined,
        photo: photoFile,
      });
      setProfile(updated);
      setName(updated.full_name);
      setPhotoFile(null);
      setPhotoPreview(null);
      notify("تم حفظ التغييرات بنجاح");
    } catch (err) {
      notify(err instanceof Error ? err.message : "حصل خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الملف الشخصي" />

      <Card className="max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> جاري تحميل بياناتك...
          </div>
        ) : !profile ? (
          <div className="p-6 text-sm text-muted-foreground">مقدرناش نجيب بياناتك، حاول تسجل الدخول تاني</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {photoPreview || profile.photo_url ? (
                  <div className="relative size-[72px] shrink-0">
                    <Image
                      src={photoPreview ?? profile.photo_url!}
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
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground"
                  title="تغيير الصورة"
                >
                  <Camera className="size-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePickPhoto}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {photoFile ? photoFile.name : "اضغط على أيقونة الكاميرا لتغيير الصورة"}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">الاسم</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>

            {[
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

            {(profile.personalPhone || profile.workPhone || profile.saudiPhone) && (
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">أرقام التواصل</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: "الرقم الشخصي", value: profile.personalPhone },
                    { label: "هاتف العمل — مصر", value: profile.workPhone },
                    { label: "هاتف العمل — السعودية", value: profile.saudiPhone },
                  ]
                    .filter((p) => p.value)
                    .map((p) => (
                      <div key={p.label} className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">{p.label}</div>
                        <div className="text-sm font-semibold tabular-nums" dir="ltr">{p.value}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />} حفظ التغييرات
            </button>

            <p className="pt-1 text-[11px] text-muted-foreground">
              الوظيفة والقسم والفرع بتتغير من صفحة الموظفين بمعرفة المدير الآخر — مش من هنا.
            </p>
          </div>
        )}
      </Card>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-teal/30 bg-teal/10 text-teal"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}