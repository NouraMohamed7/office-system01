// src/app/attendance/page.tsx
"use client";

import { PortalLayout, Card, StatusPill } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { Clock, Check, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

const PAST_RECORDS = [
  { date: "2026-07-18", checkIn: "09:02", checkOut: "17:10", status: "حاضر" },
  { date: "2026-07-17", checkIn: "09:14", checkOut: "17:05", status: "متأخر" },
  { date: "2026-07-16", checkIn: "08:55", checkOut: "16:58", status: "حاضر" },
  { date: "2026-07-15", checkIn: "—", checkOut: "—", status: "غائب" },
  { date: "2026-07-14", checkIn: "09:03", checkOut: "17:12", status: "حاضر" },
  { date: "2026-07-13", checkIn: "09:21", checkOut: "17:00", status: "متأخر" },
  { date: "2026-07-12", checkIn: "08:50", checkOut: "16:55", status: "حاضر" },
];

const OFFICIAL_START = "09:00";

export default function AttendancePage() {
  const showToast = useToast();
  const [now, setNow] = useState(new Date());
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDate = now.toISOString().slice(0, 10);

  const isLate = () => {
    const [h, m] = OFFICIAL_START.split(":").map(Number);
    const officialMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes > officialMinutes;
  };

  const handleCheckIn = () => {
    const exactTime = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setCheckInTime(exactTime);
    if (isLate()) {
      showToast("error", `تم تسجيل حضورك الساعة ${exactTime} — بتأخير عن الموعد الرسمي`);
    } else {
      showToast("success", `تم تسجيل حضورك الساعة ${exactTime}`);
    }
  };

  const handleCheckOut = () => {
    const exactTime = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setCheckOutTime(exactTime);
    showToast("success", `تم تسجيل انصرافك الساعة ${exactTime}`);
  };

  const todayStatus = checkInTime
    ? (isLate() ? "متأخر" : "حاضر")
    : null;

  return (
    <PortalLayout title="الحضور" subtitle="سجل حضورك وانصرافك اليومي وراجع تاريخك">
      <Card className="p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-sm text-muted-foreground">{date}</div>
          <div className="text-5xl font-bold text-foreground tabular-nums mt-2 mb-6">{time}</div>

          {!checkInTime && (
            <button onClick={handleCheckIn}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-8 py-4 font-bold text-lg hover:bg-[color:var(--primary-dark)] transition shadow-warm">
              <LogIn className="h-6 w-6" />
              تسجيل الحضور
            </button>
          )}

          {checkInTime && !checkOutTime && (
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
              <div>
                <button onClick={handleCheckOut}
                  className="inline-flex items-center gap-3 bg-destructive text-destructive-foreground rounded-2xl px-8 py-4 font-bold text-lg hover:opacity-90 transition shadow-warm">
                  <LogOut className="h-6 w-6" />
                  تسجيل الانصراف
                </button>
              </div>
            </div>
          )}

          {checkInTime && checkOutTime && (
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
              <div className="col-span-2 text-sm text-muted-foreground mt-1">
                تم إنهاء يوم العمل بنجاح ✅
              </div>
            </div>
          )}
        </div>
      </Card>

      {checkInTime && (
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
                  <th className="pb-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-3 text-foreground tabular-nums">{checkInTime}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{checkOutTime ?? "— لسه ماسجلتيش انصراف —"}</td>
                  <td className="py-3">
                    {todayStatus && (
                      <StatusPill tone={todayStatus === "حاضر" ? "success" : "warning"}>{todayStatus}</StatusPill>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
              {PAST_RECORDS.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-primary/5 transition">
                  <td className="py-3 text-foreground">{r.date}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{r.checkIn}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">{r.checkOut}</td>
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
          <SummaryCard label="أيام الحضور" value="22" tone="success" pct={92} />
          <SummaryCard label="أيام الغياب" value="1" tone="danger" pct={4} />
          <SummaryCard label="أيام التأخير" value="2" tone="warning" pct={8} />
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