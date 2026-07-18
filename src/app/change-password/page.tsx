import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-ink">تغيير كلمة المرور</h1>
          <p className="mt-1 text-sm text-muted">
            {user.mustChangePassword
              ? "لأمانك، غيّر كلمة المرور المؤقتة قبل المتابعة"
              : "اختر كلمة مرور جديدة"}
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
