"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/modules/users/actions/auth";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    setError(null);
    if (newPassword !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword });
      if (res.success) {
        // تغيير كلمة المرور يُنهي كل الجلسات — لازم تسجيل دخول جديد.
        setDone(true);
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setError(res.error?.message ?? "تعذّر تغيير كلمة المرور");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
        تم تغيير كلمة المرور بنجاح. جارٍ تحويلك لتسجيل الدخول…
      </div>
    );
  }

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2.5 text-left outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">كلمة المرور الحالية</span>
        <input name="currentPassword" type="password" required dir="ltr" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">كلمة المرور الجديدة</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          dir="ltr"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">تأكيد كلمة المرور الجديدة</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          dir="ltr"
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}
      </button>
    </form>
  );
}
