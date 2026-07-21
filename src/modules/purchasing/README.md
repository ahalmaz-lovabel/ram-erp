# موديول: purchasing

## الوصف

المشتريات والموردون — أوامر شراء ببنود من الخامات، دورة اعتماد/استلام،
ومدفوعات للموردين.

## الحالة

✅ مكتمل وظيفيًا (backend + UI + اختبارات قواعد الحالة). لا يوجد تحليل معتمد
لهذا القسم — النموذج بالكامل **افتراضات مؤقتة** موثّقة أدناه بموافقة صريحة.

## يعتمد على

- `modules/shared/permissions` (requirePermission + registry)
- `modules/shared/audit` (recordAuditLog على كل عملية حساسة)
- `modules/shared/errors` (AppError + wrapAction + prismaErrors)
- `modules/shared/services/sequenceGenerator` (ترقيم PO-XXXXX)
- `modules/shared/services/documentTotals` (حساب الإجماليات)
- `modules/products` (كتالوج الخامات Material لبنود أمر الشراء — snapshot وقت الإضافة)

## يُستخدم من

- (لا شيء بعد) — لاحقًا: `inventory` (زيادة المخزون عند الاستلام) و`accounting`
  (قيد مدفوعات الموردين). نقطة الربط: `receiveOrder` / `recordSupplierPayment`.

## افتراضات مؤقتة (لا يوجد تحليل معتمد)

- **دورة أمر الشراء**: `draft` (قابل للتعديل) → `sent` (مُرسل للمورد) →
  `received` (تم الاستلام). الإلغاء `cancelled` من draft/sent فقط.
- **التعديل** (بنود/خصم/ضريبة) مسموح في حالة `draft` فقط.
- **الاستلام** مسموح من draft أو sent (لا يُجبَر المرور بـ sent).
- **مدفوعات المورد** مسموحة بعد الإرسال (sent/received) وبحدود المتبقّي، وممنوعة
  على مسودة أو أمر ملغى. الدفع لا يغيّر حالة الأمر (الحالة دورة تشغيلية لا مالية).
- **الإلغاء** ممنوع بعد الاستلام أو مع وجود دفعات (تُحذف الدفعات أولًا).
- **بنود الشراء** بلا خصم على مستوى البند (الخصم على مستوى الأمر فقط)؛
  `lineTotal = quantity × unitPrice`. الوحدة والسعر يفتراضان من الخامة إن لم يُحدّدا.
- **حذف المورد** ممنوع — أرشفة فقط (`status: archived`). كود المورد فريد.
- الاستلام لا يزيد المخزون بعد (لا يوجد موديول inventory بعد) — نقطة ربط مستقبلية.

## مصدر التحليل

لا يوجد مستند تحليل في `docs/analysis/` لقسم المشتريات. النموذج بُني على نمط
موديول `invoices` (أقرب مستند مشابه: أمر برأس + بنود snapshot + دفعات + دورة
حالة) مع الافتراضات أعلاه. يجب مطابقته لأي تحليل معتمد لاحقًا قبل التوسّع.

## نقاط لازم تتقفل قبل الاعتبار "مكتمل"

- [x] كل الحقول من التحليل الأصلي موجودة في types.ts (لا تحليل — مطابقة schema.prisma)
- [x] كل الصلاحيات مسجلة في permissions.ts وفي الـ registry المركزي (register.ts + bootstrap + instrumentation)
- [x] الحالات (statuses) معرّفة كـ enum في schema.prisma (SupplierStatus + PurchaseOrderStatus)
- [x] الحقول المالية من نوع Decimal في Prisma — مش Float
- [x] الفهارس (@@index) مضافة (code فريد، status، supplierId، createdByUserId، paidAt...)
- [x] كل مدخلات الـ actions بتتحقق بـ Zod قبل ما توصل للـ service
- [x] الأخطاء بترجع عبر AppError + wrapAction، مش throw عشوائي
- [x] العمليات متعددة الخطوات داخل prisma.$transaction (إنشاء + audit، بند + إعادة حساب...)
- [x] Audit log مُفعّل على كل عملية حساسة (إنشاء/تعديل/إرسال/استلام/إلغاء/دفعة/حذف)
- [x] migration مكتوبة (`20260720222743_add_purchasing`) + عميل Prisma مولّد
- [x] لا يوجد منطق عمل داخل مكونات الواجهة (القرار في services/ + poRules.ts النقي)
- [x] اختبارات قواعد الحالة الحساسة في poRules.test.ts (21 اختبار، تغطية الأكواد المتوقعة)
