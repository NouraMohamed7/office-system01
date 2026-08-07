// src/app/manager/employees/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, Button, Card, Input, PageHeader, Pill, Select, StatCard, TableShell } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import * as XLSX from "xlsx";
import {
  Plus, Search, Users, MoreVertical, X, Eye, EyeOff, RefreshCw, Copy, Trash2, Power, Pencil, FileSpreadsheet,
} from "lucide-react";
import { getDepartments, type Department } from "@/modules/department/api/department.api";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  getAllPositions,
  getAllBranches,
} from "@/modules/employees/api/employees.api";
import type { PositionRecord, BranchRecord } from "@/types/user";

type Tone = "success" | "warning" | "danger" | "teal" | "muted" | "primary";

type EmployeeStatus = "نشط" | "معطل" | "في إجازة" | "متأخر" | "غائب";

type Employee = {
  id: string;
  name: string;
  dept: string;
  deptId?: number;
  position: string;
  positionId?: number;
  branch: string;
  branchId?: number;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  email: string;
  password: string;
  status: EmployeeStatus;
  tone: Tone;
  last: string;
  photoUrl?: string | null;
  // ⚠️ id بقى UUID مش رقم تسلسلي، فمينفعش نرتب بيه رقميًا زي الأول.
  // بنستخدم created_at بدل كده في ترتيب "الأحدث إضافة".
  createdAt: string;
};

