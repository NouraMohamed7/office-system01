// src/modules/department/api/department.api.ts
import { supabase } from '@/lib/supabase/client'

export type Department = {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

// أي مستخدم مسجل دخول يقدر يقرأ (يظهر في الـ dropdowns)
export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('department')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data as Department[]
}

// مدير فقط — الباك إند بيفرض ده عن طريق RLS، لو حد تاني حاول هياخد 403/RLS error
export async function createDepartment(name: string): Promise<Department> {
  const { data, error } = await supabase
    .from('department')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data as Department
}

export async function updateDepartment(id: number, name: string): Promise<Department> {
  const { data, error } = await supabase
    .from('department')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Department
}

// ⚠️ لو فيه موظفين أو تاسكات مرتبطة بالقسم ده، ممكن يفشل بـ foreign key constraint
// من الداتابيز نفسها — لازم تتأكد مع الباك هل عندهم ON DELETE SET NULL / CASCADE
export async function deleteDepartment(id: number): Promise<void> {
  const { error } = await supabase.from('department').delete().eq('id', id)
  if (error) throw error
}