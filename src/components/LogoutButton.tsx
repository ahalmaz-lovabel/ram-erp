"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/modules/users/actions/auth";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await logoutAction();
          router.replace("/login");
        })
      }
      disabled={pending}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
    >
      {pending ? "…" : "تسجيل الخروج"}
    </button>
  );
}