const STATUS_TONE: Record<EmployeeStatus, Tone> = {
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

type FormState = {
  name: string;
  englishName: string;
  dept: string;
  position: string;
  branch: string;
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  email: string;
  password: string;
};

const emptyForm: FormState = {
  name: "", englishName: "", dept: "", position: "", branch: "",
  personalPhone: "", workPhone: "", saudiPhone: "", email: "", password: "",
};

export default function EmployeesPage() {
  const showToast = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [depts, emps, poss, brs] = await Promise.all([
          getDepartments(),
          getEmployees(),
          getAllPositions(),
          getAllBranches(),
        ]);

        setDepartments(depts);
        setPositions(poss);
        setBranches(brs);

        const mapped: Employee[] = emps.map((e) => ({
          id: e.id,
          name: e.full_name,
          dept: e.department?.name ?? "-",
          deptId: e.department?.id,
          position: e.position?.title ?? "-",
          positionId: e.position?.id,
          branch: e.branch?.city ?? "-",
          branchId: e.branch?.id,
          personalPhone: e.personalPhone,
          workPhone: e.workPhone,
          saudiPhone: e.saudiPhone,
          email: e.email,
          password: "", // مش هيترجع من الباك لأسباب أمنية
          status: (e.emp_status as EmployeeStatus) || "نشط",
          tone: STATUS_TONE[(e.emp_status as EmployeeStatus) || "نشط"] ?? "muted",
          last: "-",
          photoUrl: e.photo_url ?? null,
          createdAt: e.created_at ?? "",
        }));

        setEmployees(mapped);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "حصل خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
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
    setPhotoFile(null);
    setPhotoPreview(null);
    setModalOpen(true);
  }

  function openEditModal(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      englishName: "",
      dept: emp.dept,
      position: emp.position,
      branch: emp.branch,
      personalPhone: emp.personalPhone,
      workPhone: emp.workPhone,
      saudiPhone: emp.saudiPhone,
      email: emp.email,
      password: emp.password,
    });
    setErrors({});
    setEmailTouched(true);
    setShowPassword(false);
    setPhotoFile(null);
    setPhotoPreview(emp.photoUrl ?? null);
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
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

    if (!editingId && (!form.password || form.password.length < 6)) {
      next.password = "الباسورد لازم 6 خانات على الأقل";
    }

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

    // --- تعديل بيانات موظف موجود (متصل بالباك — update-user) ---
    if (editingId) {
      setSubmitting(true);
      try {
        await updateEmployee({
          user_id: editingId,
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

        setEmployees((list) => list.map((emp) => emp.id === editingId ? {
          ...emp,
          name: form.name.trim(),
          dept: form.dept,
          deptId: selectedDept.id,
          position: form.position,
          positionId: selectedPos.id,
          branch: form.branch,
          branchId: selectedBranch.id,
          personalPhone: normalizePhone(form.personalPhone),
          workPhone: normalizePhone(form.workPhone),
          saudiPhone: normalizePhone(form.saudiPhone),
          email: form.email.trim(),
          photoUrl: photoPreview ?? emp.photoUrl,
        } : emp));

        showToast("success", `تم تحديث بيانات ${form.name}`);
        setModalOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "حصل خطأ غير متوقع";
        showToast("error", `فشل تحديث بيانات الموظف: ${message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // --- إضافة موظف جديد — create-user Edge Function ---
    setSubmitting(true);
    try {
      const result = await createEmployee({
        full_name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_numbers: [
          normalizePhone(form.personalPhone),
          normalizePhone(form.workPhone),
          normalizePhone(form.saudiPhone),
        ].filter(Boolean),
        department_id: selectedDept.id,
        position_id: selectedPos.id,
        branch_id: selectedBranch.id,
        photo: photoFile,
      });

      showToast("success", `تم إضافة ${form.name} بنجاح — إيميل الدخول: ${form.email}`);

      type CreateUserResult = { user?: { id?: string } };
      const typedResult = result as CreateUserResult;

      const newEmployee: Employee = {
        id: typedResult?.user?.id || String(Date.now()),
        name: form.name.trim(),
        dept: form.dept,
        deptId: selectedDept.id,
        position: form.position,
        positionId: selectedPos.id,
        branch: form.branch,
        branchId: selectedBranch.id,
        personalPhone: normalizePhone(form.personalPhone),
        workPhone: normalizePhone(form.workPhone),
        saudiPhone: normalizePhone(form.saudiPhone),
        email: form.email.trim(),
        password: form.password,
        status: "نشط",
        tone: "success",
        last: "لم يسجل الدخول بعد",
        photoUrl: photoPreview,
        createdAt: new Date().toISOString(),
      };
      setEmployees((list) => [newEmployee, ...list]);
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حصل خطأ غير متوقع";
      showToast("error", `فشلت إضافة الموظف: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ✅ متصلة بالباك (update-user بحقل emp_status)
  // ⚠️ الباك بيرجع/بياخد القيمة بالإنجليزي (active/inactive)
  async function toggleStatus(emp: Employee) {
    const nextStatus: EmployeeStatus = emp.status === "معطل" ? "نشط" : "معطل";
    const backendStatus: "active" | "inactive" = nextStatus === "معطل" ? "inactive" : "active";

    try {
      await updateEmployeeStatus(emp.id, backendStatus);
      setEmployees((list) => list.map((e) => e.id === emp.id ? { ...e, status: nextStatus, tone: STATUS_TONE[nextStatus] } : e));
      showToast("success", nextStatus === "معطل" ? `تم تعطيل حساب ${emp.name}` : `تم تفعيل حساب ${emp.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حصل خطأ غير متوقع";
      showToast("error", `فشل تغيير حالة الموظف: ${message}`);
    }
    setOpenMenuId(null);
  }

  // ⚠️ لسه شغالة محلي بس — مفيش endpoint حذف موظف (delete-user) في دوك الباك حاليًا
  function deleteEmployee(emp: Employee) {
    if (!window.confirm(`متأكد إنك عايز تحذف ${emp.name}؟ الإجراء ده مش هيتراجع.`)) return;
    setEmployees((list) => list.filter((e) => e.id !== emp.id));
    showToast("success", `تم حذف ${emp.name} (محليًا فقط — مفيش endpoint حذف من الباك لسه)`);
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
      "الوظيفة": e.position,
      "الفرع": e.branch,
      "الهاتف الشخصي": e.personalPhone,
      "هاتف الشغل": e.workPhone,
      "الهاتف السعودي": e.saudiPhone,
      "الإيميل": e.email,
      "الحالة": e.status,
      "آخر حضور": e.last,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 26 }, { wch: 12 }, { wch: 16 },
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
            <Button onClick={handleExportExcel} variant="secondary" className="bg-success text-success-foreground hover:opacity-90">
              <FileSpreadsheet className="size-4" /> تصدير Excel
            </Button>
            <Button onClick={openAddModal}>
              <Plus className="size-4" /> إضافة موظف جديد
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard dense label="إجمالي الموظفين" value={stats.total} icon={Users} tone="primary" />
        <StatCard dense label="نشط" value={stats.active} tone="success" />
        <StatCard dense label="في إجازة" value={stats.onLeave} tone="teal" />
        <StatCard dense label="متأخر/غائب" value={stats.lateAbsent} tone="warning" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pr-10 pl-4 text-sm outline-none focus:border-primary/50"
              placeholder="ابحث بالاسم أو الإيميل أو رقم التلفون..."
            />
          </div>

          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-accent"
          >
            <option value="">كل الأقسام</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-accent"
          >
            <option value="">كل الحالات</option>
            {(["نشط", "في إجازة", "متأخر", "غائب", "معطل"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>

          <div className="mr-auto">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs outline-none"
            >
              <option value="newest">ترتيب: الأحدث إضافة</option>
              <option value="name">الاسم (أ-ي)</option>
            </Select>
          </div>
        </div>
      </Card>

      {loading && <p className="text-sm text-muted-foreground p-4">جاري تحميل بيانات الموظفين...</p>}
      {loadError && <p className="text-sm text-destructive p-4">خطأ: {loadError}</p>}

      <Card className="overflow-hidden p-0">
        <TableShell>
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right">
                <th>الموظف</th><th>رقم التلفون</th><th>القسم</th><th>الوظيفة</th><th>الفرع</th><th>الحالة</th><th>آخر حضور</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="row-hover hover:row-hover-active">
                  <td className="px-4 py-3">
                    <Link href={`/manager/employees/${e.id}`} className="flex items-center gap-3">
                      {e.photoUrl ? (
                        <img src={e.photoUrl} alt={e.name} className="size-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <Avatar name={e.name} />
                      )}
                      <span className="font-semibold hover:text-primary">{e.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs tabular text-muted-foreground" dir="ltr">{e.personalPhone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.dept}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.position}</td>
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
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    مفيش نتائج مطابقة للبحث/الفلتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>
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
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass(!!errors.name)}
                  placeholder="مثال: نورا حسن"
                />
              </Field>

              <Field label="الاسم بالإنجليزي (اختياري — لتوليد إيميل أدق)">
                <Input
                  value={form.englishName}
                  onChange={(e) => updateField("englishName", e.target.value)}
                  className={inputClass(false)}
                  placeholder="مثال: Nora Hassan"
                  dir="ltr"
                />
              </Field>

              <Field label="صورة الموظف (اختياري)">
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="size-14 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="size-14 rounded-full bg-accent grid place-items-center text-xs text-muted-foreground">صورة</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs file:ml-2 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs"
                  />
                </div>
              </Field>

              <Field label="القسم" error={errors.dept} required>
                <Select value={form.dept} onChange={(e) => updateField("dept", e.target.value)} className={inputClass(!!errors.dept)}>
                  <option value="">اختر القسم</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </Select>
              </Field>

              <Field label="الوظيفة" error={errors.position} required>
                <Select value={form.position} onChange={(e) => updateField("position", e.target.value)} className={inputClass(!!errors.position)}>
                  <option value="">اختر الوظيفة</option>
                  {positions.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
                </Select>
              </Field>

              <Field label="الفرع" error={errors.branch} required>
                <Select value={form.branch} onChange={(e) => updateField("branch", e.target.value)} className={inputClass(!!errors.branch)}>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => <option key={b.id} value={b.city}>{b.city}</option>)}
                </Select>
              </Field>

              <Field label="رقم التلفون الشخصي" error={errors.personalPhone} required>
                <Input
                  value={form.personalPhone}
                  onChange={(e) => updateField("personalPhone", e.target.value)}
                  className={inputClass(!!errors.personalPhone)}
                  placeholder="01012345678"
                  dir="ltr"
                />
              </Field>

              <Field label="رقم تلفون الشغل" error={errors.workPhone} required>
                <Input
                  value={form.workPhone}
                  onChange={(e) => updateField("workPhone", e.target.value)}
                  className={inputClass(!!errors.workPhone)}
                  placeholder="01098765432"
                  dir="ltr"
                />
              </Field>

              <Field label="رقم السعودي" error={errors.saudiPhone} required>
                <Input
                  value={form.saudiPhone}
                  onChange={(e) => updateField("saudiPhone", e.target.value)}
                  className={inputClass(!!errors.saudiPhone)}
                  placeholder="0512345678"
                  dir="ltr"
                />
              </Field>

              <Field label="إيميل الدخول" error={errors.email} required>
                <div className="flex gap-2">
                  <Input
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

              {!editingId && (
                <Field label="باسورد الدخول" error={errors.password} required>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
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
              )}

              {!editingId && (
                <p className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground">
                  هيتولد للموظف إيميل وباسورد تلقائي بمجرد كتابة الاسم، وتقدر تعدّلهم قبل الحفظ. سجّل الباسورد ده وابعته للموظف — مش هيتحفظ في صورة واضحة بعد كده.
                </p>
              )}
              {editingId && (
                <p className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground">
                  تعديل الإيميل أو الباسورد بيتم من مكان تاني (auth.updateUser) — مش من الفورم ده حاليًا.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
                >
                  {submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الموظف"}
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