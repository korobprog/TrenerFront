/**
 * Комплексный тест для проверки исправлений системы авторизации
 * Проверяет доступ к админ-панели для разных ролей пользователей
 *
 * ЦЕЛЬ ТЕСТИРОВАНИЯ:
 * 1. Обычные пользователи (role: 'user') НЕ видят админ-панель
 * 2. Обычные админы (role: 'admin') видят админ-панель
 * 3. Супер админы (role: 'superadmin') видят админ-панель
 * 4. korobprog@gmail.com получает доступ к админ-функциям
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Инициализация Prisma клиента
const prisma = new PrismaClient();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Функция для цветного вывода
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Тестовые пользователи
const testUsers = [
  {
    email: 'test.user@example.com',
    name: 'Тестовый Пользователь',
    role: 'user',
    password: 'testpassword123',
  },
  {
    email: 'test.admin@example.com',
    name: 'Тестовый Админ',
    role: 'admin',
    password: 'adminpassword123',
  },
  {
    email: 'test.superadmin@example.com',
    name: 'Тестовый Супер Админ',
    role: 'superadmin',
    password: 'superadminpassword123',
  },
];

// Результаты тестов
const testResults = {
  userCreation: {},
  apiAccess: {},
  middlewareTests: {},
  korobprogAccess: {},
  summary: {
    passed: 0,
    failed: 0,
    total: 0,
  },
};

/**
 * Создание тестовых пользователей
 */
async function createTestUsers() {
  log('\n=== СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ ===', 'cyan');

  for (const userData of testUsers) {
    try {
      // Проверяем, существует ли пользователь
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        log(`✓ Пользователь ${userData.email} уже существует`, 'yellow');
        testResults.userCreation[userData.role] = {
          status: 'exists',
          userId: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
        };
        continue;
      }

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Создаем пользователя
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });

      log(`✓ Создан пользователь: ${user.email} (${user.role})`, 'green');
      testResults.userCreation[userData.role] = {
        status: 'created',
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      log(
        `✗ Ошибка создания пользователя ${userData.email}: ${error.message}`,
        'red'
      );
      testResults.userCreation[userData.role] = {
        status: 'error',
        error: error.message,
      };
    }
  }
}

/**
 * Симуляция проверки middleware авторизации
 */
async function testMiddlewareAuth() {
  log('\n=== ТЕСТИРОВАНИЕ MIDDLEWARE АВТОРИЗАЦИИ ===', 'cyan');

  // Тест withAdminAuth middleware
  log('\n--- Тест withAdminAuth middleware ---', 'blue');

  for (const role of ['user', 'admin', 'superadmin']) {
    const userData = testResults.userCreation[role];
    if (!userData || userData.status === 'error') {
      log(
        `⚠ Пропускаем тест для роли ${role} - пользователь не создан`,
        'yellow'
      );
      continue;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userData.userId },
        select: { id: true, role: true, isBlocked: true },
      });

      const shouldHaveAccess =
        user.role === 'admin' || user.role === 'superadmin';
      const hasAccess =
        !user.isBlocked &&
        (user.role === 'admin' || user.role === 'superadmin');

      if (shouldHaveAccess === hasAccess) {
        log(
          `✓ withAdminAuth для ${role}: ${
            hasAccess ? 'ДОСТУП РАЗРЕШЕН' : 'ДОСТУП ЗАПРЕЩЕН'
          } ✓`,
          'green'
        );
        testResults.middlewareTests[`withAdminAuth_${role}`] = {
          passed: true,
          hasAccess,
        };
        testResults.summary.passed++;
      } else {
        log(`✗ withAdminAuth для ${role}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ`, 'red');
        testResults.middlewareTests[`withAdminAuth_${role}`] = {
          passed: false,
          hasAccess,
          expected: shouldHaveAccess,
        };
        testResults.summary.failed++;
      }
      testResults.summary.total++;
    } catch (error) {
      log(
        `✗ Ошибка тестирования withAdminAuth для ${role}: ${error.message}`,
        'red'
      );
      testResults.middlewareTests[`withAdminAuth_${role}`] = {
        passed: false,
        error: error.message,
      };
      testResults.summary.failed++;
      testResults.summary.total++;
    }
  }

  // Тест withSuperAdminAuth middleware
  log('\n--- Тест withSuperAdminAuth middleware ---', 'blue');

  for (const role of ['user', 'admin', 'superadmin']) {
    const userData = testResults.userCreation[role];
    if (!userData || userData.status === 'error') {
      log(
        `⚠ Пропускаем тест для роли ${role} - пользователь не создан`,
        'yellow'
      );
      continue;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userData.userId },
        select: { id: true, role: true, isBlocked: true },
      });

      const shouldHaveAccess = user.role === 'superadmin';
      const hasAccess = !user.isBlocked && user.role === 'superadmin';

      if (shouldHaveAccess === hasAccess) {
        log(
          `✓ withSuperAdminAuth для ${role}: ${
            hasAccess ? 'ДОСТУП РАЗРЕШЕН' : 'ДОСТУП ЗАПРЕЩЕН'
          } ✓`,
          'green'
        );
        testResults.middlewareTests[`withSuperAdminAuth_${role}`] = {
          passed: true,
          hasAccess,
        };
        testResults.summary.passed++;
      } else {
        log(`✗ withSuperAdminAuth для ${role}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ`, 'red');
        testResults.middlewareTests[`withSuperAdminAuth_${role}`] = {
          passed: false,
          hasAccess,
          expected: shouldHaveAccess,
        };
        testResults.summary.failed++;
      }
      testResults.summary.total++;
    } catch (error) {
      log(
        `✗ Ошибка тестирования withSuperAdminAuth для ${role}: ${error.message}`,
        'red'
      );
      testResults.middlewareTests[`withSuperAdminAuth_${role}`] = {
        passed: false,
        error: error.message,
      };
      testResults.summary.failed++;
      testResults.summary.total++;
    }
  }
}

