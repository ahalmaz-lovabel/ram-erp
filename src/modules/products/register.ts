// تسجيل صلاحيات موديول products في الـ registry المركزي. يُستورَد مرة واحدة
// عند إقلاع الخادم عبر src/instrumentation.ts. بكده تظهر صلاحيات الخامات
// والسمات في شجرة الصلاحيات، ويحصل عليها مالك النظام تلقائيًا.

import { registerModulePermissions } from "@/modules/shared/permissions";
import { ProductsPermissions, ProductsPermissionLabels } from "./permissions";

registerModulePermissions("products", ProductsPermissions, ProductsPermissionLabels);
