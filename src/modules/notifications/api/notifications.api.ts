import { supabase } from "@/lib/supabase/client";

/* ==========================================================================
   NOTIFICATIONS — المصدر الوحيد للتعامل مع جدول notifications
   (بديل موحّد لأي منطق كان متكرر في dashboard.api.ts / topbar / sidebar)
   ========================================================================== */

export type NotificationRow = {
  id: string;
  users_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: number | null;
};

export type NotificationTone = "success" | "primary" | "teal" | "warning" | "destructive";

// ⚠️ عمود type في notifications نصّي حر (مفيش enum موثّق في الباك للقيم
// المسموحة)، فالماب ده تخمين منطقي بناءً على أسماء الجداول اللي related_id
// المفروض يشاور عليها. أي قيمة type مش موجودة هنا بتاخد fallback آمن
// (Bell / primary) بدل ما تكسر الواجهة.
const TONE_BY_TYPE: Record<string, NotificationTone> = {
  task: "primary",
  report: "teal",
  attendance: "warning",
  cash: "success",
  complaint: "warning",
  file: "teal",
  announcement: "primary",
  deduction_reward: "success",
  leave: "teal",
  system: "primary",
};

export function getNotificationTone(type: string): NotificationTone {
  return TONE_BY_TYPE[type] ?? "primary";
}

const PAGE_SIZE = 15;

export type NotificationsPage = {
  items: NotificationRow[];
  hasMore: boolean;
};

/**
 * أول صفحة أو صفحة تالية من إشعارات المستخدم، الأحدث أولًا.
 * cursor = created_at لآخر عنصر في الصفحة اللي فاتت (لو عايز "تحميل المزيد").
 */
export async function getNotifications(
  userId: string,
  opts: { cursor?: string } = {}
): Promise<NotificationsPage> {
  if (!userId) throw new Error("getNotifications: userId is required");

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("users_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1); // بنجيب واحد زيادة عشان نعرف لو فيه صفحة تانية

  if (opts.cursor) {
    query = query.lt("created_at", opts.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as NotificationRow[];
  const hasMore = rows.length > PAGE_SIZE;

  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    hasMore,
  };
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  if (!userId) throw new Error("getUnreadNotificationsCount: userId is required");

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("users_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

// ⚠️ تحديث is_read مباشر على الجدول — مفيش RPC موثّق لتعليم إشعار كمقروء
// في الباك. فلترة .eq("users_id", userId) هنا دفاع إضافي من الفرونت بس،
// مش بديل عن RLS policy حقيقية على الجدول لازم تكون مفعّلة في Supabase
// تمنع أي مستخدم من تعديل is_read لإشعار مش بتاعه.
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  if (!notificationId) throw new Error("markNotificationRead: notificationId is required");
  if (!userId) throw new Error("markNotificationRead: userId is required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("users_id", userId);

  if (error) throw error;
}

/**
 * تعليم كل إشعارات المستخدم الغير مقروءة كمقروءة دفعة واحدة.
 * برضو تحديث مباشر على الجدول لنفس السبب فوق — لو فيه RPC مخصص لده
 * في الباك مستقبلًا (mark_all_notifications_read مثلاً) استبدل الجسم هنا بيها.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!userId) throw new Error("markAllNotificationsRead: userId is required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("users_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

export function subscribeToNotifications(userId: string | null | undefined, onChange: () => void) {
  if (!userId) {
    // لسه مفيش user (بيتحمل) — رجّع no-op unsubscribe بدل ما نكسر الاشتراك
    return () => {};
  }

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `users_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function timeAgoAr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}