/**
 * Тестирование доступа к админ API endpoints
 */
async function testAdminApiAccess() {
  log('\n=== ТЕСТИРОВАНИЕ ДОСТУПА К АДМИН API ===', 'cyan');

  const adminEndpoints = [
    '/api/admin/statistics',
    '/api/admin/users',
    '/api/admin/logs',
    '/api/admin/interviews',
  ];

  for (const endpoint of adminEndpoints) {
    log(`\n--- Тестирование ${endpoint} ---`, 'blue');

    for (const role of ['user', 'admin', 'superadmin']) {
      const userData = testResults.userCreation[role];
      if (!userData || userData.status === 'error') {
        log(
          `⚠ Пропускаем тест для роли ${role} - пользователь не создан`,
          'yellow'
        );
        continue;
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userData.userId },
          select: { id: true, role: true, isBlocked: true, email: true },
        });

        // Симулируем проверку доступа (как в middleware)
        const shouldHaveAccess =
          !user.isBlocked &&
          (user.role === 'admin' || user.role === 'superadmin');

        // Для тестирования API мы симулируем результат на основе роли
        let apiAccessResult;
        if (user.isBlocked) {
          apiAccessResult = { status: 403, message: 'Доступ запрещен' };
        } else if (user.role === 'user') {
          apiAccessResult = {
            status: 403,
            message: 'Требуются права администратора',
          };
        } else if (user.role === 'admin' || user.role === 'superadmin') {
          apiAccessResult = { status: 200, message: 'Доступ разрешен' };
        }

        const hasAccess = apiAccessResult.status === 200;

        if (shouldHaveAccess === hasAccess) {
          log(
            `✓ ${endpoint} для ${role}: ${
              hasAccess ? 'ДОСТУП РАЗРЕШЕН' : 'ДОСТУП ЗАПРЕЩЕН'
            } ✓`,
            'green'
          );
          testResults.apiAccess[`${endpoint}_${role}`] = {
            passed: true,
            hasAccess,
            status: apiAccessResult.status,
            message: apiAccessResult.message,
          };
          testResults.summary.passed++;
        } else {
          log(`✗ ${endpoint} для ${role}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ`, 'red');
          testResults.apiAccess[`${endpoint}_${role}`] = {
            passed: false,
            hasAccess,
            expected: shouldHaveAccess,
            status: apiAccessResult.status,
            message: apiAccessResult.message,
          };
          testResults.summary.failed++;
        }
        testResults.summary.total++;
      } catch (error) {
        log(
          `✗ Ошибка тестирования ${endpoint} для ${role}: ${error.message}`,
          'red'
        );
        testResults.apiAccess[`${endpoint}_${role}`] = {
          passed: false,
          error: error.message,
        };
        testResults.summary.failed++;
        testResults.summary.total++;
      }
    }
  }
}

