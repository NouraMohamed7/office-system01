// src/components/manager/topbar.tsx
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NotificationsBell } from "@/components/notifications-bell";

function initialsOf(name: string | null | undefined) {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed[0] : "؟";
}

export function ManagerTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useCurrentUser();

  const displayName = user?.name || "...";
  const roleLabel = user?.position_title || "مدير";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground lg:hidden" onClick={onToggleSidebar}>
        <Menu className="size-5" />
      </button>

      {/* عنوان بسيط بدل السيرش شاغل المساحة، بيدّي البار شكل أنظف */}
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">مرحبًا، {displayName}</div>
        <div className="text-[11px] text-muted-foreground">{roleLabel}</div>
      </div>

      <div className="flex items-center gap-2">
        {/* الجرس — كومبوننت موحّد، نفس المصدر ونفس السلوك في البورتالين */}
        <NotificationsBell userId={user?.id} />

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