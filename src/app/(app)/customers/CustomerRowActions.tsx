"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCustomerAction } from "@/modules/customers/actions";

/** أزرار إجراءات الصف في جدول العملاء (§2): عرض · تعديل · أرشفة. */
export function CustomerRowActions({
  customerId,
  archived,
}: {
  customerId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs font-semibold">
      <Link href={`/customers/${customerId}`} className="text-brand hover:underline">
        عرض
      </Link>
      <Link href={`/customers/${customerId}/edit`} className="text-muted hover:text-brand">
        تعديل
      </Link>
      {!archived && (
        <button
          onClick={() => {
            if (!confirm("أرشفة هذا العميل؟")) return;
            startTransition(async () => {
              const res = await archiveCustomerAction(customerId);
              if (res.success) router.refresh();
              else alert(res.error?.message ?? "تعذّرت الأرشفة");
            });
          }}
          disabled={pending}
          className="text-muted hover:text-red-600 disabled:opacity-60"
        >
          {pending ? "…" : "أرشفة"}
        </button>
      )}
    </div>
  );
}
