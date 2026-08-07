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

// ⚠️ الأرقام في قاعدة البيانات متخزنة بصيغة دولية (+20xxxxxxxxxx / +966xxxxxxxxx)
// بينما الـ regex بتاعة مصر بتتوقع صيغة محلية (01xxxxxxxxx).
// الفنكشن دي بتحوّل أي صيغة دولية (+20 / 0020 / +966 / 00966) لصيغة محلية تبدأ بـ 0
// قبل ما نطابقها، عشان التصنيف يشتغل صح مهما كانت الصيغة المخزنة.
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
    // ⚠️ جدول users مفيهوش عمود email — بنرجع إيميل المستخدم الحالي بس من auth.getUser()
    full_name: u.name ?? '',
    email: u.email ?? authUser.email ?? '',
    emp_status: u.emp_status ?? 'نشط',
    department: (department as DepartmentRecord) ?? null,
    position: (position as PositionRecord) ?? null,
    branch: (branch as BranchRecord) ?? null,
    personalPhone,
    workPhone,
    saudiPhone,
    photo_url: u.photo_url ?? null,
    created_at: u.created_at,
  }
}

// ⚠️ ملحوظة: عمود "المدير المباشر" (manager) مش موجود في جدول users حسب الدوك،
// فمقدرش أجيبه من الباك دلوقتي — الحقل ده مشال من صفحة البروفايل لحد ما الباك يضيفه.