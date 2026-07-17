// تسجيل صلاحيات موديول customers في الـ registry المركزي (عبر instrumentation).

import { registerModulePermissions } from "@/modules/shared/permissions";
import { CustomersPermissions, CustomersPermissionLabels } from "./permissions";

registerModulePermissions("customers", CustomersPermissions, CustomersPermissionLabels);
