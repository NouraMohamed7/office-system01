// src/app/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import {
  CheckCircle2, ClipboardList, Target, Bell, Check,
  Clock, FileText, Upload, LifeBuoy,
} from "lucide-react";
import { useState } from "react";

const INITIAL_CHECKLIST = [
  { id: 1, ar: "تسجيل الحضور", done: true },
  { id: 2, ar: "مراجعة المهام", done: true },
  { id: 3, ar: "رفع التقرير اليومي", done: false },
  { id: 4, ar: "رفع شيت العمل", done: false },
];

const ACTIVITIES = [
  { color: "bg-success", ar: "تم اعتماد شيت الليدز اليومي", time: "منذ 12 دقيقة" },
  { color: "bg-primary", ar: "تم إسناد مهمة جديدة: تصميم بوست إطلاق", time: "منذ 45 دقيقة" },
  { color: "bg-teal", ar: "علّق أحمد على تقريرك اليومي", time: "منذ ساعتين" },
  { color: "bg-warning", ar: "تذكير: موعد تسليم تقرير الأسبوع", time: "منذ 3 ساعات" },
  { color: "bg-destructive", ar: "تأخر تسليم مهمة: إعداد سكربت المكالمات", time: "أمس" },
  { color: "bg-primary", ar: "حصلت على +15 نقطة أداء", time: "أمس" },
];

const QUICK_ACTIONS = [
  { icon: Clock, ar: "تسجيل حضور", message: "تم تسجيل حضورك بنجاح" },
  { icon: FileText, ar: "إضافة تقرير", message: "جاري تحويلك لصفحة التقارير..." },
  { icon: Upload, ar: "رفع شيت", message: "جاري تحويلك لصفحة رفع الشيتات..." },
  { icon: LifeBuoy, ar: "فتح شكوى", message: "جاري تحويلك لصفحة الشكاوى..." },
];

export default function Dashboard() {
  const showToast = useToast();
  const [items, setItems] = useState(INITIAL_CHECKLIST);

  const toggle = (id: number) => {
    setItems((xs) => {
      const updated = xs.map((x) => x.id === id ? { ...x, done: !x.done } : x);
      const target = updated.find((x) => x.id === id);
      if (target?.done) {
        showToast("success", `تم إنجاز: ${target.ar}`);
      }
      return updated;
    });
  };

  const handleQuickAction = (ar: string, message: string) => {
    showToast("success", message);
  };

  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <PortalLayout title="الرئيسية" subtitle="نظرة سريعة على يومك">
      {/* Greeting */}
      <Card className="relative overflow-hidden p-6 mb-6 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent">
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-teal text-teal-foreground grid place-items-center text-xl font-bold shrink-0 ring-4 ring-card">
            ك.م
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{today}</div>
            <h2 className="text-2xl font-bold text-foreground">صباح الخير، كريم 👋</h2>
            <div className="text-sm text-muted-foreground">قسم التسويق · Team Leader · مصر</div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-primary font-semibold bg-primary/10 rounded-xl px-4 py-2">
            <Target className="h-4 w-4" /> نسبة إنجازك اليوم 68%
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="text-sm font-semibold text-muted-foreground mb-3">ملخص اليوم</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="المهام الجديدة" value="7" tone="primary" trend="+2 اليوم" />
        <StatCard icon={CheckCircle2} label="المهام المكتملة" value="12" tone="success" trend="+3 اليوم" />
        <StatCard icon={Target} label="نسبة تحقيق التارجت" value="68%" tone="primary" ring />
        <StatCard icon={Bell} label="الإشعارات الجديدة" value="4" tone="teal" trend="اليوم" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">التشيك ليست اليومية</h3>
              <span className="text-xs text-muted-foreground">
                {items.filter((i) => i.done).length} / {items.length} مكتمل
              </span>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => toggle(it.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right
                    ${it.done ? "bg-success/5 border-success/20" : "bg-background border-border hover:border-primary/30"}`}
                >
                  <div className={`h-6 w-6 rounded-lg grid place-items-center border-2 transition
                    ${it.done ? "bg-success border-success" : "border-muted-foreground/30"}`}>
                    {it.done && <Check className="h-4 w-4 text-success-foreground" />}
                  </div>
                  <span className={`text-sm font-medium ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {it.ar}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">أزرار سريعة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.ar}
                  onClick={() => handleQuickAction(q.ar, q.message)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary transition"
                >
                  <q.icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{q.ar}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">آخر الأنشطة</h3>
          <div className="relative space-y-4">
            <div className="absolute right-1.5 top-2 bottom-2 w-px bg-border" />
            {ACTIVITIES.map((a, i) => (
              <div key={i} className="relative flex gap-3 pr-6">
                <div className={`absolute right-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-card ${a.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{a.ar}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <div className="text-sm text-muted-foreground">
          <StatusPill tone="success">مكتملة</StatusPill>{" "}
          <StatusPill tone="warning">جاري التنفيذ</StatusPill>{" "}
          <StatusPill tone="danger">متأخرة</StatusPill>
        </div>
      </div>
    </PortalLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone, trend, ring }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone: "primary" | "success" | "teal" | "warning";
  trend?: string; ring?: boolean;
}) {
  const toneBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    teal: "bg-teal/10 text-teal",
    warning: "bg-warning/15 text-[oklch(0.48_0.11_82)]",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${toneBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {ring && (
          <div className="relative h-14 w-14">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${68 * 0.94} 100`} className="text-primary" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-bold text-primary tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
      {trend && <div className="text-xs text-success mt-2 font-semibold">{trend}</div>}
    </Card>
  );
}