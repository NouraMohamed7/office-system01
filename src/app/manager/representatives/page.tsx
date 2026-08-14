// src/app/manager/representatives/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Card, PageHeader, StatCard } from "@/components/manager/primitives";
import { useToast } from "@/components/toast";
import * as XLSX from "xlsx";
import {
  Plus, Phone, X, UserRound, Bike, Eye, Search, ImagePlus,
  FileSpreadsheet, Pencil, Trash2, Loader2,
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
  validateName,
  validatePhone,
  validateOptionalPhone,
  validateImageFile,
  MAX_IMAGE_SIZE_MB,
} from "@/modules/representatives/api/representatives.api";

/* ------------------------------------------------------------------ */
/*  Form state                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function RepsPage() {
  const showToast = useToast();

  const [reps, setReps] = useState<Representative[]>([]);
  const [loadingReps, setLoadingReps] = useState(true);

  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [existingDocs, setExistingDocs] = useState<{
    profile_img: string | null;
    identity_front: string | null;
    identity_back: string | null;
    license_front: string | null;
    license_back: string | null;
  }>({ profile_img: null, identity_front: null, identity_back: null, license_front: null, license_back: null });

  const [formErrors, setFormErrors] = useState<{ name?: string; phone1?: string; phone2?: string; supervisorId?: string }>({});

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
    const q = search.trim();
    if (!q) return reps;
    return reps.filter((r) => {
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
    setExpandedId(null);
  };

  const handleSaveRep = async () => {
    const errors: typeof formErrors = {};
    const nameErr = validateName(form.name);
    if (nameErr) errors.name = nameErr;
    const phone1Err = validatePhone(form.phone1);
    if (phone1Err) errors.phone1 = phone1Err;
    const phone2Err = validateOptionalPhone(form.phone2);
    if (phone2Err) errors.phone2 = phone2Err;
    if (!form.supervisorId) errors.supervisorId = "اختيار المشرف مطلوب";

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showToast("error", "فيه حقول ناقصة أو غير صحيحة في الفورم");
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
        showToast("success", `تم إضافة ${form.name.trim()} بنجاح`);
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
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المناديب");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `المناديب-${dateStr}.xlsx`);
    showToast("success", `تم تصدير ${filtered.length} مندوب لملف Excel`);
  };

  const viewingRep = reps.find((r) => r.id === viewingId) || null;
  const deletingRep = reps.find((r) => r.id === deletingId) || null;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }
        @keyframes formIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .expand-in { animation: expandIn 0.25s ease-out; overflow: hidden; }
        .form-in { animation: formIn 0.2s ease-out; }
      `}</style>

      <PageHeader
        title="المناديب"
        subtitle="إدارة بيانات المناديب ومتابعة أعمالهم."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground transition hover:opacity-90"
            >
              <FileSpreadsheet className="size-4" /> تصدير Excel
            </button>
            <button
              onClick={handleStartAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-95"
            >
              {showForm && !editingId ? <X className="size-4" /> : <Plus className="size-4" />}
              {showForm && !editingId ? "إغلاق" : "إضافة مندوب"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard dense label="إجمالي المناديب" value={String(totals.total)} tone="primary" />
        <StatCard dense label="عندهم موتوسيكل" value={String(totals.withMotorcycle)} tone="success" />
        <StatCard dense label="من غير موتوسيكل" value={String(totals.withoutMotorcycle)} tone="muted" />
      </div>

      {showForm && (
        <Card className="form-in border-2 border-primary/20 !p-6">
          <h3 className="mb-4 font-bold text-foreground">{editingId ? "تعديل بيانات المندوب" : "مندوب جديد"}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-foreground">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="اسم المندوب"
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.name ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.name && <p className="mt-1.5 text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الأول</label>
              <input
                value={form.phone1}
                onChange={(e) => { setForm((f) => ({ ...f, phone1: e.target.value })); setFormErrors((p) => ({ ...p, phone1: undefined })); }}
                placeholder="01xxxxxxxxx"
                inputMode="numeric"
                maxLength={11}
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.phone1 ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.phone1 && <p className="mt-1.5 text-xs text-destructive">{formErrors.phone1}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">رقم الهاتف الثاني (اختياري)</label>
              <input
                value={form.phone2}
                onChange={(e) => { setForm((f) => ({ ...f, phone2: e.target.value })); setFormErrors((p) => ({ ...p, phone2: undefined })); }}
                placeholder="01xxxxxxxxx"
                inputMode="numeric"
                maxLength={11}
                className={`mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition ${
                  formErrors.phone2 ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
              {formErrors.phone2 && <p className="mt-1.5 text-xs text-destructive">{formErrors.phone2}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">المشرف</label>
              <div className="relative mt-2">
                <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <select
                  value={form.supervisorId}
                  disabled={loadingSupervisors}
                  onChange={(e) => { setForm((f) => ({ ...f, supervisorId: e.target.value })); setFormErrors((p) => ({ ...p, supervisorId: undefined })); }}
                  className={`w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none transition pr-9 disabled:opacity-60 ${
                    formErrors.supervisorId ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                >
                  <option value="">{loadingSupervisors ? "جاري التحميل..." : "اختر المشرف"}</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {formErrors.supervisorId && <p className="mt-1.5 text-xs text-destructive">{formErrors.supervisorId}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">عنده موتوسيكل؟</label>
              <div className="mt-2 inline-flex w-full rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hasMotorcycle: true }))}
                  className={`flex flex-1 items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition ${
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
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="text-sm font-bold text-foreground">الصور والمستندات</h4>
              <span className="text-xs text-muted-foreground">JPG, PNG أو WEBP — حد أقصى {MAX_IMAGE_SIZE_MB} ميجابايت</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FileInputPreview label="الصورة الشخصية" file={form.profileImg} existingUrl={existingDocs.profile_img} onChange={(f) => setForm((s) => ({ ...s, profileImg: f }))} />
              <FileInputPreview label="صورة البطاقة (وش)" file={form.identityFront} existingUrl={existingDocs.identity_front} onChange={(f) => setForm((s) => ({ ...s, identityFront: f }))} />
              <FileInputPreview label="صورة البطاقة (ضهر)" file={form.identityBack} existingUrl={existingDocs.identity_back} onChange={(f) => setForm((s) => ({ ...s, identityBack: f }))} />
              <FileInputPreview label="صورة الرخصة (وش)" file={form.licenseFront} existingUrl={existingDocs.license_front} onChange={(f) => setForm((s) => ({ ...s, licenseFront: f }))} />
              <FileInputPreview label="صورة الرخصة (ضهر)" file={form.licenseBack} existingUrl={existingDocs.license_back} onChange={(f) => setForm((s) => ({ ...s, licenseBack: f }))} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={handleSaveRep}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "حفظ التعديلات" : "حفظ المندوب"}
            </button>
            <button onClick={resetForm} className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent">
              إلغاء
            </button>
          </div>
        </Card>
      )}

      <Card className="!p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو المشرف"
            className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {loadingReps ? (
        <Card className="flex items-center justify-center gap-2 !py-14 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 !py-14 text-center">
          <div className="text-3xl">📭</div>
          <div className="font-bold">لا يوجد مناديب مطابقين للبحث</div>
          <div className="text-sm text-muted-foreground">ابدأ بإضافة أول مندوب.</div>
          <button onClick={() => setShowForm(true)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark">
            <Plus className="size-4" /> إضافة مندوب
          </button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const isOpen = expandedId === r.id;
            const canManage = canManageRepresentative(r, currentUserId);
            const country = formatCountry(r.country);
            return (
              <div
                key={r.id}
                onClick={() => setExpandedId(isOpen ? null : r.id)}
                className="card-warm cursor-pointer bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-warm-lg"
              >
                <div className="flex items-start gap-3">
                  {r.profile_img ? (
                    <img src={r.profile_img} alt={r.full_name} className="h-12 w-12 rounded-full object-cover border border-border" />
                  ) : (
                    <Avatar name={r.full_name} size={48} />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">{r.full_name}</div>
                    <a
                      href={`tel:${r.phone_1}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
                    >
                      <Phone className="size-3" />
                      <span>{r.phone_1}</span>
                    </a>
                    <div className="text-xs text-muted-foreground">
                      مشرف: {loadingSupervisors ? "..." : supervisorNameMap[r.supervisor_id] || "غير معروف"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        r.has_motorcycle ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bike className="size-3" /> {r.has_motorcycle ? "نعم" : "لا"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{country.flag} {country.name}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="expand-in mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    {r.phone_2 && (
                      <a
                        href={`tel:${r.phone_2}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 transition hover:text-primary"
                      >
                        <Phone className="size-3.5" />
                        <span>الهاتف الثاني: {r.phone_2}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-1.5">
                      <UserRound className="size-3.5" />
                      <span>المشرف: <span className="font-semibold text-foreground">{supervisorNameMap[r.supervisor_id] || "غير معروف"}</span></span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingId(r.id); }}
                        className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                      >
                        <Eye className="size-3.5" /> عرض الصور والمستندات
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(r); }}
                            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                          >
                            <Pencil className="size-3.5" /> تعديل
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(r.id); }}
                            className="inline-flex items-center gap-1.5 font-semibold text-destructive hover:underline"
                          >
                            <Trash2 className="size-3.5" /> حذف
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewingRep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewingId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-foreground">صور {viewingRep.full_name}</h3>
              <button onClick={() => setViewingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setDeletingId(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-bold text-foreground">تأكيد الحذف</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              هل أنت متأكد إنك عايز تحذف المندوب <span className="font-semibold text-foreground">{deletingRep.full_name}</span>؟ الإجراء ده مش هيتقدر يتراجع عنه.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                حذف
              </button>
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared small pieces                                                 */
/* ------------------------------------------------------------------ */

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
  const [error, setError] = useState<string | null>(null);

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
    if (!f) {
      setError(null);
      onChange(null);
      return;
    }
    const validationError = validateImageFile(f);
    if (validationError) {
      setError(validationError);
      onChange(null);
      e.target.value = "";
      return;
    }
    setError(null);
    onChange(f);
  };

  const displayUrl = previewUrl || existingUrl || undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex h-11 items-center gap-2 rounded-xl border border-dashed bg-secondary px-4 text-xs font-semibold transition
            ${error ? "border-destructive text-destructive" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
        >
          <ImagePlus className="h-4 w-4" /> {displayUrl ? "تغيير الصورة" : "رفع صورة"}
        </button>
        {displayUrl && <img src={displayUrl} alt={label} className="h-11 w-11 rounded-lg border border-border object-cover" />}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src?: string | null }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      {src ? (
        <img src={src} alt={label} className="h-40 w-full rounded-xl border border-border object-cover" />
      ) : (
        <div className="grid h-40 w-full place-items-center rounded-xl border border-dashed border-border bg-secondary text-xs text-muted-foreground">
          لم يتم الرفع
        </div>
      )}
    </div>
  );
}