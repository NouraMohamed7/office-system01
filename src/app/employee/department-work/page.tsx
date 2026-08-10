// src/app/employee/department-work/page.tsx
"use client";

import type { Dispatch, SetStateAction, ComponentType } from "react";
import { PortalLayout, Card } from "@/components/portal-layout";
import { useToast } from "@/components/toast";
import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Image as ImageIcon,
  Film,
  LayoutTemplate,
  User,
  Truck,
  MessageCircle,
  Download,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  type SocialWork,
  type MediaType,
  type SocialContentType,
  MEDIA_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  MEDIA_TYPES,
  CONTENT_TYPES,
  getSocialWorks,
  createSocialWork,
  updateSocialWork,
  deleteSocialWork,
  type RepWork,
  type RepWorkStatus,
  type RepWorkComment,
  REP_WORK_STATUSES,
  REP_WORK_STATUS_LABELS,
  getRepWorks,
  createRepWork,
  updateRepWorkStatus,
  deleteRepWork,
  getRepWorkComments,
  addRepWorkComment,
  getCurrentUserId,
} from "@/modules/department/api/department-work.api";

type Tab = "social" | "dash";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
}

export default function DepartmentPage() {
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>("social");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [socialItems, setSocialItems] = useState<SocialWork[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);

  const [repWorks, setRepWorks] = useState<RepWork[]>([]);
  const [loadingRepWorks, setLoadingRepWorks] = useState(true);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId).catch(() => setCurrentUserId(null));
  }, []);

  const loadSocial = useCallback(async () => {
    setLoadingSocial(true);
    try {
      setSocialItems(await getSocialWorks());
    } catch {
      showToast("error", "تعذر تحميل بيانات السوشيال ميديا");
    } finally {
      setLoadingSocial(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRepWorks = useCallback(async () => {
    setLoadingRepWorks(true);
    try {
      setRepWorks(await getRepWorks());
    } catch {
      showToast("error", "تعذر تحميل بيانات المناديب");
    } finally {
      setLoadingRepWorks(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSocial();
    loadRepWorks();
  }, [loadSocial, loadRepWorks]);

  const counts = socialItems.reduce(
    (acc, it) => ({
      posts: acc.posts + (it.content_type === "post" || it.content_type === "carousel" ? 1 : 0),
      reels: acc.reels + (it.content_type === "reel" ? 1 : 0),
      stories: acc.stories + (it.content_type === "story" ? 1 : 0),
    }),
    { posts: 0, reels: 0, stories: 0 }
  );

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const socialSheet = XLSX.utils.json_to_sheet([
      { المؤشر: "عدد البوستات", القيمة: counts.posts },
      { المؤشر: "عدد الريلز", القيمة: counts.reels },
      { المؤشر: "عدد الستوري", القيمة: counts.stories },
    ]);
    XLSX.utils.book_append_sheet(wb, socialSheet, "السوشيال ميديا");

    if (socialItems.length > 0) {
      const contentSheet = XLSX.utils.json_to_sheet(
        socialItems.map((c) => ({
          المنصة: MEDIA_TYPE_LABELS[c.media_type] ?? c.media_type,
          النوع: CONTENT_TYPE_LABELS[c.content_type] ?? c.content_type,
          الرابط: c.link,
          التوقيت: formatDate(c.created_at),
        }))
      );
      XLSX.utils.book_append_sheet(wb, contentSheet, "المحتوى المضاف");
    }

    const driversSheet = XLSX.utils.json_to_sheet(
      repWorks.map((d) => ({
        "اسم المندوب": d.full_name,
        الحالة: REP_WORK_STATUS_LABELS[d.status] ?? d.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, driversSheet, "المناديب");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `تقرير_شغل_القسم_${dateStr}.xlsx`);
    showToast("success", "تم تصدير التقرير بصيغة إكسيل");
  };

  return (
    <PortalLayout title="شغل القسم" subtitle="بيانات وتسجيل أعمال قسمك">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-secondary p-1 flex-wrap">
          {(
            [
              { k: "social", ar: "السوشيال ميديا" },
              { k: "dash", ar: "المناديب / Dash" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t.k ? "bg-card text-primary shadow-warm" : "text-muted-foreground"
              }`}
            >
              {t.ar}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-success text-success-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:opacity-90 transition shadow-warm"
        >
          <Download className="h-4 w-4" />
          تصدير إلى إكسيل
        </button>
      </div>

      {tab === "social" && (
        <SocialVariant
          items={socialItems}
          setItems={setSocialItems}
          loading={loadingSocial}
          counts={counts}
          currentUserId={currentUserId}
        />
      )}
      {tab === "dash" && (
        <DashVariant
          repWorks={repWorks}
          setRepWorks={setRepWorks}
          loading={loadingRepWorks}
          currentUserId={currentUserId}
        />
      )}
    </PortalLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Social variant                                                     */
/* ------------------------------------------------------------------ */

function SocialVariant({
  items,
  setItems,
  loading,
  counts,
  currentUserId,
}: {
  items: SocialWork[];
  setItems: Dispatch<SetStateAction<SocialWork[]>>;
  loading: boolean;
  counts: { posts: number; reels: number; stories: number };
  currentUserId: string | null;
}) {
  const showToast = useToast();
  const [platform, setPlatform] = useState<MediaType>(MEDIA_TYPES[0]);
  const [contentType, setContentType] = useState<SocialContentType>(CONTENT_TYPES[0]);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{
    media_type: MediaType;
    content_type: SocialContentType;
    link: string;
  }>({ media_type: MEDIA_TYPES[0], content_type: CONTENT_TYPES[0], link: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSave = async () => {
    if (!link.trim()) {
      setError("من فضلك أدخل رابط المحتوى");
      showToast("error", "الرابط مطلوب قبل الحفظ");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const created = await createSocialWork({
        link: link.trim(),
        media_type: platform,
        content_type: contentType,
      });
      setItems((prev) => [created, ...prev]);
      setLink("");
      showToast("success", `تم حفظ ${CONTENT_TYPE_LABELS[contentType]} على ${MEDIA_TYPE_LABELS[platform]} بنجاح`);
    } catch {
      showToast("error", "حصل خطأ أثناء حفظ المحتوى");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: SocialWork) => {
    setEditingId(item.id);
    setEditDraft({ media_type: item.media_type, content_type: item.content_type, link: item.link });
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editDraft.link.trim()) {
      setEditError("الرابط مطلوب");
      showToast("error", "الرابط مطلوب قبل الحفظ");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateSocialWork(id, {
        link: editDraft.link.trim(),
        media_type: editDraft.media_type,
        content_type: editDraft.content_type,
      });
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setEditError("");
      showToast("success", "تم تعديل المحتوى بنجاح");
    } catch {
      showToast("error", "حصل خطأ أثناء التعديل");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSocialWork(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
      showToast("success", "تم حذف المحتوى");
    } catch {
      showToast("error", "حصل خطأ أثناء الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={ImageIcon} label="عدد البوستات" value={String(counts.posts)} tone="primary" />
        <MetricCard icon={Film} label="عدد الريلز" value={String(counts.reels)} tone="teal" />
        <MetricCard icon={LayoutTemplate} label="عدد الستوري" value={String(counts.stories)} tone="warning" />
      </div>
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">تسجيل محتوى</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Select
            label="المنصة"
            value={platform}
            onChange={(v) => setPlatform(v as MediaType)}
            options={MEDIA_TYPES}
            labels={MEDIA_TYPE_LABELS}
          />
          <Select
            label="نوع المحتوى"
            value={contentType}
            onChange={(v) => setContentType(v as SocialContentType)}
            options={CONTENT_TYPES}
            labels={CONTENT_TYPE_LABELS}
          />
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-foreground">الرابط</label>
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setError("");
              }}
              placeholder="https://..."
              className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                ${
                  error
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-border focus:border-primary focus:ring-primary/20"
                }`}
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ المحتوى
        </button>
      </Card>

      <Card className="p-6 mt-6">
        <h3 className="font-bold text-foreground mb-4">المحتوى المضاف</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">لسه مفيش محتوى مضاف</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="py-2 px-2 text-right font-semibold">المنصة</th>
                  <th className="py-2 px-2 text-right font-semibold">النوع</th>
                  <th className="py-2 px-2 text-right font-semibold">الرابط</th>
                  <th className="py-2 px-2 text-right font-semibold">التوقيت</th>
                  <th className="py-2 px-2 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  const isOwner = currentUserId && item.users_id === currentUserId;
                  return (
                    <tr key={item.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="py-2.5 px-2">
                        {isEditing ? (
                          <select
                            value={editDraft.media_type}
                            onChange={(e) =>
                              setEditDraft((prev) => ({ ...prev, media_type: e.target.value as MediaType }))
                            }
                            className="h-9 rounded-lg border border-border bg-card px-2 text-xs outline-none"
                          >
                            {MEDIA_TYPES.map((o) => (
                              <option key={o} value={o}>
                                {MEDIA_TYPE_LABELS[o]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-foreground">{MEDIA_TYPE_LABELS[item.media_type] ?? item.media_type}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {isEditing ? (
                          <select
                            value={editDraft.content_type}
                            onChange={(e) =>
                              setEditDraft((prev) => ({ ...prev, content_type: e.target.value as SocialContentType }))
                            }
                            className="h-9 rounded-lg border border-border bg-card px-2 text-xs outline-none"
                          >
                            {CONTENT_TYPES.map((o) => (
                              <option key={o} value={o}>
                                {CONTENT_TYPE_LABELS[o]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-foreground">
                            {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 max-w-[220px]">
                        {isEditing ? (
                          <>
                            <input
                              value={editDraft.link}
                              onChange={(e) => {
                                setEditDraft((prev) => ({ ...prev, link: e.target.value }));
                                setEditError("");
                              }}
                              className={`h-9 w-full rounded-lg border bg-card px-2 text-xs outline-none transition
                                ${
                                  editError
                                    ? "border-destructive focus:border-destructive"
                                    : "border-border focus:border-primary"
                                }`}
                            />
                            {editError && <p className="text-xs text-destructive mt-1">{editError}</p>}
                          </>
                        ) : (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block max-w-[220px]"
                          >
                            {item.link}
                          </a>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-2.5 px-2">
                        {!isOwner ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  disabled={editSaving}
                                  className="text-xs font-semibold text-success hover:underline disabled:opacity-60"
                                >
                                  حفظ
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs font-semibold text-muted-foreground hover:underline"
                                >
                                  إلغاء
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                  <Pencil className="h-3 w-3" />
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deletingId === item.id}
                                  className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline disabled:opacity-60"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Dash (representative_work) variant                                  */
/* ------------------------------------------------------------------ */

function DashVariant({
  repWorks,
  setRepWorks,
  loading,
  currentUserId,
}: {
  repWorks: RepWork[];
  setRepWorks: Dispatch<SetStateAction<RepWork[]>>;
  loading: boolean;
  currentUserId: string | null;
}) {
  const showToast = useToast();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<RepWorkStatus>("active");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, RepWorkComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentSending, setCommentSending] = useState<Record<number, boolean>>({});

  const handleSave = async () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسم المندوب");
      showToast("error", "اسم المندوب مطلوب قبل الحفظ");
      return;
    }
    if (!comment.trim()) {
      setError("من فضلك أضف ملاحظة أولية");
      showToast("error", "الملاحظة مطلوبة قبل الحفظ");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await createRepWork({ full_name: name.trim(), status, comment: comment.trim() });
      const fresh = await getRepWorks();
      setRepWorks(fresh);
      setName("");
      setStatus("active");
      setComment("");
      showToast("success", `تم تسجيل المندوب ${name.trim()}`);
    } catch {
      showToast("error", "حصل خطأ أثناء تسجيل المندوب");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: RepWorkStatus) => {
    const prevStatus = repWorks.find((d) => d.id === id)?.status;
    setStatusUpdatingId(id);
    setRepWorks((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
    try {
      await updateRepWorkStatus(id, newStatus);
      showToast("success", "تم تحديث الحالة");
    } catch {
      setRepWorks((prev) => prev.map((d) => (d.id === id && prevStatus ? { ...d, status: prevStatus } : d)));
      showToast("error", "تعذر تحديث الحالة");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleToggleComments = async (id: number) => {
    const willOpen = !openComments[id];
    setOpenComments((prev) => ({ ...prev, [id]: willOpen }));
    if (willOpen && !comments[id]) {
      setCommentsLoading((prev) => ({ ...prev, [id]: true }));
      try {
        const data = await getRepWorkComments(id);
        setComments((prev) => ({ ...prev, [id]: data }));
      } catch {
        showToast("error", "تعذر تحميل التعليقات");
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleAddComment = async (id: number) => {
    const text = (commentDrafts[id] || "").trim();
    if (!text) {
      showToast("error", "اكتب تعليق الأول قبل الإضافة");
      return;
    }
    setCommentSending((prev) => ({ ...prev, [id]: true }));
    try {
      await addRepWorkComment(id, text);
      setCommentDrafts((prev) => ({ ...prev, [id]: "" }));
      const data = await getRepWorkComments(id);
      setComments((prev) => ({ ...prev, [id]: data }));
      showToast("success", "تم إضافة التعليق");
    } catch {
      showToast("error", "تعذر إضافة التعليق");
    } finally {
      setCommentSending((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> تسجيل مندوب
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">اسم المندوب</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="اسم المندوب"
              className={`mt-2 w-full h-11 rounded-xl border bg-card focus:ring-2 outline-none px-3 text-sm transition
                ${
                  error
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-border focus:border-primary focus:ring-primary/20"
                }`}
            />
          </div>
          <Select
            label="الحالة"
            value={status}
            onChange={(v) => setStatus(v as RepWorkStatus)}
            options={REP_WORK_STATUSES}
            labels={REP_WORK_STATUS_LABELS}
          />
          <div>
            <label className="text-sm font-semibold text-foreground">ملاحظة أولية</label>
            <input
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError("");
              }}
              placeholder="اكتب ملاحظة..."
              className="mt-2 w-full h-11 rounded-xl border border-border bg-card focus:ring-2 focus:border-primary focus:ring-primary/20 outline-none px-3 text-sm transition"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ المندوب
        </button>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> قائمة المناديب
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
          </p>
        ) : (
          <div className="space-y-2">
            {repWorks.length === 0 && <p className="text-sm text-muted-foreground">لسه مفيش مناديب مسجلين</p>}
            {repWorks.map((d) => {
              const isOpen = !!openComments[d.id];
              const isOwner = currentUserId && d.created_by === currentUserId;
              const list = comments[d.id] || [];
              return (
                <div key={d.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{d.full_name}</span>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <select
                          value={d.status}
                          disabled={statusUpdatingId === d.id}
                          onChange={(e) => handleStatusChange(d.id, e.target.value as RepWorkStatus)}
                          className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none disabled:opacity-60
                            ${
                              d.status === "active"
                                ? "border-success/30 bg-success/10 text-success"
                                : d.status === "absent"
                                ? "border-border bg-muted text-muted-foreground"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                            }`}
                        >
                          {REP_WORK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {REP_WORK_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`h-9 grid place-items-center rounded-lg border px-2.5 text-xs font-semibold
                            ${
                              d.status === "active"
                                ? "border-success/30 bg-success/10 text-success"
                                : d.status === "absent"
                                ? "border-border bg-muted text-muted-foreground"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                            }`}
                        >
                          {REP_WORK_STATUS_LABELS[d.status]}
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleComments(d.id)}
                        className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        تعليقات {list.length > 0 && `(${list.length})`}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      {commentsLoading[d.id] ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري تحميل التعليقات...
                        </p>
                      ) : list.length === 0 ? (
                        <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>
                      ) : (
                        list.map((c, i) => (
                          <div key={c.id ?? i} className="bg-secondary/50 rounded-lg px-3 py-2">
                            {c.created_at && (
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                              </div>
                            )}
                            <p className="text-sm text-foreground">{String(c.body ?? c.content ?? "")}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={commentDrafts[d.id] || ""}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(d.id)}
                          placeholder="اكتب تعليق..."
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleAddComment(d.id)}
                          disabled={commentSending[d.id]}
                          className="bg-primary text-primary-foreground rounded-lg px-3 text-xs font-semibold hover:bg-primary-dark transition disabled:opacity-60"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared small pieces                                                 */
/* ------------------------------------------------------------------ */

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
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
      <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
        <span>{label}</span>
      </div>
    </Card>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: T;
  onChange: (v: string) => void;
  options: readonly T[];
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full h-11 rounded-xl border border-border bg-card px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}