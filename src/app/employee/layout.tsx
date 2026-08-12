"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserRole } from "@/modules/auth/api/auth.api";
import { ROLE_ID } from "@/constants";
import { AnnouncementPopup } from "@/components/announcement-popup";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const roleId = await getCurrentUserRole(user.id);
        if (!active) return;

        if (roleId !== ROLE_ID.EMPLOYEE) {
          router.replace("/manager/dashboard");
          return;
        }
        setAuthChecked(true);
      } catch {
        router.replace("/login");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) {
    return (
      <div dir="rtl" className="grid min-h-screen w-full place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Global modal — بيظهر تلقائيًا فوق أي صفحة الموظف فاتحها لو فيه إعلان جديد لسه ما شافوش */}
      <AnnouncementPopup />
    </>
  );
}