"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  submitDailyReport,
  getMyDailyReports,
  getSubmitDailyReportErrorMessage,
  getReportComments,
  subscribeToDailyReports,
  subscribeToReportComments,
  DailyReportHistory,
  ReportComment,
  STATUS_LABELS,
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

  // ملاحظات/تعليقات المدير على كل تقرير — بتتحمّل بس لما تفتحي التقرير
  // (Fix 6: كانت مش بتتعرض خالص، عندنا TODO بيقول إن الداتا دي مش متجابة)
  const [comments, setComments] = useState<Record<number, ReportComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});

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

  // Fix 5 (ريل تايم): أي تحديث على تقارير الموظف ده — خصوصًا لما المدير
  // يعتمد/يرفض/يطلب تعديل — يحدّث القائمة أوتوماتيك من غير ريفريش يدوي
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToDailyReports(() => loadReports(userId));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchComments = async (reportId: number) => {
    try {
      const data = await getReportComments(reportId);
      setComments((prev) => ({ ...prev, [reportId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOpen = (index: number, reportId: number) => {
    const next = open === index ? null : index;
    setOpen(next);

    // أول ما تتفتح، لو لسه ما اتجابتش تعليقاتها، هاتها مرة واحدة بس
    if (next !== null && !comments[reportId]) {
      setCommentsLoading((prev) => ({ ...prev, [reportId]: true }));
      fetchComments(reportId).finally(() =>
        setCommentsLoading((prev) => ({ ...prev, [reportId]: false }))
      );
    }
  };

  // ريل تايم لتعليقات التقرير المفتوح حاليًا بس (مفيش داعي نفتح اشتراك
  // لكل تقرير في القائمة مرة واحدة)
  useEffect(() => {
    if (open === null) return;
    const report = past[open];
    if (!report) return;
    const unsubscribe = subscribeToReportComments(report.id, () => fetchComments(report.id));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, past]);

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
      // Fix 1: كانت الرسالة ثابتة "حاول تاني" مهما كان سبب الخطأ. دلوقتي
      // لو السبب إن الموظف بعت تقرير اليوم ده بالفعل، بتظهر رسالة واضحة
      // "قد تم التسليم" بدل الرسالة العامة.
      showToast("error", getSubmitDailyReportErrorMessage(err));
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
              const reportComments = comments[r.id] ?? [];
              const isCommentsLoading = !!commentsLoading[r.id];

              return (
                <Card key={r.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleOpen(i, r.id)}
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

                      <div className="pt-3 mt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5 mb-2 font-semibold text-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          ملاحظات المدير
                        </div>

                        {isCommentsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            جارِ تحميل الملاحظات...
                          </div>
                        ) : reportComments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            مفيش ملاحظات على التقرير ده لحد دلوقتي.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportComments.map((c) => (
                              <div
                                key={c.id}
                                className="rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-800 leading-relaxed"
                              >
                                <p>{c.body}</p>
                                <div className="mt-1 text-[10px] text-amber-700/70">
                                  {new Date(c.created_at).toLocaleString("ar-EG", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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