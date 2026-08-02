// src/app/manager/employees/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, Card, PageHeader, Pill, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import * as XLSX from "xlsx";
import {
  Plus, Search, Users, MoreVertical, X, Eye, EyeOff, RefreshCw, Copy, Trash2, Power, Pencil, FileSpreadsheet,
} from "lucide-react";

type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";

type EmployeeStatus = "نشط" | "معطل" | "في إجازة" | "متأخر" | "غائب";

type Employee = {
  id: string;
  name: string;
  dept: string;
  branch: string;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  email: string;
  password: string;
  status: EmployeeStatus;
  tone: Tone;
  last: string;
};

const DEPARTMENTS = ["سوشيال ميديا", "تسويق", "داش", "كول سنتر"];

const STATUS_TONE: Record<EmployeeStatus, Tone> = {
  "نشط": "success",
  "معطل": "muted",
  "في إجازة": "teal",
  "متأخر": "warning",
  "غائب": "danger",
};

// تحقق مبسّط من صيغة الأرقام (مصري 01xxxxxxxxx / سعودي 05xxxxxxxx أو 9665xxxxxxxx)
const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;
const SAUDI_PHONE_RE = /^(?:\+?966|00966|0)?5[0-9]{8}$/;

function normalizePhone(v: string) {
  return v.replace(/[\s-]/g, "");
}

const ARABIC_TO_LATIN: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "e", "آ": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "g", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "z", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w",
  "ي": "y", "ى": "a", "ة": "a", "ء": "a", "ئ": "e", "ؤ": "o", " ": ".",
};

function transliterate(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .split("")
    .map((ch) => ARABIC_TO_LATIN[ch] ?? (/[a-zA-Z0-9]/.test(ch) ? ch : ""))
    .join("")
    .toLowerCase();
}

function generateEmail(name: string, existing: Employee[]) {
  const base = transliterate(name) || "emp";
  let email = `${base}@marketingco.com`;
  let n = 1;
  while (existing.some((e) => e.email === email)) {
    n += 1;
    email = `${base}${n}@marketingco.com`;
  }
  return email;
}

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const initialEmployees: Employee[] = [
  { id: "1", name: "نورا حسن", dept: "سوشيال ميديا", branch: "القاهرة", personalPhone: "01011122233", workPhone: "01099988877", saudiPhone: "0512345678", email: "nora.hassan@marketingco.com", password: "Xk9mPz2Qa", status: "نشط", tone: "success", last: "اليوم 08:35" },
  { id: "2", name: "محمود علي", dept: "كول سنتر", branch: "الإسكندرية", personalPhone: "01123344556", workPhone: "01288877665", saudiPhone: "0555566778", email: "mahmoud.ali@marketingco.com", password: "Rj4tYw8Nb", status: "نشط", tone: "success", last: "اليوم 09:02" },
  { id: "3", name: "سارة إبراهيم", dept: "تسويق", branch: "القاهرة", personalPhone: "01234455667", workPhone: "01555566778", saudiPhone: "0533221144", email: "sara.ibrahim@marketingco.com", password: "Hs3vLm7Kd", status: "في إجازة", tone: "teal", last: "أمس 09:10" },
  { id: "4", name: "كريم سعيد", dept: "داش", branch: "الجيزة", personalPhone: "01055667788", workPhone: "01166778899", saudiPhone: "0567788990", email: "karim.saeed@marketingco.com", password: "Fg6bQx4Tp", status: "متأخر", tone: "warning", last: "اليوم 10:22" },
  { id: "5", name: "دينا فتحي", dept: "سوشيال ميديا", branch: "القاهرة", personalPhone: "01277889900", workPhone: "01399001122", saudiPhone: "0544332211", email: "dina.fathy@marketingco.com", password: "Wm8nJc5Ry", status: "نشط", tone: "success", last: "اليوم 08:50" },
  { id: "6", name: "خالد يوسف", dept: "داش", branch: "الإسكندرية", personalPhone: "01500112233", workPhone: "01011223344", saudiPhone: "0522113344", email: "khaled.youssef@marketingco.com", password: "Dp2sVn9Lc", status: "غائب", tone: "danger", last: "قبل 3 أيام" },
];

type FormState = {
  name: string;
  englishName: string;
  dept: string;
  branch: string;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  email: string;
  password: string;
};

