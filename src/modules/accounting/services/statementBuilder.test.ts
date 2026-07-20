import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { buildAccountStatement, type StatementEntry } from "./statementBuilder";

const D = (v: number | string) => new Prisma.Decimal(v);
const entry = (
  date: string,
  type: "invoice" | "payment",
  amount: number,
  reference = "INV-1"
): StatementEntry => ({
  date: new Date(date),
  type,
  reference,
  description: "",
  amount: D(amount),
});

describe("buildAccountStatement", () => {
  it("كشف فارغ ⇒ أصفار", () => {
    const s = buildAccountStatement([]);
    expect(s.balance.toString()).toBe("0");
    expect(s.movements).toHaveLength(0);
  });

  it("فاتورة ثم دفعة جزئية ⇒ رصيد جارٍ صحيح", () => {
    const s = buildAccountStatement([
      entry("2026-01-01", "invoice", 1000),
      entry("2026-01-05", "payment", 400),
    ]);
    expect(s.movements[0].balance).toBe("1000");
    expect(s.movements[1].balance).toBe("600");
    expect(s.totalDebit.toString()).toBe("1000");
    expect(s.totalCredit.toString()).toBe("400");
    expect(s.balance.toString()).toBe("600");
  });

  it("يرتّب الحركات زمنيًا بغضّ النظر عن ترتيب الإدخال", () => {
    const s = buildAccountStatement([
      entry("2026-03-01", "payment", 200),
      entry("2026-01-01", "invoice", 500),
    ]);
    expect(s.movements[0].type).toBe("invoice");
    expect(s.movements[0].balance).toBe("500");
    expect(s.movements[1].balance).toBe("300");
  });

  it("عند تساوي التاريخ تُقدَّم الفاتورة على الدفعة", () => {
    const s = buildAccountStatement([
      entry("2026-01-01", "payment", 100),
      entry("2026-01-01", "invoice", 300),
    ]);
    expect(s.movements[0].type).toBe("invoice");
    expect(s.movements[1].type).toBe("payment");
    expect(s.balance.toString()).toBe("200");
  });

  it("دفع كامل ⇒ رصيد صفر", () => {
    const s = buildAccountStatement([
      entry("2026-01-01", "invoice", 750),
      entry("2026-01-02", "payment", 750),
    ]);
    expect(s.balance.toString()).toBe("0");
  });
});
