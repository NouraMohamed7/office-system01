import { supabase } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Raw table types                                                    */
/* ------------------------------------------------------------------ */

export type FileApprovalStatus = "pending" | "accepted" | "rejected" | "edit_requested";

// جدول files العادي (بدون موافقة)
export type PlainFileRow = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  file_path: string;
  users_id: string;
  mime_type: string;
  size_bytes: number;
  storage_id: string;
};

// جدول files_approval (محتاج موافقة مدير)
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

export type FileKind = "file" | "approval";

export type UnifiedFile = {
  kind: FileKind;
  id: number;
  name: string;
  url: string;
  size_bytes: number | null;
  mime_type: string | null;
  status: FileApprovalStatus | null; // null لو kind === "file"
  created_at: string;
  users_id: string;
  user_name?: string | null; // موجود بس لصفحة المدير
};

function plainToUnified(row: PlainFileRow, userName?: string | null): UnifiedFile {
  return {
    kind: "file",
    id: row.id,
    name: row.name,
    url: row.file_path,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    status: null,
    created_at: row.created_at,
    users_id: row.users_id,
    user_name: userName ?? null,
  };
}

function approvalToUnified(row: FileApprovalRow, userName?: string | null): UnifiedFile {
  return {
    kind: "approval",
    id: row.id,
    name: row.file_name,
    url: row.file_url,
    size_bytes: null,
    mime_type: null,
    status: row.status,
    created_at: row.created_at,
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

export const MAX_FILE_SIZE_MB = 10; // حد الرفع العادي (files)
export const MAX_APPROVAL_FILE_SIZE_MB = 50; // حد ملفات الموافقة (files_approval)

/* ------------------------------------------------------------------ */
/*  Employee                                                            */
/* ------------------------------------------------------------------ */

// جلب كل ملفات المستخدم الحالي من الجدولين مع بعض، مرتبة بالأحدث
export async function getMyFiles(): Promise<UnifiedFile[]> {
  const [plainRes, approvalRes] = await Promise.all([
    supabase.from("files").select("*").order("created_at", { ascending: false }),
    supabase.from("files_approval").select("*").order("created_at", { ascending: false }),
  ]);

  if (plainRes.error) throw plainRes.error;
  if (approvalRes.error) throw approvalRes.error;

  const plain = (plainRes.data ?? []).map((r) => plainToUnified(r as PlainFileRow));
  const approval = (approvalRes.data ?? []).map((r) => approvalToUnified(r as FileApprovalRow));

  return [...plain, ...approval].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// رفع ملفات عادية (بدون موافقة) - يدعم أكتر من ملف في نفس الوقت
export async function uploadPlainFiles(files: File[]): Promise<void> {
  const formData = new FormData();
  files.forEach((f) => formData.append("file", f));

  const { data, error } = await supabase.functions.invoke("upload-file", {
    body: formData,
  });

  if (error) throw error;
  if (data?.errors?.length) throw new Error(data.errors.join("، "));
}

// رفع ملف واحد يحتاج موافقة (status يبدأ pending دايمًا)
export async function uploadApprovalFile(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const { data, error } = await supabase.functions.invoke("upload-file-approval", {
    body: formData,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

// تعديل اسم ملف عادي — بدل الاعتماد على RPC (update_file_name) اللي مش
// موجودة في الداتابيز (PGRST202)، بنعدّل الاسم مباشرة في الجدول عن طريق
// الـ supabase client. محتاج RLS يسمح بالـ update على عمود name
// لصاحب الملف أو المدير — لو الصلاحية مش موجودة هيرجع إيرور واضح
// ("permission denied" أو صف فاضي) بدل الإيرور الغامض اللي كان بيطلع.
export async function renamePlainFile(fileId: number, newName: string) {
  const { data, error } = await supabase
    .from("files")
    .update({ name: newName })
    .eq("id", fileId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// بيستخرج المسار الفعلي جوه الـ bucket من رابط الملف العام
// (شكل الرابط: .../object/public/{bucket}/{path})
function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

// حذف ملف/ملفات عادية — بدل الاعتماد على delete-file Edge Function
// (المحجوبة حاليًا بمشكلة CORS)، بنحذف ملف الـ storage الفعلي أولاً ثم
// صف الجدول مباشرة عن طريق الـ supabase client. محتاج RLS/Storage
// policies تسمح بالحذف لصاحب الملف أو المدير.
// ⚠️ ملحوظة: الـ Edge Function الأصلية كانت بترفض حذف ملف "مرتبط بعنصر
// تاني" (زي مرفق تاسك). الحذف المباشر ده مش بيعمل الفحص ده، فلو الملف
// مرتبط بحاجة تانية ممكن يطلع إيرور قيد foreign key بدل رسالة عربي واضحة.
export async function deletePlainFiles(fileIds: number[]) {
  const { data: rows, error: fetchErr } = await supabase
    .from("files")
    .select("id, file_path")
    .in("id", fileIds);
  if (fetchErr) throw fetchErr;

  const paths = (rows ?? [])
    .map((r) => extractStoragePath(r.file_path, "files"))
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    const { error: storageErr } = await supabase.storage.from("files").remove(paths);
    // بنكمل حذف الصفوف حتى لو حذف ملف الـ storage فشل (يمنع بقاء صف يتيم
    // من غير ملف)، بس بنسجل تحذير في الـ console للديباج
    if (storageErr) console.warn("تعذر حذف بعض ملفات الـ storage:", storageErr);
  }

  const { error: deleteErr } = await supabase.from("files").delete().in("id", fileIds);
  if (deleteErr) throw deleteErr;
}

// حذف ملف موافقة — نفس الفكرة، بدل الاعتماد على delete-file-approval
// Edge Function.
export async function deleteApprovalFile(fileId: number) {
  const { data: row, error: fetchErr } = await supabase
    .from("files_approval")
    .select("id, file_url")
    .eq("id", fileId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (row?.file_url) {
    const path = extractStoragePath(row.file_url, "files_approval");
    if (path) {
      const { error: storageErr } = await supabase.storage.from("files_approval").remove([path]);
      if (storageErr) console.warn("تعذر حذف ملف الـ storage:", storageErr);
    }
  }

  const { error: deleteErr } = await supabase.from("files_approval").delete().eq("id", fileId);
  if (deleteErr) throw deleteErr;
}

/* ------------------------------------------------------------------ */
/*  Manager                                                             */
/* ------------------------------------------------------------------ */

// جلب كل ملفات كل الموظفين من الجدولين مع اسم صاحب كل ملف
export async function getAllFiles(): Promise<UnifiedFile[]> {
  const [plainRes, approvalRes] = await Promise.all([
    supabase.from("files").select("*, users:users_id(name)").order("created_at", { ascending: false }),
    supabase.from("files_approval").select("*, users:users_id(name)").order("created_at", { ascending: false }),
  ]);

  if (plainRes.error) throw plainRes.error;
  if (approvalRes.error) throw approvalRes.error;

  const plain = ((plainRes.data ?? []) as unknown as WithUser<PlainFileRow>[]).map((r) =>
    plainToUnified(r, r.users?.name)
  );
  const approval = ((approvalRes.data ?? []) as unknown as WithUser<FileApprovalRow>[]).map((r) =>
    approvalToUnified(r, r.users?.name)
  );

  return [...plain, ...approval].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// مراجعة ملف الموافقة: اعتماد / رفض / طلب تعديل (المدير فقط)
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