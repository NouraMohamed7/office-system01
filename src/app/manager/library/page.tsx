// src/app/manager/library/page.tsx
"use client";

import { Card, PageHeader } from "@/components/manager/primitives";
import { LibraryContent } from "@/components/library/library-content";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="المكتبة" subtitle="محتوى تدريبي وإرشادي لكل قسم." />
      <LibraryContent CardComponent={Card} isManager={true} />
    </div>
  );
}