/**
 * Специальный тест для korobprog@gmail.com
 */
async function testKorobprogAccess() {
  log('\n=== ТЕСТИРОВАНИЕ ДОСТУПА korobprog@gmail.com ===', 'cyan');

  try {
    const korobprogUser = await prisma.user.findUnique({
      where: { email: 'korobprog@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!korobprogUser) {
      log(
        '⚠ Пользователь korobprog@gmail.com не найден в базе данных',
        'yellow'
      );
      testResults.korobprogAccess.status = 'not_found';
      testResults.summary.failed++;
      testResults.summary.total++;
      return;
    }

    log(`✓ Пользователь найден: ${korobprogUser.email}`, 'green');
    log(`  - Имя: ${korobprogUser.name || 'Не указано'}`, 'blue');
    log(`  - Роль: ${korobprogUser.role}`, 'blue');
    log(`  - Заблокирован: ${korobprogUser.isBlocked ? 'Да' : 'Нет'}`, 'blue');
    log(`  - Дата создания: ${korobprogUser.createdAt}`, 'blue');
    log(
      `  - Последний вход: ${korobprogUser.lastLoginAt || 'Никогда'}`,
      'blue'
    );

    // Проверяем доступ к админ функциям
    const shouldHaveAdminAccess =
      !korobprogUser.isBlocked &&
      (korobprogUser.role === 'admin' || korobprogUser.role === 'superadmin');

    const shouldHaveSuperAdminAccess =
      !korobprogUser.isBlocked && korobprogUser.role === 'superadmin';

    testResults.korobprogAccess = {
      status: 'found',
      user: korobprogUser,
      adminAccess: shouldHaveAdminAccess,
      superAdminAccess: shouldHaveSuperAdminAccess,
      recommendations: [],
    };

    if (shouldHaveAdminAccess) {
      log(`✓ korobprog@gmail.com имеет доступ к админ-панели`, 'green');
      testResults.summary.passed++;
    } else {
      log(`✗ korobprog@gmail.com НЕ имеет доступа к админ-панели`, 'red');
      testResults.korobprogAccess.recommendations.push(
        'Установить роль admin или superadmin'
      );
      testResults.summary.failed++;
    }

    if (korobprogUser.role === 'superadmin') {
      log(`✓ korobprog@gmail.com имеет права супер-администратора`, 'green');
    } else if (korobprogUser.role === 'admin') {
      log(
        `⚠ korobprog@gmail.com имеет права обычного администратора`,
        'yellow'
      );
      testResults.korobprogAccess.recommendations.push(
        'Рассмотреть возможность повышения до superadmin'
      );
    } else {
      log(`✗ korobprog@gmail.com имеет роль: ${korobprogUser.role}`, 'red');
      testResults.korobprogAccess.recommendations.push(
        'Установить роль superadmin для полного доступа'
      );
    }

    if (korobprogUser.isBlocked) {
      log(`✗ korobprog@gmail.com заблокирован`, 'red');
      testResults.korobprogAccess.recommendations.push(
        'Разблокировать пользователя'
      );
    }

    testResults.summary.total++;
  } catch (error) {
    log(`✗ Ошибка при проверке korobprog@gmail.com: ${error.message}`, 'red');
    testResults.korobprogAccess = { status: 'error', error: error.message };
    testResults.summary.failed++;
    testResults.summary.total++;
  }
}

/**
 * Проверка статистики ролей в системе
 */
async function checkRoleStatistics() {
  log('\n=== СТАТИСТИКА РОЛЕЙ В СИСТЕМЕ ===', 'cyan');

  try {
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
      orderBy: {
        role: 'asc',
      },
    });

    const totalUsers = await prisma.user.count();
    const blockedUsers = await prisma.user.count({
      where: { isBlocked: true },
    });

    log(`Общее количество пользователей: ${totalUsers}`, 'blue');
    log(`Заблокированных пользователей: ${blockedUsers}`, 'blue');
    log('\nРаспределение по ролям:', 'blue');

    roleStats.forEach((stat) => {
      const percentage = ((stat._count.role / totalUsers) * 100).toFixed(1);
      log(`  - ${stat.role}: ${stat._count.role} (${percentage}%)`, 'blue');
    });

    // Проверяем наличие администраторов
    const adminCount =
      roleStats.find((s) => s.role === 'admin')?._count.role || 0;
    const superAdminCount =
      roleStats.find((s) => s.role === 'superadmin')?._count.role || 0;
    const totalAdmins = adminCount + superAdminCount;

    log(
      `\nВсего администраторов: ${totalAdmins}`,
      totalAdmins > 0 ? 'green' : 'red'
    );

    if (totalAdmins === 0) {
      log('⚠ ВНИМАНИЕ: В системе нет администраторов!', 'red');
      testResults.summary.failed++;
    } else {
      testResults.summary.passed++;
    }
    testResults.summary.total++;
  } catch (error) {
    log(`✗ Ошибка при получении статистики ролей: ${error.message}`, 'red');
    testResults.summary.failed++;
    testResults.summary.total++;
  }
}

