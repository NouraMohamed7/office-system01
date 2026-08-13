import { supabase } from '@/lib/supabase/client'
import type {
  PersonRow,
  DepartmentRecord,
  PositionRecord,
  BranchRecord,
  PhoneRecord,
  UserRecord,
} from '@/types/user'
import { normalizeEmpStatus, type EmpStatus } from '@/lib/emp-status-labels'
import { toInternationalPhone } from '@/lib/validation/employee-form'

export type EmployeeRow = PersonRow

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

// ------------------------------------------------------------------
// ✅ الفيكس: استخراج رسالة الخطأ الحقيقية من الـ Edge Function.
//
// supabase.functions.invoke() لما الـ Edge Function ترجع status غير 2xx،
// بيرجع FunctionsHttpError واللي error.message بتاعه بيكون نص عام
// ("Edge Function returned a non-2xx status code") مش الرسالة العربية
// الحقيقية من الباك (زي "الإيميل مستخدم بالفعل" أو "هذا الإجراء متاح
// للمدير فقط"). الرسالة الحقيقية موجودة جوه response body، فبنحاول:
//   1) data?.error (لو الـ SDK رجّعها في data برضه)
//   2) error.context.json() (الـ response الحقيقي لـ FunctionsHttpError)
//   3) error.message كـ fallback أخير
// ------------------------------------------------------------------
async function extractErrorMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const msg = (data as Record<string, unknown>).error
    if (typeof msg === 'string' && msg) return msg
  }

  const err = error as { context?: Response; message?: string }
  if (err?.context && typeof err.context.json === 'function') {
    try {
      const body = await err.context.json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error
      }
    } catch {
      // الـ body مش JSON قابل للقراءة (اتقرا قبل كده أو مش JSON أصلاً) — نكمل على fallback
    }
  }

  return err?.message || 'حصل خطأ غير متوقع'
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
    .from('users_with_email')
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
      // ⚠️ جدول users مفيهوش عمود email فعليًا (شايفينه في الـ response اللي وصلنا).
      // الإيميل موجود بس في auth.users، ومفيش صلاحية نجيبه من هنا لمستخدمين تانيين.
      email: u.email ?? '',
      emp_status: normalizeEmpStatus(u.emp_status),
      department: departmentsList.find((d) => d.id === u.department_id) ?? null,
      position: positionsList.find((p) => p.id === u.position_id) ?? null,
      branch: branchesList.find((b) => b.id === u.branch_id) ?? null,
      personalPhone,
      workPhone,
      saudiPhone,
      photo_url: u.photo_url ?? null,
      created_at: u.created_at,
    }
  })

  return mapped
}

export async function getEmployeeById(id: string): Promise<EmployeeRow | null> {
  const { data: user, error: userError } = await supabase
    .from('users_with_email')
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
    emp_status: normalizeEmpStatus(u.emp_status),
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

// إضافة موظف جديد — create-user (form-data)
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
    const message = await extractErrorMessage(error, data)
    console.error('خطأ في إضافة الموظف:', message)
    throw new Error(message)
  }

  return data
}

// تعديل بيانات موظف موجود — update-user (form-data)
// ⚠️ افتراض: نفس حقول create-user من غير email/password، وفيها user_id إجباري.
export async function updateEmployee(payload: {
  user_id: string
  full_name?: string
  phone_numbers?: string[]
  department_id?: number
  position_id?: number
  branch_id?: number
  emp_status?: EmpStatus
  photo?: File | null
}) {
  const formData = new FormData()
  formData.append('user_id', payload.user_id)
  if (payload.full_name) formData.append('name', payload.full_name)
  if (payload.department_id !== undefined) formData.append('department_id', String(payload.department_id))
  if (payload.position_id !== undefined) formData.append('position_id', String(payload.position_id))
  if (payload.branch_id !== undefined) formData.append('branch_id', String(payload.branch_id))
  if (payload.emp_status) formData.append('emp_status', payload.emp_status)

  payload.phone_numbers?.forEach((phone) => {
    formData.append('phone_numbers', toInternationalPhone(phone))
  })

  if (payload.photo) {
    formData.append('photo', payload.photo)
  }

  const { data, error } = await supabase.functions.invoke('update-user', {
    body: formData,
  })

  if (error) {
    const message = await extractErrorMessage(error, data)
    console.error('خطأ في تعديل بيانات الموظف:', message)
    throw new Error(message)
  }

  return data
}

