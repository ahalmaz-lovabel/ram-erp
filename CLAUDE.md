# نظام إدارة المصنع — دليل Claude Code

هذا الملف مرجع دائم لأي جلسة Claude Code على المشروع ده. اقرأه قبل أي مهمة.

## نبذة عن المشروع

نظام إدارة داخلي لمصنع معدات رياضية (تصنيع، توريد، تركيب). النظام مبني على
8 تحليلات متطلبات + دراسة فجوات معتمدة (راجع `/docs/analysis/` و
`/docs/strategy-report.md`). الهدف: منظومة موحدة تغطي العملاء، عروض الأسعار،
الفواتير، الحسابات، المشتريات، المخازن، الإنتاج، الشحن والتركيب، تحت طبقة
صلاحيات واحدة.

## الحزمة التقنية

Next.js 15 (App Router) · TypeScript (`strict: true`) · Prisma · PostgreSQL
(Supabase) · Vercel · Zod (تحقق) · Pino (سجلات تقنية) · date-fns (تواريخ)
· ESLint + Prettier + Husky + lint-staged (جودة كود)

## الإعداد الأولي (مرة واحدة فقط عند بداية المشروع)

```
bash scripts/setup-tooling.sh
```

يجهّز ESLint/Prettier/Husky/lint-staged ويثبّت Zod وPino وdate-fns.
بعدها تأكد يدويًا إن `tsconfig.json` فيه `"strict": true`.

## قواعد ثابتة — ممنوع كسرها

### قاعدة البيانات والـ Migrations

1. **مفيش `prisma migrate dev` على قاعدة بيانات فيها بيانات حقيقية.**
   على Production: migration تُكتب/تُراجع يدويًا وتُشغّل بـ
   `prisma migrate deploy`، مع نسخة احتياطية قبل أي تنفيذ.
   على التطوير المحلي/Staging: `prisma migrate dev` طبيعي ومطلوب بعد أي
   تعديل في `schema.prisma`.
2. **قاعدة بيانات Staging منفصلة تمامًا عن Production.** أي push لأي فرع
   يشغّل Vercel preview يستخدم Staging فقط.
3. **الحقول المالية (سعر، مبلغ، رصيد) نوعها `Decimal` في Prisma دايمًا** —
   ممنوع `Float` أو `Int` للأموال (يسبب أخطاء تقريب).
4. **الحالات (statuses) كـ `enum` في schema.prisma** — ممنوع نص حر لأي
   حالة كيان مذكورة في التحليل.
5. **فهرسة (`@@index`) لأي حقل هيتم البحث/الفلترة بيه بكثرة**: رقم فاتورة،
   كود منتج، معرف عميل، حالة الطلب.
6. **أسماء النماذج (Models) مفردة بصيغة PascalCase** (`Product`, `Invoice`
   لا `Products`)، وحقول الجدول camelCase.

### الموديولات والكود

7. **كل موديول جديد يتولّد بالأداة**، مش يدويًا من الصفر:
   ```
   node scripts/new-module.mjs <module-name> "<وصف مختصر بالعربي>"
   ```
8. **الترقيم التسلسلي** (فواتير، عروض أسعار، أوامر شراء، أوامر تصنيع) يمر
   حصريًا عبر `modules/shared/services/sequenceGenerator.ts`.
9. **الصلاحيات تُفحص server-side دايمًا** عبر `requirePermission()` من
   `modules/shared/permissions` — مش بس إخفاء زرار في الواجهة.
10. **مفيش منطق عمل (business logic) داخل مكونات الواجهة أو الـ actions.**
    القرار في `services/` بس. الـ action بيتحقق بـ Zod وينادي service.

### الأخطاء والمعاملات المالية

11. **كل خطأ عمل يُرمى كـ `AppError`** من `modules/shared/errors/AppError.ts`
    (كود + رسالة عربية واضحة + statusCode) — ممنوع `throw new Error()` عادي.
