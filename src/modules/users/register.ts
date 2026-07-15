// ربط موديول users بالبنية المشتركة. يُستورَد مرة واحدة عند إقلاع الخادم
// (عبر src/instrumentation.ts) قبل أي طلب:
//   1) تسجيل صلاحيات الموديول في الـ registry المركزي (لبناء شجرة الصلاحيات).
//   2) حقن منطق استخراج صلاحيات المستخدم في shared/permissions حتى يعمل
//      requirePermission() في كل النظام.

import { registerModulePermissions, setPermissionResolver } from "@/modules/shared/permissions";
import { UsersPermissions, UsersPermissionLabels } from "./permissions";
import { resolveUserPermissions } from "./services/PermissionService";

registerModulePermissions("users", UsersPermissions, UsersPermissionLabels);
setPermissionResolver(resolveUserPermissions);