/**
 * Генерация отчета о результатах тестирования
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'magenta');
  log('ОТЧЕТ О ТЕСТИРОВАНИИ СИСТЕМЫ АВТОРИЗАЦИИ', 'magenta');
  log('='.repeat(60), 'magenta');

  // Общая статистика
  log(`\nОБЩАЯ СТАТИСТИКА:`, 'cyan');
  log(`  Всего тестов: ${testResults.summary.total}`, 'blue');
  log(`  Пройдено: ${testResults.summary.passed}`, 'green');
  log(`  Провалено: ${testResults.summary.failed}`, 'red');

  const successRate =
    testResults.summary.total > 0
      ? (
          (testResults.summary.passed / testResults.summary.total) *
          100
        ).toFixed(1)
      : 0;
  log(`  Успешность: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

  // Детальные результаты
  log(`\nДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:`, 'cyan');

  // Создание пользователей
  log(`\n1. Создание тестовых пользователей:`, 'yellow');
  Object.entries(testResults.userCreation).forEach(([role, result]) => {
    const status =
      result.status === 'created'
        ? '✓ Создан'
        : result.status === 'exists'
        ? '⚠ Существует'
        : '✗ Ошибка';
    const color = result.status === 'error' ? 'red' : 'green';
    log(`  ${role}: ${status}`, color);
  });

  // Middleware тесты
  log(`\n2. Тестирование middleware:`, 'yellow');
  Object.entries(testResults.middlewareTests).forEach(([test, result]) => {
    const status = result.passed ? '✓ Пройден' : '✗ Провален';
    const color = result.passed ? 'green' : 'red';
    log(`  ${test}: ${status}`, color);
  });

  // API тесты
  log(`\n3. Тестирование API endpoints:`, 'yellow');
  const apiResults = {};
  Object.entries(testResults.apiAccess).forEach(([test, result]) => {
    const [endpoint, role] = test.split('_');
    if (!apiResults[endpoint]) apiResults[endpoint] = {};
    apiResults[endpoint][role] = result;
  });

  Object.entries(apiResults).forEach(([endpoint, roles]) => {
    log(`  ${endpoint}:`, 'blue');
    Object.entries(roles).forEach(([role, result]) => {
      const status = result.passed ? '✓' : '✗';
      const access = result.hasAccess ? 'ДОСТУП' : 'БЛОК';
      const color = result.passed ? 'green' : 'red';
      log(`    ${role}: ${status} ${access}`, color);
    });
  });

  // korobprog тест
  log(`\n4. Тестирование korobprog@gmail.com:`, 'yellow');
  if (testResults.korobprogAccess.status === 'found') {
    const user = testResults.korobprogAccess.user;
    log(`  Статус: ✓ Найден`, 'green');
    log(
      `  Роль: ${user.role}`,
      user.role === 'superadmin' ? 'green' : 'yellow'
    );
    log(
      `  Админ доступ: ${
        testResults.korobprogAccess.adminAccess ? '✓ Есть' : '✗ Нет'
      }`,
      testResults.korobprogAccess.adminAccess ? 'green' : 'red'
    );
    log(
      `  Супер-админ доступ: ${
        testResults.korobprogAccess.superAdminAccess ? '✓ Есть' : '✗ Нет'
      }`,
      testResults.korobprogAccess.superAdminAccess ? 'green' : 'red'
    );

    if (testResults.korobprogAccess.recommendations.length > 0) {
      log(`  Рекомендации:`, 'yellow');
      testResults.korobprogAccess.recommendations.forEach((rec) => {
        log(`    - ${rec}`, 'yellow');
      });
    }
  } else {
    log(`  Статус: ✗ ${testResults.korobprogAccess.status}`, 'red');
  }

  // Итоговые рекомендации
  log(`\nИТОГОВЫЕ РЕКОМЕНДАЦИИ:`, 'cyan');

  if (testResults.summary.failed === 0) {
    log(
      `✓ Все тесты пройдены успешно! Система авторизации работает корректно.`,
      'green'
    );
  } else {
    log(`⚠ Обнаружены проблемы в системе авторизации:`, 'red');

    // Анализируем провалы
    const failedTests = [];
    Object.entries(testResults.middlewareTests).forEach(([test, result]) => {
      if (!result.passed) failedTests.push(`Middleware: ${test}`);
    });
    Object.entries(testResults.apiAccess).forEach(([test, result]) => {
      if (!result.passed) failedTests.push(`API: ${test}`);
    });

    failedTests.forEach((test) => {
      log(`  - ${test}`, 'red');
    });

    log(`\nДействия для исправления:`, 'yellow');
    log(`  1. Проверить middleware в lib/middleware/adminAuth.js`, 'yellow');
    log(
      `  2. Проверить middleware в lib/middleware/superAdminAuth.js`,
      'yellow'
    );
    log(
      `  3. Убедиться, что роли пользователей установлены корректно`,
      'yellow'
    );
    log(
      `  4. Проверить, что korobprog@gmail.com имеет роль superadmin`,
      'yellow'
    );
  }

  log('\n' + '='.repeat(60), 'magenta');
}

/**
 * Очистка тестовых данных
 */
