import { supabase } from '@/lib/supabase/client'

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signInWithOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
  return data
}

export async function resetPasswordForEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUserRole(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('users_with_email')
    .select('role_id')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data?.role_id ?? null
}