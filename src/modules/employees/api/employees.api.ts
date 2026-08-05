import { supabase } from '@/lib/supabase/client'

export type EmployeeRow = {
  id: string
  full_name: string
  email: string
  emp_status: string
  department: { id: number; name: string } | null
  position: { id: number; title: string } | null
  branch: { id: number; city: string; country?: string; address?: string | null } | null
  personalPhone: string
  workPhone: string
  saudiPhone: string
  created_at?: string
}

type DepartmentRecord = { id: number; name: string }
type PositionRecord = { id: number; title: string }
type BranchRecord = { id: number; city: string; country?: string; address?: string | null }
type PhoneRecord = { id: number; number: string; is_primary: boolean; users_id: string }

type UserRecord = {
  id: string
  name?: string
  email?: string
  emp_status?: string
  department_id?: number
  position_id?: number
  branch_id?: number
  created_at?: string
}

const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/
const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/

function classifyPhones(numbers: string[]): { personalPhone: string; workPhone: string; saudiPhone: string } {
  const saudi = numbers.find((n) => SAUDI_PHONE_RE.test(n)) ?? ''
  const egyptians = numbers.filter((n) => EGYPT_PHONE_RE.test(n))
  return {
    personalPhone: egyptians[0] ?? '',
    workPhone: egyptians[1] ?? '',
    saudiPhone: saudi,
  }
}

async function getPhonesByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (userIds.length === 0) return map

  const { data, error } = await supabase
    .from('phone')
    .select('*')
    .in('users_id', userIds)
    .order('is_primary', { ascending: false })

  if (error) throw error

  const phones = (data || []) as PhoneRecord[]
  for (const p of phones) {
    const list = map.get(p.users_id) ?? []
    list.push(p.number)
    map.set(p.users_id, list)
  }
  return map
}

export async function getEmployees(): Promise<EmployeeRow[]> {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')

  if (usersError) {
    console.error('خطأ في جلب users - التفاصيل الكاملة:', {
      message: usersError.message,
      code: usersError.code,
      details: usersError.details,
      hint: usersError.hint,
    })
    throw new Error(usersError.message || 'فشل الاتصال بجدول users')
  }

  const usersList = (users || []) as UserRecord[]

  const [
    { data: departments, error: deptError },
    { data: positions, error: posError },
    { data: branches, error: branchError },
    phonesByUser,
  ] = await Promise.all([
    supabase.from('department').select('*'),
    supabase.from('position').select('*'),
    supabase.from('branch').select('*'),
    getPhonesByUserIds(usersList.map((u) => u.id)),
  ])

  if (deptError) throw deptError
  if (posError) throw posError
  if (branchError) throw branchError

  const departmentsList = (departments || []) as DepartmentRecord[]
  const positionsList = (positions || []) as PositionRecord[]
  const branchesList = (branches || []) as BranchRecord[]

  const mapped: EmployeeRow[] = usersList.map((u) => {
    const { personalPhone, workPhone, saudiPhone } = classifyPhones(phonesByUser.get(u.id) ?? [])
    return {
      id: u.id,
      full_name: u.name ?? '',
      email: u.email ?? '',
      emp_status: u.emp_status ?? 'نشط',
      department: departmentsList.find((d) => d.id === u.department_id) ?? null,
      position: positionsList.find((p) => p.id === u.position_id) ?? null,
      branch: branchesList.find((b) => b.id === u.branch_id) ?? null,
      personalPhone,
      workPhone,
      saudiPhone,
      created_at: u.created_at,
    }
  })

  return mapped
}

export async function getEmployeeById(id: string): Promise<EmployeeRow | null> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (userError) throw userError
  if (!user) return null

  const u = user as UserRecord

  const [
    { data: department, error: deptError },
    { data: position, error: posError },
    { data: branch, error: branchError },
    phonesByUser,
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
    getPhonesByUserIds([u.id]),
  ])

  if (deptError) throw deptError
  if (posError) throw posError
  if (branchError) throw branchError

  const { personalPhone, workPhone, saudiPhone } = classifyPhones(phonesByUser.get(u.id) ?? [])

  return {
    id: u.id,
    full_name: u.name ?? '',
    email: u.email ?? '',
    emp_status: u.emp_status ?? 'نشط',
    department: (department as DepartmentRecord) ?? null,
    position: (position as PositionRecord) ?? null,
    branch: (branch as BranchRecord) ?? null,
    personalPhone,
    workPhone,
    saudiPhone,
    created_at: u.created_at,
  }
}

// تحويل الأرقام المحلية لصيغة دولية (+20 لمصر, +966 للسعودية) زي ما الباك بيطلب
function toInternationalPhone(local: string): string {
  const digits = local.replace(/\D/g, '') // شيل أي حروف غير أرقام

  // مصري: بيبدأ بـ 01 وطوله 11 رقم
  if (/^01[0125][0-9]{8}$/.test(digits)) {
    return `+20${digits.slice(1)}` // نشيل الصفر الأول ونضيف +20
  }

  // سعودي: بيبدأ بـ 05 وطوله 10 أرقام
  if (/^05[0-9]{8}$/.test(digits)) {
    return `+966${digits.slice(1)}`
  }

  // سعودي مكتوب من غير الصفر (5xxxxxxxx)
  if (/^5[0-9]{8}$/.test(digits)) {
    return `+966${digits}`
  }

  // لو أصلاً فيه + أو الرقم مش متعرف عليه، رجّعه زي ما هو
  return local.startsWith('+') ? local : `+${digits}`
}

// إضافة موظف جديد عن طريق Edge Function بتاعت الباك — form-data
export async function createEmployee(payload: {
  full_name: string
  email: string
  password: string
  phone_numbers: string[]
  department_id: number
  position_id: number
  branch_id: number
  photo?: File | null
}) {
  const formData = new FormData()
  formData.append('name', payload.full_name)
  formData.append('email', payload.email)
  formData.append('password', payload.password)
  formData.append('department_id', String(payload.department_id))
  formData.append('position_id', String(payload.position_id))
  formData.append('branch_id', String(payload.branch_id))

  payload.phone_numbers.forEach((phone) => {
    formData.append('phone_numbers', toInternationalPhone(phone))
  })

  if (payload.photo) {
    formData.append('photo', payload.photo)
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: formData,
  })

  if (error) {
    console.error('خطأ في إضافة الموظف:', error)
    throw error
  }

  return data
}