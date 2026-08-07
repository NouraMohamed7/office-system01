"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  submitDailyReport,
  getMyDailyReports,
  DailyReportHistory,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/modules/reports/api/reports.api";

export default function ReportsPage() {
  const showToast = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [past, setPast] = useState<DailyReportHistory[]>([]);

  const [achievements, setAchievements] = useState("");
  const [problems, setProblems] = useState("");
  const [needs, setNeeds] = useState("");
  const [pct, setPct] = useState(70);
  const [errors, setErrors] = useState<{ achievements?: string }>({});
  const [open, setOpen] = useState<number | null>(0);

  const color =
    pct < 50 ? "var(--warning)" : pct < 80 ? "oklch(0.68 0.13 55)" : "var(--primary)";

  const loadReports = async (uid: string) => {
    try {
      const data = await getMyDailyReports(uid);
      setPast(data);
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ في تحميل التقارير السابقة");
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast("error", "لازم تسجّل الدخول الأول");
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await loadReports(user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!achievements.trim()) {
      setErrors({ achievements: "من فضلك اكتبي ماذا أنجزتِ اليوم قبل الإرسال" });
      showToast("error", "فيه حقل ناقص في الفورم");
      return;
    }
    setErrors({});

    if (!userId) {
      showToast("error", "مش قادرين نتأكد من هويتك، حاول تسجل الدخول تاني");
      return;
    }

    setSubmitting(true);
    try {
      await submitDailyReport({
        goal: achievements.trim(),
        issue: problems.trim(),
        need: needs.trim(),
        completion_percent: pct,
      });

      setAchievements("");
      setProblems("");
      setNeeds("");
      setPct(70);
      showToast("success", "تم إرسال التقرير اليومي بنجاح");
      await loadReports(userId);
    } catch (err) {
      console.error(err);
      showToast("error", "حصل خطأ أثناء إرسال التقرير، حاول تاني");
    } finally {
      setSubmitting(false);
    }
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
              <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                {pct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(+e.target.value)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border"
              style={{
                background: `linear-gradient(to left, ${color} 0%, ${color} ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold hover:bg-[color:var(--primary-dark)] transition shadow-warm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال التقرير
          </button>
        </div>
      </Card>

      <div>
        <h3 className="font-bold text-foreground mb-3">التقارير السابقة</h3>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارِ التحميل...
          </div>
        ) : past.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            لسه معملتيش أي تقرير.
          </p>
        ) : (
          <div className="space-y-2">
            {past.map((r, i) => {
              const status = r.status ?? "pending";
              return (
                <Card key={r.id} className="overflow-hidden">
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-primary/5 transition text-right"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(r.report_date).toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {STATUS_LABELS[status]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${r.completion_percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums w-12">
                        {r.completion_percent}%
                      </span>
                    </div>
                    <span className="text-sm text-teal font-semibold flex items-center gap-1">
                      عرض {open === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  {open === i && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/60 text-sm text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        <span className="font-semibold text-foreground">الإنجازات: </span>
                        {r.goal}
                      </p>
                      {r.issue && (
                        <p>
                          <span className="font-semibold text-foreground">المشاكل: </span>
                          {r.issue}
                        </p>
                      )}
                      {r.need && (
                        <p>
                          <span className="font-semibold text-foreground">الاحتياجات: </span>
                          {r.need}
                        </p>
                      )}
                      {/* TODO: ملاحظة المدير مش بترجع من الباك حاليًا — راجع getReportComments في reports.api.ts */}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

function Field({
  label,
  placeholder,
  rows,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  rows: number;
  value: string;
  onChange: (v: string) => void;
  error?: string;
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
          ${
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-border focus:border-primary focus:ring-primary/20"
          }`}
      />
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}