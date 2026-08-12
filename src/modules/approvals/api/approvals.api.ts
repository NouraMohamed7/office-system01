import { supabase } from "@/lib/supabase/client";

export async function getPendingApprovalsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("files_approval")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

/** Realtime: أي تغيير في files_approval (رفع/مراجعة/حذف) يحدّث البادج فورًا */
export function subscribePendingApprovalsCount(onChange: () => void): () => void {
  const channel = supabase
    .channel("files-approval-count")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "files_approval" },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}