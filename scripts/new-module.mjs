#!/usr/bin/env node
/**
 * new-module.mjs (v2)
 * -----------------------------------------------------------------------
 * أداة توليد موديول جديد بنفس البنية المتفق عليها في خطة العمارة.
 * الاستخدام:
 *   node scripts/new-module.mjs <module-name> "<وصف مختصر بالعربي>"
 * مثال:
 *   node scripts/new-module.mjs quotes "عروض الأسعار وإدارة الإصدارات"
 * -----------------------------------------------------------------------
 * الأداة بتعمل:
 *  1) هيكل مجلدات الموديول الكامل جوه src/modules/<name>
 *  2) ملفات أساسية جاهزة (types, service, permissions, actions, README)
 *     مبنية على: AppError + wrapAction لمعالجة الأخطاء، Zod للتحقق من
 *     المدخلات، transaction للعمليات متعددة الخطوات، requirePermission،
 *     recordAuditLog، sequenceGenerator عند الحاجة.
 *  3) تسجيل الموديول في سجل مركزي src/modules/registry.ts
 *  4) طباعة قايمة "خطوات لازم تتعمل يدويًا" في الآخر (فيها تذكير migration)
 * -----------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";

const [, , rawName, rawDescription] = process.argv;

if (!rawName) {
  console.error("❌  لازم تحدد اسم الموديول. مثال:");
  console.error('    node scripts/new-module.mjs quotes "عروض الأسعار"');
  process.exit(1);
}

const kebab = rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const pascal = kebab
  .split("-")
  .filter(Boolean)
  .map((s) => s[0].toUpperCase() + s.slice(1))
  .join("");
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const description = rawDescription?.trim() || "(اكتب وصف الموديول هنا)";

const root = process.cwd();
const moduleDir = path.join(root, "src", "modules", kebab);

if (fs.existsSync(moduleDir)) {
  console.error(`❌  الموديول "${kebab}" موجود بالفعل في ${moduleDir}`);
  process.exit(1);
}

const dirs = ["actions", "services", "components"];

function write(relPath, content) {
  const full = path.join(moduleDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("  + " + path.relative(root, full));
}

console.log(`\n🧱  إنشاء موديول: ${kebab} (${pascal})\n`);

dirs.forEach((d) => fs.mkdirSync(path.join(moduleDir, d), { recursive: true }));

// ---------------------------------------------------------------------
// types.ts
// ---------------------------------------------------------------------
write(
  "types.ts",
  `// أنواع البيانات الخاصة بموديول ${kebab} فقط.
// أي نوع مشترك بين أكتر من موديول يروح في src/modules/shared/types.ts
//
// تنبيه: أي حقل مالي (سعر، مبلغ، رصيد) لازم يكون Decimal في schema.prisma
// و Prisma.Decimal هنا — ممنوع استخدام number/Float للأموال (خطأ تقريب).

import type { Prisma } from "@prisma/client";

export type ${pascal}Status = "draft" | "active" | "archived";

export interface ${pascal}Entity {
  id: string;
  status: ${pascal}Status;
  // amount: Prisma.Decimal;  // مثال لحقل مالي — فعّله لو الموديول فيه مبالغ
  createdAt: Date;
  updatedAt: Date;
  // TODO: أضف باقي الحقول الفعلية حسب تحليل القسم — بدون اختصار أو افتراض
}
`
);

// ---------------------------------------------------------------------
// permissions.ts
// ---------------------------------------------------------------------
write(
  "permissions.ts",
  `// صلاحيات موديول ${kebab}. كل صلاحية بتتسجل هنا وتتربط بالـ registry المركزي
// في src/modules/shared/permissions/registry.ts

export const ${pascal}Permissions = {
  view: "${kebab}.view",
  create: "${kebab}.create",
  update: "${kebab}.update",
  archive: "${kebab}.archive", // نفضل الأرشفة (soft delete) على الحذف الفعلي
  approve: "${kebab}.approve",
} as const;

export type ${pascal}Permission =
  (typeof ${pascal}Permissions)[keyof typeof ${pascal}Permissions];
`
);

// ---------------------------------------------------------------------
// errors.ts (أكواد أخطاء خاصة بالموديول فقط)
// ---------------------------------------------------------------------
write(
  "errors.ts",
  `// أكواد أخطاء خاصة بموديول ${kebab} فقط (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts زي PERMISSION_DENIED أو NOT_FOUND).

export const ${pascal}ErrorCodes = {
  // مثال: INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
} as const;
`
);

// ---------------------------------------------------------------------
// services/<Pascal>Service.ts
// ---------------------------------------------------------------------
write(
  `services/${pascal}Service.ts`,
  `import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { ${pascal}Permissions } from "../permissions";
import type { ${pascal}Entity } from "../types";
import type { Create${pascal}Input } from "./${camel}Schemas";

/**
 * منطق العمل الخاص بموديول ${kebab}.
 * قاعدة: أي قرار عمل (business rule) يتكتب هنا، مش جوه الـ action أو الـ UI.
 * الأخطاء تُرمى دايمًا كـ AppError — ممنوع throw new Error() عادي.
 */

