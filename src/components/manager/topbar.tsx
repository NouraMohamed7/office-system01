// src/components/manager/topbar.tsx
"use client";

import Link from "next/link";
import { Bell, Search, CheckCircle2, Menu } from "lucide-react";
import { useToast } from "@/components/toast";

export function ManagerTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const showToast = useToast();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground lg:hidden" onClick={onToggleSidebar}>
        <Menu className="size-5" />
      </button>
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="ابحث عن موظف، مهمة، تقرير، ملف..."
          className="h-10 w-full rounded-xl border border-border bg-background/70 pr-10 pl-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background"
        />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/manager/approvals"
          className="relative hidden items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15 sm:flex"
        >
          <CheckCircle2 className="size-4" />
          <span>14 اعتماد ينتظر</span>
        </Link>
        <button
          onClick={() => showToast("success", "لا توجد إشعارات جديدة")}
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-background hover:bg-accent"
        >
          <Bell className="size-4.5 text-foreground/80" strokeWidth={1.75} />
          <span className="absolute top-2 left-2 size-2 rounded-full bg-primary ring-2 ring-card" />
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-2 py-1.5">
          <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary font-bold text-sm">أ</div>
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-semibold">أحمد الشريف</div>
            <div className="text-[10px] text-muted-foreground">مدير</div>
          </div>
        </div>
      </div>
    </header>
  );
}