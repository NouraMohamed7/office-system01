import { supabase } from "@/lib/supabase/client";

/* ============================================================
   Representatives — جدول representatives + الـ Edge Functions بتاعته
   ⚠️ ده مختلف عن representative_work (تبويب "داش" في صفحة شغل القسم) —
   ده الملف الكامل للمندوب (بيانات + مستندات + صور)
   ============================================================ */

export type Representative = {
  id: number;
  full_name: string;
  supervisor_id: string;
  has_motorcycle: boolean;
  profile_img: string | null;
  identity_front: string | null;
  identity_back: string | null;
  license_front: string | null;
  license_back: string | null;
  country: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  phone_1: string;
  phone_2: string | null;
};

// ⚠️ الباك بيرجع "country" جاهزة من عنده (مش بتتبعت من الفرونت وقت الإنشاء)
// القيم المؤكدة من الدوك: "egypt". القيم التانية دي تخمين — زوّد عليها لو
// اكتشفت قيم تانية فعلية من الداتا.
export const COUNTRY_LABELS: Record<string, { flag: string; name: string }> = {
  egypt: { flag: "🇪🇬", name: "مصر" },
  saudi: { flag: "🇸🇦", name: "السعودية" },
  uae: { flag: "🇦🇪", name: "الإمارات" },
};

export function formatCountry(country: string | null): { flag: string; name: string } {
  if (!country) return { flag: "🌍", name: "غير محدد" };
  return COUNTRY_LABELS[country] ?? { flag: "🌍", name: country };
}

/* ------------------------------------------------------------------ */
/*  Validation + Phone normalization                                  */
/* ------------------------------------------------------------------ */

// المستخدم يقدر يدخل الرقم المصري بالشكل العادي:
// 01098765488
// أو بالشكل الدولي:
// +201098765488
//
// والباك يستقبل دائمًا الشكل الدولي:
// +201098765488

const EG_LOCAL_PHONE_REGEX = /^01[0125][0-9]{8}$/;
const EG_INTERNATIONAL_PHONE_REGEX = /^\+20(1[0125][0-9]{8})$/;

export function normalizeEgyptianPhone(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, "");

  // لو بالفعل بصيغة دولية
  if (EG_INTERNATIONAL_PHONE_REGEX.test(trimmed)) {
    return trimmed;
  }

  // لو بصيغة مصرية محلية
  if (EG_LOCAL_PHONE_REGEX.test(trimmed)) {
    return `+20${trimmed.slice(1)}`;
  }

  // نرجع القيمة كما هي علشان الـ validation هو اللي يطلع الرسالة
  return trimmed;
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/\s+/g, "");

  if (!trimmed) {
    return "رقم الهاتف مطلوب";
  }

  const normalized = normalizeEgyptianPhone(trimmed);

  if (!EG_INTERNATIONAL_PHONE_REGEX.test(normalized)) {
    return "رقم الهاتف لازم يكون رقم مصري صحيح مثل 01098765488";
  }

  return null;
}

export function validateOptionalPhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/\s+/g, "");

  if (!trimmed) {
    return null;
  }

  const normalized = normalizeEgyptianPhone(trimmed);

  if (!EG_INTERNATIONAL_PHONE_REGEX.test(normalized)) {
    return "رقم الهاتف لازم يكون رقم مصري صحيح مثل 01098765488";
  }

  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "الاسم مطلوب";
  if (trimmed.length < 3) return "الاسم لازم يكون 3 حروف على الأقل";
  if (trimmed.length > 100) return "الاسم طويل أوي (100 حرف كحد أقصى)";
  return null;
}

export const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "نوع الملف لازم يكون صورة (JPG, PNG أو WEBP)";
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `حجم الصورة أكبر من ${MAX_IMAGE_SIZE_MB} ميجابايت`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Read                                                                */
/* ------------------------------------------------------------------ */

