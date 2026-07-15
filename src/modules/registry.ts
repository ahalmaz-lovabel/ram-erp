// سجل مركزي بكل موديولات النظام وحالتها.
// بيتحدث تلقائيًا كل ما تستخدم scripts/new-module.mjs

export interface ModuleRegistryEntry {
  name: string;
  label: string;
  status: "planned" | "in-progress" | "stable";
}

export const moduleRegistry: ModuleRegistryEntry[] = [
  { name: "users", label: "المستخدمون والأدوار والصلاحيات وسجل العمليات", status: "in-progress" },
];
