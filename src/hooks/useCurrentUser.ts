"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { ROLE_ID } from "@/constants";

export type CurrentUser = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  role_id: number | null;
  emp_status: string | null;
  department_id: number | null;
  department_name: string | null;
  position_id: number | null;
  position_title: string | null;
  branch_id: number | null;
  branch_city: string | null;
  branch_country: string | null;
  is_manager: boolean;
};

// شكل الصف اللي بيرجع من users_with_email
type UsersWithEmailRow = {
  id: string;
  name: string | null;
  photo_url: string | null;
  role_id: number | null;
  emp_status: string | null;
  email: string | null;
};

// شكل الصف الأساسي من users (من غير أي embed، بس الـ FK ids)
type BasicProfileRow = {
  department_id: number | null;
  position_id: number | null;
  branch_id: number | null;
  role_id: number | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setError(authError?.message ?? "لا يوجد مستخدم مسجل الدخول");
      setUser(null);
      setLoading(false);
      return;
    }
    const uid = authData.user.id;

    // بيانات أساسية من الـ view
    const { data: profile, error: profileError } = await supabase
      .from("users_with_email")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setUser(null);
      setLoading(false);
      return;
    }

    const profileRow = profile as UsersWithEmailRow | null;

    // الـ FK ids الأساسية بس (من غير embed) — أبسط query وأقل عرضة للفشل
    const { data: basic, error: basicError } = await supabase
      .from("users")
      .select("department_id, position_id, branch_id, role_id")
      .eq("id", uid)
      .maybeSingle();

    if (basicError) {
      console.error("useCurrentUser: basic profile fetch failed", basicError);
    }

    const basicRow = basic as BasicProfileRow | null;

    // ⚠️ بدل الـ embed، هنجيب department / position / branch بـ query مباشر
    // منفصل لكل واحد على حسب الـ id بتاعه. ده أبسط وأضمن من الـ nested
    // select، وبيتجنب أي مشاكل ممكنة في تفسير العلاقات (relationship
    // ambiguity) أو صيغة الـ embed جوه PostgREST.
    const [deptRes, posRes, branchRes] = await Promise.all([
      basicRow?.department_id
        ? supabase.from("department").select("name").eq("id", basicRow.department_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      basicRow?.position_id
        ? supabase.from("position").select("title").eq("id", basicRow.position_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      basicRow?.branch_id
        ? supabase.from("branch").select("city, country").eq("id", basicRow.branch_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (deptRes.error) console.error("useCurrentUser: department fetch failed", deptRes.error);
    if (posRes.error) console.error("useCurrentUser: position fetch failed", posRes.error);
    if (branchRes.error) console.error("useCurrentUser: branch fetch failed", branchRes.error);

    const roleId = profileRow?.role_id ?? basicRow?.role_id ?? null;

    setUser({
      id: uid,
      name: profileRow?.name ?? "",
      email: profileRow?.email ?? authData.user.email ?? null,
      photo_url: profileRow?.photo_url ?? null,
      role_id: roleId,
      emp_status: profileRow?.emp_status ?? null,
      department_id: basicRow?.department_id ?? null,
      department_name: (deptRes.data as { name: string } | null)?.name ?? null,
      position_id: basicRow?.position_id ?? null,
      position_title: (posRes.data as { title: string } | null)?.title ?? null,
      branch_id: basicRow?.branch_id ?? null,
      branch_city: (branchRes.data as { city: string; country: string } | null)?.city ?? null,
      branch_country: (branchRes.data as { city: string; country: string } | null)?.country ?? null,
      is_manager: roleId === ROLE_ID.MANAGER,
    });

    setLoading(false);
  }, []);

 useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount قياسي، آمن هنا
    load();
  }, [load]);

  return { user, loading, error, refetch: load };
}