export async function getRepresentatives(): Promise<Representative[]> {
  const { data, error } = await supabase
    .from("representatives")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type SupervisorOption = {
  id: string;
  name: string;
};

// ⚠️ مفيش عمود واضح في users_with_email بيقول "مدير/موظف" (فيه بس role_id
// رقمي). فعارض هنا كل المستخدمين كخيارات مشرف. لو عايز تقصرها على
// المديرين بس، محتاج تفلتر بـ role_id بعد ما تعرف قيمته الفعلية للمدير،
// أو تضيف عمود/RPC مخصص من الباك.
export async function getSupervisorOptions(): Promise<SupervisorOption[]> {
  const { data, error } = await supabase
    .from("users_with_email")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((u: { id: string; name: string | null }) => ({
    id: u.id,
    name: u.name ?? "بدون اسم",
  }));
}

/* ------------------------------------------------------------------ */
/*  Create / Update — multipart FormData عبر Edge Functions            */
/* ------------------------------------------------------------------ */

export type RepresentativeInput = {
  full_name?: string;
  supervisor_id?: string;
  has_motorcycle?: boolean;
  phone1?: string;
  phone2?: string;
  profileImg?: File | null;
  identityFront?: File | null;
  identityBack?: File | null;
  licenseFront?: File | null;
  licenseBack?: File | null;
};

function buildRepFormData(input: RepresentativeInput): FormData {
  const fd = new FormData();

  if (input.full_name !== undefined) {
    fd.append("full_name", input.full_name);
  }

  if (input.supervisor_id !== undefined) {
    fd.append("supervisor_id", input.supervisor_id);
  }

  if (input.has_motorcycle !== undefined) {
    fd.append("has_motorcycle", String(input.has_motorcycle));
  }

  // تحويل أرقام الموبايل تلقائيًا للصيغة الدولية قبل إرسالها للباك
  if (input.phone1?.trim()) {
    fd.append("phone_numbers", normalizeEgyptianPhone(input.phone1));
  }

  if (input.phone2?.trim()) {
    fd.append("phone_numbers", normalizeEgyptianPhone(input.phone2));
  }

  if (input.profileImg) {
    fd.append("profile_img", input.profileImg);
  }

  if (input.identityFront) {
    fd.append("identity_front", input.identityFront);
  }

  if (input.identityBack) {
    fd.append("identity_back", input.identityBack);
  }

  if (input.licenseFront) {
    fd.append("license_front", input.licenseFront);
  }

  if (input.licenseBack) {
    fd.append("license_back", input.licenseBack);
  }

  return fd;
}

type EdgeFunctionResult = { representative?: Representative; error?: string; message?: string };

export async function createRepresentative(input: RepresentativeInput): Promise<Representative> {
  const formData = buildRepFormData(input);
  const { data, error } = await supabase.functions.invoke<EdgeFunctionResult>(
    "create_representative",
    { body: formData }
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.representative) throw new Error("لم يتم استلام بيانات المندوب من الباك");
  return data.representative;
}

export type RepresentativeUpdateInput = RepresentativeInput & { rep_id: number };

export async function updateRepresentative(input: RepresentativeUpdateInput): Promise<Representative> {
  const { rep_id, ...rest } = input;
  const formData = buildRepFormData(rest);
  formData.append("rep_id", String(rep_id));
  const { data, error } = await supabase.functions.invoke<EdgeFunctionResult>(
    "update-representative",
    { body: formData }
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.representative) throw new Error("لم يتم استلام بيانات المندوب من الباك");
  return data.representative;
}

/* ------------------------------------------------------------------ */
/*  Delete                                                              */
/* ------------------------------------------------------------------ */

export async function deleteRepresentative(repId: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ message?: string; error?: string }>(
    "delete_representative",
    { body: { rep_id: repId } }
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

/* ------------------------------------------------------------------ */
/*  Current user helper — نحدد صلاحية التعديل/الحذف بيها:              */
/*  مسموح لصاحب المندوب (created_by) أو المشرف عليه (supervisor_id) بس */
/* ------------------------------------------------------------------ */

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function canManageRepresentative(rep: Representative, currentUserId: string | null): boolean {
  if (!currentUserId) return false;
  return rep.created_by === currentUserId || rep.supervisor_id === currentUserId;
}