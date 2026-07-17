import { describe, it, expect } from "vitest";
import { formatSequenceNumber } from "./sequenceGenerator";

describe("formatSequenceNumber", () => {
  it("يصفّ القيمة بأصفار مع البادئة", () => {
    expect(formatSequenceNumber("DEAL", 42)).toBe("DEAL-00042");
    expect(formatSequenceNumber("INV", 1)).toBe("INV-00001");
  });

  it("يحترم طول التصفير المخصّص", () => {
    expect(formatSequenceNumber("Q", 7, 3)).toBe("Q-007");
  });

  it("قيمة أكبر من طول التصفير تظهر كاملة", () => {
    expect(formatSequenceNumber("DEAL", 123456, 5)).toBe("DEAL-123456");
  });
});
