// src/app/manager/employees/page.tsx
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Avatar, Button, Card, Input, PageHeader, Pill, Select, StatCard, TableShell } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import * as XLSX from "xlsx";
import {
  Plus, Search, Users, MoreVertical, X, Eye, EyeOff, RefreshCw, Copy, Power, Pencil, FileSpreadsheet,
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
import {
  EMP_STATUS_LABEL_AR,
  EMP_STATUS_TONE,
  EMP_STATUS_OPTIONS,
  normalizeEmpStatus,
  type EmpStatus,
} from "@/lib/emp-status-labels";
import {
  normalizePhone,
  validateEmployeeCore,
  validateEmployeeEmail,
  validateEmployeePassword,
} from "@/lib/validation/employee-form";

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
  status: EmpStatus;
  last: string;
  photoUrl?: string | null;
  // ⚠️ id بقى UUID مش رقم تسلسلي، فمينفعش نرتب بيه رقميًا زي الأول.
  // بنستخدم created_at بدل كده في ترتيب "الأحدث إضافة".
  createdAt: string;
};

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
  deptId: number | "";
  positionId: number | "";
  branchId: number | "";
  personalPhone: string;
  workPhone: string;
  saudiPhone: string;
  email: string;
  password: string;
};

const emptyForm: FormState = {
  name: "", deptId: "", positionId: "", branchId: "",
  personalPhone: "", workPhone: "", saudiPhone: "", email: "", password: "",
};

