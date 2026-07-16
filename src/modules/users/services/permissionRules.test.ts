import { describe, it, expect } from "vitest";
import {
  computeEffectivePermissions,
  assertCanManageTarget,
  assertPermissionKeyIsKnown,
  assertRoleAssignable,
  type EffectiveInput,
} from "./permissionRules";
import { isAppError } from "@/modules/shared/errors/AppError";
import { CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { UsersErrorCodes } from "../errors";

const ALL_KEYS = ["users.view", "users.create", "invoices.approve", "invoices.view"];

function baseInput(overrides: Partial<EffectiveInput> = {}): EffectiveInput {
  return {
    isSystemOwner: false,
    roleLevel: "standard",
    status: "active",
    rolePermissionKeys: [],
    grants: [],
    allRegisteredKeys: ALL_KEYS,
    ...overrides,
  };
}

describe("computeEffectivePermissions", () => {
  it("يمنح صلاحيات الدور الأساسي", () => {
    const result = computeEffectivePermissions(
      baseInput({ rolePermissionKeys: ["users.view", "invoices.view"] })
    );
    expect(result).toEqual(new Set(["users.view", "invoices.view"]));
  });

  it("يضيف الصلاحيات الممنوحة مباشرة فوق الدور (§11)", () => {
    const result = computeEffectivePermissions(
      baseInput({
        rolePermissionKeys: ["invoices.view"],
        grants: [{ permissionKey: "invoices.approve", effect: "grant" }],
      })
    );
    expect(result.has("invoices.approve")).toBe(true);
    expect(result.has("invoices.view")).toBe(true);
  });

  it("يسحب الصلاحية المسحوبة استثناءً رغم وجودها في الدور (§11)", () => {
    const result = computeEffectivePermissions(
      baseInput({
        rolePermissionKeys: ["invoices.view", "invoices.approve"],
        grants: [{ permissionKey: "invoices.approve", effect: "revoke" }],
      })
    );
    expect(result.has("invoices.approve")).toBe(false);
    expect(result.has("invoices.view")).toBe(true);
  });

  it("مالك النظام يحصل على كل الصلاحيات المسجّلة (§4)", () => {
    const result = computeEffectivePermissions(
      baseInput({ isSystemOwner: true, rolePermissionKeys: [] })
    );
    expect(result).toEqual(new Set(ALL_KEYS));
  });

  it("الدور بمستوى owner يحصل على كل الصلاحيات المسجّلة", () => {
    const result = computeEffectivePermissions(
      baseInput({ roleLevel: "owner", rolePermissionKeys: [] })
    );
    expect(result).toEqual(new Set(ALL_KEYS));
  });

  it("حساب موقوف ⇐ لا صلاحيات إطلاقًا (§10، §13)", () => {
    const result = computeEffectivePermissions(
      baseInput({
        status: "suspended",
        rolePermissionKeys: ["users.view"],
        grants: [{ permissionKey: "users.create", effect: "grant" }],
      })
    );
    expect(result.size).toBe(0);
  });

  it("حساب مؤرشف حتى لو مالك ⇐ لا صلاحيات", () => {
    const result = computeEffectivePermissions(
      baseInput({ status: "archived", isSystemOwner: true })
    );
    expect(result.size).toBe(0);
  });

  it("منع افتراضي: لا صلاحية بدون منح صريح", () => {
    const result = computeEffectivePermissions(baseInput());
    expect(result.has("users.create")).toBe(false);
  });
});

describe("assertCanManageTarget — حماية مالك النظام (§4، §10)", () => {
  it("يمنع حسابًا غير مالك من إدارة حساب المالك", () => {
    expect.assertions(2);
    try {
      assertCanManageTarget({ isSystemOwner: false }, { isSystemOwner: true });
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.code).toBe(UsersErrorCodes.OWNER_PROTECTED);
    }
  });

  it("يسمح للمالك بإدارة حساب مالك آخر", () => {
    expect(() =>
      assertCanManageTarget({ isSystemOwner: true }, { isSystemOwner: true })
    ).not.toThrow();
  });

  it("يسمح بإدارة مستخدم عادي", () => {
    expect(() =>
      assertCanManageTarget({ isSystemOwner: false }, { isSystemOwner: false })
    ).not.toThrow();
  });
});

describe("assertPermissionKeyIsKnown", () => {
  const isRegistered = (key: string) => ALL_KEYS.includes(key);

  it("يقبل مفتاح صلاحية مسجّل", () => {
    expect(() => assertPermissionKeyIsKnown("users.view", isRegistered)).not.toThrow();
  });

  it("يرفض مفتاح صلاحية غير معروف بكود واضح", () => {
    expect.assertions(2);
    try {
      assertPermissionKeyIsKnown("ghost.permission", isRegistered);
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.code).toBe(UsersErrorCodes.UNKNOWN_PERMISSION);
    }
  });
});

describe("assertRoleAssignable — منع تصعيد الصلاحيات (§4، §21)", () => {
  it("يسمح بإسناد دور تشغيلي (standard)", () => {
    expect(() => assertRoleAssignable("standard")).not.toThrow();
  });

  it("يرفض إسناد دور بمستوى owner", () => {
    expect.assertions(2);
    try {
      assertRoleAssignable("owner");
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.code).toBe(UsersErrorCodes.ROLE_LEVEL_NOT_ASSIGNABLE);
    }
  });

  it("يرفض إسناد دور بمستوى admin", () => {
    expect(() => assertRoleAssignable("admin")).toThrow();
  });
});

// حارس صغير عشان نضمن إن الأكواد المشتركة متاحة للاختبارات المستقبلية.
describe("sanity", () => {
  it("كود PERMISSION_DENIED المشترك موجود", () => {
    expect(CommonErrorCodes.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
  });
});
