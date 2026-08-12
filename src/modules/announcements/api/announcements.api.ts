import { supabase } from "@/lib/supabase/client";

/**
 * ============================================================
 *  Announcements API
 *  يغطي كل اللي الباك اند عامله لفيتشر الإعلانات:
 *  - جدول announcements            (CRUD - مدير فقط)
 *  - جدول department                (لبناء قائمة الجمهور المستهدف)
 *  - view  announcement_seen_status (حالة كل إعلان لكل مستخدم - RLS)
 *  - جدول announcement_seen         (سجل تاريخي - مين شاف امتى)
 *  - RPC   mark_announcement_seen   (تعليم الإعلان كمشاهد)
 *  - Realtime على جدول announcements
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

export type AnnouncementSeenStatusRow = {
  announcement_id: number;
  title: string;
  department_id: number | null;
  users_id: string;
  name: string;
  seen_at: string | null;
  has_seen: boolean;
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
export async function getAnnouncementViews(announcementId: number): Promise<number> {
  const { count, error } = await supabase
    .from("announcement_seen")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", announcementId);

  if (error) throw error;
  return count ?? 0;
}

/** يجيب عدد المشاهدات لعدة إعلانات مرة واحدة (يفادي N+1 قدر الإمكان) */
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
// Employee: قراءة حالة الإعلانات + تعليمها كمشاهدة
// ---------------------------------------------------------------

/** كل الإعلانات (مشاهدة وغير مشاهدة) الخاصة بالموظف الحالي — الفلترة حسب القسم متكفل بيها RLS */
export async function getAnnouncementSeenStatus(): Promise<AnnouncementSeenStatusRow[]> {
  const { data, error } = await supabase
    .from("announcement_seen_status")
    .select("*")
    .order("announcement_id", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** بس الإعلانات اللي الموظف لسه ما شافهاش */
export async function getUnseenAnnouncements(): Promise<AnnouncementSeenStatusRow[]> {
  const { data, error } = await supabase
    .from("announcement_seen_status")
    .select("*")
    .eq("has_seen", false)
    .order("announcement_id", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * الـ view announcement_seen_status مفيهاش عمود "details"، فبنجيب تفاصيل
 * الإعلانات غير المشاهدة من جدول announcements نفسه عشان نعرضها كاملة في البوب أب.
 */
export async function getAnnouncementsDetails(ids: number[]): Promise<AnnouncementRow[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("announcements").select("*").in("id", ids);

  if (error) throw error;
  return data ?? [];
}

/** يجمع الاتنين مع بعض: قايمة الإعلانات غير المشاهدة بالتفاصيل الكاملة، الأحدث أولاً */
export async function getUnseenAnnouncementsWithDetails(): Promise<AnnouncementRow[]> {
  const unseen = await getUnseenAnnouncements();
  if (unseen.length === 0) return [];

  const ids = unseen.map((u) => u.announcement_id);
  const full = await getAnnouncementsDetails(ids);

  return unseen
    .map((u) => full.find((f) => f.id === u.announcement_id))
    .filter((a): a is AnnouncementRow => Boolean(a));
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