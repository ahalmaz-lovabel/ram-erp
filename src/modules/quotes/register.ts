// تسجيل صلاحيات موديول quotes في الـ registry المركزي (عبر bootstrap/instrumentation).

import { registerModulePermissions } from "@/modules/shared/permissions";
import { QuotesPermissions, QuotesPermissionLabels } from "./permissions";

registerModulePermissions("quotes", QuotesPermissions, QuotesPermissionLabels);
