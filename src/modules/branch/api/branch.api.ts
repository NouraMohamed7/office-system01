// src/modules/branch/api/branch.api.ts
import { supabase } from '@/lib/supabase/client'

export type Branch = {
  id: number
  city: string
  country: string
  address?: string | null
  created_at?: string
  updated_at?: string
}

export type BranchInput = {
  city: string
  country: string
  address?: string | null
}

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branch')
    .select('*')
    .order('city', { ascending: true })
  if (error) throw error
  return data as Branch[]
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const { data, error } = await supabase
    .from('branch')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as Branch
}

export async function updateBranch(id: number, input: Partial<BranchInput>): Promise<Branch> {
  const { data, error } = await supabase
    .from('branch')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Branch
}

export async function deleteBranch(id: number): Promise<void> {
  const { error } = await supabase.from('branch').delete().eq('id', id)
  if (error) throw error
}