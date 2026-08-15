"use client";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ManagerSidebar } from "@/components/manager/sidebar";
import { ManagerTopbar } from "@/components/manager/topbar";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserRole } from "@/modules/auth/api/auth.api";
import { ROLE_ID } from "@/constants";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
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

        if (roleId !== ROLE_ID.MANAGER) {
          router.replace("/employee/dashboard");
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
      <div className="grid min-h-screen w-full place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen w-full bg-background font-sans text-foreground">
      <ManagerSidebar mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ManagerTopbar onToggleSidebar={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
           <ConfirmProvider>
    {children}
  </ConfirmProvider>
        </main>
      </div>
    </div>
  );
}