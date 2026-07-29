// src/app/reports/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useState } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

interface Report { date: string; pct: number; summary: string; }

const INITIAL_PAST: Report[] = [
  { date: "17 يوليو 2026", pct: 92, summary: "تم إنجاز جميع المهام الأساسية ورفع شيت الليدز." },
  { date: "16 يوليو 2026", pct: 78, summary: "تأخر تقرير التسويق بسبب انتظار موافقة العميل." },
  { date: "15 يوليو 2026", pct: 85, summary: "إنجاز 4 مهام، متابعة اجتماع القسم." },
  { date: "14 يوليو 2026", pct: 65, summary: "يوم بطيء بسبب مشاكل تقنية في السيستم." },
];

export default function ReportsPage() {
  const showToast = useToast();

  const [achievements, setAchievements] = useState("");
  const [problems, setProblems] = useState("");
  const [needs, setNeeds] = useState("");
  const [pct, setPct] = useState(70);
  const [errors, setErrors] = useState<{ achievements?: string }>({});
  const [past, setPast] = useState<Report[]>(INITIAL_PAST);
  const [open, setOpen] = useState<number | null>(0);

  const color = pct < 50 ? "var(--warning)" : pct < 80 ? "oklch(0.68 0.13 55)" : "var(--primary)";

  const handleSubmit = () => {
    if (!achievements.trim()) {
      setErrors({ achievements: "من فضلك اكتبي ماذا أنجزتِ اليوم قبل الإرسال" });
      showToast("error", "فيه حقل ناقص في الفورم");
      return;
    }
    setErrors({});

    const today = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    setPast((prev) => [{ date: today, pct, summary: achievements.trim() }, ...prev]);

    setAchievements("");
    setProblems("");
    setNeeds("");
    setPct(70);
    showToast("success", "تم إرسال التقرير اليومي بنجاح");
  };

  return (
    <PortalLayout title="التقارير اليومية" subtitle="لخّص يومك في دقيقتين">
      <Card className="p-6 lg:p-8 mb-6">
        <div className="space-y-6">
          <Field
            label="ماذا أنجزت اليوم؟"
            placeholder="اكتب أهم إنجازاتك اليوم..."
            rows={4}
            value={achievements}
            onChange={setAchievements}
            error={errors.achievements}
          />
          <Field
            label="المشاكل التي واجهتك"
            placeholder="أي عقبات أو مشاكل تحتاج تصعيد؟"
            rows={3}
            value={problems}
            onChange={setProblems}
          />
          <Field
            label="احتياجاتك"
            placeholder="موارد أو دعم تحتاجه للاستمرار..."
            rows={3}
            value={needs}
            onChange={setNeeds}
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-foreground">نسبة الإنجاز</label>
              <span className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
            </div>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(+e.target.value)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border"
              style={{ background: `linear-gradient(to left, ${color} 0%, ${color} ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)` }} />
            <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>0%</span><span>100%</span></div>
          </div>

          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold hover:bg-[color:var(--primary-dark)] transition shadow-warm"
          >
            <Send className="h-4 w-4" /> إرسال التقرير
          </button>
        </div>
      </Card>

      <div>
        <h3 className="font-bold text-foreground mb-3">التقارير السابقة</h3>
        <div className="space-y-2">
          {past.map((r, i) => (
            <Card key={i} className="overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center gap-4 p-4 hover:bg-primary/5 transition text-right">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{r.date}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums w-12">{r.pct}%</span>
                </div>
                <span className="text-sm text-teal font-semibold flex items-center gap-1">
                  عرض {open === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {open === i && (
                <div className="px-4 pb-4 pt-2 border-t border-border/60 text-sm text-muted-foreground leading-relaxed">
                  {r.summary}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}

function Field({
  label, placeholder, rows, value, onChange, error,
}: {
  label: string; placeholder: string; rows: number;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-2 w-full rounded-xl border bg-card focus:ring-2 outline-none p-3 text-sm transition leading-relaxed resize-none
          ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
      />
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}