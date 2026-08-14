// src/modules/library/api/library.api.ts
import { supabase } from "@/lib/supabase/client";
import type { LibraryDepartment, LibraryContentType, LibraryItem } from "@/types/library";

/** يقرأ رسالة الخطأ الحقيقية اللي بترجع من الـ Edge Function (body.error) */
async function extractFunctionError(error: unknown, fallback: string): Promise<string> {
  const err = error as { context?: Response; message?: string } | null;
  if (err?.context && typeof err.context.json === "function") {
    try {
      const body = await err.context.json();
      if (body?.error) return body.error as string;
    } catch {
      /* تجاهل، هنستخدم fallback */
    }
  }
  return err?.message ?? fallback;
}

/* -------------------------------------------------------------------- */
/*  Read                                                                  */
/* -------------------------------------------------------------------- */

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from("library")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as LibraryItem[];
}

/** خريطة id -> name لعرض اسم اللي أضاف المحتوى (created_by) */
export async function fetchUsersNameMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("users_with_email").select("id,name");
  if (error) throw new Error(error.message);

  const map: Record<string, string> = {};
  (data ?? []).forEach((u: { id: string; name: string | null }) => {
    map[u.id] = u.name ?? "";
  });
  return map;
}

/* -------------------------------------------------------------------- */
/*  Create                                                                */
/* -------------------------------------------------------------------- */

export interface CreateLibraryPayload {
  title: string;
  name: string;
  department: LibraryDepartment;
  content: LibraryContentType;
  description?: string;
  link?: string;
  file?: File | null;
}

export async function createLibraryItem(
  payload: CreateLibraryPayload
): Promise<{ message: string; library: LibraryItem }> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("name", payload.name);
  formData.append("department", payload.department);
  formData.append("content", payload.content);
  if (payload.description) formData.append("description", payload.description);
  if (payload.link) formData.append("link", payload.link);
  if (payload.file) formData.append("file", payload.file);

  const { data, error } = await supabase.functions.invoke("create_library", {
    body: formData,
  });

  if (error) {
    throw new Error(await extractFunctionError(error, "تعذر إنشاء العنصر"));
  }
  return data as { message: string; library: LibraryItem };
}

/* -------------------------------------------------------------------- */
/*  Update                                                                */
/* -------------------------------------------------------------------- */

export interface UpdateLibraryPayload {
  library_id: number;
  title: string;
  name: string;
  department: LibraryDepartment;
  content: LibraryContentType;
  description?: string;
  link?: string;
  file?: File | null;
}

export async function updateLibraryItem(
  payload: UpdateLibraryPayload
): Promise<{ message: string; library: LibraryItem }> {
  const formData = new FormData();
  formData.append("library_id", String(payload.library_id));
  formData.append("title", payload.title);
  formData.append("name", payload.name);
  formData.append("department", payload.department);
  formData.append("content", payload.content);
  formData.append("description", payload.description ?? "");
  if (payload.link) formData.append("link", payload.link);
  if (payload.file) formData.append("file", payload.file);

  const { data, error } = await supabase.functions.invoke("update-library", {
    body: formData,
  });

  if (error) {
    throw new Error(await extractFunctionError(error, "تعذر تعديل العنصر"));
  }
  return data as { message: string; library: LibraryItem };
}

/* -------------------------------------------------------------------- */
/*  Delete                                                                */
/* -------------------------------------------------------------------- */

export async function deleteLibraryItem(library_id: number): Promise<{ message: string }> {
  const { data, error } = await supabase.functions.invoke("delete-library", {
    body: { library_id },
  });

  if (error) {
    throw new Error(await extractFunctionError(error, "تعذر حذف العنصر"));
  }
  return data as { message: string };
}