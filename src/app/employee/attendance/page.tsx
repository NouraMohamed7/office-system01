// src/app/employee/attendance/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { Clock, Check, LogIn, LogOut, Coffee, PlayCircle, Loader2, Palmtree, X, Pencil, Trash2, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  getMyAttendanceToday,
  getMyTodayAttendanceRecords,
  getMyAttendanceHistory,
  getMyMonthSummary,
  startBreak as apiStartBreak,
  endBreak as apiEndBreak,
  getBreaksByAttendanceIds,
  subscribeToBreaks,
  getBreaksSummaryByAttendanceIds,
  getMyLeaveRequests,
  submitLeave as apiSubmitLeave,
  editLeave as apiEditLeave,
  removeLeave as apiRemoveLeave,
  type AttendanceRecord,
  type MonthSummary,
  type BreakRecord,
} from "@/modules/attendance/api/attendance.api";

import {
  ATTENDANCE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_OPTIONS,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_TONE,
  type LeaveType,
} from "@/lib/constants";
import type { LeaveRequest } from "@/types/attendance";

// ============================================================
// ✅ دوال محلية مستقلة — كانت قبل كده في attendance-logic.ts (اتحذف).
// نفس المنطق بالظبط، بس دلوقتي مصدرها الوحيد هو الملف ده.
// ============================================================

// ⚠️ قواعد مؤكدة فعليًا من الباك (اتفحصت مباشرة عبر الـ RPCs):
// - update_leave / delete_leave: بيرفضوا برسالة "Cannot update/delete a leave
//   that has already started" لو start_date <= النهاردة، بغض النظر عن الحالة.
// - end_leave_early: بيرفض برسالة "Only accepted leaves can be ended early"
//   لو الحالة مش accepted.
function isLeaveStarted(startDate: string): boolean {
  return startDate <= new Date().toISOString().slice(0, 10);
}

// بندور على أحدث بريك مفتوح (end_time === null). لو فيه orphan قديم
// (بريك فاضل مفتوح من باگ سابق في end_break)، بنتجاهله ونستخدم الأحدث.
// ده المصدر الوحيد لمعرفة هل الموظف في بريك دلوقتي — مفيش أي مصدر تاني
// (زي attendance_today.status، اللي ثبت إنه بيرجّع حالة الحضور مش حالة
// البريك، فاتشال خالص من هنا).
function getCurrentOpenBreak(breaks: BreakRecord[]): BreakRecord | null {
  const open = breaks.filter((b) => b.end_time === null);
  if (open.length === 0) return null;
  return open.reduce((latest, b) => (new Date(b.start_time) > new Date(latest.start_time) ? b : latest));
}

// إجمالي وقت البريك بالثواني: مجموع البريكات المقفولة + وقت البريك
// المفتوح الحالي (بيتحدث كل ثانية من breakElapsedSec).
function computeTotalBreakSeconds(breaks: BreakRecord[], breakElapsedSec: number): number {
  let total = 0;
  for (const b of breaks) {
    if (b.end_time) {
      const secs = Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 1000);
      total += Math.max(0, secs);
    }
  }
  const hasOpen = breaks.some((b) => b.end_time === null);
  if (hasOpen) total += breakElapsedSec;
  return total;
}

