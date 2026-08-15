// src/modules/position/api/position.api.ts
import { supabase } from '@/lib/supabase/client'

export type Position = {
  id: number
  title: string
  created_at?: string
  updated_at?: string
}

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('position')
    .select('*')
    .order('title', { ascending: true })
  if (error) throw error
  return data as Position[]
}

export async function createPosition(title: string): Promise<Position> {
  const { data, error } = await supabase
    .from('position')
    .insert({ title })
    .select()
    .single()
  if (error) throw error
  return data as Position
}

export async function updatePosition(id: number, title: string): Promise<Position> {
  const { data, error } = await supabase
    .from('position')
    .update({ title })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Position
}

export async function deletePosition(id: number): Promise<void> {
  const { error } = await supabase.from('position').delete().eq('id', id)
  if (error) throw error
}