const emptyForm: FormState = {
  name: "", englishName: "", dept: "", branch: "",
  personalPhone: "", workPhone: "", saudiPhone: "", email: "", password: "",
};

export default function EmployeesPage() {
  const showToast = useToast();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const filtered = useMemo(() => {
    let list = employees.filter((e) => {
      const q = search.trim();
      if (
        q &&
        !e.name.includes(q) &&
        !e.email.includes(q) &&
        !e.personalPhone.includes(q) &&
        !e.workPhone.includes(q)
      ) return false;
      if (deptFilter && e.dept !== deptFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "newest") return Number(b.id) - Number(a.id);
      if (sortBy === "name") return a.name.localeCompare(b.name, "ar");
      return 0;
    });
    return list;
  }, [employees, search, deptFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === "نشط").length,
    onLeave: employees.filter((e) => e.status === "في إجازة").length,
    lateAbsent: employees.filter((e) => e.status === "متأخر" || e.status === "غائب").length,
  }), [employees]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setEmailTouched(false);
    setShowPassword(false);
    setModalOpen(true);
  }

  function openEditModal(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name, englishName: "", dept: emp.dept, branch: emp.branch,
      personalPhone: emp.personalPhone, workPhone: emp.workPhone, saudiPhone: emp.saudiPhone,
      email: emp.email, password: emp.password,
    });
    setErrors({});
    setEmailTouched(true);
    setShowPassword(false);
    setModalOpen(true);
    setOpenMenuId(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if ((key === "name" || key === "englishName") && !emailTouched) {
        const base = next.englishName || next.name;
        if (base.trim()) {
          next.email = generateEmail(base, employees.filter((e) => e.id !== editingId));
        }
      }
      if (key === "name" && !next.password) {
        next.password = generatePassword();
      }
      return next;
    });
    setErrors((er) => ({ ...er, [key]: undefined }));
  }

  function regeneratePassword() {
    setForm((f) => ({ ...f, password: generatePassword() }));
  }

  function regenerateEmail() {
    const base = form.englishName || form.name;
    setForm((f) => ({ ...f, email: generateEmail(base, employees.filter((e) => e.id !== editingId)) }));
    setEmailTouched(false);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim() || form.name.trim().length < 3) {
      next.name = "اكتب اسم الموظف كامل (3 أحرف على الأقل)";
    }
    if (!form.dept) next.dept = "اختر القسم";

    const personal = normalizePhone(form.personalPhone);
    if (!personal) next.personalPhone = "رقم التلفون الشخصي مطلوب";
    else if (!EGYPT_PHONE_RE.test(personal)) next.personalPhone = "رقم مصري غير صحيح (مثال: 01012345678)";

    const work = normalizePhone(form.workPhone);
    if (!work) next.workPhone = "رقم تلفون الشغل مطلوب";
    else if (!EGYPT_PHONE_RE.test(work)) next.workPhone = "رقم مصري غير صحيح (مثال: 01012345678)";
    else if (personal && work && personal === work) next.workPhone = "لازم يبقى مختلف عن الرقم الشخصي";

    const saudi = normalizePhone(form.saudiPhone);
    if (!saudi) next.saudiPhone = "الرقم السعودي مطلوب";
    else if (!SAUDI_PHONE_RE.test(saudi)) next.saudiPhone = "رقم سعودي غير صحيح (مثال: 0512345678)";

    if (!form.email.trim()) next.email = "الإيميل مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "صيغة الإيميل غير صحيحة";
    else if (employees.some((e) => e.email === form.email.trim() && e.id !== editingId)) next.email = "الإيميل ده مستخدم بالفعل";

    if (!form.password || form.password.length < 6) next.password = "الباسورد لازم 6 خانات على الأقل";

    const allPhones = [personal, work, saudi].filter(Boolean);
    const phoneTaken = employees.some((e) => {
      if (e.id === editingId) return false;
      return allPhones.includes(e.personalPhone) || allPhones.includes(e.workPhone) || allPhones.includes(e.saudiPhone);
    });
    if (phoneTaken && !next.personalPhone && !next.workPhone && !next.saudiPhone) {
      next.personalPhone = "أحد الأرقام مستخدم بالفعل مع موظف آخر";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      showToast("error", "في بيانات ناقصة أو غير صحيحة، راجع الحقول باللون الأحمر");
      return;
    }

    if (editingId) {
      setEmployees((list) => list.map((emp) => emp.id === editingId ? {
        ...emp,
        name: form.name.trim(),
        dept: form.dept,
        branch: form.branch.trim() || emp.branch,
        personalPhone: normalizePhone(form.personalPhone),
        workPhone: normalizePhone(form.workPhone),
        saudiPhone: normalizePhone(form.saudiPhone),
        email: form.email.trim(),
        password: form.password,
      } : emp));
      showToast("success", `تم تحديث بيانات ${form.name}`);
    } else {
      const newEmployee: Employee = {
        id: String(Date.now()),
        name: form.name.trim(),
        dept: form.dept,
        branch: form.branch.trim() || "-",
        personalPhone: normalizePhone(form.personalPhone),
        workPhone: normalizePhone(form.workPhone),
        saudiPhone: normalizePhone(form.saudiPhone),
        email: form.email.trim(),
        password: form.password,
        status: "نشط",
        tone: "success",
        last: "لم يسجل الدخول بعد",
      };
      setEmployees((list) => [newEmployee, ...list]);
      showToast("success", `تم إضافة ${form.name} — إيميل الدخول: ${newEmployee.email}`);
    }
    setModalOpen(false);
  }

  function toggleStatus(emp: Employee) {
    const nextStatus: EmployeeStatus = emp.status === "معطل" ? "نشط" : "معطل";
    setEmployees((list) => list.map((e) => e.id === emp.id ? { ...e, status: nextStatus, tone: STATUS_TONE[nextStatus] } : e));
    showToast("success", nextStatus === "معطل" ? `تم تعطيل حساب ${emp.name}` : `تم تفعيل حساب ${emp.name}`);
    setOpenMenuId(null);
  }

  function deleteEmployee(emp: Employee) {
    if (!window.confirm(`متأكد إنك عايز تحذف ${emp.name}؟ الإجراء ده مش هيتراجع.`)) return;
    setEmployees((list) => list.filter((e) => e.id !== emp.id));
    showToast("success", `تم حذف ${emp.name}`);
    setOpenMenuId(null);
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      showToast("error", "مفيش بيانات عشان تتصدّر");
      return;
    }

    const rows = filtered.map((e) => ({
      "الاسم": e.name,
      "القسم": e.dept,
      "الفرع": e.branch,
      "الهاتف الشخصي": e.personalPhone,
      "هاتف الشغل": e.workPhone,
      "الهاتف السعودي": e.saudiPhone,
      "الإيميل": e.email,
      "الباسورد": e.password,
      "الحالة": e.status,
      "آخر حضور": e.last,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الموظفون");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `الموظفون-${dateStr}.xlsx`);

    showToast("success", `تم تصدير ${filtered.length} موظف لملف Excel`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        subtitle="إدارة كاملة لبيانات الموظفين والأداء."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground shadow-warm hover:opacity-90"
            >
              <FileSpreadsheet className="size-4" /> تصدير Excel
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:bg-primary-dark"
            >
              <Plus className="size-4" /> إضافة موظف جديد
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="إجمالي الموظفين" value={stats.total} icon={Users} tone="primary" />
        <StatCard dense label="نشط" value={stats.active} tone="success" />
        <StatCard dense label="في إجازة" value={stats.onLeave} tone="teal" />
        <StatCard dense label="متأخر/غائب" value={stats.lateAbsent} tone="warning" />
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pr-10 pl-4 text-sm outline-none focus:border-primary/50"
              placeholder="ابحث بالاسم أو الإيميل أو رقم التلفون..."
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-accent"
          >
            <option value="">كل الأقسام</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-accent"
          >
            <option value="">كل الحالات</option>
            {(["نشط", "في إجازة", "متأخر", "غائب", "معطل"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="mr-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs outline-none"
            >
              <option value="newest">ترتيب: الأحدث إضافة</option>
              <option value="name">الاسم (أ-ي)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>رقم التلفون</th><th>القسم</th><th>الفرع</th><th>الحالة</th><th>آخر حضور</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="row-hover hover:row-hover-active">
                  <td className="px-4 py-3">
                    <Link href={`/manager/employees/${e.id}`} className="flex items-center gap-3">
                      <Avatar name={e.name} />
                      <span className="font-semibold hover:text-primary">{e.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs tabular text-muted-foreground" dir="ltr">{e.personalPhone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.dept}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.branch}</td>
                  <td className="px-4 py-3"><Pill tone={e.tone}>{e.status}</Pill></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.last}</td>
                  <td className="relative px-4 py-3">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === e.id ? null : e.id)}
                      className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuId === e.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute left-4 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-warm">
                          <button onClick={() => openEditModal(e)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm hover:bg-accent">
                            <Pencil className="size-4 text-primary" /> تعديل البيانات
                          </button>
                          <button onClick={() => toggleStatus(e)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm hover:bg-accent">
                            <Power className="size-4 text-warning" /> {e.status === "معطل" ? "تفعيل الحساب" : "تعطيل الحساب"}
                          </button>
                          <button onClick={() => deleteEmployee(e)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm text-destructive hover:bg-destructive/10">
                            <Trash2 className="size-4" /> حذف الموظف
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    مفيش نتائج مطابقة للبحث/الفلتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setModalOpen(false)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-warm-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</h2>
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
                  placeholder="مثال: نورا حسن"
                />
              </Field>

              <Field label="الاسم بالإنجليزي (اختياري — لتوليد إيميل أدق)">
                <input
                  value={form.englishName}
                  onChange={(e) => updateField("englishName", e.target.value)}
                  className={inputClass(false)}
                  placeholder="مثال: Nora Hassan"
                  dir="ltr"
                />
              </Field>

              <Field label="القسم" error={errors.dept} required>
                <select value={form.dept} onChange={(e) => updateField("dept", e.target.value)} className={inputClass(!!errors.dept)}>
                  <option value="">اختر القسم</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>

              <Field label="الفرع (اختياري)">
                <input value={form.branch} onChange={(e) => updateField("branch", e.target.value)} className={inputClass(false)} placeholder="مثال: القاهرة" />
              </Field>

              <Field label="رقم التلفون الشخصي" error={errors.personalPhone} required>
                <input
                  value={form.personalPhone}
                  onChange={(e) => updateField("personalPhone", e.target.value)}
                  className={inputClass(!!errors.personalPhone)}
                  placeholder="01012345678"
                  dir="ltr"
                />
              </Field>

              <Field label="رقم تلفون الشغل" error={errors.workPhone} required>
                <input
                  value={form.workPhone}
                  onChange={(e) => updateField("workPhone", e.target.value)}
                  className={inputClass(!!errors.workPhone)}
                  placeholder="01098765432"
                  dir="ltr"
                />
              </Field>

              <Field label="رقم السعودي" error={errors.saudiPhone} required>
                <input
                  value={form.saudiPhone}
                  onChange={(e) => updateField("saudiPhone", e.target.value)}
                  className={inputClass(!!errors.saudiPhone)}
                  placeholder="0512345678"
                  dir="ltr"
                />
              </Field>

              <Field label="إيميل الدخول" error={errors.email} required>
                <div className="flex gap-2">
                  <input
                    value={form.email}
                    onChange={(e) => { setEmailTouched(true); updateField("email", e.target.value); }}
                    className={inputClass(!!errors.email)}
                    placeholder="name@marketingco.com"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={regenerateEmail}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:bg-accent"
                    title="توليد إيميل جديد"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </div>
              </Field>

              <Field label="باسورد الدخول" error={errors.password} required>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className={inputClass(!!errors.password) + " pl-10"}
                      placeholder="8 خانات على الأقل"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={regeneratePassword} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:bg-accent" title="توليد باسورد جديد">
                    <RefreshCw className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(form.password); showToast("success", "تم نسخ الباسورد"); }}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:bg-accent"
                    title="نسخ"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </Field>

              {!editingId && (
                <p className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground">
                  هيتولد للموظف إيميل وباسورد تلقائي بمجرد كتابة الاسم، وتقدر تعدّلهم قبل الحفظ. سجّل الباسورد ده وابعته للموظف — مش هيتحفظ في صورة واضحة بعد كده.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
                  {editingId ? "حفظ التعديلات" : "إضافة الموظف"}
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

function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
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