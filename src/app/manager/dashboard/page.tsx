// src/app/manager/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { PageHeader, ProgressBar, SectionTitle, StatCard } from "@/components/manager/primitives";
import {
  Users, UserCheck, UserX, Clock, Palmtree, FileText, FolderCheck, MessageSquare,
  Truck, Wallet, Plus, ChevronDown, UserPlus, ListPlus, Receipt, ShieldCheck,
  ClipboardCheck, MinusCircle, Gift, Megaphone, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { getManagerDashboardData, type ManagerDashboardData } from "@/modules/dashboard/api/dashboard.api";

// ⚠️ الروابط دي اتصلحت عشان تطابق فولدرز الصفحات الفعلية عندك:
//   - "cash" مش "finance"
//   - "approvals" مش "files" (approvals هي صفحة files_approval)
//   - "deductions" top-level، مش جوه employees، والمكافأة والخصم في نفس
//     الصفحة (جدول deductions_rewards بيفرّق بينهم بعمود type)
//
// أما إضافة موظف / إنشاء مهمة / إرسال إعلان: مفيش صفحة /new منفصلة ظاهرة
// في هيكل المشروع — رجّعتهم لصفحة الـ list نفسها. لو الإضافة عندك بتتم
// عن طريق modal جوه نفس الصفحة، بدّل router.push هنا بفتح الـ modal state
// (مثلاً عن طريق query param زي ?action=new لو الصفحة بتقرأه، أو state
// عن طريق context/zustand لو عندك حاجة جاهزة).
const quickActions = [
  { label: "إضافة موظف", icon: UserPlus, href: "/manager/employees" },
  { label: "إنشاء مهمة", icon: ListPlus, href: "/manager/tasks" },
  { label: "تسجيل مصروف", icon: Receipt, href: "/manager/cash" },
  { label: "اعتماد الملفات", icon: ShieldCheck, href: "/manager/approvals?status=pending" },
  { label: "مراجعة التقارير", icon: ClipboardCheck, href: "/manager/reports?filter=pending" },
  { label: "إضافة خصم", icon: MinusCircle, href: "/manager/deductions?type=deduction" },
  { label: "إضافة مكافأة", icon: Gift, href: "/manager/deductions?type=reward" },
  { label: "إرسال إعلان", icon: Megaphone, href: "/manager/announcements" },
];

function formatEGP(value: number) {
  return `${value.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const go = (href: string) => router.push(href);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getManagerDashboardData();
      setData(result);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل بيانات لوحة التحكم. حاول تاني.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">جاري تحميل لوحة التحكم...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:bg-primary-dark"
        >
          <RefreshCw className="size-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { employees, reports, files, complaints, representatives, cash } = data;
  const reportsReceivedPercent =
    reports.totalToday > 0 ? Math.round((reports.received / reports.totalToday) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على أداء الشركة اليوم."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              title="تحديث"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-accent"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
          </div>
        }
      />

      <section>
        <SectionTitle sub="Employees">الموظفون</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button onClick={() => go("/manager/employees")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="إجمالي الموظفين" value={employees.total} icon={Users} tone="primary" />
          </button>
          <button onClick={() => go("/manager/employees?status=present")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="الحاضرون" value={employees.present} icon={UserCheck} tone="success" />
          </button>
          <button onClick={() => go("/manager/employees?status=late")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="المتأخرون" value={employees.late} icon={Clock} tone="warning" />
          </button>
          <button onClick={() => go("/manager/employees?status=absent")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="الغائبون" value={employees.absent} icon={UserX} tone="danger" />
          </button>
          <button onClick={() => go("/manager/employees?status=leave")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
            <StatCard dense label="في إجازة" value={employees.onLeave} icon={Palmtree} tone="teal" />
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle sub="Reports">التقارير</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => go("/manager/reports?status=received")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="المستلمة" value={reports.received} icon={FileText} tone="success" />
            </button>
            <button onClick={() => go("/manager/reports?status=missing")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="لم تُرسل" value={reports.notSent} icon={FileText} tone="danger" />
            </button>
            <button onClick={() => go("/manager/reports?filter=pending")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تحتاج مراجعة" value={reports.needsReview} icon={FileText} tone="warning" />
            </button>
          </div>
          <div className="mt-3 card-warm p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>نسبة استلام التقارير</span>
              <span className="font-semibold text-primary tabular">
                {reports.received} / {reports.totalToday}
              </span>
            </div>
            <div className="mt-2"><ProgressBar value={reportsReceivedPercent} /></div>
          </div>
        </div>
        <div>
          <SectionTitle sub="Files">الملفات</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button onClick={() => go("/manager/approvals?status=new")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="جديدة" value={files.pending} tone="teal" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/approvals?status=approved")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="معتمدة" value={files.accepted} tone="success" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/approvals?status=rejected")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مرفوضة" value={files.rejected} tone="danger" icon={FolderCheck} />
            </button>
            <button onClick={() => go("/manager/approvals?status=needs_edit")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تحتاج تعديل" value={files.editRequested} tone="warning" icon={FolderCheck} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <SectionTitle sub="Complaints">الشكاوى</SectionTitle>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => go("/manager/complaints?status=new")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="جديدة" value={complaints.newCount} icon={MessageSquare} tone="teal" />
            </button>
            <button onClick={() => go("/manager/complaints?status=in_processing")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="قيد التنفيذ" value={complaints.inProcessing} icon={MessageSquare} tone="warning" />
            </button>
            <button onClick={() => go("/manager/complaints?status=done")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="تم حلها" value={complaints.done} icon={MessageSquare} tone="success" />
            </button>
          </div>
        </div>
        <div>
          <SectionTitle sub="Representatives">المناديب</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => go("/manager/representatives")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="إجمالي" value={representatives.total} icon={Truck} tone="primary" />
            </button>
            <button onClick={() => go("/manager/representatives?status=active")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="نشط اليوم" value={representatives.active} icon={Truck} tone="success" />
            </button>
            <button onClick={() => go("/manager/representatives?status=absent")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="غياب اليوم" value={representatives.absent} icon={Truck} tone="warning" />
            </button>
            <button onClick={() => go("/manager/representatives?status=violation")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مخالفات اليوم" value={representatives.violation} icon={Truck} tone="danger" />
            </button>
          </div>
        </div>
        <div>
          <SectionTitle sub="Finance">المالية</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => go("/manager/cash?period=today")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف اليوم" value={formatEGP(cash.todayExpenses)} icon={Wallet} tone="primary" />
            </button>
            <button onClick={() => go("/manager/cash?period=week")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف الأسبوع" value={formatEGP(cash.weekExpenses)} icon={Wallet} tone="warning" />
            </button>
            <button onClick={() => go("/manager/cash?period=month")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="مصروف الشهر" value={formatEGP(cash.monthExpenses)} icon={Wallet} tone="danger" />
            </button>
            <button onClick={() => go("/manager/cash?tab=transactions")} className="block w-full appearance-none border-0 bg-transparent p-0 text-right transition-transform hover:-translate-y-0.5">
              <StatCard dense label="عمليات الصرف" value={cash.totalTransactions} icon={Wallet} tone="teal" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}