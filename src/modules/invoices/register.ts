// تسجيل صلاحيات موديول invoices في الـ registry المركزي (عبر bootstrap/instrumentation).

import { registerModulePermissions } from "@/modules/shared/permissions";
import { InvoicesPermissions, InvoicesPermissionLabels } from "./permissions";

registerModulePermissions("invoices", InvoicesPermissions, InvoicesPermissionLabels);
