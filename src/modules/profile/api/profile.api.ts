// src/modules/profile/api/profile.api.ts
import { supabase } from '@/lib/supabase/client'
import type {
  PersonRow,
  DepartmentRecord,
  PositionRecord,
  BranchRecord,
  PhoneRecord,
  UserRecord,
} from '@/types/user'

const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/
const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/

// ⚠️ الأرقام في القاعدة متخزنة بصيغة دولية (+20xxxxxxxxxx / +966xxxxxxxxx)
// بينما regex مصر بتتوقع صيغة محلية (01xxxxxxxxx) — الفنكشن دي بتحوّل أي صيغة
// دولية (+20 / 0020 / +966 / 00966) لصيغة محلية تبدأ بـ 0 قبل ما نطابقها.
function toLocalPhone(raw: string): string {
  let v = raw.replace(/[\s-]/g, '')
  if (v.startsWith('+20')) v = '0' + v.slice(3)
  else if (v.startsWith('0020')) v = '0' + v.slice(4)
  else if (v.startsWith('+966')) v = '0' + v.slice(4)
  else if (v.startsWith('00966')) v = '0' + v.slice(5)
  return v
}

function classifyPhones(numbers: string[]): { personalPhone: string; workPhone: string; saudiPhone: string } {
  const normalized = numbers.map(toLocalPhone)
  const saudi = normalized.find((n) => SAUDI_PHONE_RE.test(n)) ?? ''
  const egyptians = normalized.filter((n) => EGYPT_PHONE_RE.test(n))
  return {
    personalPhone: egyptians[0] ?? '',
    workPhone: egyptians[1] ?? '',
    saudiPhone: saudi,
  }
}

export type MyProfile = PersonRow

// بيرجع بيانات المستخدم اللي عامل login حاليًا (auth.getUser + جدول users)
export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const authUser = authData?.user
  if (!authUser) return null

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError) throw userError
  if (!user) return null

  const u = user as UserRecord

  const [
    { data: department, error: deptError },
    { data: position, error: posError },
    { data: branch, error: branchError },
    { data: phones, error: phoneError },
  ] = await Promise.all([
    u.department_id
      ? supabase.from('department').select('*').eq('id', u.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    u.position_id
      ? supabase.from('position').select('*').eq('id', u.position_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    u.branch_id
      ? supabase.from('branch').select('*').eq('id', u.branch_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('phone').select('*').eq('users_id', authUser.id),
  ])

  if (deptError) throw deptError
  if (posError) throw posError
  if (branchError) throw branchError
  if (phoneError) throw phoneError

  const numbers = ((phones || []) as PhoneRecord[]).map((p) => p.number)
  const { personalPhone, workPhone, saudiPhone } = classifyPhones(numbers)

  return {
    id: u.id,
    // ⚠️ جدول users مفيهوش عمود email — بنرجعه من auth.getUser() بس
    full_name: u.name ?? '',
    email: u.email ?? authUser.email ?? '',
    emp_status: u.emp_status ?? 'نشط',
    department: (department as DepartmentRecord) ?? null,
    position: (position as PositionRecord) ?? null,
    branch: (branch as BranchRecord) ?? null,
    personalPhone,
    workPhone,
    saudiPhone,
    // ⚠️ الـ photo_url ثابت الشكل (مبني من user_id) وبيتغيّر محتواه بس بدون
    // تغيّر اللينك نفسه، فلو مضفناش cache-buster المتصفح هيفضل يورّي النسخة
    // القديمة اللي كاشها من زيارة سابقة، حتى لو الباك فعليًا خزّن الصورة الجديدة.
    photo_url: u.photo_url ? `${u.photo_url}?v=${encodeURIComponent(u.updated_at ?? '')}` : null,
    created_at: u.created_at,
  }
}

// ⚠️ update-user موثّق كـ "manager only" وبيتعدل بيه بيانات موظف تاني بالـ user_id.
// هنا بنستخدمه على user_id الخاص بالمدير نفسه.
// ⚠️ الـ Edge Function دي بتتطلب multipart/form-data دايمًا (حتى من غير صورة)،
// فمينفعش نبعت JSON عادي — لازم FormData في كل الحالات.
export async function updateMyProfile(patch: {
  name?: string
  photo?: File | null
}): Promise<MyProfile> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const authUser = authData?.user
  if (!authUser) throw new Error('لازم تسجل الدخول الأول')

  if (!patch.name && !patch.photo) {
    throw new Error('مفيش تعديلات لحفظها')
  }

  const formData = new FormData()
  formData.append('user_id', authUser.id)
  if (patch.name) formData.append('name', patch.name)
  if (patch.photo) formData.append('photo', patch.photo)

  const { data, error } = await supabase.functions.invoke('update-user', {
    body: formData,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)

  // نرجع نجيب البروفايل كامل تاني عشان نضمن التزامن (بيانات القسم/الوظيفة/الأرقام)
  const refreshed = await getMyProfile()
  if (!refreshed) throw new Error('تعذر تحميل بياناتك بعد الحفظ')
  return refreshed
}