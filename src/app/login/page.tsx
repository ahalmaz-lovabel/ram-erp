import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ background: "var(--color-brand)" }}
          >
            م
          </div>
          <h1 className="text-xl font-bold text-ink">نظام إدارة المصنع</h1>
          <p className="mt-1 text-sm text-muted">سجّل الدخول للمتابعة</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