export async function create${pascal}(
  userId: string,
  input: Create${pascal}Input
): Promise<${pascal}Entity> {
  await requirePermission(userId, ${pascal}Permissions.create);

  // لو العملية فيها أكتر من خطوة مترابطة (مثلاً إنشاء + خصم مخزون + قيد
  // محاسبي) لازم تتنفذ كلها جوه transaction واحدة عشان تضمن Rollback
  // كامل لو أي خطوة فشلت:
  //
  // const created = await prisma.$transaction(async (tx) => {
  //   const entity = await tx.${camel}.create({ data: { ...input } });
  //   await tx.someOtherTable.update({ ... });
  //   return entity;
  // });

  const created = await prisma.${camel}.create({
    data: {
      ...input,
      status: "draft",
    },
  });

  // مثال لخطأ عمل: لو فيه شرط لازم يتحقق قبل الإنشاء
  // if (someCondition) {
  //   throw new AppError("SOME_CODE", "رسالة واضحة بالعربي للمستخدم", 400);
  // }

  await recordAuditLog({
    userId,
    module: "${kebab}",
    action: "create",
    entityId: created.id,
    newValue: created,
  });

  return created as unknown as ${pascal}Entity;
}

// TODO: أضف باقي دوال الموديول بنفس النمط:
// update${pascal}, archive${pascal}, approve${pascal}...
// كل دالة: requirePermission → (transaction لو متعدد الخطوات) → AppError
// عند فشل شرط عمل → recordAuditLog بعد النجاح.
`
);

// ---------------------------------------------------------------------
// services/<camel>Schemas.ts (Zod validation)
// ---------------------------------------------------------------------
write(
  `services/${camel}Schemas.ts`,
  `import { z } from "zod";

// كل مدخلات الموديول تتحقق هنا بـ Zod قبل ما توصل لأي service function.
// الـ action هو اللي بينادي .parse() — الـ service بيستقبل بيانات موثوقة
// بالفعل ومفيهوش تحقق مكرر.

export const create${pascal}Schema = z.object({
  // TODO: عرّف الحقول الفعلية المطلوبة عند الإنشاء حسب تحليل القسم
});

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>;
`
);

// ---------------------------------------------------------------------
// actions/index.ts
// ---------------------------------------------------------------------
write(
  "actions/index.ts",
  `"use server";

// نقطة الدخول الوحيدة من الواجهة (UI) لموديول ${kebab}.
// كل action: يتحقق من المدخلات بـ Zod، ينادي service، ويلف كل حاجة
// بـ wrapAction عشان يرجع شكل رد موحّد { success, data } أو { success, error }.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { create${pascal} } from "../services/${pascal}Service";
import { create${pascal}Schema } from "../services/${camel}Schemas";

export async function create${pascal}Action(userId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = create${pascal}Schema.parse(raw);
    return create${pascal}(userId, input);
  });
}
`
);

// ---------------------------------------------------------------------
// README.md
// ---------------------------------------------------------------------
write(
  "README.md",
  `# موديول: ${kebab}

## الوصف
${description}

## الحالة
🚧 قيد الإنشاء — تم توليد الهيكل فقط، لسه محتاج تنفيذ فعلي.

