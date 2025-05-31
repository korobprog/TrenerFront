/**
 * Простой тест API профиля без зависимостей
 * Проверяет работу API endpoint /api/user/profile
 */

const http = require('http');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
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

// Функция для выполнения HTTP запроса
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            rawBody: body,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: body,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

// Проверка доступности сервера
async function checkServerStatus() {
  log('\n=== ПРОВЕРКА ДОСТУПНОСТИ СЕРВЕРА ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const response = await makeRequest(options);

    if (response.statusCode === 200) {
      log('✅ Сервер доступен на localhost:3000', 'green');
      return true;
    } else {
      log(`⚠️ Сервер отвечает с кодом: ${response.statusCode}`, 'yellow');
      return true; // Сервер работает, но может быть редирект
    }
  } catch (error) {
    log(`❌ Сервер недоступен: ${error.message}`, 'red');
    log('💡 Убедитесь, что сервер запущен: npm run dev', 'cyan');
    return false;
  }
}

// Тест API без аутентификации
async function testAPIWithoutAuth() {
  log('\n=== ТЕСТ API БЕЗ АУТЕНТИФИКАЦИИ ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    log('Отправляем GET запрос на /api/user/profile...', 'blue');
    const response = await makeRequest(options);

    log(
      `Статус ответа: ${response.statusCode}`,
      response.statusCode === 401 ? 'green' : 'red'
    );
    log(`Тело ответа: ${JSON.stringify(response.body, null, 2)}`, 'yellow');

    if (response.statusCode === 401) {
      log('✅ API корректно требует аутентификацию', 'green');
      return true;
    } else if (response.statusCode === 500) {
      log('❌ Внутренняя ошибка сервера - это наша проблема!', 'red');
      return false;
    } else {
      log(`⚠️ Неожиданный статус: ${response.statusCode}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при тестировании API: ${error.message}`, 'red');
    return false;
  }
}

// Тест NextAuth endpoints
async function testNextAuthEndpoints() {
  log('\n=== ТЕСТ NEXTAUTH ENDPOINTS ===', 'cyan');

  const endpoints = [
    '/api/auth/providers',
    '/api/auth/session',
    '/api/auth/csrf',
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      log(`Тестируем ${endpoint}...`, 'blue');
      const response = await makeRequest(options);

      if (response.statusCode === 200) {
        log(`✅ ${endpoint} - OK`, 'green');
      } else {
        log(`❌ ${endpoint} - статус ${response.statusCode}`, 'red');
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${endpoint} - ошибка: ${error.message}`, 'red');
      allPassed = false;
    }
  }

  return allPassed;
}

// Проверка логов сервера
async function checkServerLogs() {
  log('\n=== ИНСТРУКЦИИ ПО ПРОВЕРКЕ ЛОГОВ ===', 'cyan');

  log('📝 Для диагностики проблемы выполните следующие шаги:', 'yellow');
  log('1. Откройте терминал с запущенным сервером (npm run dev)', 'blue');
  log('2. Перейдите на страницу http://localhost:3000/user/profile', 'blue');
  log('3. Войдите в систему, если потребуется', 'blue');
  log('4. Проверьте логи в терминале сервера', 'blue');
  log('5. Ищите сообщения с префиксом [PROFILE API]', 'blue');

  log('\n🔍 Что искать в логах:', 'yellow');
  log('- 🔍 [PROFILE API] Получен запрос: {...}', 'cyan');
  log('- 🔍 [PROFILE API] Сессия: {...}', 'cyan');
  log('- 🔍 [PROFILE API] Ищем пользователя по email: ...', 'cyan');
  log('- 🔍 [PROFILE API] Результат поиска пользователя: {...}', 'cyan');
  log('- ❌ [PROFILE API] КРИТИЧЕСКАЯ ОШИБКА: {...}', 'cyan');

  return true;
}

// Создание тестового пользователя
async function createTestUser() {
  log('\n=== СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ ===', 'cyan');

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Проверяем, есть ли уже тестовый пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (existingUser) {
      log('✅ Тестовый пользователь уже существует', 'green');
      await prisma.$disconnect();
      return true;
    }

    // Создаем тестового пользователя
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-profile',
        email: 'test@example.com',
        name: 'Test User Profile',
        role: 'user',
        emailVerified: new Date(),
        userPoints: {
          create: {
            points: 100,
          },
        },
      },
    });

    log('✅ Создан тестовый пользователь:', 'green');
    log(`Email: ${testUser.email}`, 'yellow');
    log(`ID: ${testUser.id}`, 'yellow');

    await prisma.$disconnect();
    return true;
  } catch (error) {
    log(
      `❌ Ошибка при создании тестового пользователя: ${error.message}`,
      'red'
    );
    return false;
  }
}

// Основная функция диагностики
async function runDiagnostics() {
  log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ "ВНУТРЕННЯЯ ОШИБКА СЕРВЕРА"', 'magenta');
  log('=' * 60, 'magenta');

  const results = {
    serverStatus: false,
    apiWithoutAuth: false,
    nextAuthEndpoints: false,
    testUserCreated: false,
    logsChecked: true,
  };

  // Выполняем все тесты
  results.serverStatus = await checkServerStatus();

  if (results.serverStatus) {
    results.apiWithoutAuth = await testAPIWithoutAuth();
    results.nextAuthEndpoints = await testNextAuthEndpoints();
    results.testUserCreated = await createTestUser();
    results.logsChecked = await checkServerLogs();
  }

  // Выводим итоговый отчет
  log('\n' + '=' * 60, 'magenta');
  log('📋 ИТОГОВЫЙ ОТЧЕТ ДИАГНОСТИКИ', 'magenta');
  log('=' * 60, 'magenta');

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН';
    const color = passed ? 'green' : 'red';
    log(`${test}: ${status}`, color);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  log(
    `\n📊 Результат: ${passedCount}/${totalCount} проверок пройдено`,
    passedCount === totalCount ? 'green' : 'yellow'
  );

  // Рекомендации
  log('\n🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:', 'cyan');

  if (!results.serverStatus) {
    log('1. ❌ КРИТИЧНО: Запустите сервер разработки: npm run dev', 'red');
  } else if (!results.apiWithoutAuth) {
    log(
      '1. ❌ КРИТИЧНО: API возвращает 500 ошибку - проверьте логи сервера',
      'red'
    );
    log(
      '2. 🔍 Откройте http://localhost:3000/user/profile в браузере',
      'yellow'
    );
    log('3. 🔍 Проверьте консоль сервера на наличие ошибок', 'yellow');
  } else {
    log('1. ✅ API работает корректно без аутентификации', 'green');
    log('2. 🔍 Проблема может быть в аутентификации или сессии', 'yellow');
    log('3. 🔍 Проверьте логи при входе в систему', 'yellow');
  }

  if (!results.nextAuthEndpoints) {
    log('4. ❌ Проблема с NextAuth - проверьте конфигурацию', 'red');
  }

  log('\n📝 СЛЕДУЮЩИЕ ШАГИ:', 'cyan');
  log('1. Перейдите на http://localhost:3000/user/profile', 'blue');
  log('2. Войдите в систему (email: test@example.com, пароль: любой)', 'blue');
  log('3. Проверьте логи в терминале сервера', 'blue');
  log(
    '4. Если видите ошибки, сообщите о них для дальнейшей диагностики',
    'blue'
  );

  return results;
}

// Запускаем диагностику
if (require.main === module) {
  runDiagnostics().catch((error) => {
    log(`❌ Критическая ошибка диагностики: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runDiagnostics,
  checkServerStatus,
  testAPIWithoutAuth,
  testNextAuthEndpoints,
  createTestUser,
};
