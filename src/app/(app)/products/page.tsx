import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";

const cards: { href: string; title: string; desc: string; ready: boolean }[] = [
  {
    href: "/products/materials",
    title: "مكتبة الخامات",
    desc: "الخامات وأسعارها ووحدات الحساب",
    ready: true,
  },
  {
    href: "/products/catalog",
    title: "المنتجات",
    desc: "الأجهزة والقطع وشجرة التكلفة",
    ready: true,
  },
  {
    href: "/products/attributes",
    title: "مكتبة السمات",
    desc: "خصائص المنتجات الموحّدة",
    ready: true,
  },
  {
    href: "/products/operations",
    title: "عمليات التصنيع",
    desc: "العمليات المعيارية وتكلفتها",
    ready: true,
  },
];

export default async function ProductsHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-extrabold text-ink">المنتجات وتكلفة الإنتاج</h1>
        <p className="mt-1 text-sm text-muted">الخامات، السمات، عمليات التصنيع، والمنتجات</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) =>
          c.ready ? (
            <Link
              key={c.href}
              href={c.href}
              className="flex min-h-[110px] flex-col justify-between rounded-[14px] border border-line bg-surface p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
            >
              <div className="text-base font-bold text-ink">{c.title}</div>
              <div className="text-xs text-muted">{c.desc}</div>
            </Link>
          ) : (
            <div
              key={c.href}
              className="flex min-h-[110px] flex-col justify-between rounded-[14px] border border-line bg-surface p-5 opacity-60"
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-ink">{c.title}</div>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] text-muted">
                  قريبًا
                </span>
              </div>
              <div className="text-xs text-muted">{c.desc}</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
