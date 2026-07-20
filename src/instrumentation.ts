// نقطة إقلاع الخادم في Next.js. بتشتغل مرة واحدة عند بدء الخادم قبل أي طلب.
// هنا بنسجّل موديولات النظام في البنية المشتركة (صلاحيات + resolver...).
// كل موديول جديد بيحتاج تسجيل بيتضاف استيراده هنا.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/modules/users/register");
    await import("@/modules/products/register");
    await import("@/modules/customers/register");
    await import("@/modules/quotes/register");
    await import("@/modules/invoices/register");
    await import("@/modules/accounting/register");
  }
}
