/**
 * Дополнительный тест для проверки HTTP запросов к админ API
 * Тестирует реальные HTTP запросы к API endpoints с разными ролями
 */

const http = require('http');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Конфигурация
const config = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  timeout: 10000,
};

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Выполнение HTTP запроса
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * Создание сессии для пользователя (симуляция)
 */
async function createUserSession(userId) {
  try {
    // В реальном приложении здесь был бы запрос на /api/auth/session
    // Для тестирования мы симулируем создание сессии
    const sessionToken = `test-session-${userId}-${Date.now()}`;

    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
      },
    });

    return {
      sessionToken: session.sessionToken,
      cookie: `next-auth.session-token=${session.sessionToken}`,
    };
  } catch (error) {
    log(
      `Ошибка создания сессии для пользователя ${userId}: ${error.message}`,
      'red'
    );
    return null;
  }
}

/**
 * Удаление тестовой сессии
 */
async function cleanupSession(sessionToken) {
  try {
    await prisma.session.deleteMany({
      where: {
        sessionToken,
      },
    });
  } catch (error) {
    log(`Ошибка удаления сессии: ${error.message}`, 'yellow');
  }
}

/**
 * Тестирование доступа к админ API с реальными HTTP запросами
 */
async function testApiEndpointsWithHttp() {
  log('\n=== ТЕСТИРОВАНИЕ HTTP ЗАПРОСОВ К АДМИН API ===', 'cyan');

  const endpoints = [
    { path: '/api/admin/statistics', method: 'GET' },
    { path: '/api/admin/users', method: 'GET' },
    { path: '/api/admin/logs', method: 'GET' },
    { path: '/api/admin/interviews', method: 'GET' },
  ];

  const testUsers = [
    { role: 'user', email: 'test.user@example.com' },
    { role: 'admin', email: 'test.admin@example.com' },
    { role: 'superadmin', email: 'test.superadmin@example.com' },
  ];

  const results = {};

  for (const endpoint of endpoints) {
    log(`\n--- Тестирование ${endpoint.path} ---`, 'blue');
    results[endpoint.path] = {};

    for (const testUser of testUsers) {
      try {
        // Получаем пользователя из БД
        const user = await prisma.user.findUnique({
          where: { email: testUser.email },
          select: { id: true, role: true, isBlocked: true },
        });

        if (!user) {
          log(`⚠ Пользователь ${testUser.email} не найден`, 'yellow');
          continue;
        }

        // Создаем сессию для пользователя
        const session = await createUserSession(user.id);
        if (!session) {
          log(`✗ Не удалось создать сессию для ${testUser.role}`, 'red');
          continue;
        }

        // Подготавливаем запрос
        const url = new URL(config.baseUrl + endpoint.path);
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 3000),
          path: url.pathname + url.search,
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            Cookie: session.cookie,
            'User-Agent': 'Auth-Test-Script/1.0',
          },
          protocol: url.protocol,
        };

        // Выполняем запрос
        const response = await makeRequest(options);

        // Анализируем результат
        const expectedAccess =
          !user.isBlocked &&
          (user.role === 'admin' || user.role === 'superadmin');
        const hasAccess = response.statusCode === 200;
        const testPassed = expectedAccess === hasAccess;

        if (testPassed) {
          log(
            `✓ ${testUser.role}: ${
              hasAccess ? 'ДОСТУП РАЗРЕШЕН' : 'ДОСТУП ЗАПРЕЩЕН'
            } (${response.statusCode})`,
            'green'
          );
        } else {
          log(
            `✗ ${testUser.role}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ (${response.statusCode})`,
            'red'
          );
          log(`  Ожидался: ${expectedAccess ? 'доступ' : 'блокировка'}`, 'red');
          log(`  Получен: ${hasAccess ? 'доступ' : 'блокировка'}`, 'red');
        }

        results[endpoint.path][testUser.role] = {
          passed: testPassed,
          statusCode: response.statusCode,
          hasAccess,
          expectedAccess,
          responseData: response.data,
        };

        // Очищаем сессию
        await cleanupSession(session.sessionToken);
      } catch (error) {
        log(
          `✗ Ошибка тестирования ${endpoint.path} для ${testUser.role}: ${error.message}`,
          'red'
        );
        results[endpoint.path][testUser.role] = {
          passed: false,
          error: error.message,
        };
      }
    }
  }

  return results;
}