// 🔧 VALIDATION FIX: تاريخ اليوم كسلسلة نصية — مستخدم في أكتر من مكان
// (min على input البداية + فاليديشن الإرسال) عشان منسمحش بطلب إجازة
// تاريخ بدايته في الماضي.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// 🔧 VALIDATION FIX: أقل عدد أحرف مقبول لسبب الإجازة — قبل كده كان أي نص
// غير فاضي (حتى مسافة واحدة أو حرفين) بيعدي، وده مش سبب مفيد فعليًا
// للمدير وقت المراجعة.
const MIN_LEAVE_REASON_LENGTH = 5;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function computeSecondsBetween(startISO: string, endISO: string | null): number {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

function formatMinutesAsHhMm(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// أنواع الأكشن اللي ممكن تتنفذ على صف إجازة واحد — مستخدمة عشان نعرف
// أي زرار بالظبط نعطّله/نحط عليه اللودينج، بدل ما نعطّل الصف كله بأكشن غلط.
type LeaveRowAction = "cancel";

export default function AttendancePage() {
  const showToast = useToast();
  const [now, setNow] = useState<Date | null>(null);

  // ---- بيانات حقيقية من الباك ----
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  // إجمالي دقايق البريك لكل سجل في "سجل الحضور السابق"
  const [historyBreakMinutes, setHistoryBreakMinutes] = useState<Map<number, number>>(new Map());
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [breakSubmitting, setBreakSubmitting] = useState(false);
  const [breakElapsedSec, setBreakElapsedSec] = useState(0);
  // كل الـ attendance_id بتاعت صفوف اليوم كلها (مش بس آخر صف) — لازمة عشان
  // refreshBreaks تقدر تجيب بريكات أي صف قديم النهاردة برضه.
  const [todayAttendanceIds, setTodayAttendanceIds] = useState<number[]>([]);

  // ---- طلبات الإجازة — مباشرة من جدول leaves في الباك ----
  // ✅ كان useMyLeaveRequests() / useLeaveActions() من hooks/useAttendance.ts
  // (اتحذف). دلوقتي state محلي بسيط بيستخدم دوال attendance.api مباشرة.
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);

  const refreshLeaves = useCallback(async () => {
    try {
      const data = await getMyLeaveRequests();
      setLeaves(data);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "حصل خطأ في تحميل طلبات الإجازة");
    } finally {
      setLoadingLeaves(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshLeaves();
  }, [refreshLeaves]);

  // فيكس مشكلة "error من غير ما يتمسح" — بنتبع الصف/الأكشن بالظبط اللي
  // شغال دلوقتي، ونعطّل زراره بس بدل state لودينج مشترك.
  const [busyLeave, setBusyLeave] = useState<{ id: number; action: LeaveRowAction } | null>(null);

  // كارد تفاصيل الإجازة — مودال منفصل يعرض تفاصيل طلب الإجازة كاملة
  // (خصوصًا السبب لو فقرة طويلة) بدون أي قطع/truncate.
  const [detailsLeave, setDetailsLeave] = useState<LeaveRequest | null>(null);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<number | null>(null);
  const [leaveForm, setLeaveForm] = useState<{
    start_date: string;
    end_date: string;
    leave_type: LeaveType | "";
    reason: string;
  }>({
    start_date: todayISO(),
    end_date: todayISO(),
    leave_type: "",
    reason: "",
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  // مصدر الحقيقة الوحيد لحالة البريك: جدول breaks (فيه صف end_time===null
  // ولا لأ). مفيش أي fallback على attendance_today.status — اتأكد فعليًا
  // إنه بيرجّع حالة الحضور مش حالة البريك، فاتشال بالكامل.
  const currentBreak = getCurrentOpenBreak(breaks);
  const isOnBreak = !!currentBreak;

  useEffect(() => {
    if (!isOnBreak || !currentBreak) return;
    const tick = () => setBreakElapsedSec(computeSecondsBetween(currentBreak.start_time, null));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isOnBreak, currentBreak]);

  const mounted = now !== null;
  const time = now ? now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—:—:—";
  const date = now ? now.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const shortDate = now ? now.toISOString().slice(0, 10) : "";

  const checkInTime = formatTime(record?.check_in_at ?? null);
  const checkOutTime = formatTime(record?.check_out_at ?? null);
  const hasCheckedIn = !!record?.check_in_at;
  const hasCheckedOut = !!record?.check_out_at;

  // بنجيب بريكات كل صفوف اليوم (todayAttendanceIds) مش صف واحد بس، عشان
  // لو الباك بيتعامل مع البريك على مستوى المستخدم مش الصف، الواجهة تفضل
  // شايفة الصورة كاملة دايمًا.
  async function refreshBreaks(attendanceIds: number[]) {
    if (attendanceIds.length === 0) {
      setBreaks([]);
      return;
    }
    const fresh = await getBreaksByAttendanceIds(attendanceIds);
    setBreaks(fresh);
  }

  // لو صف حضور جديد اتعمل (مثلاً بعد check-in) ومكانش في اللستة، نضيفه
  // عشان refreshBreaks الجاية تجيب بريكاته هو كمان.
  async function refreshTodayAttendanceIds(): Promise<number[]> {
    const todayRecords = await getMyTodayAttendanceRecords();
    const ids = todayRecords.map((r) => r.id);
    setTodayAttendanceIds(ids);
    return ids;
  }

  // تحميل حالة اليوم + البريكات + السجل السابق + ملخص الشهر أول ما الصفحة تفتح
  useEffect(() => {
    async function load() {
      try {
        const [todayRec, hist, summary] = await Promise.all([
          getMyAttendanceToday(),
          getMyAttendanceHistory(7),
          getMyMonthSummary(),
        ]);
        setRecord(todayRec);
        setHistory(hist);
        setMonthSummary(summary);

        // بنجيب كل صفوف اليوم بتاعة المستخدم (مش بس الأحدث) وبنجمع
        // بريكات كل الصفوف دي مع بعض.
        const todayRecords = await getMyTodayAttendanceRecords();
        const ids = todayRecords.map((r) => r.id);
        setTodayAttendanceIds(ids);
        if (ids.length > 0) {
          const todayBreaks = await getBreaksByAttendanceIds(ids);
          setBreaks(todayBreaks);
        }

        // إجمالي دقايق البريك لكل سجل في السجل السابق دفعة واحدة
        if (hist.length > 0) {
          const summaryMap = await getBreaksSummaryByAttendanceIds(hist.map((h) => h.id));
          setHistoryBreakMinutes(summaryMap);
        }
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الحضور");
      } finally {
        setLoadingToday(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ realtime على جدول breaks — دي فانكشن موثّقة وجاهزة من الباك
  // (نفس اللي مستخدمة في صفحة المدير) وكانت موجودة بالفعل في attendance.api
  // بس مش موصولة هنا. بتحدّث الحالة فورًا لحظة ما أي صف break يتغيّر، بدل
  // ما نعتمد بالكامل على refetch يدوي بعد كل أكشن (اللي ممكن يحصل فيه
  // race condition لو حصل تغيير من مصدر تاني في نفس الوقت).
  useEffect(() => {
    const unsubscribe = subscribeToBreaks(async () => {
      try {
        const ids = await refreshTodayAttendanceIds();
        await refreshBreaks(ids);
      } catch {
        // تجاهل فشل الـ refresh التلقائي — الأكشنات نفسها (start/end break)
        // بترجّع refresh يدوي بعدها أصلاً فمش هتفضل الواجهة واقفة غلط.
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckIn() {
    if (!mounted || submitting) return;
    setSubmitting(true);
    try {
      await apiCheckIn();
      const fresh = await getMyAttendanceToday();
      setRecord(fresh);
      const exactTime = formatTime(fresh?.check_in_at ?? null);
      if (fresh && fresh.late_minutes > 0) {
        showToast("error", `تم تسجيل حضورك الساعة ${exactTime} — بتأخير عن الموعد الرسمي`);
      } else {
        showToast("success", `تم تسجيل حضورك الساعة ${exactTime}`);
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تسجيل الحضور");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!mounted || submitting) return;
    if (isOnBreak) {
      showToast("error", "لازم تنهي البريك الأول قبل ما تسجل انصراف");
      return;
    }
    setSubmitting(true);
    try {
      await apiCheckOut();
      const fresh = await getMyAttendanceToday();
      setRecord(fresh);
      showToast("success", `تم تسجيل انصرافك الساعة ${formatTime(fresh?.check_out_at ?? null)}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر تسجيل الانصراف");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartBreak() {
    if (breakSubmitting) return;

    if (!hasCheckedIn) {
      showToast("error", "لازم تسجل حضورك الأول قبل ما تاخد بريك");
      return;
    }
    if (hasCheckedOut) {
      showToast("error", "مينفعش تاخد بريك بعد ما سجلت انصراف");
      return;
    }
    if (isOnBreak) {
      showToast("error", "انت أصلاً في بريك دلوقتي");
      return;
    }

    setBreakSubmitting(true);
    try {
      await apiStartBreak();
      // ✅ مصدر الحقيقة الوحيد: refetch كامل لجدول breaks. شكل الـ data
      // الراجعة من الـ RPC نفسها مش موثّق، فمنعتمدش عليها.
      const ids = await refreshTodayAttendanceIds();
      await refreshBreaks(ids);
      setBreakElapsedSec(0);
      showToast("success", `بدأت البريك الساعة ${time}`);
    } catch (err) {
      try {
        const ids = await refreshTodayAttendanceIds();
        await refreshBreaks(ids);
      } catch {
        // تجاهل فشل الـ refresh نفسه — التوست تحت هيوضح المشكلة الأصلية
      }
      showToast("error", err instanceof Error ? err.message : "تعذر بدء البريك");
    } finally {
      setBreakSubmitting(false);
    }
  }

  async function handleEndBreak() {
    if (breakSubmitting) return;

    if (!isOnBreak) {
      showToast("error", "مفيش بريك شغال دلوقتي عشان تنهيه");
      return;
    }

    setBreakSubmitting(true);
    try {
      await apiEndBreak();
      // ✅ نفس المبدأ: refetch كامل. بنستخدم todayAttendanceIds (كل صفوف
      // اليوم) مش صف واحد بس — عشان نغطي حالة أكتر من check-in في نفس اليوم.
      const ids = todayAttendanceIds.length > 0 ? todayAttendanceIds : await refreshTodayAttendanceIds();
      await refreshBreaks(ids);
      setBreakElapsedSec(0);
      showToast("success", `انتهت البريك الساعة ${time}`);
    } catch (err) {
      try {
        const ids = todayAttendanceIds.length > 0 ? todayAttendanceIds : await refreshTodayAttendanceIds();
        await refreshBreaks(ids);
      } catch {
        // تجاهل فشل الـ refresh نفسه
      }
      showToast("error", err instanceof Error ? err.message : "تعذر إنهاء البريك");
    } finally {
      setBreakSubmitting(false);
    }
  }

  const todayStatus = record?.status ?? null;

  const totalBreakSeconds = computeTotalBreakSeconds(breaks, breakElapsedSec);

  const formatDuration = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const summaryPct = (count: number) =>
    monthSummary && monthSummary.totalDays > 0 ? Math.round((count / monthSummary.totalDays) * 100) : 0;

  // ============================================================
  // طلبات الإجازة
  // ============================================================

  function openNewLeaveForm() {
    setEditingLeaveId(null);
    setLeaveForm({
      start_date: todayISO(),
      end_date: todayISO(),
      leave_type: "",
      reason: "",
    });
    setLeaveOpen(true);
  }

  function openEditLeaveForm(l: (typeof leaves)[number]) {
    setEditingLeaveId(l.id);
    setLeaveForm({
      start_date: l.start_date,
      end_date: l.end_date,
      leave_type: l.leave_type,
      reason: l.reason,
    });
    setLeaveOpen(true);
  }

  async function submitLeaveForm() {
    if (!leaveForm.leave_type) {
      showToast("error", "حدد نوع الإجازة");
      return;
    }
    const trimmedReason = leaveForm.reason.trim();
    if (!trimmedReason) {
      showToast("error", "اكتب سبب الإجازة");
      return;
    }
    if (trimmedReason.length < MIN_LEAVE_REASON_LENGTH) {
      showToast("error", `سبب الإجازة قصير جدًا — اكتب ${MIN_LEAVE_REASON_LENGTH} أحرف على الأقل`);
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      showToast("error", "تاريخ النهاية لازم يكون بعد أو يساوي تاريخ البداية");
      return;
    }
    if (editingLeaveId === null && leaveForm.start_date < todayISO()) {
      showToast("error", "تاريخ بداية الإجازة لازم يكون النهاردة أو بعده");
      return;
    }
    setLeaveActionLoading(true);
    try {
      if (editingLeaveId !== null) {
        await apiEditLeave({
          p_leave_id: editingLeaveId,
          p_start_date: leaveForm.start_date,
          p_end_date: leaveForm.end_date,
          p_reason: trimmedReason,
        });
        showToast("success", "تم تعديل طلب الإجازة");
      } else {
        await apiSubmitLeave({
          p_start_date: leaveForm.start_date,
          p_end_date: leaveForm.end_date,
          p_leave_type: leaveForm.leave_type,
          p_reason: trimmedReason,
        });
        showToast("success", "تم إرسال طلب الإجازة بنجاح");
      }
      await refreshLeaves();
      setLeaveOpen(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إرسال طلب الإجازة");
    } finally {
      setLeaveActionLoading(false);
    }
  }

  async function cancelLeave(leaveId: number) {
    if (busyLeave) return;
    setBusyLeave({ id: leaveId, action: "cancel" });
    try {
      await apiRemoveLeave(leaveId);
      await refreshLeaves();
      showToast("success", "تم إلغاء طلب الإجازة");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "تعذر إلغاء طلب الإجازة");
    } finally {
      setBusyLeave(null);
    }
  }

  return (
    <PortalLayout title="الحضور" subtitle="سجل حضورك وانصرافك اليومي وراجع تاريخك">
      <Card className="p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div />
            <button
              onClick={openNewLeaveForm}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold transition hover:bg-accent active:scale-95"
            >
              <Palmtree className="h-4 w-4 text-teal" />
              طلب إجازة
            </button>
          </div>

          <div className="text-sm text-muted-foreground">{date}</div>
          <div className="text-5xl font-bold text-foreground tabular-nums mt-2 mb-6">{time}</div>

          {loadingToday && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل حالة اليوم...
            </div>
          )}

          {!loadingToday && !hasCheckedIn && (
            <button onClick={handleCheckIn} disabled={!mounted || submitting}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-8 py-4 font-bold text-lg hover:bg-primary-dark transition shadow-warm disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
              تسجيل الحضور
            </button>
          )}

          {!loadingToday && hasCheckedIn && !hasCheckedOut && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 bg-success/10 text-success rounded-2xl px-6 py-4">
                <div className="h-10 w-10 rounded-full bg-success grid place-items-center">
                  <Check className="h-6 w-6 text-success-foreground" />
                </div>
                <div className="text-right">
                  <div className="font-bold">تم تسجيل حضورك</div>
                  <div className="text-sm tabular-nums">الساعة {checkInTime}</div>
                </div>
              </div>

              {isOnBreak && (
                <div className="inline-flex items-center gap-3 bg-warning/10 text-warning rounded-2xl px-6 py-4">
                  <div className="h-10 w-10 rounded-full bg-warning grid place-items-center">
                    <Coffee className="h-6 w-6 text-warning-foreground" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold">في استراحة الآن</div>
                    <div className="text-sm tabular-nums">{formatDuration(breakElapsedSec)}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                {!isOnBreak && (
                  <button onClick={handleStartBreak} disabled={breakSubmitting}
                    className="inline-flex items-center gap-2 bg-warning/15 text-warning rounded-2xl px-6 py-3 font-bold hover:bg-warning/25 transition disabled:opacity-50">
                    {breakSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Coffee className="h-5 w-5" />}
                    بدء البريك
                  </button>
                )}
                {isOnBreak && (
                  <button onClick={handleEndBreak} disabled={breakSubmitting}
                    className="inline-flex items-center gap-2 bg-success/15 text-success rounded-2xl px-6 py-3 font-bold hover:bg-success/25 transition disabled:opacity-50">
                    {breakSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                    إنهاء البريك
                  </button>
                )}

                <button onClick={handleCheckOut} disabled={isOnBreak || submitting}
                  className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground rounded-2xl px-8 py-3 font-bold text-lg hover:opacity-90 transition shadow-warm disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                  تسجيل الانصراف
                </button>
              </div>

              {breaks.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  إجمالي وقت البريك النهاردة: <span className="font-bold tabular-nums text-foreground">{formatDuration(totalBreakSeconds)}</span>
                </div>
              )}
            </div>
          )}

          {!loadingToday && hasCheckedIn && hasCheckedOut && (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-success/10 text-success rounded-2xl p-4">
                <LogIn className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs font-semibold">وقت الحضور</div>
                <div className="text-lg font-bold tabular-nums mt-1">{checkInTime}</div>
              </div>
              <div className="bg-destructive/10 text-destructive rounded-2xl p-4">
                <LogOut className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs font-semibold">وقت الانصراف</div>
                <div className="text-lg font-bold tabular-nums mt-1">{checkOutTime}</div>
              </div>
              {breaks.length > 0 && (
                <div className="col-span-2 bg-warning/10 text-warning rounded-2xl p-4">
                  <Coffee className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-xs font-semibold">إجمالي وقت البريك</div>
                  <div className="text-lg font-bold tabular-nums mt-1">{formatDuration(totalBreakSeconds)}</div>
                </div>
              )}
              <div className="col-span-2 text-sm text-muted-foreground mt-1">
                تم إنهاء يوم العمل بنجاح ✅
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ============================================================
          طلبات الإجازة — مباشرة من جدول leaves في الباك
      ============================================================ */}
      {(leaves.length > 0 || loadingLeaves) && (
        <Card className="p-6 mb-6 border-2 border-teal/20">
          <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-teal" /> طلبات الإجازة
          </h3>
          {loadingLeaves && <p className="text-xs text-muted-foreground mb-4">جاري التحميل...</p>}
          <div className="space-y-2">
            {leaves.map((l) => {
              const started = isLeaveStarted(l.start_date);
              // تعديل/إلغاء: متاحين بس لو الإجازة لسه ما بدأتش (مطابق لرسالة الباك)
              const canEditOrCancel = !started;
              const hasAnyAction = canEditOrCancel;
              const isCancelling = busyLeave?.id === l.id && busyLeave.action === "cancel";
              const rowBusy = busyLeave?.id === l.id;

              return (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setDetailsLeave(l)}
                    className="min-w-0 flex-1 text-right"
                    title="عرض التفاصيل كاملة"
                  >
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {LEAVE_TYPE_LABEL[l.leave_type]} — {l.start_date} إلى {l.end_date}
                      <StatusPill tone={LEAVE_STATUS_TONE[l.status]}>
                        {LEAVE_STATUS_LABEL[l.status]}
                      </StatusPill>
                    </div>
                    <div className="text-muted-foreground text-xs line-clamp-2 mt-0.5">{l.reason}</div>
                  </button>
                  {hasAnyAction ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailsLeave(l)}
                        className="rounded-lg border border-border p-2 hover:bg-accent"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditOrCancel && (
                        <button
                          onClick={() => openEditLeaveForm(l)}
                          disabled={rowBusy}
                          className="rounded-lg border border-border p-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canEditOrCancel && (
                        <button
                          onClick={() => cancelLeave(l.id)}
                          disabled={rowBusy}
                          className="rounded-lg border border-border p-2 hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="إلغاء"
                        >
                          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailsLeave(l)}
                        className="rounded-lg border border-border p-2 hover:bg-accent"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {started ? "بدأت الإجازة — لا يمكن التعديل" : "لا يوجد إجراء متاح"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {hasCheckedIn && (
        <Card className="p-6 mb-6 border-2 border-primary/20">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> سجل اليوم — {shortDate}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-muted-foreground border-b border-border">
                  <th className="pb-3 font-semibold">وقت الحضور</th>
                  <th className="pb-3 font-semibold">وقت الانصراف</th>
                  <th className="pb-3 font-semibold">إجمالي البريك</th>
                  <th className="pb-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-3 text-foreground tabular-nums">{checkInTime}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{hasCheckedOut ? checkOutTime : "— لسه ماسجلتيش انصراف —"}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{formatDuration(totalBreakSeconds)}</td>
                  <td className="py-3">
                    {todayStatus && (
                      <StatusPill tone={todayStatus === "present" ? "success" : todayStatus === "late" ? "warning" : "danger"}>
                        {ATTENDANCE_STATUS_LABEL[todayStatus]}
                      </StatusPill>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {breaks.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border/60">
              <h4 className="text-sm font-semibold text-foreground mb-3">تفاصيل البريكات</h4>
              <div className="space-y-2">
                {breaks.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between text-sm bg-warning/5 rounded-xl px-4 py-2">
                    <span className="flex items-center gap-2 text-warning font-semibold">
                      <Coffee className="h-4 w-4" /> بريك {i + 1}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatTime(b.start_time)} — {b.end_time ? formatTime(b.end_time) : "جارية الآن"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-foreground mb-4">سجل الحضور السابق</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground border-b border-border">
                <th className="pb-3 font-semibold">التاريخ</th>
                <th className="pb-3 font-semibold">الحضور</th>
                <th className="pb-3 font-semibold">الانصراف</th>
                <th className="pb-3 font-semibold">الاستراحة</th>
                <th className="pb-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && !loadingToday && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">مفيش سجل سابق</td>
                </tr>
              )}
              {history.map((r) => {
                const breakMins = historyBreakMinutes.get(r.id) ?? 0;
                return (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-primary/5 transition">
                    <td className="py-3 text-foreground">{r.attendance_date}</td>
                    <td className="py-3 text-muted-foreground tabular-nums">{formatTime(r.check_in_at)}</td>
                    <td className="py-3 text-muted-foreground tabular-nums">{formatTime(r.check_out_at)}</td>
                    <td className="py-3 text-muted-foreground tabular-nums">
                      {breakMins > 0 ? formatMinutesAsHhMm(breakMins) : "—"}
                    </td>
                    <td className="py-3">
                      <StatusPill tone={r.status === "present" ? "success" : r.status === "late" ? "warning" : "danger"}>
                        {ATTENDANCE_STATUS_LABEL[r.status]}
                      </StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div>
        <h3 className="font-bold text-foreground mb-3">ملخص الشهر</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="أيام الحضور" value={String(monthSummary?.presentDays ?? 0)} tone="success" pct={summaryPct(monthSummary?.presentDays ?? 0)} />
          <SummaryCard label="أيام الغياب" value={String(monthSummary?.absentDays ?? 0)} tone="danger" pct={summaryPct(monthSummary?.absentDays ?? 0)} />
          <SummaryCard label="أيام التأخير" value={String(monthSummary?.lateDays ?? 0)} tone="warning" pct={summaryPct(monthSummary?.lateDays ?? 0)} />
        </div>
      </div>

      {/* ============================================================
          مودال: طلب/تعديل إجازة
      ============================================================ */}
      {leaveOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setLeaveOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-warm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Palmtree className="h-5 w-5 text-teal" />
                {editingLeaveId !== null ? "تعديل طلب الإجازة" : "طلب إجازة جديد"}
              </h3>
              <button onClick={() => setLeaveOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs space-y-1 block">
                  <span className="text-muted-foreground">من تاريخ</span>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    min={todayISO()}
                    onChange={(e) =>
                      setLeaveForm((f) => {
                        const start_date = e.target.value;
                        const end_date = f.end_date < start_date ? start_date : f.end_date;
                        return { ...f, start_date, end_date };
                      })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </label>
                <label className="text-xs space-y-1 block">
                  <span className="text-muted-foreground">إلى تاريخ</span>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    min={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </label>
              </div>

              <label className="text-xs space-y-1 block">
                <span className="text-muted-foreground">نوع الإجازة</span>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value as LeaveType }))}
                  disabled={editingLeaveId !== null}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60"
                >
                  <option value="" disabled>اختار نوع الإجازة</option>
                  {LEAVE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs space-y-1 block">
                <span className="text-muted-foreground">
                  السبب
                  <span className="text-muted-foreground/70"> (لا يقل عن {MIN_LEAVE_REASON_LENGTH} أحرف)</span>
                </span>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </label>

              <button
                onClick={submitLeaveForm}
                disabled={leaveActionLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {leaveActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palmtree className="h-4 w-4" />}
                {editingLeaveId !== null ? "حفظ التعديل" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          مودال: تفاصيل طلب الإجازة (كارد) — بيعرض السبب كامل من غير قطع
      ============================================================ */}
      {detailsLeave && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDetailsLeave(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-warm max-h-[85vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Palmtree className="h-5 w-5 text-teal" />
                  {LEAVE_TYPE_LABEL[detailsLeave.leave_type]}
                </h3>
                <div className="mt-1">
                  <StatusPill tone={LEAVE_STATUS_TONE[detailsLeave.status]}>
                    {LEAVE_STATUS_LABEL[detailsLeave.status]}
                  </StatusPill>
                </div>
              </div>
              <button onClick={() => setDetailsLeave(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="rounded-xl bg-accent/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">من تاريخ</div>
                <div className="font-semibold tabular-nums">{detailsLeave.start_date}</div>
              </div>
              <div className="rounded-xl bg-accent/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">إلى تاريخ</div>
                <div className="font-semibold tabular-nums">{detailsLeave.end_date}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">السبب</div>
              <div className="rounded-xl border border-border bg-background p-3 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {detailsLeave.reason || "— بدون سبب مكتوب —"}
              </div>
            </div>

            <button
              onClick={() => setDetailsLeave(null)}
              className="mt-5 w-full rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-accent"
            >
              إغلاق
            </button>
          </div>
        </>
      )}
    </PortalLayout>
  );
}

function SummaryCard({ label, value, tone, pct }: { label: string; value: string; tone: "success" | "danger" | "warning"; pct: number }) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--destructive)";
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${pct * 0.94} 100`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums" style={{ color }}>{pct}%</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}