// تفعيل/تعطيل موظف (بيستخدم نفس update-user بحقل emp_status بس)
// ⚠️ لازم قيمة إنجليزية حقيقية من enum public.emp_status
// (active / on_leave / suspended / resigned / pending) — مش "inactive".
export async function updateEmployeeStatus(userId: string, emp_status: EmpStatus) {
  return updateEmployee({ user_id: userId, emp_status })
}

// حذف موظف نهائيًا — delete-user Edge Function (Manager only)
// بيمسح: الملف الشخصي، الهاتف، المهام، الحضور، التقارير، التعليقات،
// الإشعارات، الملفات، وحساب الدخول. غير قابل للتراجع.
export async function deleteEmployee(userId: string): Promise<{ message: string; storage_warnings: string[] }> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: userId },
  })

  if (error) {
    const message = await extractErrorMessage(error, data)
    console.error('خطأ في حذف الموظف:', message)
    throw new Error(message)
  }

  return data
}

// لستة الوظائف والفروع (عشان الـ Select بتاعة الفورم)
export async function getAllPositions(): Promise<PositionRecord[]> {
  const { data, error } = await supabase.from('position').select('*')
  if (error) throw error
  return (data || []) as PositionRecord[]
}

export async function getAllBranches(): Promise<BranchRecord[]> {
  const { data, error } = await supabase.from('branch').select('*')
  if (error) throw error
  return (data || []) as BranchRecord[]
}

// ============================================================
//  Employee Stats — تاسكات / تقارير / ملفات / حضور
// ============================================================

export type EmployeeTaskStats = {
  total: number
  completed: number
  late: number
}

// ⚠️ عمود completion_percent هو المصدر الموثوق لتحديد "مكتملة" (بدل status
// لإن القيم الممكنة لـ public.task_status مش موثقة عندي).
// "متأخرة" = end_date فات وما اكتملتش 100%.
export async function getEmployeeTaskStats(userId: string): Promise<EmployeeTaskStats> {
  const { data, error } = await supabase
    .from('tasks')
    .select('completion_percent, end_date')
    .eq('assigned_to', userId)

  if (error) throw error
  const rows = data || []
  const today = new Date().toISOString().slice(0, 10)

  const total = rows.length
  const completed = rows.filter((t) => (t.completion_percent ?? 0) >= 100).length
  const late = rows.filter(
    (t) => (t.completion_percent ?? 0) < 100 && t.end_date && t.end_date < today
  ).length

  return { total, completed, late }
}

export async function getEmployeeReportsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('daily_reports')
    .select('id', { count: 'exact', head: true })
    .eq('users_id', userId)

  if (error) throw error
  return count ?? 0
}

export async function getEmployeeFilesCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('files')
    .select('id', { count: 'exact', head: true })
    .eq('users_id', userId)

  if (error) throw error
  return count ?? 0
}

export type EmployeeAttendanceStats = {
  presentDays: number
  lateDays: number
}

// ⚠️ عمود status في attendance هو public.attendance_type لكن القيم الممكنة
// (حاضر/غائب/متأخر...؟) مش موثقة عندي، فمعتمدتش عليه.
// "حضور" = عدد صفوف الشهر الحالي (كل صف = يوم حضر فيه فعليًا).
// "تأخير" = late_minutes > 0.
export async function getEmployeeAttendanceStats(userId: string): Promise<EmployeeAttendanceStats> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('attendance')
    .select('late_minutes, attendance_date')
    .eq('users_id', userId)
    .gte('attendance_date', monthStart)
    .lte('attendance_date', monthEnd)

  if (error) throw error
  const rows = data || []

  return {
    presentDays: rows.length,
    lateDays: rows.filter((r) => (r.late_minutes ?? 0) > 0).length,
  }
}