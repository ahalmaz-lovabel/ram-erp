"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav: { href: string; label: string; ready: boolean }[] = [
  { href: "/dashboard", label: "لوحة التحكم", ready: true },
  { href: "/customers", label: "العملاء", ready: true },
  { href: "/products", label: "المنتجات", ready: true },
  { href: "/users", label: "المستخدمون", ready: true },
  { href: "/accounting", label: "الحسابات", ready: false },
  { href: "/invoices", label: "الفواتير", ready: false },
  { href: "/quotes", label: "عروض الأسعار", ready: true },
  { href: "/shipping", label: "الشحن", ready: false },
  { href: "/production", label: "الإنتاج", ready: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col p-7 text-white"
      style={{
        background: "linear-gradient(180deg, oklch(0.16 0.005 30), oklch(0.1 0.005 30))",
      }}
    >
      <div
        className="mb-6 flex items-center gap-3 border-b pb-6"
        style={{ borderColor: "oklch(1 0 0 / 0.12)" }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[10px] text-lg font-extrabold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          م
        </div>
        <div>
          <div className="text-base font-bold">إدارة المصنع</div>
          <div className="font-slug text-xs" style={{ color: "oklch(0.7 0.01 30)" }}>
            ClubMe Manufacturing
          </div>
        </div>
      </div>

      <div className="px-2 pb-2 text-xs font-semibold" style={{ color: "oklch(0.6 0.01 30)" }}>
        الأقسام
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const dot = (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background: active ? "oklch(0.75 0.15 300)" : "oklch(0.55 0.01 292)",
              }}
            />
          );
          const inner = (
            <span className="flex items-center gap-2.5">
              {dot}
              {it.label}
            </span>
          );
          const rowCls =
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold";

          if (!it.ready) {
            return (
              <div
                key={it.href}
                className={`${rowCls} cursor-default`}
                style={{ color: "oklch(0.75 0.01 30)" }}
              >
                {inner}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: "oklch(1 0 0 / 0.1)", color: "oklch(0.8 0.02 292)" }}
                >
                  قريبًا
                </span>
              </div>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`${rowCls} transition-colors`}
              style={
                active
                  ? { background: "oklch(1 0 0 / 0.1)", color: "white" }
                  : { color: "oklch(0.75 0.01 30)" }
              }
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div
        className="mt-auto border-t pt-5 text-xs"
        style={{ borderColor: "oklch(1 0 0 / 0.12)", color: "oklch(0.55 0.01 30)" }}
      >
        نظام إدارة المصنع · v0.1
      </div>
    </aside>
  );
}
