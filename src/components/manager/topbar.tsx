// src/components/manager/topbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Search, CheckCircle2, Menu } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase/client";
import {
  getManagerFilesStats,
  getUnreadNotificationsCount,
  subscribeToNotifications,
} from "@/modules/dashboard/api/dashboard.api";

function initialsOf(name: string | null | undefined) {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed[0] : "؟";
}

export function ManagerTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useCurrentUser();

  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  // عدد الاعتمادات المعلّقة — نفس المصدر بالظبط اللي بيستخدمه Manager Dashboard
  // (getManagerFilesStats().pending)، من غير أي كويري مكررة هنا
  useEffect(() => {
    let active = true;

    getManagerFilesStats()
      .then((stats) => {
        if (active) setPendingApprovals(stats.pending);
      })
      .catch((err) => {
        console.error(err);
        if (active) setPendingApprovals(0);
      });

    const channel = supabase
      .channel("topbar-files-approval")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files_approval" },
        () => {
          getManagerFilesStats()
            .then((stats) => {
              if (active) setPendingApprovals(stats.pending);
            })
            .catch(console.error);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // عدد الإشعارات الغير مقروءة + realtime — نفس المصدر المستخدم في
  // Employee PortalLayout (getUnreadNotificationsCount + subscribeToNotifications)
  useEffect(() => {
    if (!user) return;
    let active = true;

    getUnreadNotificationsCount(user.id)
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch(console.error);

    const unsubscribe = subscribeToNotifications(user.id, () => {
      getUnreadNotificationsCount(user.id)
        .then((count) => {
          if (active) setUnreadCount(count);
        })
        .catch(console.error);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const displayName = user?.name || "...";
  const roleLabel = user?.position_title || "مدير";

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
        {/* رقم حقيقي من getManagerFilesStats().pending مع realtime */}
        <Link
          href="/manager/approvals?status=pending"
          className="relative hidden items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15 sm:flex"
        >
          <CheckCircle2 className="size-4" />
          <span>
            {pendingApprovals === null ? "..." : pendingApprovals} اعتماد ينتظر
          </span>
        </Link>

        {/* الجرس — عدد حقيقي من notifications.is_read + realtime */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative grid size-10 place-items-center rounded-xl border border-border bg-background hover:bg-accent"
          >
            <Bell className="size-4.5 text-foreground/80" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 left-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-card p-4 text-sm shadow-warm">
                {unreadCount > 0 ? (
                  <span className="text-foreground font-medium">
                    عندك {unreadCount} إشعار{unreadCount > 1 ? "ات" : ""} جديدة
                  </span>
                ) : (
                  <span className="text-muted-foreground">لا توجد إشعارات جديدة</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-2 py-1.5">
          <div className="grid size-8 place-items-center overflow-hidden rounded-full bg-primary/15 text-primary font-bold text-sm">
            {user?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initialsOf(displayName)
            )}
          </div>
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-semibold">{displayName}</div>
            <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  );
}