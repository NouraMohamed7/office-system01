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

// شكل الصف اللي بيرجع من users مع الـ embeds
// ⚠️ الصيغة الصح للـ embed في PostgREST: alias:الجدول_المرتبط(الأعمدة)
// مش alias:اسم_عمود_الـ_FK(الأعمدة) — كانت غلط قبل كده وده اللي كان بيخلي
// department_name / position_title / branch_city دايمًا null
type ExtraProfileRow = {
  department_id: number | null;
  position_id: number | null;
  branch_id: number | null;
  role_id: number | null;
  department: { name: string } | null;
  position: { title: string } | null;
  branch: { city: string; country: string } | null;
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

    // القسم/الوظيفة/الفرع — عبر جدول users مع embed للجداول المرتبطة فعليًا
    // (department / position / branch)، مش عبر أعمدة الـ FK نفسها
    const { data: extra, error: extraError } = await supabase
      .from("users")
      .select(
        `
        department_id,
        position_id,
        branch_id,
        role_id,
        department:department ( name ),
        position:position ( title ),
        branch:branch ( city, country )
      `
      )
      .eq("id", uid)
      .maybeSingle();

    if (extraError) {
      console.error("useCurrentUser: extra profile fetch failed", extraError);
    }

    const extraRow = extra as ExtraProfileRow | null;
    const roleId = profileRow?.role_id ?? extraRow?.role_id ?? null;

    setUser({
      id: uid,
      name: profileRow?.name ?? "",
      email: profileRow?.email ?? authData.user.email ?? null,
      photo_url: profileRow?.photo_url ?? null,
      role_id: roleId,
      emp_status: profileRow?.emp_status ?? null,
      department_id: extraRow?.department_id ?? null,
      department_name: extraRow?.department?.name ?? null,
      position_id: extraRow?.position_id ?? null,
      position_title: extraRow?.position?.title ?? null,
      branch_id: extraRow?.branch_id ?? null,
      branch_city: extraRow?.branch?.city ?? null,
      branch_country: extraRow?.branch?.country ?? null,
      is_manager: roleId === ROLE_ID.MANAGER,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { user, loading, error, refetch: load };
}