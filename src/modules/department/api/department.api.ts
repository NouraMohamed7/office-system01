import { supabase } from '@/lib/supabase/client' //نجيب الـ Dropdowns الحقيقية (الأقسام، الفروع، الوظائف) من الباك بدل الأسماء الثابتة

export type Department = {
  id: number
  name: string
}

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('department')
    .select('*')
  if (error) throw error
  return data
}