// src/modules/attendance/api/hooks/useAttendance.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyLeaveRequests,
  getAllLeaveRequests,
  submitLeave,
  editLeave,
  removeLeave,
  setLeaveStatus,
  type SubmitLeavePayload,
  type EditLeavePayload,
} from "../attendance.api";
import type { LeaveRequest, LeaveStatus } from "@/types/attendance";

/**
 * ⚠️ ملحوظة عن react-hooks/set-state-in-effect:
 * كل هوك من التلاتة دي فيه:
 *   1) دالة `refresh` (مُصدَّرة للاستخدام اليدوي بعد أكشن زي حفظ/إلغاء
 *      طلب) — دي بتنادي setLoading(true) على طول، وده طبيعي ومقبول
 *      لأنها مش جوه useEffect.
 *   2) useEffect منفصل للتحميل الأول عند mount — ده بيعمل الـ fetch
 *      مباشرة (supabase call) ومبينادوش refresh() ولا أي setState قبل
 *      أول await، عشان أي تحديث state بيحصل جوه .then/.catch/.finally
 *      (يعني بعد رجوع النتيجة من الشبكة فعليًا)، مش synchronously في
 *      جسم الـ effect — وده بالظبط اللي القاعدة عايزاه.
 */

/** طلبات إجازة المستخدم الحالي فقط — لصفحة الموظف. */
export function useMyLeaveRequests() {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMyLeaveRequests();
      setData(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل طلبات الإجازة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getMyLeaveRequests()
      .then((rows) => {
        if (ignore) return;
        setData(rows);
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "تعذر تحميل طلبات الإجازة");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // التحميل الأول بس عند mount — التحديثات بعد كده بتتم عبر refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh };
}

/** كل طلبات الإجازة لكل الموظفين — لصفحة المدير. */
export function useManagerLeaveRequests() {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllLeaveRequests();
      setData(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل طلبات الإجازة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getAllLeaveRequests()
      .then((rows) => {
        if (ignore) return;
        setData(rows);
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "تعذر تحميل طلبات الإجازة");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh };
}

/**
 * أكشنز الإجازة (تقديم / تعديل / إلغاء / قرار المدير). loading هنا عام
 * لكل الأكشنز — الصفحتين بيحطوا فوقه حماية إضافية على مستوى الصف
 * (busyLeave / busyLeaveId) عشان يمنعوا ضغط متزامن على صفوف مختلفة.
 */
export function useLeaveActions() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    submitLeave: (payload: SubmitLeavePayload) => run(() => submitLeave(payload)),
    editLeave: (payload: EditLeavePayload) => run(() => editLeave(payload)),
    removeLeave: (leaveId: number) => run(() => removeLeave(leaveId)),
    setLeaveStatus: (leaveId: number, status: Extract<LeaveStatus, "accepted" | "rejected" | "cancelled">) =>
      run(() => setLeaveStatus(leaveId, status)),
  };
}