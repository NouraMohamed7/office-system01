// src/app/employee/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { PortalLayout, Card } from "@/components/portal-layout";
import { User, Mail, Briefcase, Calendar, MapPin, Phone, Loader2 } from "lucide-react";
import { getMyProfile, type MyProfile } from "@/modules/profile/api/profile.api";
import Image from "next/image";

function formatJoinDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل بياناتك");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PortalLayout title="الملف الشخصي" subtitle="بياناتك الشخصية ومعلومات وظيفتك">
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل بياناتك...
        </div>
      </PortalLayout>
    );
  }

  if (loadError) {
    return (
      <PortalLayout title="الملف الشخصي" subtitle="بياناتك الشخصية ومعلومات وظيفتك">
        <div className="p-6 text-sm text-destructive">خطأ: {loadError}</div>
      </PortalLayout>
    );
  }

  if (!profile) {
    return (
      <PortalLayout title="الملف الشخصي" subtitle="بياناتك الشخصية ومعلومات وظيفتك">
        <div className="p-6 text-sm text-muted-foreground">مقدرناش نجيب بياناتك، حاول تسجل الدخول تاني</div>
      </PortalLayout>
    );
  }

  const phones = [
    { label: "الرقم الشخصي", value: profile.personalPhone, flag: "📱" },
    { label: "هاتف العمل — مصر", value: profile.workPhone, flag: "🇪🇬" },
    { label: "هاتف العمل — السعودية", value: profile.saudiPhone, flag: "🇸🇦" },
  ].filter((p) => p.value);

  return (
    <PortalLayout title="الملف الشخصي" subtitle="بياناتك الشخصية ومعلومات وظيفتك">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center">
            {profile.photo_url ? (
              <div className="relative h-24 w-24 mx-auto">
                <Image
                  src={profile.photo_url}
                  alt={profile.full_name}
                  fill
                  sizes="96px"
                  className="rounded-full object-cover shadow-warm"
                />
              </div>
            ) : (
              <div className="h-24 w-24 mx-auto rounded-full bg-teal text-teal-foreground grid place-items-center text-2xl font-bold shadow-warm">
                {profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
            )}
            <h2 className="font-bold text-foreground mt-4">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.position?.title ?? "—"}</p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> معلومات الوظيفة
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow icon={Briefcase} label="القسم" value={profile.department?.name ?? "—"} />
              <InfoRow icon={Calendar} label="تاريخ الالتحاق" value={formatJoinDate(profile.created_at)} />
              <InfoRow icon={User} label="الرقم الوظيفي" value={profile.id} />
              {/* "المدير المباشر" اتشالت مؤقتًا — مفيش عمود ليها في جدول users حسب الدوك الحالي */}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> البيانات الشخصية
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow icon={User} label="الاسم الكامل" value={profile.full_name} />
              <InfoRow icon={Mail} label="البريد الإلكتروني" value={profile.email} />
              <div className="md:col-span-2">
                <InfoRow
                  icon={MapPin}
                  label="الفرع"
                  value={[profile.branch?.city, profile.branch?.address].filter(Boolean).join(" — ") || "—"}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              لو محتاج تحديث أي بيانات هنا، تواصل مع مديرك المباشر أو قسم الموارد البشرية.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> أرقام التواصل
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {phones.length === 0 && <p className="text-sm text-muted-foreground">مفيش أرقام مسجلة</p>}
              {phones.map((p) => (
                <div key={p.label} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                  <span className="text-lg shrink-0">{p.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground">{p.label}</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums" dir="ltr">{p.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}