## يعتمد على
- \`modules/shared/permissions\`
- \`modules/shared/audit\`
- \`modules/shared/errors\` (AppError + wrapAction)
- \`modules/shared/logger\`
- (أضف باقي الموديولات اللي بيعتمد عليها، مثلاً products أو customers)

## يُستخدم من
- (اذكر أي موديول تاني بيستدعي الموديول ده)

## افتراضات مؤقتة
- (لو في التحليل الأصلي حاجة غير واضحة واضطريت تفترض حاجة، اكتبها هنا
  صراحة — ممنوع تتخبى جوه الكود)

## مصدر التحليل
راجع مستند تحليل القسم الأصلي قبل التنفيذ، وتأكد إن الحقول في types.ts
مطابقة للبيانات المذكورة فيه بالكامل.

## نقاط لازم تتقفل قبل الاعتبار "مكتمل"
- [ ] كل الحقول من التحليل الأصلي موجودة في types.ts
- [ ] كل الصلاحيات المذكورة في التحليل مسجلة في permissions.ts وفي الـ registry المركزي
- [ ] الحالات (statuses) مطابقة لما ذُكر في التحليل، ومعرّفة كـ enum في schema.prisma
- [ ] الحقول المالية (لو فيه) من نوع Decimal في Prisma — مش Float
- [ ] الفهارس (@@index) مضافة لأي حقل هيتم البحث/الفلترة بيه بكثرة (رقم فاتورة، كود منتج...)
- [ ] كل مدخلات الـ actions بتتحقق بـ Zod قبل ما توصل للـ service
- [ ] الأخطاء بترجع عبر AppError + wrapAction، مش throw عشوائي
- [ ] العمليات متعددة الخطوات (خصم مخزون + إنشاء فاتورة مثلاً) داخل prisma.\$transaction
- [ ] Audit log مُفعّل على كل عملية حساسة (تعديل، اعتماد، إلغاء)
- [ ] شُغّلت \`prisma migrate dev\` محليًا بعد أي تعديل في schema.prisma (وأُعدّت migration مكتوبة يدويًا لـ production)
- [ ] لا يوجد منطق عمل داخل مكونات الواجهة (components)
- [ ] اختبار أساسي واحد على الأقل لكل دالة في services/، وتغطية خاصة لأي قاعدة عمل حساسة
`
);

// ---------------------------------------------------------------------
// تسجيل الموديول في السجل المركزي
// ---------------------------------------------------------------------
const registryPath = path.join(root, "src", "modules", "registry.ts");
const entry = `  { name: "${kebab}", label: "${description}", status: "in-progress" },\n`;

if (!fs.existsSync(registryPath)) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(
    registryPath,
    `// سجل مركزي بكل موديولات النظام وحالتها.
// بيتحدث تلقائيًا كل ما تستخدم scripts/new-module.mjs

export interface ModuleRegistryEntry {
  name: string;
  label: string;
  status: "planned" | "in-progress" | "stable";
}

export const moduleRegistry: ModuleRegistryEntry[] = [
${entry}];
`,
    "utf8"
  );
  console.log("  + " + path.relative(root, registryPath) + " (تم إنشاؤه)");
} else {
  const content = fs.readFileSync(registryPath, "utf8");
  if (!content.includes(`name: "${kebab}"`)) {
    const updated = content.replace(
      /(export const moduleRegistry: ModuleRegistryEntry\[\] = \[\n)/,
      `$1${entry}`
    );
    fs.writeFileSync(registryPath, updated, "utf8");
    console.log("  ~ " + path.relative(root, registryPath) + " (تم تحديثه)");
  }
}

console.log(`\n✅  تم إنشاء موديول "${kebab}" بنجاح.\n`);
console.log("خطوات لازم تتعمل يدويًا دلوقتي:");
console.log("  1. افتح types.ts واملأ الحقول الفعلية من مستند التحليل (استخدم Decimal للمبالغ)");
console.log("  2. أضف نماذج Prisma الخاصة بالموديول في schema.prisma (enum للحالات + @@index للحقول المهمة)");
console.log("  3. شغّل: npx prisma migrate dev --name add-" + kebab + "   (محليًا/Staging فقط)");
console.log("  4. اكتب دوال services/ الفعلية + حدد Zod schema في " + camel + "Schemas.ts");
console.log("  5. اربط permissions.ts بالـ registry المركزي في shared/permissions");
console.log("  6. حدّث قسم 'التنقل الرئيسي' في الواجهة لو الموديول له صفحة مستقلة");
console.log("  7. اكتب اختبار أساسي واحد على الأقل قبل ما تعتبره مكتمل\n");
