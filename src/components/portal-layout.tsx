// src/components/portal-layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Clock, ListTodo, FileText, Briefcase, Users,
  Upload, LifeBuoy, BookOpen, Trophy, User, Search, Bell, ChevronRight,
  ChevronsRight, Menu, X,
} from "lucide-react";

type NavItem = { to: string; ar: string; en: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { to: "/", ar: "الرئيسية", en: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", ar: "الحضور", en: "Attendance", icon: Clock },
  { to: "/tasks", ar: "المهام", en: "Tasks", icon: ListTodo },
  { to: "/reports", ar: "التقارير اليومية", en: "Daily Reports", icon: FileText },
  { to: "/department", ar: "شغل القسم", en: "Department Work", icon: Briefcase },
  { to: "/representatives", ar: "المناديب", en: "Representatives", icon: Users },
  { to: "/uploads", ar: "رفع الشيتات", en: "Upload Center", icon: Upload },
  { to: "/complaints", ar: "الشكاوى", en: "Complaints", icon: LifeBuoy },
  { to: "/library", ar: "المكتبة", en: "Library", icon: BookOpen },
  { to: "/performance", ar: "الأداء", en: "Performance", icon: Trophy },
  { to: "/profile", ar: "الملف الشخصي", en: "Profile", icon: User },
];

export function PortalLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (RTL: right side) */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 bg-card border-l border-border transition-all duration-300
          ${collapsed ? "w-20" : "w-72"}
          ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo + user */}
          <div className="p-5 border-b border-border">
            <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary grid place-items-center text-primary-foreground font-bold shadow-warm">
                ب
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="font-bold text-foreground truncate">بوابة الموظف</div>
                  <div className="text-xs text-muted-foreground truncate">Employee Portal</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-4 flex items-center gap-3 p-2.5 rounded-xl bg-secondary/60">
                <div className="h-9 w-9 rounded-full bg-teal text-teal-foreground grid place-items-center text-sm font-semibold shrink-0">
                  ك.م
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">كريم محمود</div>
                  <div className="text-xs text-muted-foreground truncate">Marketing · Team Leader</div>
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all
                    ${active
                      ? "bg-primary text-primary-foreground shadow-warm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
                    ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{item.ar}</div>
                      <div className={`text-[11px] truncate ${active ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>
                        {item.en}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center gap-2 mx-3 mb-3 rounded-xl border border-border py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <ChevronsRight className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>طي القائمة</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className={`transition-all duration-300 ${collapsed ? "lg:mr-20" : "lg:mr-72"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <button className="lg:hidden p-2 -mr-2" onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>بوابة الموظف</span>
                <ChevronRight className="h-3 w-3 rotate-180" />
                <span className="text-foreground font-medium">{title}</span>
              </div>
              <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
            </div>
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="ابحث..."
                className="h-10 w-64 rounded-xl bg-secondary/60 border border-transparent focus:border-primary/40 focus:bg-card outline-none pr-10 pl-3 text-sm transition"
              />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-secondary transition">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-3 pr-3 border-r border-border">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-foreground">كريم محمود</div>
                <div className="text-xs text-muted-foreground">Team Leader</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-teal text-teal-foreground grid place-items-center text-sm font-semibold">ك.م</div>
            </div>
          </div>
          {subtitle && <div className="px-4 lg:px-8 pb-3 text-sm text-muted-foreground">{subtitle}</div>}
        </header>

        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}

/* Shared UI atoms */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-warm ${className}`}>{children}</div>
  );
}



export function StatusPill({ tone, children }: { tone: "success" | "warning" | "danger" | "teal" | "muted" | "primary"; children: ReactNode }) {
  const map: Record<string, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
    teal: "bg-teal/15 text-teal",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}