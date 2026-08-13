"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  getNotificationTone,
  timeAgoAr,
  type NotificationRow,
} from "@/modules/notifications/api/notifications.api";

const TONE_DOT: Record<string, string> = {
  success: "bg-success",
  primary: "bg-primary",
  teal: "bg-teal",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function NotificationsBell({ userId }: { userId: string | null | undefined }) {
  const showToast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [listLoadedOnce, setListLoadedOnce] = useState(false);

  // عدّاد غير المقروء دايمًا شغال حتى لو الـ dropdown مقفول + realtime
  useEffect(() => {
    if (!userId) return;
    let active = true;

    getUnreadNotificationsCount(userId)
      .then((count) => active && setUnreadCount(count))
      .catch(console.error);

    const unsubscribe = subscribeToNotifications(userId, () => {
      getUnreadNotificationsCount(userId)
        .then((count) => active && setUnreadCount(count))
        .catch(console.error);

      // لو الـ dropdown مفتوح، حدّث الليست كمان عشان تفضل متزامنة
      if (open) {
        getNotifications(userId)
          .then((page) => active && setItems(page.items))
          .catch(console.error);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open]);

  // اقفل الـ dropdown لو ضغط برّه
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && userId && !listLoadedOnce) {
      setLoading(true);
      try {
        const page = await getNotifications(userId);
        setItems(page.items);
        setHasMore(page.hasMore);
        setListLoadedOnce(true);
      } catch (err) {
        console.error(err);
        showToast("error", "تعذر تحميل الإشعارات");
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleLoadMore() {
    if (!userId || items.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = items[items.length - 1].created_at;
      const page = await getNotifications(userId, { cursor });
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error(err);
      showToast("error", "تعذر تحميل المزيد");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleItemClick(n: NotificationRow) {
    if (!userId || n.is_read) return;
    // Optimistic update
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n.id, userId);
    } catch (err) {
      console.error(err);
      // rollback
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: false } : it)));
      setUnreadCount((c) => c + 1);
      showToast("error", "تعذر تحديث حالة الإشعار");
    }
  }

  async function handleMarkAllRead() {
    if (!userId || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    const prevItems = items;
    const prevCount = unreadCount;
    // Optimistic update
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(userId);
    } catch (err) {
      console.error(err);
      setItems(prevItems);
      setUnreadCount(prevCount);
      showToast("error", "تعذر تعليم الإشعارات كمقروءة");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={handleOpen}
        disabled={!userId}
        className="relative grid size-10 place-items-center rounded-xl border border-border bg-background hover:bg-accent disabled:opacity-50"
      >
        <Bell className="size-4.5 text-foreground/80" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 left-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-warm-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-foreground">الإشعارات</span>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {markingAll ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              تعليم الكل كمقروء
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                لا توجد إشعارات
              </div>
            )}

            {!loading &&
              items.map((n) => {
                const tone = getNotificationTone(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full gap-3 border-b border-border/60 px-4 py-3 text-right transition hover:bg-accent/50 last:border-b-0
                      ${n.is_read ? "opacity-70" : ""}`}
                  >
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : TONE_DOT[tone]}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${n.is_read ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground/70">{timeAgoAr(n.created_at)}</div>
                    </div>
                  </button>
                );
              })}

            {hasMore && !loading && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-primary hover:bg-accent/50 disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="size-3 animate-spin" />}
                تحميل المزيد
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}