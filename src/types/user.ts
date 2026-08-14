// src/types/user.ts
/**
 * User/Employee types shared across modules.
 * These map to: users, department, position, branch, phone tables.
 * Used by: employees module, profile module, and general employee lookups.
 */

/**
 * Employee employment status.
 * Maps to public.emp_status enum in the database.
 * 
 * ⚠️ **Backend Documentation**: The confirmed enum values are "نشط" (active) and "موقوف" (suspended).
 * Other states (on_leave, late, absent) are currently frontend-only logic
 * and not directly tied to the emp_status column.
 */
export type EmpStatus = string;

/**
 * Department record.
 * Database source: public.department
 */
export type DepartmentRecord = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Job position/title record.
 * Database source: public.position
 */
export type PositionRecord = {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Branch/location record.
 * Database source: public.branch
 */
export type BranchRecord = {
  id: number;
  city: string;
  country?: string;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Phone number record associated with an employee.
 * Database source: public.phone
 */
export type PhoneRecord = {
  id: number;
  number: string;
  is_primary: boolean;
  users_id: string;
  created_at?: string;
  updated_at?: string;
};

export type UserRecord = {
  id: string;
  name?: string;
  email?: string;
  emp_status?: EmpStatus;
  department_id?: number;
  position_id?: number;
  branch_id?: number;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Complete employee profile combining user data with related entities.
 * This is the unified shape returned by employees.api.ts and profile.api.ts
 * after joining: users + department + position + branch + phones.
 * 
 * Used throughout employee listing, profile pages, and detail views.
 * 
 * Database source: Aggregated from public.users, public.department, public.position, public.branch
 */
export type PersonRow = {
  id: string;
  full_name: string;
  email: string;
  emp_status: EmpStatus;
  /** Department record (nullable if employee has no department assigned) */
  department: DepartmentRecord | null;
  /** Position/job title record (nullable if no position assigned) */
  position: PositionRecord | null;
  /** Branch/location record (nullable if no branch assigned) */
  branch: BranchRecord | null;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  photo_url?: string | null;
  created_at?: string;
};