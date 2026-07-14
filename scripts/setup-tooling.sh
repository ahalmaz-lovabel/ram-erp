#!/usr/bin/env bash
# -----------------------------------------------------------------------
# setup-tooling.sh
# يُشغَّل مرة واحدة فقط عند إنشاء المشروع، عشان يجهّز كل أدوات جودة
# الكود والمكتبات المشتركة المتفق عليها قبل بناء أول موديول.
# الاستخدام: bash scripts/setup-tooling.sh
# -----------------------------------------------------------------------
set -euo pipefail

echo "📦 تثبيت أدوات جودة الكود (ESLint / Prettier / Husky / lint-staged)..."
npm install -D eslint @eslint/js typescript-eslint eslint-config-prettier prettier husky lint-staged

echo "📦 تثبيت المكتبات المشتركة (Zod / Pino / date-fns)..."
npm install zod pino pino-pretty date-fns

echo "🪝 إعداد Husky..."
npx husky init

mkdir -p .husky
cat > .husky/pre-commit <<'EOF'
npx lint-staged
EOF
chmod +x .husky/pre-commit

echo "📝 إعداد lint-staged..."
cat > .lintstagedrc.json <<'EOF'
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
EOF

echo "📝 إعداد Prettier..."
cat > .prettierrc.json <<'EOF'
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF

if [ ! -f "eslint.config.mjs" ]; then
  echo "📝 إعداد ESLint (flat config)..."
  cat > eslint.config.mjs <<'EOF'
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
    },
  }
);
EOF
fi

echo ""
echo "✅ تم إعداد الأدوات. تأكد يدويًا من:"
echo "   1) tsconfig.json فيه \"strict\": true"
echo "   2) schema.prisma بيستخدم Decimal للحقول المالية، مش Float"
echo "   3) مراجعة eslint.config.mjs لو محتاج قواعد إضافية خاصة بالمشروع"