/**
 * Тестирование без авторизации
 */
async function testUnauthorizedAccess() {
  log('\n=== ТЕСТИРОВАНИЕ ДОСТУПА БЕЗ АВТОРИЗАЦИИ ===', 'cyan');

  const endpoints = [
    '/api/admin/statistics',
    '/api/admin/users',
    '/api/admin/logs',
    '/api/admin/interviews',
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const url = new URL(config.baseUrl + endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 3000),
        path: url.pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Auth-Test-Script/1.0',
        },
        protocol: url.protocol,
      };

      const response = await makeRequest(options);

      // Ожидаем 401 (Unauthorized)
      const expectedStatus = 401;
      const testPassed = response.statusCode === expectedStatus;

      if (testPassed) {
        log(`✓ ${endpoint}: ДОСТУП ЗАПРЕЩЕН (${response.statusCode})`, 'green');
      } else {
        log(
          `✗ ${endpoint}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ (${response.statusCode})`,
          'red'
        );
        log(`  Ожидался статус: ${expectedStatus}`, 'red');
        log(`  Получен статус: ${response.statusCode}`, 'red');
      }

      results[endpoint] = {
        passed: testPassed,
        statusCode: response.statusCode,
        expectedStatus,
        responseData: response.data,
      };
    } catch (error) {
      log(`✗ Ошибка тестирования ${endpoint}: ${error.message}`, 'red');
      results[endpoint] = {
        passed: false,
        error: error.message,
      };
    }
  }

  return results;
}

/**
 * Тестирование с заблокированным пользователем
 */
async function testBlockedUserAccess() {
  log('\n=== ТЕСТИРОВАНИЕ ДОСТУПА ЗАБЛОКИРОВАННОГО ПОЛЬЗОВАТЕЛЯ ===', 'cyan');

  try {
    // Создаем временного заблокированного админа
    const blockedAdmin = await prisma.user.create({
      data: {
        email: 'blocked.admin@test.com',
        name: 'Заблокированный Админ',
        role: 'admin',
        isBlocked: true,
        emailVerified: new Date(),
      },
    });

    log(`✓ Создан заблокированный админ: ${blockedAdmin.email}`, 'green');

    // Создаем сессию
    const session = await createUserSession(blockedAdmin.id);
    if (!session) {
      log(
        `✗ Не удалось создать сессию для заблокированного пользователя`,
        'red'
      );
      return {};
    }

    const results = {};
    const endpoints = ['/api/admin/statistics', '/api/admin/users'];

    for (const endpoint of endpoints) {
      try {
        const url = new URL(config.baseUrl + endpoint);
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 3000),
          path: url.pathname,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: session.cookie,
            'User-Agent': 'Auth-Test-Script/1.0',
          },
          protocol: url.protocol,
        };

        const response = await makeRequest(options);

        // Ожидаем 403 (Forbidden) для заблокированного пользователя
        const expectedStatus = 403;
        const testPassed = response.statusCode === expectedStatus;

        if (testPassed) {
          log(
            `✓ ${endpoint}: ДОСТУП ЗАПРЕЩЕН для заблокированного админа (${response.statusCode})`,
            'green'
          );
        } else {
          log(
            `✗ ${endpoint}: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ для заблокированного админа (${response.statusCode})`,
            'red'
          );
        }

        results[endpoint] = {
          passed: testPassed,
          statusCode: response.statusCode,
          expectedStatus,
        };
      } catch (error) {
        log(
          `✗ Ошибка тестирования ${endpoint} для заблокированного пользователя: ${error.message}`,
          'red'
        );
        results[endpoint] = {
          passed: false,
          error: error.message,
        };
      }
    }

    // Очищаем тестовые данные
    await cleanupSession(session.sessionToken);
    await prisma.user.delete({
      where: { id: blockedAdmin.id },
    });

    log(`✓ Заблокированный тестовый пользователь удален`, 'green');

    return results;
  } catch (error) {
    log(
      `✗ Ошибка тестирования заблокированного пользователя: ${error.message}`,
      'red'
    );
    return {};
  }
}

/**
 * Генерация отчета по HTTP тестам
 */
