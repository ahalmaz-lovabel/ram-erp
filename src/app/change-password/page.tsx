import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">تغيير كلمة المرور</h1>
          <p className="mt-1 text-sm text-slate-500">
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
