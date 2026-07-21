// تسجيل كل الموديولات في البنية المشتركة (صلاحيات + resolver). يُستورَد كأثر
// جانبي من مسار التطبيق (shared/auth/session) حتى يعمل في نفس سياق الـ modules
// الخاص بالطلبات — مش فقط في instrumentation (اللي قد تكون في سياق منفصل مع
// Turbopack/HMR). آمن للاستيراد أكثر من مرة (التسجيل idempotent).

import "@/modules/users/register";
import "@/modules/products/register";
import "@/modules/customers/register";
import "@/modules/quotes/register";
import "@/modules/invoices/register";
import "@/modules/accounting/register";
import "@/modules/purchasing/register";
