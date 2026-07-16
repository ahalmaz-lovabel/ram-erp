import { describe, it, expect } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
  computeSessionExpiry,
  isExpired,
  SESSION_TTL_DAYS,
} from "./sessionToken";

describe("sessionToken", () => {
  it("يولّد توكنات مختلفة في كل مرة", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url بدون رموز غير آمنة للكوكي
  });

  it("hash للتوكن ثابت لنفس المدخل ومختلف للمدخلات المختلفة", () => {
    const t = generateSessionToken();
    expect(hashSessionToken(t)).toBe(hashSessionToken(t));
    expect(hashSessionToken("a")).not.toBe(hashSessionToken("b"));
    expect(hashSessionToken(t)).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it("الـ hash مش هو التوكن نفسه (مبدأ عدم تخزين التوكن الخام)", () => {
    const t = generateSessionToken();
    expect(hashSessionToken(t)).not.toBe(t);
  });

  it("computeSessionExpiry بيضيف المدة الصحيحة", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const exp = computeSessionExpiry(from);
    const expectedMs = from.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(exp.getTime()).toBe(expectedMs);
  });

  it("isExpired بيميّز الجلسة المنتهية", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(isExpired(new Date("2026-01-09T00:00:00Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-01-11T00:00:00Z"), now)).toBe(false);
  });
});
