// src/app/manager/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageHeader, ProgressBar, SectionTitle, StatCard } from "@/components/manager/primitives";
import {
  Users, UserCheck, UserX, Clock, Palmtree, FileText, FolderCheck, MessageSquare,
  Truck, Wallet, Plus, ChevronDown, UserPlus, ListPlus, Receipt, ShieldCheck,
  ClipboardCheck, MinusCircle, Gift, Megaphone,
} from "lucide-react";

const quickActions = [
  { label: "إضافة موظف", icon: UserPlus, href: "/manager/employees/new" },
  { label: "إنشاء مهمة", icon: ListPlus, href: "/manager/tasks/new" },
  { label: "تسجيل مصروف", icon: Receipt, href: "/manager/finance/new" },
  { label: "اعتماد الملفات", icon: ShieldCheck, href: "/manager/files?status=pending" },
  { label: "مراجعة التقارير", icon: ClipboardCheck, href: "/manager/reports?filter=pending" },
  { label: "إضافة خصم", icon: MinusCircle, href: "/manager/employees/deductions/new" },
  { label: "إضافة مكافأة", icon: Gift, href: "/manager/employees/bonuses/new" },
  { label: "إرسال إعلان", icon: Megaphone, href: "/manager/announcements/new" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const go = (href: string) => router.push(href);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على أداء الشركة اليوم."
        actions={
          <div className="relative">
            <button
              onClick={() => setQuickMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:bg-primary-dark"
            >
              <Plus className="size-4" /> إجراء سريع
              <ChevronDown className={`size-4 transition-transform ${quickMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {quickMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setQuickMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-warm">
                  {quickActions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.label}
                        onClick={() => {
                          setQuickMenuOpen(false);
                          go(a.href);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-right text-sm hover:bg-accent"
                      >
                        <Icon className="size-4 text-primary" strokeWidth={1.75} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        }
      />

      <section>
        <SectionTitle sub="Employees">الموظفون</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button onClick={() => go("/manager/employees")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="إجمالي الموظفين" value="142" icon={Users} tone="primary" />
          </button>
          <button onClick={() => go("/manager/employees?status=present")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="الحاضرون" value="118" icon={UserCheck} tone="success" />
          </button>
          <button onClick={() => go("/manager/employees?status=late")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="المتأخرون" value="8" icon={Clock} tone="warning" />
          </button>
          <button onClick={() => go("/manager/employees?status=absent")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="الغائبون" value="12" icon={UserX} tone="danger" />
          </button>
          <button onClick={() => go("/manager/employees?status=leave")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="في إجازة" value="4" icon={Palmtree} tone="teal" />
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle sub="Reports">التقارير</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => go("/manager/reports?status=received")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="المستلمة" value="18" icon={FileText} tone="success" />
            </button>
            <button onClick={() => go("/manager/reports?status=missing")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="لم تُرسل" value="2" icon={FileText} tone="danger" />
            </button>
            <button onClick={() => go("/manager/reports?filter=pending")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تحتاج مراجعة" value="5" icon={FileText} tone="warning" />
            </button>
          </div>
          <div className="mt-3 card-warm p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>نسبة استلام التقارير</span>
              <span className="font-semibold text-primary tabular">18 / 20</span>
            </div>
            <div className="mt-2"><ProgressBar value={90} /></div>
          </div>
        </div>
        <div>
          <SectionTitle sub="Files">الملفات</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button onClick={() => go("/manager/files?status=new")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="جديدة" value="11" tone="teal" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/files?status=approved")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="معتمدة" value="34" tone="success" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/files?status=rejected")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مرفوضة" value="3" tone="danger" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/files?status=needs_edit")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تحتاج تعديل" value="6" tone="warning" icon={FolderCheck} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <SectionTitle sub="Complaints">الشكاوى</SectionTitle>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => go("/manager/complaints?status=new")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="جديدة" value="4" icon={MessageSquare} tone="teal" />
            </button>
            <button onClick={() => go("/manager/complaints?status=in_progress")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="قيد التنفيذ" value="7" icon={MessageSquare} tone="warning" />
            </button>
            <button onClick={() => go("/manager/complaints?status=resolved")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تم حلها" value="52" icon={MessageSquare} tone="success" />
            </button>
          </div>
        </div>
        <div>
          <SectionTitle sub="Representatives">المناديب</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => go("/manager/representatives")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="إجمالي" value="86" icon={Truck} tone="primary" />
            </button>
            <button onClick={() => go("/manager/representatives?status=new")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="جدد" value="9" icon={Truck} tone="teal" />
            </button>
            <button onClick={() => go("/manager/representatives?status=accepted")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مقبولون" value="61" icon={Truck} tone="success" />
            </button>
            <button onClick={() => go("/manager/representatives?status=rejected")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مرفوضون" value="7" icon={Truck} tone="danger" />
            </button>
          </div>
        </div>
        <div>
          <SectionTitle sub="Finance">المالية</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => go("/manager/finance?period=today")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف اليوم" value="4,820 ج" icon={Wallet} tone="primary" />
            </button>
            <button onClick={() => go("/manager/finance?period=week")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف الأسبوع" value="28,140 ج" icon={Wallet} tone="warning" />
            </button>
            <button onClick={() => go("/manager/finance?period=month")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف الشهر" value="112,600 ج" icon={Wallet} tone="danger" />
            </button>
            <button onClick={() => go("/manager/finance?tab=transactions")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="عمليات الصرف" value="46" icon={Wallet} tone="teal" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}