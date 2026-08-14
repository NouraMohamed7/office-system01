// src/components/task-files-section.tsx
"use client";

import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { getTaskFiles } from "@/modules/tasks/api/tasks.api";
import type { TaskFile } from "@/types/tasks";

/**
 * 🔧 ISSUE 9 (حل فرونت-أونلي): بتقرأ الملفات المخزّنة عبر marker في
 * جدول comments (راجع recordTaskFilesMarker / getTaskFiles في tasks.api.ts).
 * ده حل مؤقت لحد ما الباك يضيف جدول ربط حقيقي بين tasks و files.
 * مستخدم في صفحة الموظف (TaskDrawer) وصفحة المدير (TaskDetailsModal) —
 * عشان منكررش نفس المنطق في المكانين.
 */
export function TaskFilesSection({ taskId }: { taskId: number }) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTaskFiles(taskId)
      .then((f) => {
        if (active) setFiles(f);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">المرفقات</span>
      {loading && <p className="text-xs text-muted-foreground">جاري تحميل المرفقات...</p>}
      {!loading && files.length === 0 && (
        <p className="text-xs text-muted-foreground">لا توجد مرفقات</p>
      )}
      {!loading && files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <a
              key={f.id}
              href={f.file_path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary/60 transition"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="flex-1 truncate">{f.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}