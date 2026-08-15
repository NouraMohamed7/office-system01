"use client";

// src/components/announcement-popup.tsx
//
// بوب أب بيظهر في نص الشاشة للموظف لما يبقى عنده إعلان جديد لسه ما شافوش.
// متركب مرة واحدة في src/app/employee/layout.tsx عشان يشتغل من أي صفحة
// الموظف يفتحها (زي أي global modal) — مفيش صفحة إعلانات منفصلة.

import { useEffect, useRef, useState, useCallback } from "react";
import { Megaphone, X } from "lucide-react";
import {
  getUnseenAnnouncementsWithDetails,
  markAnnouncementSeen,
  subscribeNewAnnouncements,
  type AnnouncementRow,
} from "@/modules/announcements/api/announcements.api";

export function AnnouncementPopup() {
  const [queue, setQueue] = useState<AnnouncementRow[]>([]);
  const [closing, setClosing] = useState(false);

  // مرجع (ref) بيعكس الطابور الحالي، مش state — بنستخدمه جوه loadUnseen
  // عشان نمنع تكرار إضافة نفس الإعلان، من غير ما نحط queue كـ dependency
  // في useCallback (لو عملنا كده، subscribeNewAnnouncements كان هيعيد
  // الاشتراك في realtime channel كل مرة الطابور يتغير — أوفرهيد مش لازم).
  const queueRef = useRef<AnnouncementRow[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const loadUnseen = useCallback(async () => {
    try {
      const rows = await getUnseenAnnouncementsWithDetails();
      if (rows.length === 0) return;
      const existingIds = new Set(queueRef.current.map((r) => r.id));
      const fresh = rows.filter((r) => !existingIds.has(r.id));
      if (fresh.length > 0) {
        setQueue((prev) => [...prev, ...fresh]);
      }
    } catch {
      // بوب أب معلوماتي بس — لو فشل الجلب منسكتش الموظف بخطأ، هيتحاول تاني المرة الجاية
    }
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

  // "المعروض حاليًا" = أول عنصر في الطابور — قيمة مُشتقة، مش state منفصلة.
  // ده بيلغي الحاجة لـ effect كان بيزامن queue -> current.
  const current = queue[0] ?? null;

  async function handleAcknowledge() {
    if (!current || closing) return;
    setClosing(true);
    try {
      await markAnnouncementSeen(current.id);
    } catch {
      // هيتعاد عرضه المرة الجاية لو التعليم فشل — أأمن من إنه يضيع بدون ما المدير يتأكد إنه اتشاف
    } finally {
      setClosing(false);
      setQueue((q) => q.slice(1)); // ننتقل للإعلان اللي بعده (لو موجود) — event handler، مش effect
    }
  }

  if (!current) return null;

  const dateLabel = new Date(current.created_at).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const remainingCount = queue.length; // شامل المعروض حاليًا

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
      {/* key={current.id}: يخلي React يعمل remount للعنصر مع كل إعلان جديد،
          فأنيميشن الدخول بتشتغل تلقائيًا من غير أي state إضافي */}
      <div
        key={current.id}
        role="dialog"
        aria-modal="true"
        className="popup-enter w-full max-w-md rounded-2xl bg-card p-6 shadow-warm-lg"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl pill-primary">
            <Megaphone className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span>إعلان جديد</span>
              {remainingCount > 1 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {remainingCount} إعلانات لم تُقرأ
                </span>
              )}
            </div>
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

      <style jsx>{`
        .popup-enter {
          animation: popup-enter 200ms ease-out;
        }
        @keyframes popup-enter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}