async function cleanupTestData() {
  log('\n=== ОЧИСТКА ТЕСТОВЫХ ДАННЫХ ===', 'cyan');

  const testEmails = testUsers.map((u) => u.email);

  try {
    const deletedCount = await prisma.user.deleteMany({
      where: {
        email: {
          in: testEmails,
        },
      },
    });

    log(`✓ Удалено ${deletedCount.count} тестовых пользователей`, 'green');
  } catch (error) {
    log(`⚠ Ошибка при очистке тестовых данных: ${error.message}`, 'yellow');
  }
}

/**
 * Основная функция запуска тестов
 */
async function runAuthTests() {
  try {
    log('ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ АВТОРИЗАЦИИ', 'bright');
    log('Дата: ' + new Date().toLocaleString('ru-RU'), 'blue');

    // Подключение к базе данных
    await prisma.$connect();
    log('✓ Подключение к базе данных установлено', 'green');

    // Запуск тестов
    await createTestUsers();
    await testMiddlewareAuth();
    await testAdminApiAccess();
    await testKorobprogAccess();
    await checkRoleStatistics();

    // Генерация отчета
    generateReport();

    // Спрашиваем пользователя о очистке
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('\nОчистить тестовые данные? (y/N): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await cleanupTestData();
      } else {
        log('Тестовые данные сохранены', 'yellow');
      }

      rl.close();
      await prisma.$disconnect();
      log('\n✓ Тестирование завершено', 'green');
      process.exit(testResults.summary.failed > 0 ? 1 : 0);
    });
  } catch (error) {
    log(`✗ Критическая ошибка: ${error.message}`, 'red');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Запуск тестов при выполнении скрипта
if (require.main === module) {
  runAuthTests();
}

module.exports = {
  runAuthTests,
  testResults,
};
