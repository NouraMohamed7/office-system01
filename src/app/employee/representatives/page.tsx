// src/app/employee/representatives/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Truck,
  Phone,
  Plus,
  Search,
  X,
  ImagePlus,
  UserRound,
  Bike,
  Eye,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  type Representative,
  type SupervisorOption,
  getRepresentatives,
  getSupervisorOptions,
  createRepresentative,
  updateRepresentative,
  deleteRepresentative,
  getCurrentUserId,
  canManageRepresentative,
  formatCountry,
} from "@/modules/representatives/api/representatives.api";

type FormState = {
  name: string;
  phone1: string;
  phone2: string;
  supervisorId: string;
  hasMotorcycle: boolean;
  profileImg: File | null;
  identityFront: File | null;
  identityBack: File | null;
  licenseFront: File | null;
  licenseBack: File | null;
};

const emptyForm: FormState = {
  name: "",
  phone1: "",
  phone2: "",
  supervisorId: "",
  hasMotorcycle: true,
  profileImg: null,
  identityFront: null,
  identityBack: null,
  licenseFront: null,
  licenseBack: null,
};

export default function RepresentativesPage() {
  const showToast = useToast();

  const [reps, setReps] = useState<Representative[]>([]);
  const [loadingReps, setLoadingReps] = useState(true);

  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  // المستندات الحالية للمندوب وقت التعديل — بتتعرض لحد ما المستخدم يختار ملف جديد بدالها
  const [existingDocs, setExistingDocs] = useState<{
    profile_img: string | null;
    identity_front: string | null;
    identity_back: string | null;
    license_front: string | null;
    license_back: string | null;
  }>({ profile_img: null, identity_front: null, identity_back: null, license_front: null, license_back: null });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone1?: string;
    supervisorId?: string;
  }>({});

  const supervisorNameMap = useMemo(
    () => Object.fromEntries(supervisors.map((s) => [s.id, s.name])),
    [supervisors]
  );

  const loadReps = async () => {
    setLoadingReps(true);
    try {
      setReps(await getRepresentatives());
    } catch {
      showToast("error", "تعذر تحميل بيانات المناديب");
    } finally {
      setLoadingReps(false);
    }
  };

  useEffect(() => {
    loadReps();
    getCurrentUserId().then(setCurrentUserId).catch(() => setCurrentUserId(null));
    setLoadingSupervisors(true);
    getSupervisorOptions()
      .then(setSupervisors)
      .catch(() => showToast("error", "تعذر تحميل قائمة المشرفين"))
      .finally(() => setLoadingSupervisors(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return reps.filter((r) => {
      const q = search.trim();
      if (!q) return true;
      const supervisorName = supervisorNameMap[r.supervisor_id] || "";
      return (
        r.full_name.includes(q) ||
        r.phone_1.includes(q) ||
        (r.phone_2 || "").includes(q) ||
        supervisorName.includes(q)
      );
    });
  }, [reps, search, supervisorNameMap]);

  const totals = useMemo(
    () => ({
      total: reps.length,
      withMotorcycle: reps.filter((r) => r.has_motorcycle).length,
      withoutMotorcycle: reps.filter((r) => !r.has_motorcycle).length,
    }),
    [reps]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setExistingDocs({ profile_img: null, identity_front: null, identity_back: null, license_front: null, license_back: null });
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleStartAdd = () => {
    if (showForm && !editingId) {
      resetForm();
      return;
    }
    setForm(emptyForm);
    setFormErrors({});
    setEditingId(null);
    setShowForm(true);
  };

  const handleStartEdit = (rep: Representative) => {
    setForm({
      name: rep.full_name,
      phone1: rep.phone_1,
      phone2: rep.phone_2 || "",
      supervisorId: rep.supervisor_id,
      hasMotorcycle: rep.has_motorcycle,
      profileImg: null,
      identityFront: null,
      identityBack: null,
      licenseFront: null,
      licenseBack: null,
    });
    setExistingDocs({
      profile_img: rep.profile_img,
      identity_front: rep.identity_front,
      identity_back: rep.identity_back,
      license_front: rep.license_front,
      license_back: rep.license_back,
    });
    setFormErrors({});
    setEditingId(rep.id);
    setShowForm(true);
  };

  const handleSaveRep = async () => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "الاسم مطلوب";
    if (!form.phone1.trim()) errors.phone1 = "رقم الهاتف الأول مطلوب";
    if (!form.supervisorId) errors.supervisorId = "اختيار المشرف مطلوب";
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showToast("error", "فيه حقول ناقصة في الفورم");
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      if (editingId) {
        await updateRepresentative({
          rep_id: editingId,
          full_name: form.name.trim(),
          supervisor_id: form.supervisorId,
          has_motorcycle: form.hasMotorcycle,
          phone1: form.phone1.trim(),
          phone2: form.phone2.trim() || undefined,
          profileImg: form.profileImg,
          identityFront: form.identityFront,
          identityBack: form.identityBack,
          licenseFront: form.licenseFront,
          licenseBack: form.licenseBack,
        });
        showToast("success", `تم حفظ تعديلات ${form.name.trim()}`);
      } else {
        await createRepresentative({
          full_name: form.name.trim(),
          supervisor_id: form.supervisorId,
          has_motorcycle: form.hasMotorcycle,
          phone1: form.phone1.trim(),
          phone2: form.phone2.trim() || undefined,
          profileImg: form.profileImg,
          identityFront: form.identityFront,
          identityBack: form.identityBack,
          licenseFront: form.licenseFront,
          licenseBack: form.licenseBack,
        });
        showToast("success", `تم إضافة المندوب ${form.name.trim()}`);
      }
      await loadReps();
      resetForm();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "حصل خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId == null) return;
    const rep = reps.find((r) => r.id === deletingId);
    if (!rep) return;
    setDeleting(true);
    try {
      await deleteRepresentative(deletingId);
      setReps((prev) => prev.filter((r) => r.id !== deletingId));
      if (editingId === deletingId) resetForm();
      showToast("success", `تم حذف المندوب ${rep.full_name}`);
      setDeletingId(null);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "حصل خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      showToast("error", "مفيش بيانات عشان تتصدّر");
      return;
    }

    const rows = filtered.map((r, idx) => {
      const country = formatCountry(r.country);
      return {
        "م": idx + 1,
        "الاسم": r.full_name,
        "الهاتف الأول": r.phone_1,
        "الهاتف الثاني": r.phone_2 || "-",
        "المشرف": supervisorNameMap[r.supervisor_id] || r.supervisor_id,
        "الدولة": `${country.flag} ${country.name}`,
        "عنده موتوسيكل": r.has_motorcycle ? "نعم" : "لا",
        "الصورة الشخصية": r.profile_img ? "متوفرة" : "غير متوفرة",
        "البطاقة (وش)": r.identity_front ? "متوفرة" : "غير متوفرة",
        "البطاقة (ضهر)": r.identity_back ? "متوفرة" : "غير متوفرة",
        "الرخصة (وش)": r.license_front ? "متوفرة" : "غير متوفرة",
        "الرخصة (ضهر)": r.license_back ? "متوفرة" : "غير متوفرة",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المناديب");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `المناديب-${dateStr}.xlsx`);

    showToast("success", `تم تصدير ${filtered.length} مندوب لملف Excel`);
  };

  const viewingRep = reps.find((r) => r.id === viewingId) || null;
  const deletingRep = reps.find((r) => r.id === deletingId) || null;

  return (
    <PortalLayout title="المناديب" subtitle="إدارة مناديب التوصيل ومتابعة بياناتهم">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={Truck} label="إجمالي المناديب" value={String(totals.total)} tone="primary" />
        <MetricCard icon={Bike} label="عندهم موتوسيكل" value={String(totals.withMotorcycle)} tone="success" />
        <MetricCard icon={Bike} label="من غير موتوسيكل" value={String(totals.withoutMotorcycle)} tone="muted" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-sm font-semibold text-muted-foreground">
          {loadingReps ? "جاري تحميل المناديب..." : `${reps.length} مندوب مسجل`}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-success text-success-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </button>
          <button
            onClick={handleStartAdd}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition"
          >
            {showForm && !editingId ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm && !editingId ? "إغلاق" : "إضافة مندوب"}
          </button>
        </div>
      </div>

      {showForm && (
        <Card className="p-6 mb-6 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">{editingId ? "تعديل بيانات المندوب" : "مندوب جديد"}</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setFormErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder="اسم المندوب"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${formErrors.name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1.5">{formErrors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الأول</label>
              <input
                value={form.phone1}
                onChange={(e) => {
                  setForm((f) => ({ ...f, phone1: e.target.value }));
                  setFormErrors((p) => ({ ...p, phone1: undefined }));
                }}
                placeholder="01xxxxxxxxx"
                className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm
                  ${formErrors.phone1 ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
              />
              {formErrors.phone1 && <p className="text-xs text-destructive mt-1.5">{formErrors.phone1}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الثاني (اختياري)</label>
              <input
                value={form.phone2}
                onChange={(e) => setForm((f) => ({ ...f, phone2: e.target.value }))}
                placeholder="01xxxxxxxxx"
                className="mt-2 w-full h-11 rounded-xl border border-border bg-card focus:ring-2 focus:border-primary focus:ring-primary/20 outline-none px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">المشرف</label>
              <div className="relative mt-2">
                <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <select
                  value={form.supervisorId}
                  disabled={loadingSupervisors}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, supervisorId: e.target.value }));
                    setFormErrors((p) => ({ ...p, supervisorId: undefined }));
                  }}
                  className={`w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none pr-9 pl-3 text-sm disabled:opacity-60
                    ${formErrors.supervisorId ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
                >
                  <option value="">{loadingSupervisors ? "جاري التحميل..." : "اختر المشرف"}</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {formErrors.supervisorId && <p className="text-xs text-destructive mt-1.5">{formErrors.supervisorId}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">عنده موتوسيكل؟</label>
              <div className="mt-2 inline-flex rounded-xl bg-secondary p-1 w-full">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hasMotorcycle: true }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition ${
                    form.hasMotorcycle ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
                  }`}
                >
                  <Bike className="h-4 w-4" /> نعم
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hasMotorcycle: false }))}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold transition ${
                    !form.hasMotorcycle ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
                  }`}
                >
                  لا
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-bold text-foreground mb-3">الصور والمستندات</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <FileInputPreview
                label="الصورة الشخصية"
                file={form.profileImg}
                existingUrl={existingDocs.profile_img}
                onChange={(f) => setForm((s) => ({ ...s, profileImg: f }))}
              />
              <FileInputPreview
                label="صورة البطاقة (وش)"
                file={form.identityFront}
                existingUrl={existingDocs.identity_front}
                onChange={(f) => setForm((s) => ({ ...s, identityFront: f }))}
              />
              <FileInputPreview
                label="صورة البطاقة (ضهر)"
                file={form.identityBack}
                existingUrl={existingDocs.identity_back}
                onChange={(f) => setForm((s) => ({ ...s, identityBack: f }))}
              />
              <FileInputPreview
                label="صورة الرخصة (وش)"
                file={form.licenseFront}
                existingUrl={existingDocs.license_front}
                onChange={(f) => setForm((s) => ({ ...s, licenseFront: f }))}
              />
              <FileInputPreview
                label="صورة الرخصة (ضهر)"
                file={form.licenseBack}
                existingUrl={existingDocs.license_back}
                onChange={(f) => setForm((s) => ({ ...s, licenseBack: f }))}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSaveRep}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--primary-dark)] transition disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "حفظ التعديلات" : "حفظ المندوب"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border transition"
            >
              إلغاء
            </button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف أو المشرف"
              className="w-full h-10 rounded-xl border border-border bg-card pr-9 pl-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground border-b border-border">
                <th className="pb-3 font-semibold">الاسم</th>
                <th className="pb-3 font-semibold">الهاتف الأول</th>
                <th className="pb-3 font-semibold">الهاتف الثاني</th>
                <th className="pb-3 font-semibold">المشرف</th>
                <th className="pb-3 font-semibold">الدولة</th>
                <th className="pb-3 font-semibold">موتوسيكل</th>
                <th className="pb-3 font-semibold">الصور</th>
                <th className="pb-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loadingReps && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
                    </span>
                  </td>
                </tr>
              )}
              {!loadingReps && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    مفيش نتائج مطابقة
                  </td>
                </tr>
              )}
              {!loadingReps &&
                filtered.map((r) => {
                  const canManage = canManageRepresentative(r, currentUserId);
                  const country = formatCountry(r.country);
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-primary/5 transition">
                      <td className="py-3 font-semibold text-foreground">
                        <span className="inline-flex items-center gap-2">
                          {r.profile_img ? (
                            <img src={r.profile_img} alt={r.full_name} className="h-7 w-7 rounded-full object-cover border border-border" />
                          ) : (
                            <span className="h-7 w-7 rounded-full bg-secondary grid place-items-center text-muted-foreground">
                              <UserRound className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {r.full_name}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {r.phone_1}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {r.phone_2 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {r.phone_2}
                          </span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {loadingSupervisors ? "..." : supervisorNameMap[r.supervisor_id] || "غير معروف"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {country.flag} {country.name}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${
                            r.has_motorcycle ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Bike className="h-3.5 w-3.5" /> {r.has_motorcycle ? "نعم" : "لا"}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setViewingId(r.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" /> عرض الصور
                        </button>
                      </td>
                      <td className="py-3">
                        {!canManage ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <Pencil className="h-3.5 w-3.5" /> تعديل
                            </button>
                            <button
                              onClick={() => setDeletingId(r.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> حذف
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingRep && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setViewingId(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">صور {viewingRep.full_name}</h3>
              <button onClick={() => setViewingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DocPreview label="الصورة الشخصية" src={viewingRep.profile_img} />
              <DocPreview label="البطاقة (وش)" src={viewingRep.identity_front} />
              <DocPreview label="البطاقة (ضهر)" src={viewingRep.identity_back} />
              <DocPreview label="الرخصة (وش)" src={viewingRep.license_front} />
              <DocPreview label="الرخصة (ضهر)" src={viewingRep.license_back} />
            </div>
          </div>
        </div>
      )}

      {deletingRep && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeletingId(null)}
        >
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-muted-foreground mb-6">
              هل أنت متأكد إنك عايز تحذف المندوب <span className="font-semibold text-foreground">{deletingRep.full_name}</span>؟ الإجراء ده مش هيتقدر يتراجع عنه.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-destructive text-destructive-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                حذف
              </button>
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "teal" | "success" | "warning" | "danger" | "muted";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    teal: "bg-teal/10 text-teal",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[oklch(0.48_0.11_82)]",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${bg[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function FileInputPreview({
  label,
  file,
  existingUrl,
  onChange,
}: {
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    onChange(f || null);
  };

  const displayUrl = previewUrl || existingUrl || undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-11 px-4 rounded-xl border border-dashed border-border bg-secondary text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition flex items-center gap-2"
        >
          <ImagePlus className="h-4 w-4" /> {displayUrl ? "تغيير الصورة" : "رفع صورة"}
        </button>
        {displayUrl && <img src={displayUrl} alt={label} className="h-11 w-11 rounded-lg object-cover border border-border" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</div>
      {src ? (
        <img src={src} alt={label} className="w-full h-40 object-cover rounded-xl border border-border" />
      ) : (
        <div className="w-full h-40 rounded-xl border border-dashed border-border bg-secondary grid place-items-center text-xs text-muted-foreground">
          لم يتم الرفع
        </div>
      )}
    </div>
  );
}