import { supabase } from "@/lib/supabase/client";

/**
 * ============================================================
 *  Announcements API
 *  - جدول announcements            (CRUD - النشر/الحذف مدير فقط، القراءة حسب القسم عبر RLS)
 *  - جدول announcement_seen         (سجل: مين شاف امتى - كل مستخدم بيشوف صفوفه هو بس)
 *  - RPC   mark_announcement_seen   (تعليم الإعلان كمشاهد)
 *  - Realtime على جدول announcements
 *
 *  ملاحظة: مبقيناش بنستخدم الـ view "announcement_seen_status" من هنا،
 *  لأنه view تقريري للمدير (بيرجع حالة كل الموظفين مع أسمائهم)، وصلاحياته
 *  مقفولة على المدير — استخدامه من جانب الموظف كان بيرجع صفوف فاضية دايمًا
 *  وده سبب إن الإعلانات ما كانتش بتظهر للموظف خالص.
 * ============================================================
 */

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type DepartmentRow = {
  id: number;
  name: string;
};

export type AnnouncementRow = {
  id: number;
  title: string;
  details: string;
  department_id: number | null; // null = يظهر لكل الموظفين
  created_by: string;
  created_at: string;
};

// ---------------------------------------------------------------
// Departments — مستخدمة في فورم "إعلان جديد" لبناء قائمة الأقسام
// ---------------------------------------------------------------

export async function getDepartments(): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from("department")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------
// Manager: CRUD على جدول announcements
// ---------------------------------------------------------------

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(payload: {
  title: string;
  details: string;
  department_id: number | null;
}): Promise<AnnouncementRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data, error } = await supabase
    .from("announcements")
    .insert([
      {
        title: payload.title,
        details: payload.details,
        department_id: payload.department_id,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

/**
 * عدد الموظفين اللي شافوا إعلان معين — يستخدم لعمود "المشاهدات" في صفحة المدير.
 * (announcement_seen هو السجل التاريخي: صف لكل مرة اتشاف فيها الإعلان لأول مرة)
 */
export async function getAnnouncementViewsMap(
  announcementIds: number[]
): Promise<Record<number, number>> {
  if (announcementIds.length === 0) return {};

  const { data, error } = await supabase
    .from("announcement_seen")
    .select("announcement_id")
    .in("announcement_id", announcementIds);

  if (error) throw error;

  const map: Record<number, number> = {};
  for (const id of announcementIds) map[id] = 0;
  for (const row of data ?? []) {
    map[row.announcement_id] = (map[row.announcement_id] ?? 0) + 1;
  }
  return map;
}

/** Realtime: صفحة المدير تتحدث فورًا مع أي إضافة/حذف */
export function subscribeAnnouncements(onChange: () => void): () => void {
  const channel = supabase
    .channel("announcements-manager")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcements" },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------
// Employee: الإعلانات اللي لسه ما شافهاش
// ---------------------------------------------------------------

/**
 * كل الإعلانات اللي لسه الموظف الحالي ما شافهاش، بالتفاصيل كاملة.
 * - "الإعلانات المرئية ليّا" بتيجي من جدول announcements مباشرة (RLS بيفلتر
 *   حسب القسم: عام department_id=null أو قسم الموظف نفسه).
 * - "اللي شفتها فعلاً" بتيجي من announcement_seen مفلترة بالـ user id بتاعي.
 * - الفرق بينهم = اللي لسه محتاج يشوفها.
 */
export async function getUnseenAnnouncementsWithDetails(): Promise<AnnouncementRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const [visibleRes, seenRes] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("announcement_seen").select("announcement_id").eq("users_id", user.id),
  ]);

  if (visibleRes.error) throw visibleRes.error;
  if (seenRes.error) throw seenRes.error;

  const seenIds = new Set((seenRes.data ?? []).map((r) => r.announcement_id as number));
  return (visibleRes.data ?? []).filter((a) => !seenIds.has(a.id));
}

/** تعليم إعلان كمشاهد — بينده RPC مين المستخدم الحالي أوتوماتيك من الـ auth context */
export async function markAnnouncementSeen(announcementId: number): Promise<void> {
  const { error } = await supabase.rpc("mark_announcement_seen", {
    p_announcement_id: announcementId,
  });

  if (error) throw error;
}

/**
 * Realtime: علشان البوب أب يظهر للموظف "فور" ما المدير ينشر إعلان جديد
 * من غير ما يعمل refresh للصفحة.
 */
export function subscribeNewAnnouncements(
  onInsert: (row: AnnouncementRow) => void
): () => void {
  const channel = supabase
    .channel("announcements-employee")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "announcements" },
      (payload) => onInsert(payload.new as AnnouncementRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}