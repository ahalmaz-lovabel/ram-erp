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
      className="rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-canvas disabled:opacity-60"
    >
      {pending ? "…" : "تسجيل الخروج"}
    </button>
  );
}
