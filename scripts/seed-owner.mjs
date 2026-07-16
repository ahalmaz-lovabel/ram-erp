#!/usr/bin/env node
/**
 * seed-owner — بذر أول حساب "مالك نظام" بشكل آمن (تحليل §4).
 * -----------------------------------------------------------------------
 * التشغيل (مرة واحدة عند تجهيز البيئة):
 *   OWNER_EMAIL=owner@example.com OWNER_PASSWORD='StrongPass#123' \
 *   OWNER_NAME='المالك' npx tsx scripts/seed-owner.mjs
 * -----------------------------------------------------------------------
 * - يقرأ بيانات المالك من متغيرات البيئة (مش من الكود).
 * - يُنشئ دور "system-owner" (مستوى owner) لو مش موجود.
 * - يُنشئ حساب المالك (isSystemOwner) بكلمة مرور إجبارية التغيير عند أول دخول.
 * - Idempotent: لو فيه مالك بالفعل، ما يعملش حاجة.
 * - قاعدة أمنية: مالك النظام لا يُنشأ أبدًا عبر واجهة إدارة المستخدمين العادية،
 *   فقط عبر السكربت ده.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
const fullName = process.env.OWNER_NAME?.trim() || "مالك النظام";

if (!email || !password) {
  console.error("❌ لازم تحدد OWNER_EMAIL و OWNER_PASSWORD في البيئة.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("❌ كلمة مرور المالك يجب أن تكون 8 أحرف على الأقل.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const existingOwner = await prisma.user.findFirst({ where: { isSystemOwner: true } });
  if (existingOwner) {
    console.log(`ℹ️  يوجد مالك نظام بالفعل (${existingOwner.email}). لا حاجة للبذر.`);
    process.exit(0);
  }

  const ownerRole = await prisma.role.upsert({
    where: { key: "system-owner" },
    update: {},
    create: {
      name: "مالك النظام",
      key: "system-owner",
      description: "أعلى سلطة في النظام — خفي ومحمي",
      level: "owner",
      isSystem: true,
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await prisma.user.create({
    data: {
      fullName,
      email,
      roleId: ownerRole.id,
      isSystemOwner: true,
      status: "active",
      passwordHash,
      mustChangePassword: true, // إجبار التغيير عند أول دخول
    },
  });

  console.log(`✅ تم إنشاء مالك النظام: ${owner.email}`);
  console.log("   لازم يغيّر كلمة المرور عند أول تسجيل دخول.");
} catch (err) {
  console.error("❌ فشل البذر:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
