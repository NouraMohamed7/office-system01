import { supabase } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Raw table types                                                    */
/*  NOTE: Backend only exposes `files_approval`. There is no separate  */
/*  "plain files" table/endpoints (upload-file, delete-file,           */
/*  update_file_name) — attachment_type enum only supports             */
/*  `tasks | files_approval`, confirming this is the only file table.  */
/* ------------------------------------------------------------------ */

export type FileApprovalStatus = "pending" | "accepted" | "rejected" | "edit_requested";

export type FileApprovalRow = {
  id: number;
  users_id: string;
  file_name: string;
  file_url: string;
  status: FileApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WithUser<T> = T & { users: { name: string } | null };

/* ------------------------------------------------------------------ */
/*  Unified shape used across the UI                                   */
/* ------------------------------------------------------------------ */

export type UnifiedFile = {
  id: number;
  name: string;
  url: string;
  status: FileApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  users_id: string;
  user_name?: string | null;
};

function approvalToUnified(row: FileApprovalRow, userName?: string | null): UnifiedFile {
  return {
    id: row.id,
    name: row.file_name,
    url: row.file_url,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    users_id: row.users_id,
    user_name: userName ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Labels                                                              */
/* ------------------------------------------------------------------ */

export const FILE_STATUS_LABELS: Record<FileApprovalStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  edit_requested: "تحتاج تعديل",
};

export const FILE_STATUSES: FileApprovalStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "edit_requested",
];

export const MAX_APPROVAL_FILE_SIZE_MB = 50;

/* ------------------------------------------------------------------ */
/*  Employee                                                            */
/* ------------------------------------------------------------------ */

export async function getMyFiles(): Promise<UnifiedFile[]> {
  const { data, error } = await supabase
    .from("files_approval")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => approvalToUnified(r as FileApprovalRow));
}

// رفع ملف للموافقة — upload-file-approval Edge Function
// دايمًا بيعمل record جديد بحالة pending، وبياخد ملف واحد بس (مش array)
export async function uploadApprovalFile(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const { data, error } = await supabase.functions.invoke("upload_file_approval", {
    body: formData,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

// حذف ملف موافقة — delete-file-approval Edge Function
// الباك يقبل file_id مفرد فقط. الحذف مسموح في أي حالة (pending/accepted/rejected/edit_requested)
// من الموظف (لملفاته فقط) أو من المدير (لأي ملف).
export async function deleteApprovalFile(fileId: number) {
  const { data, error } = await supabase.functions.invoke("delete-file-approval", {
    body: { file_id: fileId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/* ------------------------------------------------------------------ */
/*  Manager                                                             */
/* ------------------------------------------------------------------ */

export async function getAllFiles(): Promise<UnifiedFile[]> {
  const { data, error } = await supabase
    .from("files_approval")
    .select("*, users:users_id(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as WithUser<FileApprovalRow>[]).map((r) =>
    approvalToUnified(r, r.users?.name)
  );
}

// مراجعة ملف الموافقة: اعتماد / رفض / طلب تعديل — المدير فقط
export async function reviewFileApproval(
  fileId: number,
  status: FileApprovalStatus,
  comment: string
) {
  const { data, error } = await supabase.rpc("review_file_approval", {
    p_file_id: fileId,
    p_status: status,
    p_comment: comment,
  });

  if (error) throw error;
  return data;
}