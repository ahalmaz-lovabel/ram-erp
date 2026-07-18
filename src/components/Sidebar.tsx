import Link from "next/link";

// عناصر التنقّل. الموديولات اللي ليها شاشة فعلية `ready: true`.
const items: { href: string; label: string; icon: string; ready: boolean }[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "▦", ready: true },
  { href: "/customers", label: "العملاء", icon: "◔", ready: false },
  { href: "/products", label: "المنتجات", icon: "◈", ready: false },
  { href: "/users", label: "المستخدمون", icon: "◑", ready: false },
];

export function Sidebar({ current }: { current: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          م
        </span>
        <span className="font-bold text-slate-800">إدارة المصنع</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((it) => {
          const active = current === it.href;
          const base =
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition";
          if (!it.ready) {
            return (
              <span
                key={it.href}
                className={`${base} cursor-default text-slate-400`}
                title="قريبًا"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{it.icon}</span>
                  {it.label}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                  قريبًا
                </span>
              </span>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`${base} ${
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">{it.icon}</span>
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3 text-center text-[11px] text-slate-400">
        نظام إدارة المصنع
      </div>
    </aside>
  );
}
