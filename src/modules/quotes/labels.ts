// مسميات عربية لحالات عرض السعر (للعرض في الواجهة).

import type { QuoteStatus } from "./types";

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  underRevision: "تحت التعديل",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي",
  converted: "محوّل لفاتورة",
  archived: "مؤرشف",
};

export const quoteStatusBadge: Record<QuoteStatus, { bg: string; color: string }> = {
  draft: { bg: "oklch(0.9 0.01 30)", color: "oklch(0.4 0.01 30)" },
  sent: { bg: "oklch(0.9 0.06 250)", color: "oklch(0.4 0.12 250)" },
  underRevision: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
  accepted: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  rejected: { bg: "oklch(0.9 0.08 25)", color: "oklch(0.4 0.15 25)" },
  expired: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.45 0.01 30)" },
  converted: { bg: "oklch(0.9 0.06 300)", color: "oklch(0.4 0.12 300)" },
  archived: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.4 0.01 30)" },
};
