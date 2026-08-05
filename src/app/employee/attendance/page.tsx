// src/app/attendance/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { Clock, Check, LogIn, LogOut, Coffee, PlayCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  getMyAttendanceToday,
  getMyAttendanceHistory,
  getMyMonthSummary,
  type AttendanceRecord,
  type MonthSummary,
} from "@/modules/attendance/api/attendance.api";

type BreakRecord = { start: string; end: string | null; startMs: number; endMs: number | null };

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AttendancePage() {
  const showToast = useToast();
  // Start as null on both server and client so the initial render matches.
  const [now, setNow] = useState<Date | null>(null);

  // ---- بيانات حقيقية من الباك ----
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ---- البريك: لسه محلي بالكامل (مفيش endpoint ليه في الباك) ----
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [breakElapsedSec, setBreakElapsedSec] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // تحميل حالة اليوم + السجل السابق + ملخص الشهر أول ما الصفحة تفتح
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
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الحضور");
      } finally {
        setLoadingToday(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the current break's elapsed time while on break
  useEffect(() => {
    if (!isOnBreak) return;
    const current = breaks[breaks.length - 1];
    if (!current) return;
    const tick = () => setBreakElapsedSec(Math.floor((Date.now() - current.startMs) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isOnBreak, breaks]);

  const mounted = now !== null;
  const time = now ? now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—:—:—";
  const date = now ? now.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const shortDate = now ? now.toISOString().slice(0, 10) : "";

  const checkInTime = formatTime(record?.check_in_at ?? null);
  const checkOutTime = formatTime(record?.check_out_at ?? null);
  const hasCheckedIn = !!record?.check_in_at;
  const hasCheckedOut = !!record?.check_out_at;

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

  // ---- البريك (محلي زي ما هو بالظبط) ----
  const handleStartBreak = () => {
    if (!now) return;
    const exactTime = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setBreaks((prev) => [...prev, { start: exactTime, end: null, startMs: Date.now(), endMs: null }]);
    setBreakElapsedSec(0);
    setIsOnBreak(true);
    showToast("success", `بدأت البريك الساعة ${exactTime}`);
  };

  const handleEndBreak = () => {
    if (!now) return;
    const exactTime = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setBreaks((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.end === null) {
        updated[updated.length - 1] = { ...last, end: exactTime, endMs: Date.now() };
      }
      return updated;
    });
    setIsOnBreak(false);
    setBreakElapsedSec(0);
    showToast("success", `انتهت البريك الساعة ${exactTime}`);
  };

  const todayStatus = record?.status ?? null;

  const totalBreakSeconds = breaks.reduce((sum, b) => {
    if (b.endMs) return sum + Math.floor((b.endMs - b.startMs) / 1000);
    if (isOnBreak) return sum + breakElapsedSec;
    return sum;
  }, 0);

  const formatDuration = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // نسب ملخص الشهر (بناءً على إجمالي الأيام المسجّلة الشهر ده)
  const summaryPct = (count: number) =>
    monthSummary && monthSummary.totalDays > 0 ? Math.round((count / monthSummary.totalDays) * 100) : 0;

  return (
    <PortalLayout title="الحضور" subtitle="سجل حضورك وانصرافك اليومي وراجع تاريخك">
      <Card className="p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-sm text-muted-foreground">{date}</div>
          <div className="text-5xl font-bold text-foreground tabular-nums mt-2 mb-6">{time}</div>

          {loadingToday && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل حالة اليوم...
            </div>
          )}

          {!loadingToday && !hasCheckedIn && (
            <button onClick={handleCheckIn} disabled={!mounted || submitting}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-8 py-4 font-bold text-lg hover:bg-[color:var(--primary-dark)] transition shadow-warm disabled:opacity-40 disabled:cursor-not-allowed">
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
                  <button onClick={handleStartBreak}
                    className="inline-flex items-center gap-2 bg-warning/15 text-warning rounded-2xl px-6 py-3 font-bold hover:bg-warning/25 transition">
                    <Coffee className="h-5 w-5" />
                    بدء البريك
                  </button>
                )}
                {isOnBreak && (
                  <button onClick={handleEndBreak}
                    className="inline-flex items-center gap-2 bg-success/15 text-success rounded-2xl px-6 py-3 font-bold hover:bg-success/25 transition">
                    <PlayCircle className="h-5 w-5" />
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
                      <StatusPill tone={todayStatus === "حاضر" ? "success" : todayStatus === "متأخر" ? "warning" : "danger"}>{todayStatus}</StatusPill>
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
                  <div key={i} className="flex items-center justify-between text-sm bg-warning/5 rounded-xl px-4 py-2">
                    <span className="flex items-center gap-2 text-warning font-semibold">
                      <Coffee className="h-4 w-4" /> بريك {i + 1}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {b.start} — {b.end ?? "جارية الآن"}
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
                <th className="pb-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && !loadingToday && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">مفيش سجل سابق</td>
                </tr>
              )}
              {history.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-primary/5 transition">
                  <td className="py-3 text-foreground">{r.attendance_date}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{formatTime(r.check_in_at)}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{formatTime(r.check_out_at)}</td>
                  <td className="py-3">
                    <StatusPill tone={r.status === "حاضر" ? "success" : r.status === "متأخر" ? "warning" : "danger"}>
                      {r.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
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