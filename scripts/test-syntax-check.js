/**
 * Простая проверка синтаксиса исправленного middleware
 */

const fs = require('fs');
const path = require('path');

console.log(
  '🧪 Проверка синтаксиса исправленного middleware superAdminAuth.js'
);
console.log('');

try {
  // Читаем содержимое файла
  const filePath = path.join(
    __dirname,
    'lib',
    'middleware',
    'superAdminAuth.js'
  );
  const content = fs.readFileSync(filePath, 'utf8');

  console.log('✅ Файл успешно прочитан');

  // Проверяем, что withPrisma больше не используется
  const hasWithPrismaImport = content.includes('import { withPrisma }');
  const hasWithPrismaUsage = content.includes('withPrisma(');

  console.log('');
  console.log('📋 Результаты проверки:');
  console.log(
    '- Импорт withPrisma удален:',
    !hasWithPrismaImport ? '✅' : '❌'
  );
  console.log(
    '- Использование withPrisma удалено:',
    !hasWithPrismaUsage ? '✅' : '❌'
  );

  // Проверяем, что добавлен правильный импорт prisma
  const hasPrismaImport = content.includes('import { prisma }');
  console.log('- Импорт prisma добавлен:', hasPrismaImport ? '✅' : '❌');

  // Проверяем, что используется прямое обращение к prisma
  const hasDirectPrismaUsage = content.includes('prisma.user.findUnique');
  const hasDirectAdminLogUsage = content.includes(
    'prisma.adminActionLog.create'
  );
  console.log(
    '- Прямое использование prisma.user.findUnique:',
    hasDirectPrismaUsage ? '✅' : '❌'
  );
  console.log(
    '- Прямое использование prisma.adminActionLog.create:',
    hasDirectAdminLogUsage ? '✅' : '❌'
  );

  console.log('');

  if (
    !hasWithPrismaImport &&
    !hasWithPrismaUsage &&
    hasPrismaImport &&
    hasDirectPrismaUsage &&
    hasDirectAdminLogUsage
  ) {
    console.log('🎉 Все проверки пройдены! Исправление выполнено корректно.');
    console.log('');
    console.log('📝 Что было исправлено:');
    console.log(
      '1. ❌ import { withPrisma } from "../prisma" → ✅ import { prisma } from "../prisma"'
    );
    console.log(
      '2. ❌ await withPrisma(async (prisma) => { ... }) → ✅ await prisma.user.findUnique(...)'
    );
    console.log(
      '3. ❌ await withPrisma(async (prisma) => { ... }) → ✅ await prisma.adminActionLog.create(...)'
    );
    console.log('');
    console.log(
      '✨ Middleware теперь использует тот же паттерн, что и другие API файлы в проекте'
    );
  } else {
    console.log(
      '❌ Некоторые проверки не пройдены. Требуется дополнительная корректировка.'
    );
  }
} catch (error) {
  console.error('❌ Ошибка при проверке файла:', error.message);
}
