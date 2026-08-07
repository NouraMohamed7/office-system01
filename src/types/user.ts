// src/types/user.ts
// Types مشتركة بين الموديولات اللي بتتعامل مع بيانات المستخدم/الموظف
// (employees + profile) — مطابقة لجداول users / department / position / branch / phone في الباك

export type EmpStatus = string
// ⚠️ enum "public.emp_status" في الباك — القيم المؤكدة من الدوك: "نشط", "موقوف"
// باقي الحالات (في إجازة/متأخر/غائب) دي منطق فرونت حاليًا مش مربوط بعمود emp_status نفسه

export type DepartmentRecord = {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

export type PositionRecord = {
  id: number
  title: string
  created_at?: string
  updated_at?: string
}

export type BranchRecord = {
  id: number
  city: string
  country?: string
  address?: string | null
  created_at?: string
  updated_at?: string
}

export type PhoneRecord = {
  id: number
  number: string
  is_primary: boolean
  users_id: string
  created_at?: string
  updated_at?: string
}

export type UserRecord = {
  id: string
  name?: string
  email?: string
  emp_status?: EmpStatus
  department_id?: number
  position_id?: number
  branch_id?: number
  photo_url?: string | null
  created_at?: string
}

// شكل موحّد بعد دمج user + department + position + branch + phones
// (ده اللي بترجعه employees.api.ts و profile.api.ts الاتنين)
export type PersonRow = {
  id: string
  full_name: string
  email: string
  emp_status: EmpStatus
  department: DepartmentRecord | null
  position: PositionRecord | null
  branch: BranchRecord | null
  personalPhone: string
  workPhone: string
  saudiPhone: string
  photo_url?: string | null
  created_at?: string
}