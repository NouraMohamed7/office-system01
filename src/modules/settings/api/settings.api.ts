// src/modules/settings/api/settings.api.ts
import { supabase } from '@/lib/supabase/client'

// ---------------- إعدادات الإشعارات (notify_settings) ----------------

export interface MyNotifySettings {
  id: number
  system_notify: boolean
  attendance_notify: boolean
  task_notify: boolean
  cash_notify: boolean
  report_notify: boolean
}

// ⚠️ notify_settings مربوط بـ manager_id بس حسب الدوك — الصفحة دي لصفحة المدير فقط
export async function getMyNotifySettings(): Promise<MyNotifySettings | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const authUser = authData?.user
  if (!authUser) return null

  const { data, error } = await supabase
    .from('notify_settings')
    .select('id, system_notify, attendance_notify, task_notify, cash_notify, report_notify')
    .eq('manager_id', authUser.id)
    .maybeSingle()

  if (error) throw error
  return data as MyNotifySettings | null
}

export async function updateMyNotifySettings(
  patch: Partial<Omit<MyNotifySettings, 'id'>>
): Promise<MyNotifySettings> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const authUser = authData?.user
  if (!authUser) throw new Error('لازم تسجل الدخول الأول')

  const { data, error } = await supabase
    .from('notify_settings')
    .update(patch)
    .eq('manager_id', authUser.id)
    .select('id, system_notify, attendance_notify, task_notify, cash_notify, report_notify')
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('مفيش إعدادات إشعارات لحسابك بعد — لازم تتأكد مع الباك إند')
  }

  return data as MyNotifySettings
}

// ---------------- الأمان (تغيير الباسورد + تسجيل الخروج من كل الأجهزة) ----------------

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const email = authData?.user?.email
  if (!email) throw new Error('تعذر التحقق من بريدك الإلكتروني')

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthError) throw new Error('كلمة المرور الحالية غير صحيحة')

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw updateError
}

export async function signOutEverywhere(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) throw error
}