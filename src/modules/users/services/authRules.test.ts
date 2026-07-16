import { describe, it, expect } from "vitest";
import {
  isLockedOut,
  lockoutWindowStart,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MINUTES,
} from "./authRules";

describe("authRules — القفل الأمني (§13)", () => {
  it("مش مقفول تحت الحد", () => {
    expect(isLockedOut(LOCKOUT_THRESHOLD - 1)).toBe(false);
    expect(isLockedOut(0)).toBe(false);
  });

  it("مقفول عند الحد أو فوقه", () => {
    expect(isLockedOut(LOCKOUT_THRESHOLD)).toBe(true);
    expect(isLockedOut(LOCKOUT_THRESHOLD + 3)).toBe(true);
  });

  it("يحترم حد مخصّص", () => {
    expect(isLockedOut(2, 3)).toBe(false);
    expect(isLockedOut(3, 3)).toBe(true);
  });

  it("بداية النافذة قبل الآن بمقدار الدقائق المحددة", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const start = lockoutWindowStart(now);
    expect(now.getTime() - start.getTime()).toBe(LOCKOUT_WINDOW_MINUTES * 60 * 1000);
  });
});