function generateHttpTestReport(
  apiResults,
  unauthorizedResults,
  blockedResults
) {
  log('\n' + '='.repeat(60), 'magenta');
  log('ОТЧЕТ ПО HTTP ТЕСТИРОВАНИЮ АДМИН API', 'magenta');
  log('='.repeat(60), 'magenta');

  let totalTests = 0;
  let passedTests = 0;

  // Анализ результатов API тестов
  log('\n1. ТЕСТИРОВАНИЕ С АВТОРИЗАЦИЕЙ:', 'cyan');
  Object.entries(apiResults).forEach(([endpoint, roles]) => {
    log(`\n  ${endpoint}:`, 'blue');
    Object.entries(roles).forEach(([role, result]) => {
      totalTests++;
      if (result.passed) passedTests++;

      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? 'green' : 'red';
      log(`    ${role}: ${status} (${result.statusCode})`, color);

      if (!result.passed && result.error) {
        log(`      Ошибка: ${result.error}`, 'red');
      }
    });
  });

  // Анализ результатов без авторизации
  log('\n2. ТЕСТИРОВАНИЕ БЕЗ АВТОРИЗАЦИИ:', 'cyan');
  Object.entries(unauthorizedResults).forEach(([endpoint, result]) => {
    totalTests++;
    if (result.passed) passedTests++;

    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';
    log(`  ${endpoint}: ${status} (${result.statusCode})`, color);
  });

  // Анализ результатов заблокированного пользователя
  if (Object.keys(blockedResults).length > 0) {
    log('\n3. ТЕСТИРОВАНИЕ ЗАБЛОКИРОВАННОГО ПОЛЬЗОВАТЕЛЯ:', 'cyan');
    Object.entries(blockedResults).forEach(([endpoint, result]) => {
      totalTests++;
      if (result.passed) passedTests++;

      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? 'green' : 'red';
      log(`  ${endpoint}: ${status} (${result.statusCode})`, color);
    });
  }

  // Итоговая статистика
  const successRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  log(`\nИТОГОВАЯ СТАТИСТИКА HTTP ТЕСТОВ:`, 'cyan');
  log(`  Всего тестов: ${totalTests}`, 'blue');
  log(`  Пройдено: ${passedTests}`, 'green');
  log(`  Провалено: ${totalTests - passedTests}`, 'red');
  log(`  Успешность: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

  return { totalTests, passedTests, successRate };
}

/**
 * Основная функция запуска HTTP тестов
 */
async function runHttpAuthTests() {
  try {
    log('ЗАПУСК HTTP ТЕСТИРОВАНИЯ АДМИН API', 'bright');
    log('Дата: ' + new Date().toLocaleString('ru-RU'), 'blue');
    log(`Базовый URL: ${config.baseUrl}`, 'blue');

    await prisma.$connect();
    log('✓ Подключение к базе данных установлено', 'green');

    // Проверяем, что сервер доступен
    try {
      const url = new URL(config.baseUrl);
      const healthCheck = await makeRequest({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 3000),
        path: '/api/health',
        method: 'GET',
        protocol: url.protocol,
        timeout: 5000,
      });

      log('✓ Сервер доступен', 'green');
    } catch (error) {
      log(`⚠ Сервер может быть недоступен: ${error.message}`, 'yellow');
      log('Продолжаем тестирование...', 'yellow');
    }

    // Запуск тестов
    const apiResults = await testApiEndpointsWithHttp();
    const unauthorizedResults = await testUnauthorizedAccess();
    const blockedResults = await testBlockedUserAccess();

    // Генерация отчета
    const stats = generateHttpTestReport(
      apiResults,
      unauthorizedResults,
      blockedResults
    );

    await prisma.$disconnect();
    log('\n✓ HTTP тестирование завершено', 'green');

    return stats.passedTests === stats.totalTests;
  } catch (error) {
    log(`✗ Критическая ошибка HTTP тестирования: ${error.message}`, 'red');
    console.error(error);
    await prisma.$disconnect();
    return false;
  }
}

// Запуск тестов при выполнении скрипта
if (require.main === module) {
  runHttpAuthTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  runHttpAuthTests,
  makeRequest,
  createUserSession,
  cleanupSession,
};