12. **كل server action يُلف بـ `wrapAction()`** من
    `modules/shared/errors/handleError.ts` عشان يرجع شكل رد موحّد للواجهة:
    `{ success: true, data }` أو `{ success: false, error: { code, message } }`.
13. **أي عملية مترابطة من أكتر من خطوة** (مثلاً: خصم مخزون + إنشاء فاتورة +
    قيد محاسبي) تُنفَّذ داخل `prisma.$transaction()` بالكامل — إما تنجح كل
    الخطوات أو تتراجع كلها (Rollback).
14. **الأخطاء التقنية (System Logs)** عبر `logger` من `modules/shared/logger`
    (Pino) — منفصل تمامًا عن **Audit Log** (`recordAuditLog`) اللي بيسجل
    "مين عمل إيه" على مستوى العمل نفسه للمراجعة المالية.

### السجل التاريخي والحذف

15. **أي مستند رسمي صادر (فاتورة، عرض سعر مُرسل) يُحفظ كـ snapshot** وقت
    الإصدار. تعديل العميل أو المنتج لاحقًا لا يغيّر المستندات القديمة.
16. **حذف = ممنوع افتراضيًا.** استخدم `status: archived` بدل الحذف الفعلي،
    إلا في الحالات اللي التحليل الأصلي صرّح فيها بالحذف الكامل.
17. **كل عملية حساسة (إنشاء، تعديل، اعتماد، إلغاء، حذف) تُسجَّل** عبر
    `recordAuditLog()`.

### تدفق العمل

18. **لا تبدأ موديول جديد قبل ما اللي قبله يستقر**: كود + اختبار أساسي +
    `prisma migrate dev` محلي ناجح + Vercel preview نضيف + مراجعة (local
    gate أو CodeRabbit).
19. **أي افتراض غير موجود في التحليل الأصلي** يُكتب صراحة تحت "افتراضات
    مؤقتة" في `README.md` بتاع الموديول — ما يتخبّاش جوه الكود.

## هيكل المشروع

```
src/modules/<name>/
  types.ts          → أنواع بيانات الموديول
  permissions.ts     → صلاحيات الموديول (تتسجل في shared/permissions)
  errors.ts            → أكواد أخطاء خاصة بالموديول (غير الأكواد المشتركة)
  services/
    <Name>Service.ts    → منطق العمل — هنا القرارات، الـ transactions، AppError
    <name>Schemas.ts      → Zod schemas للتحقق من المدخلات
  actions/                 → نقاط الدخول من الواجهة (wrapAction فقط، بدون منطق)
  components/                → واجهات خاصة بالموديول
  README.md                    → وصف، اعتماديات، افتراضات، checklist اكتمال

src/modules/shared/
  permissions/       → RBAC engine + registry مركزي
  audit/              → recordAuditLog() موحّد (مراجعة مالية)
  errors/
    AppError.ts         → فئة الخطأ الموحدة + أكواد مشتركة
    handleError.ts        → wrapAction() لكل server actions
  logger.ts             → Pino — سجلات تقنية (منفصل عن audit)
  services/
    sequenceGenerator.ts  → توليد أرقام تسلسلية آمنة من التعارض

src/modules/registry.ts  → سجل كل الموديولات وحالتها (تلقائي)
```

## ترتيب بناء الموديولات (لا تحيد عنه إلا بسبب واضح)

1. `users` (صلاحيات) → 2. `products` → 3. `customers` → 4. `quotes`
   → 5. `invoices` → 6. `accounting` → 7. `purchasing` → 8. `inventory`
   → 9. `production` → 10. `shipping`

## قبل ما تعتبر أي موديول "مكتمل"

راجع الـ checklist في `README.md` بتاع الموديول نفسه — كل موديول جديد
يتولّد ومعاه الـ checklist ده تلقائيًا.

## مراجع

- `docs/analysis/` — التحليلات التفصيلية الأصلية لكل قسم
- `docs/strategy-report.md` — دراسة نقاط القوة والضعف والفجوات
- `docs/architecture-plan.md` — خطة العمارة الكاملة
