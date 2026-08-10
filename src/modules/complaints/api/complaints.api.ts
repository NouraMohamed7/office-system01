import { supabase } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types - matching the DB enums exactly                             */
/* ------------------------------------------------------------------ */

export type ComplaintType =
  | "work_env"
  | "salary&rewards"
  | "co-worker"
  | "tools&matrials"
  | "else";

export type ComplaintStatus = "new" | "in_processing" | "done" | "rejected";

export type ComplaintRow = {
  id: number;
  users_id: string;
  title: string;
  description: string | null;
  type: ComplaintType;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
};

// نسخة المدير: فيها اسم الموظف صاحب الشكوى (join مع جدول users)
export type ComplaintWithUser = ComplaintRow & {
  users: { name: string } | null;
};

/* ------------------------------------------------------------------ */
/*  Arabic labels <-> DB enum values                                  */
/* ------------------------------------------------------------------ */

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  work_env: "بيئة العمل",
  "salary&rewards": "الراتب والمزايا",
  "co-worker": "زميل عمل",
  "tools&matrials": "أدوات وموارد",
  else: "أخرى",
};

export const COMPLAINT_TYPES: ComplaintType[] = [
  "work_env",
  "salary&rewards",
  "co-worker",
  "tools&matrials",
  "else",
];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  new: "جديدة",
  in_processing: "قيد المراجعة",
  done: "تم الحل",
  rejected: "مرفوضة",
};

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  "new",
  "in_processing",
  "done",
  "rejected",
];

/* ------------------------------------------------------------------ */
/*  Employee                                                           */
/* ------------------------------------------------------------------ */

// جلب شكاوى المستخدم الحالي فقط (RLS بتفلتر تلقائيًا حسب users_id)
export async function getMyComplaints(): Promise<ComplaintRow[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ComplaintRow[];
}

// إنشاء شكوى جديدة
export async function createComplaint(params: {
  title: string;
  description: string;
  type: ComplaintType;
}) {
  const { data, error } = await supabase.rpc("create_complaint", {
    p_title: params.title,
    p_description: params.description,
    p_type: params.type,
  });

  if (error) throw error;
  return data;
}

// حذف شكوى
export async function deleteComplaint(complaintId: number) {
  const { data, error } = await supabase.rpc("delete_complaint", {
    p_complaint_id: complaintId,
  });

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Manager                                                             */
/* ------------------------------------------------------------------ */

// جلب كل الشكاوى مع اسم الموظف صاحب كل شكوى
export async function getAllComplaints(): Promise<ComplaintWithUser[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("*, users:users_id(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ComplaintWithUser[];
}

// تغيير حالة الشكوى (المدير فقط)
export async function reviewComplaint(
  complaintId: number,
  status: ComplaintStatus
) {
  const { data, error } = await supabase.rpc("review_complaint", {
    p_complaint_id: complaintId,
    p_status: status,
  });

  if (error) throw error;
  return data;
}