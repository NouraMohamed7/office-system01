"use client";

import { useState } from "react";
import { Avatar, Card, PageHeader } from "@/components/manager/primitives";
import { cn } from "@/lib/utils";

const tabs = ["البيانات","الأمان","الإشعارات"];

export default function ProfilePage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-6">
      <PageHeader title="الملف الشخصي" />
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="!p-2 lg:col-span-1">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={cn("mb-0.5 block w-full rounded-lg px-3 py-2.5 text-right text-sm",
                tab === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              {t}
            </button>
          ))}
        </Card>
        <Card className="lg:col-span-3">
          {tab === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name="أحمد" size={72} />
                <button className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">تغيير الصورة</button>
              </div>
              {[["الاسم","أحمد الشريف"],["البريد","ahmed@company.com"],["الهاتف","010-1234-5678"],["الوظيفة","المدير التنفيذي"],["الفرع","القاهرة"]].map(([l, v]) => (
                <label key={l} className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{l}</span>
                  <input defaultValue={v} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
                </label>
              ))}
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">حفظ التغييرات</button>
            </div>
          )}
          {tab === 1 && (
            <div className="space-y-4">
              <div className="font-bold">تغيير كلمة المرور</div>
              {["كلمة المرور الحالية","كلمة المرور الجديدة","تأكيد كلمة المرور"].map(l => (
                <label key={l} className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{l}</span>
                  <input type="password" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
                </label>
              ))}
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">تحديث</button>
              <div className="pt-4 border-t border-border">
                <button className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/15">تسجيل الخروج من جميع الأجهزة</button>
              </div>
            </div>
          )}
          {tab === 2 && (
            <div className="space-y-3">
              {["إشعارات المهام","إشعارات الملفات","إشعارات الشكاوى","إشعارات التقارير","إشعارات الاجتماعات"].map((l, i) => (
                <label key={l} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">{l}</span>
                  <input type="checkbox" defaultChecked={i < 4} className="size-5 accent-[oklch(0.62_0.128_42)]" />
                </label>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}