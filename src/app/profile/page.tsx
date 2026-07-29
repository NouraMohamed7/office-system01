// src/app/profile/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { User, Mail, Briefcase, Calendar, MapPin, Phone } from "lucide-react";

const PROFILE = {
  name: "كريم محمود",
  email: "karim.mahmoud@rika.com",
  address: "مدينة نصر، القاهرة",
};

const JOB_INFO = {
  role: "Marketing · Team Leader",
  department: "قسم التسويق والسوشيال ميديا",
  joinDate: "2024-03-10",
  employeeId: "EMP-1042",
  manager: "سارة إبراهيم",
};

// كل البيانات دي بيضيفها ويعدّلها المدير/HR فقط — الموظف يشوفها بس
const PHONE_NUMBERS = [
  { label: "هاتف العمل — مصر", value: "01012345678", flag: "🇪🇬" },
  { label: "هاتف العمل — السعودية", value: "0501234567", flag: "🇸🇦" },
  { label: "الرقم الشخصي", value: "01234567890", flag: "📱" },
];

export default function ProfilePage() {
  return (
    <PortalLayout title="الملف الشخصي" subtitle="بياناتك الشخصية ومعلومات وظيفتك">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: avatar + job info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center">
            <div className="h-24 w-24 mx-auto rounded-full bg-teal text-teal-foreground grid place-items-center text-2xl font-bold shadow-warm">
              {PROFILE.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <h2 className="font-bold text-foreground mt-4">{PROFILE.name}</h2>
            <p className="text-sm text-muted-foreground">{JOB_INFO.role}</p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> معلومات الوظيفة
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow icon={Briefcase} label="القسم" value={JOB_INFO.department} />
              <InfoRow icon={Calendar} label="تاريخ الالتحاق" value={JOB_INFO.joinDate} />
              <InfoRow icon={User} label="الرقم الوظيفي" value={JOB_INFO.employeeId} />
              <InfoRow icon={User} label="المدير المباشر" value={JOB_INFO.manager} />
            </div>
          </Card>
        </div>

        {/* Right: personal data + phones, view-only */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> البيانات الشخصية
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow icon={User} label="الاسم الكامل" value={PROFILE.name} />
              <InfoRow icon={Mail} label="البريد الإلكتروني" value={PROFILE.email} />
              <div className="md:col-span-2">
                <InfoRow icon={MapPin} label="العنوان" value={PROFILE.address} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              لو محتاجة تحديث أي بيانات هنا، تواصلي مع مديرك المباشر أو قسم الموارد البشرية.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> أرقام التواصل
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {PHONE_NUMBERS.map((p) => (
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