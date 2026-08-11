"use client";

// src/components/announcement-popup.tsx
//
// بوب أب بيظهر في نص الشاشة للموظف لما يبقى عنده إعلان جديد لسه ما شافوش.
// مش مربوط بصفحة الداشبورد — حطه مرة واحدة في src/app/employee/layout.tsx
// عشان يشتغل من أي صفحة الموظف يفتحها (زي أي global modal).
//
// السلوك:
// 1) أول ما الكومبوننت يعمل mount بيجيب كل الإعلانات غير المشاهدة.
// 2) لو فيه أكتر من واحد، بيعرضهم واحد ورا التاني (queue).
// 3) مشترك في realtime على جدول announcements، فلو المدير نشر إعلان جديد
//    وهو (الموظف) فاتح الصفحة، البوب أب يظهر فورًا من غير refresh.
// 4) لما الموظف يضغط "تم الاطلاع" بننده mark_announcement_seen ونقفل.

import { useCallback, useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import {
  getUnseenAnnouncementsWithDetails,
  markAnnouncementSeen,
  subscribeNewAnnouncements,
  type AnnouncementRow,
} from "@/modules/announcements/api/announcements.api";

export function AnnouncementPopup() {
  const [queue, setQueue] = useState<AnnouncementRow[]>([]);
  const [current, setCurrent] = useState<AnnouncementRow | null>(null);
  const [closing, setClosing] = useState(false);

  const loadUnseen = useCallback(async () => {
    try {
      const rows = await getUnseenAnnouncementsWithDetails();
      if (rows.length > 0) {
        // نتفادى تكرار نفس الإعلان لو كان موجود بالفعل في الطابور أو معروض حاليًا
        setQueue((prev) => {
          const existingIds = new Set([
            ...prev.map((r) => r.id),
            ...(current ? [current.id] : []),
          ]);
          const fresh = rows.filter((r) => !existingIds.has(r.id));
          return [...prev, ...fresh];
        });
      }
    } catch {
      // بوب أب معلوماتي بس — لو فشل الجلب منسكتش الموظف بخطأ، هيتحاول تاني المرة الجاية
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // أول تحميل
  useEffect(() => {
    loadUnseen();
  }, [loadUnseen]);

  // realtime: إعلان جديد نُشر وإحنا في نفس الجلسة
  useEffect(() => {
    const unsubscribe = subscribeNewAnnouncements(() => {
      loadUnseen();
    });
    return unsubscribe;
  }, [loadUnseen]);

  // نطلع أول عنصر من الطابور لما مفيش حاجة معروضة
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  async function handleAcknowledge() {
    if (!current || closing) return;
    setClosing(true);
    try {
      await markAnnouncementSeen(current.id);
    } catch {
      // هيتعاد عرضه المرة الجاية لو التعليم فشل — أأمن من إنه يضيع بدون ما المدير يتأكد إنه اتشاف
    } finally {
      setClosing(false);
      setCurrent(null);
    }
  }

  if (!current) return null;

  const dateLabel = new Date(current.created_at).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-warm-lg"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl pill-primary">
            <Megaphone className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-primary">إعلان جديد</div>
            <h3 className="mt-1 text-lg font-bold text-foreground">{current.title}</h3>
            <div className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</div>
          </div>
          <button
            onClick={handleAcknowledge}
            disabled={closing}
            className="text-muted-foreground hover:text-foreground transition disabled:opacity-40"
            title="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        {current.details && (
          <div className="mt-4 max-h-64 overflow-y-auto rounded-xl bg-accent/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {current.details}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAcknowledge}
            disabled={closing}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {closing ? "جاري الحفظ..." : "تم الاطلاع"}
          </button>
        </div>
      </div>
    </div>
  );
}