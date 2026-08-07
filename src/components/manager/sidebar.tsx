"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Clock, ListChecks, FileText, Truck, UploadCloud,
  MessageSquare, Wallet, Landmark, Gift, BookOpen, TrendingUp,
  Megaphone, Settings, User, LogOut, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

const nav = [
  { to: "/manager/dashboard", icon: Home, ar: "الرئيسية", en: "Dashboard" },
  { to: "/manager/employees", icon: Users, ar: "الموظفون", en: "Employees" },
  { to: "/manager/attendance", icon: Clock, ar: "الحضور", en: "Attendance" },
  { to: "/manager/tasks", icon: ListChecks, ar: "المهام", en: "Tasks" },
  { to: "/manager/reports", icon: FileText, ar: "التقارير اليومية", en: "Daily Reports" }, { to: "/manager/department", icon: Building2, ar: "شغل القسم", en: "Department Work" },
  { to: "/manager/representatives", icon: Truck, ar: "المناديب", en: "Representatives" },
  { to: "/manager/uploads", icon: UploadCloud, ar: "رفع الشيتات", en: "Upload Center" },
  // { to: "/manager/approvals", icon: CheckCircle2, ar: "الاعتمادات", en: "Approvals", badge: 14 },
  { to: "/manager/complaints", icon: MessageSquare, ar: "الشكاوى", en: "Complaints" },
  { to: "/manager/expenses", icon: Wallet, ar: "المصروفات", en: "Expenses" },
  { to: "/manager/cash", icon: Landmark, ar: "الخزنة", en: "Company Cash" },
  { to: "/manager/deductions", icon: Gift, ar: "الخصومات والمكافآت", en: "Deductions & Rewards" },
  { to: "/manager/library", icon: BookOpen, ar: "المكتبة", en: "Library" },
  { to: "/manager/performance", icon: TrendingUp, ar: "الأداء", en: "Performance" },
  { to: "/manager/announcements", icon: Megaphone, ar: "الإعلانات", en: "Announcements" },
  // { to: "/manager/reports-hub", icon: BarChart3, ar: "التقارير", en: "Reports" },
  { to: "/manager/settings", icon: Settings, ar: "الإعدادات", en: "Settings" },
  { to: "/manager/profile", icon: User, ar: "الملف الشخصي", en: "Profile" },
] as const;

export function ManagerSidebar({
  mobileOpen,
  onToggleMobile,
}: {
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/25 lg:hidden" onClick={onToggleMobile} />}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-screen shrink-0 flex-col border-l border-border bg-card/95 shadow-warm backdrop-blur transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            م
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">شركة التسويق</div>
              <div className="truncate text-[11px] text-muted-foreground">Marketing Co.</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent/50 p-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary font-bold">
              أ
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">أحمد الشريف</div>
              <div className="truncate text-[11px] text-muted-foreground">مدير</div>
            </div>
          </div>
        )}
      </div>

        <nav className="flex-1 overflow-y-auto p-2">
        {nav.map((item) => {
          const active = pathname === item.to || pathname?.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onToggleMobile}
              className={cn(
                "group relative mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-warm"
                  : "text-foreground/80 hover:bg-accent",
              )}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={1.75} />
              {!collapsed && (
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium">{item.ar}</span>
                  <span className={cn("truncate text-[10px]", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {item.en}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/login"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4.5" strokeWidth={1.75} />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">تسجيل الخروج</span>
              <span className="text-[10px] text-destructive/70">Logout</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/50 px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : (
            <>
              <ChevronsLeft className="size-4" /> طي القائمة
            </>
          )}
        </button>
      </div>
      </aside>
    </>
  );
}