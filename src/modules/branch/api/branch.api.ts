import { supabase } from '@/lib/supabase/client'

export type Branch = {
  id: number
  city: string
  country: string
  address?: string
}

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branch')
    .select('*')
  if (error) throw error
  return data
}