function mapEmployeeRow(e: Awaited<ReturnType<typeof getEmployees>>[number]): Employee {
  return {
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
    status: normalizeEmpStatus(e.emp_status),
    last: "-",
    photoUrl: e.photo_url ?? null,
    createdAt: e.created_at ?? "",
  };
}

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
        setEmployees(emps.map(mapEmployeeRow));
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
  const [statusFilter, setStatusFilter] = useState<EmpStatus | "">("");
  const [sortBy, setSortBy] = useState("newest");

  // ---- Row action menu (Portal-based عشان مايتقصش داخل الكارد اللي عندها overflow-hidden) ----
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ✅ الفيكس (#7): المنيو كانت دايمًا بتتفتح تحت الزرار (rect.bottom + 4)
  // من غير ما تتأكد إن فيه مساحة كافية تحته. في آخر صف بالجدول (أو أي صف
  // قريب من نهاية الشاشة) كانت المنيو بتتقص أو تحتاج سكرول عشان تتشاف.
  // دلوقتي بنحسب المساحة المتاحة تحت الزرار، ولو مش كفاية بنفتح المنيو
  // لفوق بدل تحت، وكمان بنمنعها تخرج برّه حواف الشاشة يمين/شمال.
  function toggleMenu(id: string) {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const btn = menuButtonRefs.current[id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const menuWidth = 176; // w-44
      const menuHeight = 108; // تقريبي لعنصرين (~54px للعنصر بعد ما شلنا الحذف)
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 16;

      const top = openUpward
        ? Math.max(8, rect.top - menuHeight - 4)
        : rect.bottom + 4;

      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        viewportWidth - menuWidth - 8
      );

      setMenuPos({ top, left });
    }
    setOpenMenuId(id);
  }

  useEffect(() => {
    function closeOnScroll() {
      setOpenMenuId(null);
      setMenuPos(null);
    }
    if (openMenuId) {
      window.addEventListener("scroll", closeOnScroll, true);
      window.addEventListener("resize", closeOnScroll);
    }
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [openMenuId]);

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
    active: employees.filter((e) => e.status === "active").length,
    onLeave: employees.filter((e) => e.status === "on_leave").length,
    suspended: employees.filter((e) => e.status === "suspended").length,
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
      deptId: emp.deptId ?? "",
      positionId: emp.positionId ?? "",
      branchId: emp.branchId ?? "",
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
    setMenuPos(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !emailTouched && typeof next.name === "string" && next.name.trim()) {
        next.email = generateEmail(next.name, employees.filter((e) => e.id !== editingId));
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
    setForm((f) => ({ ...f, email: generateEmail(f.name, employees.filter((e) => e.id !== editingId)) }));
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

  // ✅ الفيكس: الفاليديشن بقت في موديول مشترك (src/lib/validation/employee-form.ts)
  // وبتستخدم نفس القواعد بالظبط اللي صفحة البروفايل ([id]/page.tsx) بتستخدمها —
  // مفيش تناقض في القواعد بين الصفحتين تاني (required phones + فحص تكرار موحّد).
  function validate(): boolean {
    const coreErrors = validateEmployeeCore(
      {
        name: form.name,
        deptId: form.deptId,
        positionId: form.positionId,
        branchId: form.branchId,
        personalPhone: form.personalPhone,
        workPhone: form.workPhone,
        saudiPhone: form.saudiPhone,
      },
      {
        requirePhones: true,
        existing: employees.map((e) => ({
          id: e.id,
          name: e.name,
          personalPhone: e.personalPhone,
          workPhone: e.workPhone,
          saudiPhone: e.saudiPhone,
        })),
        excludeId: editingId,
      }
    );

    const next: Partial<Record<keyof FormState, string>> = { ...coreErrors };

    const emailError = validateEmployeeEmail(
      form.email,
      employees.map((e) => ({ id: e.id, email: e.email })),
      editingId
    );
    if (emailError) next.email = emailError;

    if (!editingId) {
      const passwordError = validateEmployeePassword(form.password);
      if (passwordError) next.password = passwordError;
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

    // ✅ الفيكس: بنبعت الـ IDs المختارة فعليًا من الـ Select (form.deptId/positionId/branchId)
    // بدل ما ندور تاني بالاسم (departments.find(d => d.name === form.dept)) — الدور بالاسم
    // كان بيمسك أول قسم/فرع/وظيفة يطابق الاسم بس، وده خطر لو فيه قسمين بنفس الاسم أو
    // فرعين في نفس المدينة، ممكن يحفظ ID غلط من غير ما حد يلاحظ.
    const selectedDept = departments.find((d) => d.id === form.deptId);
    const selectedPos = positions.find((p) => p.id === form.positionId);
    const selectedBranch = branches.find((b) => b.id === form.branchId);

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

        // ✅ بعد نجاح التحديث بنعيد جلب بيانات الموظف الحقيقية من الباك
        // (فيها رابط الصورة الحقيقي بعد الرفع) بدل ما نخزن الـ base64
        // preview المحلي كأنه هو الرابط النهائي.
        const { getEmployeeById } = await import("@/modules/employees/api/employees.api");
        const fresh = await getEmployeeById(editingId);

        setEmployees((list) => list.map((emp) => {
          if (emp.id !== editingId) return emp;
          if (fresh) return mapEmployeeRow(fresh);
          return {
            ...emp,
            name: form.name.trim(),
            dept: selectedDept.name,
            deptId: selectedDept.id,
            position: selectedPos.title,
            positionId: selectedPos.id,
            branch: selectedBranch.city,
            branchId: selectedBranch.id,
            personalPhone: normalizePhone(form.personalPhone),
            workPhone: normalizePhone(form.workPhone),
            saudiPhone: normalizePhone(form.saudiPhone),
            email: form.email.trim(),
          };
        }));

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
        dept: selectedDept.name,
        deptId: selectedDept.id,
        position: selectedPos.title,
        positionId: selectedPos.id,
        branch: selectedBranch.city,
        branchId: selectedBranch.id,
        personalPhone: normalizePhone(form.personalPhone),
        workPhone: normalizePhone(form.workPhone),
        saudiPhone: normalizePhone(form.saudiPhone),
        email: form.email.trim(),
        password: form.password,
        status: "active",
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

  // بنبعت قيمة enum إنجليزية حقيقية (active/suspended) بدل
  // "inactive" اللي مش موجودة في public.emp_status خالص.
  async function toggleStatus(emp: Employee) {
    const nextStatus: EmpStatus = emp.status === "suspended" ? "active" : "suspended";

    try {
      await updateEmployeeStatus(emp.id, nextStatus);
      setEmployees((list) => list.map((e) => e.id === emp.id ? { ...e, status: nextStatus } : e));
      showToast("success", nextStatus === "suspended" ? `تم تعطيل حساب ${emp.name}` : `تم تفعيل حساب ${emp.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حصل خطأ غير متوقع";
      showToast("error", `فشل تغيير حالة الموظف: ${message}`);
    }
    setOpenMenuId(null);
    setMenuPos(null);
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
      "الحالة": EMP_STATUS_LABEL_AR[e.status],
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
        <StatCard dense label="موقوف" value={stats.suspended} tone="warning" />
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
            onChange={(e) => setStatusFilter(e.target.value as EmpStatus | "")}
            className="h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-accent"
          >
            <option value="">كل الحالات</option>
            {EMP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{EMP_STATUS_LABEL_AR[s]}</option>)}
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
                  <td className="px-4 py-3"><Pill tone={EMP_STATUS_TONE[e.status]}>{EMP_STATUS_LABEL_AR[e.status]}</Pill></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.last}</td>
                  <td className="relative px-4 py-3">
                    <button
                      ref={(el) => { menuButtonRefs.current[e.id] = el; }}
                      onClick={() => toggleMenu(e.id)}
                      className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                    >
                      <MoreVertical className="size-4" />
                    </button>
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

      {/* القايمة دي بترندر في document.body عن طريق Portal بدل ما تترندر جوه
          الـ Card اللي عندها overflow-hidden — عشان كده كانت بتتقص لآخر موظف
          في الجدول. دلوقتي كمان بتحسب المكان صح فوق/تحت حسب المساحة المتاحة. */}
      {openMenuId && menuPos && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpenMenuId(null); setMenuPos(null); }} />
          <div
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-warm"
          >
            {(() => {
              const emp = employees.find((x) => x.id === openMenuId);
              if (!emp) return null;
              return (
                <>
                  <button onClick={() => openEditModal(emp)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm hover:bg-accent">
                    <Pencil className="size-4 text-primary" /> تعديل البيانات
                  </button>
                  <button onClick={() => toggleStatus(emp)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-right text-sm hover:bg-accent">
                    <Power className="size-4 text-warning" /> {emp.status === "suspended" ? "تفعيل الحساب" : "تعطيل الحساب"}
                  </button>
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}

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

              {/* ✅ الفيكس: قيمة الـ option بقت d.id (رقم) بدل d.name (نص) —
                  لو فيه قسمين بنفس الاسم كان ممكن يتحفظ ID غلط بدون ما حد يلاحظ */}
              <Field label="القسم" error={errors.deptId} required>
                <Select
                  value={form.deptId}
                  onChange={(e) => updateField("deptId", e.target.value ? Number(e.target.value) : "")}
                  className={inputClass(!!errors.deptId)}
                >
                  <option value="">اختر القسم</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>

              <Field label="الوظيفة" error={errors.positionId} required>
                <Select
                  value={form.positionId}
                  onChange={(e) => updateField("positionId", e.target.value ? Number(e.target.value) : "")}
                  className={inputClass(!!errors.positionId)}
                >
                  <option value="">اختر الوظيفة</option>
                  {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </Field>

              <Field label="الفرع" error={errors.branchId} required>
                <Select
                  value={form.branchId}
                  onChange={(e) => updateField("branchId", e.target.value ? Number(e.target.value) : "")}
                  className={inputClass(!!errors.branchId)}
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.city}</option>)}
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
                  تعديل الإيميل أو الباسورد مش متاح من الفورم ده حاليًا — محتاج Edge Function جديدة من الباك (admin.updateUserById) عشان المدير يقدر يغيّرهم لموظف تاني.
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