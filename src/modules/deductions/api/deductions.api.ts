import { z } from "zod";
import { supabase } from "@/lib/supabase/client";

// ============ Types ============

export type DeductionRewardType = "reward" | "deduction";

export type DeductionRewardRow = {
  id: number;
  users_id: string;
  cause: string;
  value: number;
  date: string; // YYYY-MM-DD
  type: DeductionRewardType;
  created_by: string;
  created_at: string;
};

export type EmployeeOption = {
  id: string;
  name: string;
};

export type DeductionRewardWithEmployee = DeductionRewardRow & {
  employee_name: string;
};

// ============ Validation ============

const deductionRewardSchema = z.object({
  users_id: z.string().uuid({ message: "الموظف غير صالح" }),
  cause: z
    .string()
    .trim()
    .min(3, "السبب يجب ألا يقل عن 3 أحرف")
    .max(300, "السبب طويل جدًا (300 حرف كحد أقصى)"),
  value: z
    .number({ invalid_type_error: "القيمة مطلوبة" })
    .positive("القيمة يجب أن تكون أكبر من صفر")
    .max(1_000_000, "القيمة كبيرة بشكل غير منطقي"),
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "التاريخ غير صالح" }),
  type: z.enum(["reward", "deduction"], {
    errorMap: () => ({ message: "النوع غير صالح" }),
  }),
});

export type DeductionRewardInput = z.infer<typeof deductionRewardSchema>;

// ============ Error mapping ============

function mapSupabaseError(error: { message: string; code?: string }): Error {
  if (error.code === "42501" || /permission|policy|rls/i.test(error.message)) {
    return new Error("ليس لديك صلاحية لتنفيذ هذا الإجراء");
  }
  return new Error(error.message || "حدث خطأ غير متوقع، حاول مرة أخرى");
}

// ============ Read: كل السجلات (مدير) ============

export async function fetchAllDeductionsRewards(): Promise<DeductionRewardWithEmployee[]> {
  const { data, error } = await supabase
    .from("deductions_rewards")
    .select("id,users_id,cause,value,date,type,created_by,created_at")
    .order("date", { ascending: false });

  if (error) throw mapSupabaseError(error);

  const rows = (data ?? []) as DeductionRewardRow[];
  if (rows.length === 0) return [];

  const ids = Array.from(new Set(rows.map((r) => r.users_id)));
  const { data: users, error: usersError } = await supabase
    .from("users_with_email")
    .select("id,name")
    .in("id", ids);

  if (usersError) throw mapSupabaseError(usersError);

  const nameMap = new Map<string, string>(
    (users ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  return rows.map((r) => ({
    ...r,
    employee_name: nameMap.get(r.users_id) ?? "موظف غير معروف",
  }));
}

// ============ Read: سجلات الموظف نفسه ============

export async function fetchMyDeductionsRewards(
  userId: string
): Promise<DeductionRewardRow[]> {
  const { data, error } = await supabase
    .from("deductions_rewards")
    .select("id,users_id,cause,value,date,type,created_by,created_at")
    .eq("users_id", userId)
    .order("date", { ascending: false });

  if (error) throw mapSupabaseError(error);
  return (data ?? []) as DeductionRewardRow[];
}

// ============ قائمة الموظفين لعمل select في الفورم (تتجاب مرة واحدة بس) ============

export async function fetchActiveEmployeesForSelect(): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from("users_with_email")
    .select("id,name,emp_status")
    .order("name", { ascending: true });

  if (error) throw mapSupabaseError(error);

  return (data ?? [])
    .filter((u: { emp_status?: string }) => u.emp_status !== "resigned")
    .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }));
}

// ============ Create (مدير فقط) ============
//
// مهم: الجدول محمي بـ RLS بتمنع الـ insert المباشر (بترجع 42501)،
// فالإنشاء لازم يعدي من الـ RPC اللي الباك عامله: create_deduction_reward.
// الفانكشن دي على الأغلب بتاخد المستخدم الحالي من auth.uid() جوه نفسها
// وبتحدد created_by هي نفسها، فمش محتاجين نبعتها من الفرونت.

export async function createDeductionReward(
  input: DeductionRewardInput
): Promise<DeductionRewardRow> {
  const parsed = deductionRewardSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const { data, error } = await supabase.rpc("create_deduction_reward", {
    p_cause: parsed.data.cause,
    p_date: parsed.data.date,
    p_type: parsed.data.type,
    p_users_id: parsed.data.users_id,
    p_value: parsed.data.value,
  });

  if (error) throw mapSupabaseError(error);

  // الـ RPC ممكن ترجع الصف الجديد كـ object، أو كـ array فيه صف واحد،
  // حسب تعريفها بالظبط في الباك — بنغطي الاحتمالين.
  const row = Array.isArray(data) ? data[0] : data;
  return row as DeductionRewardRow;
}

// ============ Delete (مدير فقط) ============

export async function deleteDeductionReward(id: number): Promise<void> {
  const { error } = await supabase.from("deductions_rewards").delete().eq("id", id);
  if (error) throw mapSupabaseError(error);
}

// ============ Realtime ============
// userId اختياري: لو اتبعت، الاشتراك بيتقيّد بصفوف الموظف ده بس على مستوى السيرفر
// (مش فلترة على الفرونت بعد ما توصل البيانات) — كده الموظف مش بياخد ولا event
// لتغييرات خاصة بموظفين تانيين.

export function subscribeDeductionsRewards(
  onChange: () => void,
  userId?: string
): () => void {
  const channelName = userId ? `deductions-rewards-${userId}` : "deductions-rewards-all";

  const channel = supabase.channel(channelName).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "deductions_rewards",
      ...(userId ? { filter: `users_id=eq.${userId}` } : {}),
    },
    onChange
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============ Helper ============

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}