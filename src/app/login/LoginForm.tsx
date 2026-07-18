"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/modules/users/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (res.success) {
        router.replace(res.data?.mustChangePassword ? "/change-password" : "/dashboard");
      } else {
        setError(res.error?.message ?? "تعذّر تسجيل الدخول");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">بريد الدخول</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          dir="ltr"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-left outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="owner@example.com"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-left outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="••••••••"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "جارٍ الدخول…" : "تسجيل الدخول"}
      </button>
    </form>
  );
}
