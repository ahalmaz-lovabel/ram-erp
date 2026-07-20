// تسجيل صلاحيات موديول accounting في الـ registry المركزي (عبر bootstrap/instrumentation).

import { registerModulePermissions } from "@/modules/shared/permissions";
import { AccountingPermissions, AccountingPermissionLabels } from "./permissions";

registerModulePermissions("accounting", AccountingPermissions, AccountingPermissionLabels);
