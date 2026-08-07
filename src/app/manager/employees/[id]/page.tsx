// src/app/manager/employees/[id]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { Avatar, Card, PageHeader, Pill, SectionTitle, StatCard } from "@/components/manager/primitives";
import {
  Mail, Phone, MapPin, Briefcase, Building2, Calendar, Loader2,
  Pencil, X, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import {
  getEmployeeById,
  getEmployeeTaskStats,
  getEmployeeReportsCount,
  getEmployeeFilesCount,
  getEmployeeAttendanceStats,
  updateEmployee,
  getAllPositions,
  getAllBranches,
  type EmployeeRow,
  type EmployeeTaskStats,
  type EmployeeAttendanceStats,
} from "@/modules/employees/api/employees.api";
import { getDepartments, type Department } from "@/modules/department/api/department.api";
import type { PositionRecord, BranchRecord } from "@/types/user";
import { useToast } from "@/components/toast";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "teal" | "muted" | "primary"> = {
  "نشط": "success",
  "معطل": "muted",
  "في إجازة": "teal",
  "متأخر": "warning",
  "غائب": "danger",
};

const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;
const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/;

function normalizePhone(v: string) {
  return v.replace(/[\s-]/g, "");
}

function formatJoinDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type FormState = {
  name: string;
  dept: string;
  position: string;
  branch: string;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
};

export default function EmployeeProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const showToast = useToast();

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [taskStats, setTaskStats] = useState<EmployeeTaskStats | null>(null);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const [filesCount, setFilesCount] = useState<number | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<EmployeeAttendanceStats | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Edit modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", dept: "", position: "", branch: "",
    personalPhone: "", workPhone: "", saudiPhone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    try {
      const [emp, tasks, reports, files, attendance, depts, poss, brs] = await Promise.all([
        getEmployeeById(id),
        getEmployeeTaskStats(id),
        getEmployeeReportsCount(id),
        getEmployeeFilesCount(id),
        getEmployeeAttendanceStats(id),
        getDepartments(),
        getAllPositions(),
        getAllBranches(),
      ]);
      setEmployee(emp);
      setTaskStats(tasks);
      setReportsCount(reports);
      setFilesCount(files);
      setAttendanceStats(attendance);
      setDepartments(depts);
      setPositions(poss);
      setBranches(brs);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل بيانات الموظف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openEditModal() {
    if (!employee) return;
    setForm({
      name: employee.full_name,
      dept: employee.department?.name ?? "",
      position: employee.position?.title ?? "",
      branch: employee.branch?.city ?? "",
      personalPhone: employee.personalPhone,
      workPhone: employee.workPhone,
      saudiPhone: employee.saudiPhone,
    });
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(employee.photo_url ?? null);
    setModalOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 3) {
      next.name = "اكتب اسم الموظف كامل (3 أحرف على الأقل)";
    }
    if (!form.dept) next.dept = "اختر القسم";
    if (!form.position) next.position = "اختر الوظيفة";
    if (!form.branch) next.branch = "اختر الفرع";

    const personal = normalizePhone(form.personalPhone);
    if (personal && !EGYPT_PHONE_RE.test(personal)) next.personalPhone = "رقم مصري غير صحيح (مثال: 01012345678)";

    const work = normalizePhone(form.workPhone);
    if (work && !EGYPT_PHONE_RE.test(work)) next.workPhone = "رقم مصري غير صحيح (مثال: 01012345678)";

    const saudi = normalizePhone(form.saudiPhone);
    if (saudi && !SAUDI_PHONE_RE.test(saudi)) next.saudiPhone = "رقم سعودي غير صحيح (مثال: 0512345678)";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      showToast("error", "في بيانات ناقصة أو غير صحيحة، راجع الحقول باللون الأحمر");
      return;
    }

    const selectedDept = departments.find((d) => d.name === form.dept);
    const selectedPos = positions.find((p) => p.title === form.position);
    const selectedBranch = branches.find((b) => b.city === form.branch);

    if (!selectedDept || !selectedPos || !selectedBranch) {
      showToast("error", "القسم أو الوظيفة أو الفرع المختار غير صحيح");
      return;
    }

    setSubmitting(true);
    try {
      await updateEmployee({
        user_id: id,
        full_name: form.name.trim(),
        department_id: selectedDept.id,
        position_id: selectedPos.id,
        branch_id: selectedBranch.id,
        phone_numbers: [
          normalizePhone(form.personalPhone),
          normalizePhone(form.workPhone),
          normalizePhone(form.saudiPhone),
        ].filter(Boolean),
        photo: photoFile,
      });

      showToast("success", `تم تحديث بيانات ${form.name}`);
      setModalOpen(false);
      // نعيد تحميل بيانات الموظف عشان نتأكد إن اللي اتحفظ هو اللي هيظهر فعليًا
      await loadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حصل خطأ غير متوقع";
      showToast("error", `فشل تحديث بيانات الموظف: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> جاري تحميل بيانات الموظف...
      </div>
    );
  }

  if (loadError) {
    return <div className="p-6 text-sm text-destructive">خطأ: {loadError}</div>;
  }

  if (!employee) {
    return <div className="p-6 text-sm text-muted-foreground">الموظف غير موجود</div>;
  }

  const status = employee.emp_status || "نشط";
  const tone = STATUS_TONE[status] ?? "muted";
  const location = [employee.branch?.city, employee.branch?.address].filter(Boolean).join(" — ") || "—";

  return (
    <div className="space-y-6">
      <PageHeader title={`ملف الموظف · ${employee.full_name}`} subtitle={`رقم الموظف: ${id}`} />

      <Card>
        <div className="flex flex-wrap items-start gap-5">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={employee.full_name} className="size-18 rounded-full object-cover border border-border" />
          ) : (
            <Avatar name={employee.full_name} size={72} />
          )}

          <div className="flex-1 min-w-[240px]">
            <div className="text-xl font-bold">{employee.full_name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{employee.position?.title ?? "—"}</div>

            {/* كل البيانات اللي بتتسجل وقت الإضافة — إيميل + 3 أرقام تلفون منفصلة */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div className="flex items-center gap-1.5"><Mail className="size-3.5" /> {employee.email || "—"}</div>
              <div className="flex items-center gap-1.5" dir="ltr"><Phone className="size-3.5" /> {employee.personalPhone || "—"} <span className="text-[10px]">(شخصي)</span></div>
              <div className="flex items-center gap-1.5" dir="ltr"><Phone className="size-3.5" /> {employee.workPhone || "—"} <span className="text-[10px]">(شغل)</span></div>
              <div className="flex items-center gap-1.5" dir="ltr"><Phone className="size-3.5" /> {employee.saudiPhone || "—"} <span className="text-[10px]">(سعودي)</span></div>
              <div className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {location}</div>
              <div className="flex items-center gap-1.5"><Building2 className="size-3.5" /> {employee.department?.name ?? "—"}</div>
              <div className="flex items-center gap-1.5"><Briefcase className="size-3.5" /> {employee.branch?.city ?? "—"}</div>
              <div className="flex items-center gap-1.5"><Calendar className="size-3.5" /> عُيّن {formatJoinDate(employee.created_at)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Pill tone={tone}>{status}</Pill>
            <button
              onClick={openEditModal}
              className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent"
            >
              <Pencil className="size-3.5" /> تعديل البيانات
            </button>
          </div>
        </div>
      </Card>

      {/* المهام + التقارير + الملفات = بيانات حقيقية من الباك (tasks / daily_reports / files) */}
      {/* النقاط = لسه mock، مفيش جدول points/rewards في الباك */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard dense label="المهام" value={String(taskStats?.total ?? 0)} tone="primary" />
        <StatCard dense label="المكتملة" value={String(taskStats?.completed ?? 0)} tone="success" />
        <StatCard dense label="المتأخرة" value={String(taskStats?.late ?? 0)} tone="danger" />
        <StatCard dense label="التقارير" value={String(reportsCount ?? 0)} tone="teal" />
        <StatCard dense label="الملفات" value={String(filesCount ?? 0)} tone="warning" />
        <StatCard dense label="النقاط" value="940" tone="primary" />
      </div>

      {/* أيام حضور + تأخير = بيانات حقيقية من الباك (attendance، الشهر الحالي) */}
      {/* غياب + الشكاوى + تحقيق Target = لسه mock، مفيش endpoint موثق ليهم */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard dense label="أيام حضور" value={String(attendanceStats?.presentDays ?? 0)} tone="success" />
        <StatCard dense label="غياب" value="1" tone="danger" />
        <StatCard dense label="تأخير" value={String(attendanceStats?.lateDays ?? 0)} tone="warning" />
        <StatCard dense label="الشكاوى" value="0" tone="muted" />
        <StatCard dense label="تحقيق Target" value="112%" tone="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle sub="Timeline">سجل النشاط</SectionTitle>
          {/* التايم لاين ده لسه بيانات وهمية — مفيش endpoint موحّد بيجمع
              الأحداث دي (تقارير/مهام/خصومات/مكافآت) في مكان واحد */}
          <ol className="space-y-3">
            {[
              { d: "20 يوليو", t: "رفعت تقرير اليوم", tone: "teal" },
              { d: "19 يوليو", t: "أنهت مهمة تصميم كاروسيل", tone: "success" },
              { d: "18 يوليو", t: "رفعت شيت ليدز — تم الاعتماد", tone: "success" },
              { d: "17 يوليو", t: "حصلت على مكافأة (150 ج)", tone: "warning" },
              { d: "12 يوليو", t: "خصم بسبب تأخير 20 دقيقة", tone: "danger" },
            ].map((x, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: `var(--${x.tone === "teal" ? "teal" : x.tone === "success" ? "success" : x.tone === "warning" ? "warning" : "destructive"})` }} />
                <div className="flex-1">
                  <div className="text-sm">{x.t}</div>
                  <div className="text-[11px] text-muted-foreground">{x.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* --- Edit modal — متصل بالباك فعليًا عن طريق updateEmployee (update-user) --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setModalOpen(false)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-warm-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">تعديل بيانات الموظف</h2>
              <button onClick={() => setModalOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field label="الاسم بالكامل" error={errors.name} required>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass(!!errors.name)}
                />
              </Field>

              <Field label="صورة الموظف">
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="size-14 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="size-14 rounded-full bg-accent grid place-items-center text-xs text-muted-foreground">صورة</div>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs" />
                </div>
              </Field>

              <Field label="القسم" error={errors.dept} required>
                <select value={form.dept} onChange={(e) => updateField("dept", e.target.value)} className={inputClass(!!errors.dept)}>
                  <option value="">اختر القسم</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>

              <Field label="الوظيفة" error={errors.position} required>
                <select value={form.position} onChange={(e) => updateField("position", e.target.value)} className={inputClass(!!errors.position)}>
                  <option value="">اختر الوظيفة</option>
                  {positions.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
                </select>
              </Field>

              <Field label="الفرع" error={errors.branch} required>
                <select value={form.branch} onChange={(e) => updateField("branch", e.target.value)} className={inputClass(!!errors.branch)}>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => <option key={b.id} value={b.city}>{b.city}</option>)}
                </select>
              </Field>

              <Field label="رقم التلفون الشخصي" error={errors.personalPhone}>
                <input value={form.personalPhone} onChange={(e) => updateField("personalPhone", e.target.value)} className={inputClass(!!errors.personalPhone)} dir="ltr" placeholder="01012345678" />
              </Field>

              <Field label="رقم تلفون الشغل" error={errors.workPhone}>
                <input value={form.workPhone} onChange={(e) => updateField("workPhone", e.target.value)} className={inputClass(!!errors.workPhone)} dir="ltr" placeholder="01098765432" />
              </Field>

              <Field label="الرقم السعودي" error={errors.saudiPhone}>
                <input value={form.saudiPhone} onChange={(e) => updateField("saudiPhone", e.target.value)} className={inputClass(!!errors.saudiPhone)} dir="ltr" placeholder="0512345678" />
              </Field>

              <p className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground">
                تعديل الإيميل أو الباسورد بيتم من مكان تاني — مش من الفورم ده حاليًا.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-accent">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition ${
    hasError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"
  }`;
}