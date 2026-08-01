import { supabase } from '@/lib/supabase/client'

const TABLE_NAME = 'department'

// جلب كل الأقسام
export async function getDepartments() {
  const { data, error } = await supabase.from(TABLE_NAME).select('*')
  if (error) throw error
  return data
}

// إضافة قسم جديد (Manager فقط - هيرجع خطأ 403 لو مش مدير، الحماية جوه Supabase)
export async function createDepartment(name: string) {
  const { data, error } = await supabase.from(TABLE_NAME).insert({ name })
  if (error) throw error
  return data
}