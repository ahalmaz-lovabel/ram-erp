"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCustomerAction } from "@/modules/customers/actions";

export function CustomerActions({
  customerId,
  archived,
}: {
  customerId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Link
        href={`/customers/${customerId}/edit`}
        className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
      >
        تعديل
      </Link>
      {!archived && (
        <button
          onClick={() => {
            if (!confirm("أرشفة هذا العميل؟")) return;
            startTransition(async () => {
              const res = await archiveCustomerAction(customerId);
              if (res.success) router.push("/customers");
              else alert(res.error?.message ?? "تعذّرت الأرشفة");
            });
          }}
          disabled={pending}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "…" : "أرشفة"}
        </button>
      )}
    </div>
  );
}
