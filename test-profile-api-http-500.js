/**
 * Тест для воспроизведения ошибки 500 на эндпоинте /user/profile
 * Симулирует реальный HTTP запрос с различными сценариями аутентификации
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Тест 1: Запрос без аутентификации
async function testWithoutAuth() {
  log('\n=== ТЕСТ 1: ЗАПРОС БЕЗ АУТЕНТИФИКАЦИИ ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0',
      },
    };

    log('🔍 Отправка запроса без cookies...', 'blue');
    log(
      `   URL: http://${options.hostname}:${options.port}${options.path}`,
      'yellow'
    );
    log(`   Method: ${options.method}`, 'yellow');

    const response = await makeRequest(options);

    log(`📊 Ответ сервера:`, 'blue');
    log(
      `   Status: ${response.statusCode}`,
      response.statusCode === 401 ? 'green' : 'red'
    );
    log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`, 'yellow');
    log(`   Data: ${JSON.stringify(response.data, null, 2)}`, 'yellow');

    if (response.statusCode === 401) {
      log('✅ Ожидаемый результат: 401 Unauthorized', 'green');
      return true;
    } else {
      log(`❌ Неожиданный статус: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при выполнении запроса: ${error.message}`, 'red');
    return false;
  }
}

// Тест 2: Запрос с недействительными cookies
async function testWithInvalidCookies() {
  log('\n=== ТЕСТ 2: ЗАПРОС С НЕДЕЙСТВИТЕЛЬНЫМИ COOKIES ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0',
        Cookie:
          'next-auth.session-token=invalid-token; next-auth.csrf-token=invalid-csrf',
      },
    };

    log('🔍 Отправка запроса с недействительными cookies...', 'blue');
    log(
      `   URL: http://${options.hostname}:${options.port}${options.path}`,
      'yellow'
    );
    log(`   Cookies: ${options.headers.Cookie}`, 'yellow');

    const response = await makeRequest(options);

    log(`📊 Ответ сервера:`, 'blue');
    log(
      `   Status: ${response.statusCode}`,
      response.statusCode === 401 ? 'green' : 'red'
    );
    log(`   Data: ${JSON.stringify(response.data, null, 2)}`, 'yellow');

    if (response.statusCode === 401) {
      log('✅ Ожидаемый результат: 401 Unauthorized', 'green');
      return true;
    } else if (response.statusCode === 500) {
      log(
        '🚨 НАЙДЕНА ОШИБКА 500! Проблема с обработкой недействительных cookies',
        'red'
      );
      log(`   Данные ошибки: ${response.rawData}`, 'red');
      return false;
    } else {
      log(`❌ Неожиданный статус: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при выполнении запроса: ${error.message}`, 'red');
    return false;
  }
}

// Тест 3: Запрос с поврежденными cookies
async function testWithCorruptedCookies() {
  log('\n=== ТЕСТ 3: ЗАПРОС С ПОВРЕЖДЕННЫМИ COOKIES ===', 'cyan');

  try {
    const corruptedCookies = [
      'next-auth.session-token=corrupted%data%here',
      'next-auth.session-token={"invalid":"json"',
      'next-auth.session-token=null',
      'next-auth.session-token=undefined',
    ];

    for (const cookie of corruptedCookies) {
      log(`🔍 Тестирование cookie: ${cookie}`, 'blue');

      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/user/profile',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Test-Agent/1.0',
          Cookie: cookie,
        },
      };

      const response = await makeRequest(options);

      log(
        `   Status: ${response.statusCode}`,
        response.statusCode === 401 ? 'green' : 'red'
      );

      if (response.statusCode === 500) {
        log(
          '🚨 НАЙДЕНА ОШИБКА 500! Проблема с обработкой поврежденных cookies',
          'red'
        );
        log(`   Cookie: ${cookie}`, 'red');
        log(`   Данные ошибки: ${response.rawData}`, 'red');
        return false;
      }
    }

    log('✅ Все поврежденные cookies обработаны корректно', 'green');
    return true;
  } catch (error) {
    log(`❌ Ошибка при выполнении запроса: ${error.message}`, 'red');
    return false;
  }
}

// Тест 4: Проверка доступности сервера
async function testServerAvailability() {
  log('\n=== ТЕСТ 4: ПРОВЕРКА ДОСТУПНОСТИ СЕРВЕРА ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Agent/1.0',
      },
    };

    log('🔍 Проверка доступности главной страницы...', 'blue');

    const response = await makeRequest(options);

    log(`📊 Ответ сервера:`, 'blue');
    log(
      `   Status: ${response.statusCode}`,
      response.statusCode === 200 ? 'green' : 'red'
    );

    if (response.statusCode === 200) {
      log('✅ Сервер доступен', 'green');
      return true;
    } else {
      log(`❌ Сервер недоступен: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Сервер не запущен (ECONNREFUSED)', 'red');
      log('💡 Запустите сервер командой: npm run dev', 'yellow');
    } else {
      log(`❌ Ошибка подключения: ${error.message}`, 'red');
    }
    return false;
  }
}

// Тест 5: Проверка NextAuth эндпоинтов
async function testNextAuthEndpoints() {
  log('\n=== ТЕСТ 5: ПРОВЕРКА NEXTAUTH ЭНДПОИНТОВ ===', 'cyan');

  const endpoints = [
    '/api/auth/session',
    '/api/auth/providers',
    '/api/auth/csrf',
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      log(`🔍 Проверка эндпоинта: ${endpoint}`, 'blue');

      const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'User-Agent': 'Test-Agent/1.0',
        },
      };

      const response = await makeRequest(options);

      log(
        `   Status: ${response.statusCode}`,
        response.statusCode === 200 ? 'green' : 'red'
      );

      if (response.statusCode !== 200) {
        log(`   ❌ Эндпоинт ${endpoint} недоступен`, 'red');
        allPassed = false;
      }

      if (response.statusCode === 500) {
        log(`   🚨 ОШИБКА 500 на эндпоинте NextAuth: ${endpoint}`, 'red');
        log(`   Данные ошибки: ${response.rawData}`, 'red');
      }
    } catch (error) {
      log(`   ❌ Ошибка при проверке ${endpoint}: ${error.message}`, 'red');
      allPassed = false;
    }
  }

  return allPassed;
}

// Основная функция диагностики
async function runHTTPDiagnostics() {
  log('🔍 ДИАГНОСТИКА HTTP ЗАПРОСОВ К API ПРОФИЛЯ', 'magenta');
  log('=' * 60, 'magenta');

  const results = {
    serverAvailability: false,
    nextAuthEndpoints: false,
    withoutAuth: false,
    invalidCookies: false,
    corruptedCookies: false,
  };

  try {
    // Проверяем доступность сервера
    results.serverAvailability = await testServerAvailability();

    if (!results.serverAvailability) {
      log('\n❌ Сервер недоступен. Остальные тесты пропущены.', 'red');
      return results;
    }

    // Проверяем NextAuth эндпоинты
    results.nextAuthEndpoints = await testNextAuthEndpoints();

    // Выполняем тесты API профиля
    results.withoutAuth = await testWithoutAuth();
    results.invalidCookies = await testWithInvalidCookies();
    results.corruptedCookies = await testWithCorruptedCookies();

    // Итоговый отчет
    log('\n' + '=' * 60, 'magenta');
    log('📋 ИТОГОВЫЙ ОТЧЕТ HTTP ДИАГНОСТИКИ', 'magenta');
    log('=' * 60, 'magenta');

    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН';
      const color = passed ? 'green' : 'red';
      log(`${test}: ${status}`, color);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    log(
      `\n📊 Результат: ${passedCount}/${totalCount} тестов пройдено`,
      passedCount === totalCount ? 'green' : 'yellow'
    );

    if (passedCount === totalCount) {
      log('\n🎉 Все HTTP тесты пройдены!', 'green');
      log(
        '💡 Если ошибка 500 все еще возникает, проблема может быть в:',
        'blue'
      );
      log('   - Специфических условиях браузера', 'blue');
      log('   - Конкретных пользовательских данных', 'blue');
      log('   - Состоянии сессии в определенный момент', 'blue');
    } else {
      log('\n⚠️ Обнаружены проблемы в HTTP обработке.', 'yellow');
    }

    return results;
  } catch (error) {
    log(`❌ Критическая ошибка HTTP диагностики: ${error.message}`, 'red');
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
    return results;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
if (require.main === module) {
  runHTTPDiagnostics().catch((error) => {
    log(`❌ Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runHTTPDiagnostics,
  testServerAvailability,
  testNextAuthEndpoints,
  testWithoutAuth,
  testWithInvalidCookies,
  testWithCorruptedCookies,
};
