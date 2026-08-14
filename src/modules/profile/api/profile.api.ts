// src/modules/profile/api/profile.api.ts
import { supabase } from "@/lib/supabase/client";
import type {
  PersonRow,
  DepartmentRecord,
  PositionRecord,
  BranchRecord,
  PhoneRecord,
  UserRecord,
} from "@/types/user";

const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;
const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/;

function toLocalPhone(raw: string): string {
  let v = raw.replace(/[\s-]/g, "");
  if (v.startsWith("+20")) v = "0" + v.slice(3);
  else if (v.startsWith("0020")) v = "0" + v.slice(4);
  else if (v.startsWith("+966")) v = "0" + v.slice(4);
  else if (v.startsWith("00966")) v = "0" + v.slice(5);
  return v;
}

function classifyPhones(numbers: string[]): {
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
} {
  const normalized = numbers.map(toLocalPhone);
  const saudi = normalized.find((n) => SAUDI_PHONE_RE.test(n)) ?? "";
  const egyptians = normalized.filter((n) => EGYPT_PHONE_RE.test(n));
  return {
    personalPhone: egyptians[0] ?? "",
    workPhone: egyptians[1] ?? "",
    saudiPhone: saudi,
  };
}

export type MyProfile = PersonRow;

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const authUser = authData?.user;
  if (!authUser) return null;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (userError) throw userError;
  if (!user) return null;

  const u = user as UserRecord;

  const [
    { data: department, error: deptError },
    { data: position, error: posError },
    { data: branch, error: branchError },
    { data: phones, error: phoneError },
  ] = await Promise.all([
    u.department_id
      ? supabase.from("department").select("*").eq("id", u.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    u.position_id
      ? supabase.from("position").select("*").eq("id", u.position_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    u.branch_id
      ? supabase.from("branch").select("*").eq("id", u.branch_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("phone").select("*").eq("users_id", authUser.id),
  ]);

  if (deptError) throw deptError;
  if (posError) throw posError;
  if (branchError) throw branchError;
  if (phoneError) throw phoneError;

  const numbers = ((phones || []) as PhoneRecord[]).map((p) => p.number);
  const { personalPhone, workPhone, saudiPhone } = classifyPhones(numbers);

  return {
    id: u.id,
    full_name: u.name ?? "",
    email: u.email ?? authUser.email ?? "",
    emp_status: u.emp_status ?? "نشط",
    department: (department as DepartmentRecord) ?? null,
    position: (position as PositionRecord) ?? null,
    branch: (branch as BranchRecord) ?? null,
    personalPhone,
    workPhone,
    saudiPhone,
    // ⚠️ cache-busting دايمًا مهم هنا لأن الـ storage_id/الـ path بيفضل ثابت
    // للمستخدم نفسه (avatar/{user_id}.png) — التاريخ بيضمن إن المتصفح يجيب
    // النسخة الجديدة بعد كل تحديث، حتى لو الـ URL نفسه متكرر.
    photo_url: u.photo_url ? `${u.photo_url}?v=${Date.now()}` : null,
    created_at: u.created_at,
  };
}

// ⚠️ مطابق تمامًا لمثال الـ Postman الناجح "user > update":
// FormData فيها user_id (نص) + photo (ملف). بيانات تانية زي name أو
// department_id اختيارية وبتتبعت كنص برضه لو موجودة — مفيش JSON هنا خالص.
export async function updateMyProfile(patch: {
  name?: string;
  photo?: File | null;
}): Promise<MyProfile> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const authUser = authData?.user;
  if (!authUser) throw new Error("لازم تسجل الدخول الأول");

  if (!patch.name && !patch.photo) {
    throw new Error("مفيش تعديلات لحفظها");
  }

  const formData = new FormData();
  formData.append("user_id", authUser.id);
  if (patch.name) formData.append("name", patch.name);
  if (patch.photo) formData.append("photo", patch.photo, patch.photo.name);

  const { data, error } = await supabase.functions.invoke("update-user", {
    body: formData,
    // ⚠️ لا تحط Content-Type يدوي هنا — المتصفح لازم يحدد الـ boundary
    // بنفسه لما بيبعت FormData، لو حطيناه يدوي الرفع هيفشل بصمت.
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const refreshed = await getMyProfile();
  if (!refreshed) throw new Error("تعذر تحميل بياناتك بعد الحفظ");
  return refreshed;
}