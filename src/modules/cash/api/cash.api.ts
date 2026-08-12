import { supabase } from "@/lib/supabase/client";

// ============================================================
// cash.api.ts
// كل الاتصال الحقيقي بجدول cash + edge functions create-cash / delete-cash
// حسب الدوكيومنتيشن الفعلي للباك (مفيش تعديل، مفيش تاريخ يدوي، مفيش summary RPC
// لحد ما نعرف شكل الـ response بتاعه).
// ============================================================

export type CashType = "income" | "expenses";

export interface CashRow {
  id: number;
  type: CashType;
  value: number;
  date: string; // بيتحدد سيرفر-سايد وقت الإنشاء
  category: string | null;
  cause: string | null;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
  responsible_by: string | null;
}

export interface CreateCashParams {
  type: CashType;
  value: number;
  category?: string;
  cause?: string;
  /**
   * ⚠️ مش موثّق كحقل مقبول في create-cash (مش موجود في الـ example body بتاع الباك).
   * بنبعته على أساس إنه عمود موجود في الجدول، لكن لازم تتأكد إن الـ edge function
   * فعلاً بتحفظه. لو مش بتحفظه، القيمة هتتجاهل بصمت.
   */
  responsible_by?: string;
  receipt?: File;
}

// ---------- قراءة كل الحركات ----------
export async function fetchCash(): Promise<CashRow[]> {
  const { data, error } = await supabase
    .from("cash")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CashRow[];
}

// ---------- إضافة عملية (مدير فقط) ----------
export async function createCash(params: CreateCashParams) {
  const formData = new FormData();
  formData.append("type", params.type);
  formData.append("value", String(params.value));
  if (params.category) formData.append("category", params.category);
  if (params.cause) formData.append("cause", params.cause);
  if (params.responsible_by) formData.append("responsible_by", params.responsible_by);
  if (params.receipt) formData.append("receipt", params.receipt);

  const { data, error } = await supabase.functions.invoke("create-cash", {
    body: formData,
  });

  if (error) {
    // رسالة الباك بتيجي جوه data.error غالبًا لو الاستجابة فيها JSON error
    const msg = (data as { error?: string } | null)?.error || error.message;
    throw new Error(msg);
  }
  return data as { message: string; cash: CashRow };
}

// ---------- حذف عملية (مدير فقط) ----------
export async function deleteCash(cashId: number) {
  const { data, error } = await supabase.functions.invoke("delete-cash", {
    body: { cash_id: cashId },
  });

  if (error) {
    const msg = (data as { error?: string } | null)?.error || error.message;
    throw new Error(msg);
  }
  return data as { message: string };
}