import { supabase } from "@/lib/supabase/client";

/* ============================================================
   Social Works — جدول social_works
   ============================================================
   ⚠️ القيم دي افتراضية بناءً على تصميم الفرونت الحالي. لازم تتأكد
   إنها *مطابقة تمامًا* لقيم public.media_type و public.social_content_type
   الحقيقية في الباك (Supabase Studio > Database > Enumerated Types).
   لو مختلفة، غيّر القيم هنا بس (String) وكل حاجة تانية هتفضل شغالة
   لأن كل التصميم بيقرا من MEDIA_TYPE_LABELS / CONTENT_TYPE_LABELS.
   ============================================================ */

export type MediaType = "instagram" | "tiktok" | "facebook" | "x(twitter)";
export type SocialContentType = "post" | "reel" | "story" | "carousel";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  "x(twitter)": "X (Twitter)",
};

export const CONTENT_TYPE_LABELS: Record<SocialContentType, string> = {
  post: "بوست",
  reel: "ريل",
  story: "ستوري",
  carousel: "كاروسيل",
};

export const MEDIA_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];
export const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as SocialContentType[];

export type SocialWork = {
  id: number;
  created_at: string;
  updated_at: string;
  users_id: string;
  link: string;
  media_type: MediaType;
  content_type: SocialContentType;
};

export async function getSocialWorks(): Promise<SocialWork[]> {
  const { data, error } = await supabase
    .from("social_works")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSocialWork(input: {
  link: string;
  media_type: MediaType;
  content_type: SocialContentType;
}): Promise<SocialWork> {
  // لازم نبعت users_id صراحةً عشان الـ RLS insert policy
  // (auth.uid() = users_id) تنجح. لو سبناها للباك بتتبعت null.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("مفيش يوزر مسجل دخول");

  const { data, error } = await supabase
    .from("social_works")
    .insert([{ ...input, users_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data as SocialWork;
}

export async function updateSocialWork(
  id: number,
  input: Partial<Pick<SocialWork, "link" | "media_type" | "content_type">>
): Promise<SocialWork> {
  const { data, error } = await supabase
    .from("social_works")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SocialWork;
}

export async function deleteSocialWork(id: number): Promise<void> {
  const { error } = await supabase.from("social_works").delete().eq("id", id);
  if (error) throw error;
}

/* ============================================================
   Representative work — تبويب "المناديب / Dash"
   جدول representative_work + الـ RPCs بتاعته
   ============================================================
   ⚠️ ده مختلف عن صفحة/جدول "المناديب" (representatives) اللي فيها
   بيانات المندوب الكاملة (رخصة، هوية، تليفون، موتوسيكل...) — دي صفحة
   منفصلة خالص (employee/manager/representatives) ومالهاش دعوة هنا.

   قواعد الصلاحيات حسب ملاحظات الباك:
   1) المدير والموظف الاتنين ممكن يضيفوا rep_work
   2) كل مستخدم يعدّل حالة/يحذف اللي هو عمله بس (created_by)
   3) أي حد يقدر يشوف كل الـ rep_works ويضيف تعليق
   ============================================================ */

// قيم public.rep_work_type الحقيقية في الباك (إنجليزي) — العرض بالعربي عن طريق
// REP_WORK_STATUS_LABELS تحت
export type RepWorkStatus = "active" | "absent" | "violation";
export const REP_WORK_STATUSES: RepWorkStatus[] = ["active", "absent", "violation"];

export const REP_WORK_STATUS_LABELS: Record<RepWorkStatus, string> = {
  active: "نشط",
  absent: "متغيب",
  violation: "مخالفة",
};

export type RepWork = {
  id: number;
  created_at: string;
  updated_at: string;
  status: RepWorkStatus;
  created_by: string | null;
  full_name: string;
};

export type RepWorkComment = {
  id?: number;
  body?: string;
  content?: string;
  sender_id?: string;
  created_at?: string;
  [key: string]: unknown;
};

export async function getRepWorks(): Promise<RepWork[]> {
  const { data, error } = await supabase
    .from("representative_work")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRepWork(input: {
  full_name: string;
  status: RepWorkStatus;
  comment: string;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc("create_rep_work", {
    p_full_name: input.full_name,
    p_status: input.status,
    p_comment: input.comment,
  });
  if (error) throw error;
  return data;
}

export async function updateRepWorkStatus(
  repWorkId: number,
  status: RepWorkStatus
): Promise<void> {
  const { error } = await supabase.rpc("update_rep_work_status", {
    p_rep_work_id: repWorkId,
    p_status: status,
  });
  if (error) throw error;
}

export async function deleteRepWork(repWorkId: number): Promise<void> {
  const { error } = await supabase.rpc("delete_rep_work", {
    p_rep_work_id: repWorkId,
  });
  if (error) throw error;
}

export async function getRepWorkComments(
  repWorkId: number
): Promise<RepWorkComment[]> {
  const { data, error } = await supabase.rpc("get_rep_work_comments", {
    p_rep_work_id: repWorkId,
  });
  if (error) throw error;
  return (data as RepWorkComment[]) ?? [];
}

export async function addRepWorkComment(
  repWorkId: number,
  body: string
): Promise<void> {
  const { error } = await supabase.rpc("add_rep_work_comment", {
    p_rep_work_id: repWorkId,
    p_body: body,
  });
  if (error) throw error;
}

/* ============================================================
   Current user helper — بنستخدمه نحدد صاحب كل عنصر عشان نظهر/نخفي
   أزرار التعديل والحذف حسب الصلاحيات فوق
   ============================================================ */

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}