import pino from "pino";

/**
 * Logger تقني عام (System Logs) — مختلف تمامًا عن Audit Log.
 *
 * الفرق مهم:
 *  - logger (هنا): أخطاء تقنية، تحذيرات نظام، تتبّع أداء. للمطورين.
 *  - recordAuditLog (في modules/shared/audit): "مين عمل إيه" على مستوى
 *    العمل نفسه (اعتماد فاتورة، تعديل سعر...). للمراجعة والتدقيق المالي.
 *
 * ممنوع استخدام logger بدل recordAuditLog أو العكس.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined,
});
