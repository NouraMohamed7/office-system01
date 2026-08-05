import { supabase } from '@/lib/supabase/client'

export type Position = {
  id: number
  title: string
}

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('position')
    .select('*')
  if (error) throw error
  return data
}