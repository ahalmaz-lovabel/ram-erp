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

const BRAND = "oklch(0.45 0.2 25)";
const INK = "oklch(0.2 0.01 30)";

const badge: Record<string, { text: string; bg: string; color: string }> = {
  stable: { text: "مكتمل", bg: "oklch(0.92 0.01 30)", color: "oklch(0.2 0.01 30)" },
  "in-progress": { text: "قيد التنفيذ", bg: BRAND, color: "white" },
  planned: { text: "مخطط", bg: "oklch(0.88 0.01 30)", color: "oklch(0.3 0.01 30)" },
};

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    { label: "الخامات", value: stats.materials, color: BRAND, circle: false, cta: "أضف خامة" },
    { label: "المنتجات", value: stats.products, color: INK, circle: false, cta: "أضف منتج" },
    { label: "الصفقات", value: stats.deals, color: BRAND, circle: true, cta: "أضف صفقة" },
    { label: "العملاء", value: stats.customers, color: INK, circle: true, cta: "أضف عميل" },
  ];

  const quickActions = [
    { label: "عميل جديد", color: BRAND },
    { label: "منتج جديد", color: INK },
    { label: "فاتورة جديدة", color: BRAND },
    { label: "صفقة جديدة", color: INK },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div>
        <h1 className="text-[26px] font-extrabold text-ink">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted">نظرة عامة على النظام وأقسامه</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <span
                className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]"
                style={{ background: "oklch(0.94 0.01 30)" }}
              >
                <span
                  className="h-4 w-4"
                  style={{ background: s.color, borderRadius: s.circle ? "50%" : "4px" }}
                />
              </span>
              <span className="text-[13px] font-semibold text-muted">{s.label}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[32px] font-extrabold text-ink">{s.value}</span>
              <span
                className="cursor-default text-xs font-bold"
                style={{ color: s.color }}
                title="قريبًا"
              >
                {s.cta} ←
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-6 rounded-[14px] border border-line bg-surface px-6 py-5">
        <span className="shrink-0 text-sm font-bold" style={{ color: "oklch(0.3 0.005 30)" }}>
          إجراءات سريعة
        </span>
        <span className="h-6 w-px shrink-0" style={{ background: "oklch(0.88 0.005 30)" }} />
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map((q) => (
            <span
              key={q.label}
              className="flex cursor-default items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold"
              style={{ color: "oklch(0.3 0.005 30)" }}
              title="قريبًا"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.color }} />
              {q.label}
            </span>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div>
        <h2 className="mb-4 text-lg font-extrabold text-ink">أقسام النظام</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleRegistry.map((m) => {
            const b = badge[m.status] ?? badge.planned;
            return (
              <div
                key={m.name}
                className="flex min-h-[110px] cursor-default flex-col justify-between gap-8 rounded-[14px] border border-line bg-surface p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: b.bg, color: b.color }}
                  >
                    {b.text}
                  </span>
                  <span className="text-lg" style={{ color: "oklch(0.65 0.005 30)" }}>
                    ↖
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold text-ink">{m.label}</div>
                  <div className="font-slug mt-0.5 text-xs text-muted" dir="ltr">
                    {m.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
