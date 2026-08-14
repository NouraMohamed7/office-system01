// src/app/employee/library/page.tsx
"use client";

import { PortalLayout, Card } from "@/components/portal-layout";
import { LibraryContent } from "@/components/library/library-content";

export default function LibraryPage() {
  return (
    <PortalLayout title="المكتبة" subtitle="محتوى تدريبي وإرشادي لكل قسم">
      <LibraryContent CardComponent={Card} isManager={false} />
    </PortalLayout>
  );
}