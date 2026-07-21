// تسجيل صلاحيات موديول purchasing في الـ registry المركزي (عبر bootstrap/instrumentation).

import { registerModulePermissions } from "@/modules/shared/permissions";
import { PurchasingPermissions, PurchasingPermissionLabels } from "./permissions";

registerModulePermissions("purchasing", PurchasingPermissions, PurchasingPermissionLabels);
