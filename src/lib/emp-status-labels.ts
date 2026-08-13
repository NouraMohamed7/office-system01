// src/lib/emp-status-labels.ts
//
// public.emp_status enum الحقيقي في الباك (القيم دي بالظبط بتتخزن في العمود):
//   on_leave, resigned, suspended, pending, active
//
// ⚠️ أي نص عربي ("نشط", "موقوف"...) هو label للعرض بس — لازم دايمًا
// نبعت/نستقبل من الباك القيمة الإنجليزية، ونحوّلها لعربي في الواجهة فقط.
// ده كان سبب Issue "تعطيل الحساب" — الكود القديم كان بيبعت "inactive"
// اللي مش موجودة في الـ enum خالص.

export type EmpStatus = "active" | "on_leave" | "suspended" | "resigned" | "pending";

export type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";

export const EMP_STATUS_LABEL_AR: Record<EmpStatus, string> = {
  active: "نشط",
  on_leave: "في إجازة",
  suspended: "موقوف",
  resigned: "مستقيل",
  pending: "معلّق",
};

export const EMP_STATUS_TONE: Record<EmpStatus, Tone> = {
  active: "success",
  on_leave: "teal",
  suspended: "warning",
  resigned: "danger",
  pending: "muted",
};

export const EMP_STATUS_OPTIONS: EmpStatus[] = [
  "active",
  "on_leave",
  "suspended",
  "resigned",
  "pending",
];

/** أي قيمة غريبة/undefined راجعة من الباك بتقع هنا بدل ما تكسر الواجهة */
export function normalizeEmpStatus(raw: string | null | undefined): EmpStatus {
  if (raw && (EMP_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as EmpStatus;
  }
  return "active";
}