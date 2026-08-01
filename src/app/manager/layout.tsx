import { ManagerSidebar } from "@/components/manager/sidebar";
import { ManagerTopbar } from "@/components/manager/topbar";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="flex min-h-screen w-full bg-background font-sans text-foreground">
      <ManagerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ManagerTopbar />
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}