const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function diagnoseAdminAccess() {
  console.log('🔍 ДИАГНОСТИКА ДОСТУПА К АДМИН ПАНЕЛИ');
  console.log('=====================================\n');

  const issues = [];

  try {
    // 1. Проверка API эндпоинтов администратора
    console.log('1️⃣ Проверка API эндпоинтов администратора...');
    const adminApiPath = path.join(process.cwd(), 'pages', 'api', 'admin');
    const adminStatisticsPath = path.join(adminApiPath, 'statistics.js');

    if (!fs.existsSync(adminApiPath)) {
      issues.push({
        type: 'CRITICAL',
        category: 'API_ENDPOINTS',
        problem: 'Отсутствует папка /pages/api/admin/',
        description: 'API эндпоинты администратора не существуют',
        impact: 'Все запросы к админ API возвращают 404',
      });
      console.log('❌ Папка /pages/api/admin/ НЕ СУЩЕСТВУЕТ');
    } else {
      console.log('✅ Папка /pages/api/admin/ существует');
    }

    if (!fs.existsSync(adminStatisticsPath)) {
      issues.push({
        type: 'CRITICAL',
        category: 'API_ENDPOINTS',
        problem: 'Отсутствует файл /pages/api/admin/statistics.js',
        description: 'Эндпоинт для статистики администратора не существует',
        impact: 'Запросы к /api/admin/statistics возвращают 404',
      });
      console.log('❌ Файл /pages/api/admin/statistics.js НЕ СУЩЕСТВУЕТ');
    } else {
      console.log('✅ Файл /pages/api/admin/statistics.js существует');
    }

    // 2. Проверка ролей пользователей в базе данных
    console.log('\n2️⃣ Проверка ролей пользователей в базе данных...');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Всего пользователей в системе: ${users.length}`);

    const roleStats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Статистика ролей:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} пользователей`);
    });

    // Проверка конкретного пользователя makstreid@yandex.ru
    const targetUser = users.find(
      (user) => user.email === 'makstreid@yandex.ru'
    );
    if (targetUser) {
      console.log('\n👤 Пользователь makstreid@yandex.ru:');
      console.log(`   ID: ${targetUser.id}`);
      console.log(`   Роль: ${targetUser.role}`);
      console.log(`   Заблокирован: ${targetUser.isBlocked}`);
      console.log(`   Дата создания: ${targetUser.createdAt}`);

      if (targetUser.role !== 'superadmin') {
        issues.push({
          type: 'CRITICAL',
          category: 'USER_ROLES',
          problem: `Пользователь makstreid@yandex.ru имеет роль '${targetUser.role}' вместо 'superadmin'`,
          description:
            'Пользователь не может получить доступ к админ панели из-за недостаточных прав',
          impact: 'Доступ к административным функциям заблокирован',
        });
        console.log('❌ РОЛЬ НЕ СООТВЕТСТВУЕТ ТРЕБОВАНИЯМ');
      } else {
        console.log('✅ Роль корректна');
      }

      if (targetUser.isBlocked) {
        issues.push({
          type: 'CRITICAL',
          category: 'USER_ROLES',
          problem: 'Пользователь makstreid@yandex.ru заблокирован',
          description:
            'Заблокированный пользователь не может получить доступ к админ панели',
          impact: 'Доступ полностью заблокирован',
        });
        console.log('❌ ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН');
      } else {
        console.log('✅ Пользователь не заблокирован');
      }
    } else {
      issues.push({
        type: 'CRITICAL',
        category: 'USER_ROLES',
        problem: 'Пользователь makstreid@yandex.ru не найден в базе данных',
        description: 'Пользователь не существует в системе',
        impact: 'Невозможно предоставить доступ несуществующему пользователю',
      });
      console.log('❌ ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН В БАЗЕ ДАННЫХ');
    }

    // Проверка супер-администраторов
    const superAdmins = users.filter((user) => user.role === 'superadmin');
    console.log(`\n👑 Супер-администраторы в системе: ${superAdmins.length}`);
    if (superAdmins.length === 0) {
      issues.push({
        type: 'WARNING',
        category: 'USER_ROLES',
        problem: 'В системе нет ни одного супер-администратора',
        description: 'Отсутствуют пользователи с правами супер-администратора',
        impact: 'Никто не может получить доступ к админ панели',
      });
      console.log('⚠️ НЕТ СУПЕР-АДМИНИСТРАТОРОВ');
    } else {
      superAdmins.forEach((admin) => {
        console.log(`   ${admin.email} (ID: ${admin.id})`);
      });
    }

    // 3. Проверка middleware
    console.log('\n3️⃣ Проверка middleware для авторизации...');

    const adminAuthPath = path.join(
      process.cwd(),
      'lib',
      'middleware',
      'adminAuth.js'
    );
    const superAdminAuthPath = path.join(
      process.cwd(),
      'lib',
      'middleware',
      'superAdminAuth.js'
    );

    if (fs.existsSync(adminAuthPath)) {
      console.log('✅ Middleware adminAuth.js существует');
    } else {
      issues.push({
        type: 'CRITICAL',
        category: 'MIDDLEWARE',
        problem: 'Отсутствует файл lib/middleware/adminAuth.js',
        description:
          'Middleware для проверки прав администратора не существует',
        impact: 'Невозможно проверить права доступа к админ функциям',
      });
      console.log('❌ Middleware adminAuth.js НЕ СУЩЕСТВУЕТ');
    }

    if (fs.existsSync(superAdminAuthPath)) {
      console.log('✅ Middleware superAdminAuth.js существует');
    } else {
      issues.push({
        type: 'CRITICAL',
        category: 'MIDDLEWARE',
        problem: 'Отсутствует файл lib/middleware/superAdminAuth.js',
        description:
          'Middleware для проверки прав супер-администратора не существует',
        impact: 'Невозможно проверить права доступа к супер-админ функциям',
      });
      console.log('❌ Middleware superAdminAuth.js НЕ СУЩЕСТВУЕТ');
    }

    // 4. Проверка схемы базы данных
    console.log('\n4️⃣ Проверка схемы базы данных...');

    // Проверяем, есть ли поле role в модели User
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      if (schemaContent.includes('role') && schemaContent.includes('String')) {
        console.log('✅ Поле role существует в схеме User');
      } else {
        issues.push({
          type: 'CRITICAL',
          category: 'DATABASE_SCHEMA',
          problem: 'Поле role отсутствует в модели User',
          description: 'База данных не поддерживает роли пользователей',
          impact: 'Невозможно определить права доступа пользователей',
        });
        console.log('❌ Поле role НЕ НАЙДЕНО в схеме User');
      }

      if (schemaContent.includes('AdminActionLog')) {
        console.log('✅ Модель AdminActionLog существует');
      } else {
        issues.push({
          type: 'WARNING',
          category: 'DATABASE_SCHEMA',
          problem: 'Модель AdminActionLog отсутствует',
          description: 'Нет возможности логировать действия администраторов',
          impact: 'Отсутствует аудит административных действий',
        });
        console.log('⚠️ Модель AdminActionLog НЕ НАЙДЕНА');
      }
    } else {
      issues.push({
        type: 'CRITICAL',
        category: 'DATABASE_SCHEMA',
        problem: 'Файл prisma/schema.prisma не найден',
        description: 'Схема базы данных отсутствует',
        impact: 'Невозможно работать с базой данных',
      });
      console.log('❌ Файл schema.prisma НЕ НАЙДЕН');
    }

    // 5. Проверка страниц администратора
    console.log('\n5️⃣ Проверка страниц администратора...');

    const adminPagesPath = path.join(process.cwd(), 'pages', 'admin');
    if (fs.existsSync(adminPagesPath)) {
      console.log('✅ Папка /pages/admin/ существует');
      const adminFiles = fs.readdirSync(adminPagesPath);
      console.log(`📁 Файлы в папке admin: ${adminFiles.join(', ')}`);
    } else {
      issues.push({
        type: 'WARNING',
        category: 'ADMIN_PAGES',
        problem: 'Отсутствует папка /pages/admin/',
        description: 'Страницы администратора не существуют',
        impact: 'Нет интерфейса для администрирования',
      });
      console.log('⚠️ Папка /pages/admin/ НЕ СУЩЕСТВУЕТ');
    }

    // Генерация отчета
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ');
    console.log('==================');

    const criticalIssues = issues.filter((issue) => issue.type === 'CRITICAL');
    const warningIssues = issues.filter((issue) => issue.type === 'WARNING');

    console.log(`🚨 Критических проблем: ${criticalIssues.length}`);
    console.log(`⚠️ Предупреждений: ${warningIssues.length}`);

    if (criticalIssues.length > 0) {
      console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
      criticalIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.problem}`);
        console.log(`   Категория: ${issue.category}`);
        console.log(`   Описание: ${issue.description}`);
        console.log(`   Влияние: ${issue.impact}`);
      });
    }

    if (warningIssues.length > 0) {
      console.log('\n⚠️ ПРЕДУПРЕЖДЕНИЯ:');
      warningIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.problem}`);
        console.log(`   Категория: ${issue.category}`);
        console.log(`   Описание: ${issue.description}`);
        console.log(`   Влияние: ${issue.impact}`);
      });
    }

    if (issues.length === 0) {
      console.log('\n✅ Проблем не обнаружено! Система настроена корректно.');
    }

    return {
      totalIssues: issues.length,
      criticalIssues: criticalIssues.length,
      warningIssues: warningIssues.length,
      issues: issues,
    };
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
    return {
      error: error.message,
      totalIssues: -1,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск диагностики
if (require.main === module) {
  diagnoseAdminAccess()
    .then((result) => {
      if (result.error) {
        console.log('\n💥 Диагностика завершилась с ошибкой');
        process.exit(1);
      } else if (result.criticalIssues > 0) {
        console.log(
          '\n🚨 Обнаружены критические проблемы, требующие немедленного исправления'
        );
        process.exit(1);
      } else {
        console.log('\n✅ Диагностика завершена успешно');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseAdminAccess };
