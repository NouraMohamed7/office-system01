// src/lib/validation/employee-form.ts
//
// منطق الفاليديشن المشترك لفورم إضافة/تعديل الموظف.
// كان قبل كده متكرر بقاعدتين مختلفتين بين:
//   - src/app/manager/employees/page.tsx (مودال الليست: أرقام التليفون required + فحص تكرار)
//   - src/app/manager/employees/[id]/page.tsx (مودال البروفايل: أرقام اختيارية + من غير فحص تكرار)
// ده كان بيسمح إن حد يمسح رقم تليفون أو يحط رقم مكرر مع موظف تاني لو دخل
// من صفحة البروفايل بدل الليست. دلوقتي الاتنين بيستخدموا نفس القواعد بالظبط.

export const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;
export const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/;

export function normalizePhone(v: string) {
  return v.replace(/[\s-]/g, "");
}

// تحويل الأرقام المحلية لصيغة دولية (+20 لمصر, +966 للسعودية) زي ما الباك بيطلب
export function toInternationalPhone(local: string): string {
  const digits = local.replace(/\D/g, "");

  if (/^01[0125][0-9]{8}$/.test(digits)) {
    return `+20${digits.slice(1)}`;
  }
  if (/^05[0-9]{8}$/.test(digits)) {
    return `+966${digits.slice(1)}`;
  }
  if (/^5[0-9]{8}$/.test(digits)) {
    return `+966${digits}`;
  }
  return local.startsWith("+") ? local : `+${digits}`;
}

export type EmployeeFormCore = {
  name: string;
  deptId: number | "";
  positionId: number | "";
  branchId: number | "";
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
};

export type EmployeeCoreFieldErrors = Partial<
  Record<
    "name" | "deptId" | "positionId" | "branchId" | "personalPhone" | "workPhone" | "saudiPhone",
    string
  >
>;

// شكل مبسّط لأي موظف موجود بالفعل — مستخدم بس عشان فحص تكرار الأرقام
export type PhoneConflictCandidate = {
  id: string;
  name: string;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
};

export function validateEmployeeCore(
  form: EmployeeFormCore,
  opts: {
    /** هل أرقام التليفون التلاتة إجبارية؟ (نفس القاعدة في الإنشاء والتعديل الاتنين) */
    requirePhones?: boolean;
    /** باقي الموظفين — لفحص تكرار الأرقام */
    existing?: PhoneConflictCandidate[];
    /** استبعاد الموظف الحالي نفسه من فحص التكرار وقت التعديل */
    excludeId?: string | null;
  } = {}
): EmployeeCoreFieldErrors {
  const { requirePhones = true, existing = [], excludeId = null } = opts;
  const errors: EmployeeCoreFieldErrors = {};

  if (!form.name.trim() || form.name.trim().length < 3) {
    errors.name = "اكتب اسم الموظف كامل (3 أحرف على الأقل)";
  }
  if (!form.deptId) errors.deptId = "اختر القسم";
  if (!form.positionId) errors.positionId = "اختر الوظيفة";
  if (!form.branchId) errors.branchId = "اختر الفرع";

  const personal = normalizePhone(form.personalPhone);
  const work = normalizePhone(form.workPhone);
  const saudi = normalizePhone(form.saudiPhone);

  if (requirePhones && !personal) {
    errors.personalPhone = "رقم التلفون الشخصي مطلوب";
  } else if (personal && !EGYPT_PHONE_RE.test(personal)) {
    errors.personalPhone = "رقم مصري غير صحيح (مثال: 01012345678)";
  }

  if (requirePhones && !work) {
    errors.workPhone = "رقم تلفون الشغل مطلوب";
  } else if (work && !EGYPT_PHONE_RE.test(work)) {
    errors.workPhone = "رقم مصري غير صحيح (مثال: 01012345678)";
  } else if (!errors.workPhone && personal && work && personal === work) {
    errors.workPhone = "لازم يبقى مختلف عن الرقم الشخصي";
  }

  if (requirePhones && !saudi) {
    errors.saudiPhone = "الرقم السعودي مطلوب";
  } else if (saudi && !SAUDI_PHONE_RE.test(saudi)) {
    errors.saudiPhone = "رقم سعودي غير صحيح (مثال: 0512345678)";
  }

  // فحص التكرار — بنحدد بالظبط أي حقل فيه الرقم المكرر بدل ما نلزّق
  // الخطأ على personalPhone دايمًا مهما كان الرقم المكرر فعليًا شخصي/شغل/سعودي
  const dup = existing.find((e) => {
    if (e.id === excludeId) return false;
    return (
      (personal && e.personalPhone === personal) ||
      (work && e.workPhone === work) ||
      (saudi && e.saudiPhone === saudi) ||
      (personal && e.workPhone === personal) ||
      (work && e.personalPhone === work)
    );
  });

  if (dup) {
    if (personal && (dup.personalPhone === personal || dup.workPhone === personal) && !errors.personalPhone) {
      errors.personalPhone = `الرقم ده مستخدم بالفعل مع ${dup.name}`;
    }
    if (work && (dup.workPhone === work || dup.personalPhone === work) && !errors.workPhone) {
      errors.workPhone = `الرقم ده مستخدم بالفعل مع ${dup.name}`;
    }
    if (saudi && dup.saudiPhone === saudi && !errors.saudiPhone) {
      errors.saudiPhone = `الرقم ده مستخدم بالفعل مع ${dup.name}`;
    }
  }

  return errors;
}

export function validateEmployeeEmail(
  email: string,
  existing: { id: string; email: string }[],
  excludeId?: string | null
): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "الإيميل مطلوب";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "صيغة الإيميل غير صحيحة";
  if (existing.some((e) => e.email === trimmed && e.id !== excludeId)) return "الإيميل ده مستخدم بالفعل";
  return undefined;
}

export function validateEmployeePassword(password: string): string | undefined {
  if (!password || password.length < 6) return "الباسورد لازم 6 خانات على الأقل";
  return undefined;
}