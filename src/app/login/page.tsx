import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            م
          </div>
          <h1 className="text-xl font-bold text-slate-900">نظام إدارة المصنع</h1>
          <p className="mt-1 text-sm text-slate-500">سجّل الدخول للمتابعة</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
