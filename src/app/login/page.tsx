"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { Button, Input } from "@/components/manager/primitives";
import {
  signInWithPassword,
  resetPasswordForEmail,
  getCurrentUserRole,
  signOut,
} from "@/modules/auth/api/auth.api";
import { ROLE_ID } from "@/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const { user } = await signInWithPassword(email, password);
      if (!user) throw new Error("تعذر تسجيل الدخول");

      const roleId = await getCurrentUserRole(user.id);

      if (roleId === ROLE_ID.MANAGER) {
        router.push("/manager/dashboard");
      } else if (roleId === ROLE_ID.EMPLOYEE) {
        router.push("/employee/dashboard");
      } else {
        await signOut();
        setErrorMsg("حسابك غير مفعّل أو ليس له صلاحية دخول، تواصل مع الإدارة");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    if (!email) {
      setErrorMsg("من فضلك اكتب بريدك الإلكتروني أولاً");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      await resetPasswordForEmail(email);
      setInfoMsg("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني");
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء إرسال رابط الاستعادة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background font-sans">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden bg-linear-to-br from-primary/10 via-warning/10 to-teal/10 lg:block">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.62 0.128 42 / 0.25), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.45 0.045 195 / 0.2), transparent 40%)",
          }} />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg">م</div>
              <div>
                <div className="text-lg font-bold">شركة التسويق</div>
                <div className="text-xs text-muted-foreground">Marketing Company</div>
              </div>
            </div>

            <div className="max-w-md">
              <span className="inline-block rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary shadow-warm backdrop-blur">
                لوحة تحكم الشركة
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-foreground">
                بوابة إدارية موحّدة
                <br />
                <span className="text-primary">لإدارة كل شيء</span> بهدوء.
              </h1>
            </div>

            <div className="text-xs text-muted-foreground">© 2026 Marketing Co.</div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-[1.5rem] border border-border bg-card/80 p-6 shadow-warm sm:p-8">
            <h2 className="text-2xl font-bold text-foreground">أهلاً بعودتك</h2>
            <p className="mt-1 text-sm text-muted-foreground">سجّل الدخول للمتابعة إلى لوحة التحكم.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">البريد الإلكتروني</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10 pl-4"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">كلمة المرور</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-4"
                  />
                </div>
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" defaultChecked className="size-4 rounded border-border accent-[oklch(0.62_0.128_42)]" />
                  تذكرني
                </label>

                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-500">{errorMsg}</p>
              )}
              {infoMsg && (
                <p className="text-sm text-teal-600">{infoMsg}</p>
              )}

              <Button type="submit" disabled={loading} className="h-11 w-full">
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}