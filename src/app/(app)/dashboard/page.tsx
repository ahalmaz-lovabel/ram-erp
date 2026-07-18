import { prisma } from "@/lib/prisma";
import { moduleRegistry } from "@/modules/registry";

async function getStats() {
  const [customers, deals, products, materials] = await Promise.all([
    prisma.customer.count(),
    prisma.deal.count(),
    prisma.product.count(),
    prisma.material.count(),
  ]);
  return { customers, deals, products, materials };
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  stable: { text: "مكتمل", cls: "bg-green-100 text-green-700" },
  "in-progress": { text: "قيد التنفيذ", cls: "bg-amber-100 text-amber-700" },
  planned: { text: "مخطّط", cls: "bg-slate-100 text-slate-500" },
};

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "العملاء", value: stats.customers },
    { label: "الصفقات", value: stats.deals },
    { label: "المنتجات", value: stats.products },
    { label: "الخامات", value: stats.materials },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
      <p className="mt-1 text-slate-500">نظرة عامة على النظام وأقسامه.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-800">أقسام النظام</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {moduleRegistry.map((m) => {
          const s = statusLabel[m.status] ?? statusLabel.planned;
          return (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div>
                <div className="font-semibold text-slate-800">{m.label}</div>
                <div className="text-xs text-slate-400" dir="ltr">
                  {m.name}
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
                {s.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
