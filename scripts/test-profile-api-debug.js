/**
 * Диагностический тест для API endpoint /api/user/profile
 * Проверяет различные сценарии и добавляет детальное логирование
 */

const https = require('https');
const http = require('http');

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/user/profile';

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
    const protocol = options.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
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

// Тест 1: Проверка без аутентификации
async function testWithoutAuth() {
  log('\n=== ТЕСТ 1: Запрос без аутентификации ===', 'cyan');

  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: API_ENDPOINT,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    log(`Отправляем GET запрос на ${BASE_URL}${API_ENDPOINT}`, 'blue');
    const response = await makeRequest(options);

    log(
      `Статус ответа: ${response.statusCode}`,
      response.statusCode === 401 ? 'green' : 'red'
    );
    log(
      `Заголовки ответа: ${JSON.stringify(response.headers, null, 2)}`,
      'yellow'
    );
    log(`Тело ответа: ${JSON.stringify(response.body, null, 2)}`, 'yellow');

    if (response.statusCode === 401) {
      log(
        '✅ Тест пройден: API корректно возвращает 401 для неавторизованных запросов',
        'green'
      );
    } else {
      log('❌ Тест не пройден: Ожидался статус 401', 'red');
    }

    return response.statusCode === 401;
  } catch (error) {
    log(`❌ Ошибка при выполнении запроса: ${error.message}`, 'red');
    return false;
  }
}

// Тест 2: Проверка с некорректными методами
async function testInvalidMethods() {
  log('\n=== ТЕСТ 2: Проверка неподдерживаемых HTTP методов ===', 'cyan');

  const methods = ['POST', 'DELETE', 'PATCH'];
  let allPassed = true;

  for (const method of methods) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: API_ENDPOINT,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      log(`Отправляем ${method} запрос на ${BASE_URL}${API_ENDPOINT}`, 'blue');
      const response = await makeRequest(options);

      log(
        `Статус ответа для ${method}: ${response.statusCode}`,
        response.statusCode === 405 ? 'green' : 'red'
      );
      log(`Тело ответа: ${JSON.stringify(response.body, null, 2)}`, 'yellow');

      if (response.statusCode !== 405) {
        allPassed = false;
        log(`❌ Ожидался статус 405 для метода ${method}`, 'red');
      }
    } catch (error) {
      log(
        `❌ Ошибка при тестировании метода ${method}: ${error.message}`,
        'red'
      );
      allPassed = false;
    }
  }

  if (allPassed) {
    log('✅ Все тесты методов пройдены', 'green');
  }

  return allPassed;
}

// Тест 3: Проверка подключения к базе данных
async function testDatabaseConnection() {
  log('\n=== ТЕСТ 3: Проверка подключения к базе данных ===', 'cyan');

  try {
    // Импортируем Prisma клиент
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    log('Проверяем подключение к базе данных...', 'blue');

    // Простой запрос для проверки подключения
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    log(
      `✅ Подключение к базе данных работает: ${JSON.stringify(result)}`,
      'green'
    );

    // Проверяем существование таблицы User
    const userCount = await prisma.user.count();
    log(
      `✅ Таблица User существует, количество пользователей: ${userCount}`,
      'green'
    );

    // Проверяем существование связанных таблиц
    const userPointsCount = await prisma.userPoints.count();
    log(
      `✅ Таблица UserPoints существует, количество записей: ${userPointsCount}`,
      'green'
    );

    const transactionsCount = await prisma.pointsTransaction.count();
    log(
      `✅ Таблица PointsTransaction существует, количество записей: ${transactionsCount}`,
      'green'
    );

    await prisma.$disconnect();
    return true;
  } catch (error) {
    log(`❌ Ошибка подключения к базе данных: ${error.message}`, 'red');
    log(`Стек ошибки: ${error.stack}`, 'red');
    return false;
  }
}

// Тест 4: Проверка NextAuth конфигурации
async function testNextAuthConfig() {
  log('\n=== ТЕСТ 4: Проверка конфигурации NextAuth ===', 'cyan');

  try {
    // Проверяем доступность NextAuth endpoint
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/providers',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    log('Проверяем доступность NextAuth providers...', 'blue');
    const response = await makeRequest(options);

    log(
      `Статус ответа: ${response.statusCode}`,
      response.statusCode === 200 ? 'green' : 'red'
    );
    log(`Провайдеры: ${JSON.stringify(response.body, null, 2)}`, 'yellow');

    if (response.statusCode === 200) {
      log('✅ NextAuth конфигурация доступна', 'green');
      return true;
    } else {
      log('❌ Проблема с конфигурацией NextAuth', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при проверке NextAuth: ${error.message}`, 'red');
    return false;
  }
}

// Тест 5: Проверка структуры базы данных
async function testDatabaseSchema() {
  log('\n=== ТЕСТ 5: Проверка структуры базы данных ===', 'cyan');

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Проверяем наличие тестового пользователя
    log('Ищем тестового пользователя...', 'blue');
    const testUser = await prisma.user.findFirst({
      include: {
        userPoints: true,
        pointsTransactions: {
          take: 1,
        },
        _count: {
          select: {
            interviewerSessions: true,
            intervieweeSessions: true,
            pointsTransactions: true,
          },
        },
      },
    });

    if (testUser) {
      log(`✅ Найден пользователь: ${testUser.email}`, 'green');
      log(
        `Структура пользователя: ${JSON.stringify(
          {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            role: testUser.role,
            hasUserPoints: !!testUser.userPoints,
            transactionsCount: testUser._count.pointsTransactions,
          },
          null,
          2
        )}`,
        'yellow'
      );

      // Проверяем все поля, которые использует API
      const requiredFields = ['id', 'name', 'email', 'role', 'createdAt'];
      const missingFields = requiredFields.filter(
        (field) => testUser[field] === undefined
      );

      if (missingFields.length === 0) {
        log('✅ Все необходимые поля присутствуют', 'green');
      } else {
        log(`❌ Отсутствуют поля: ${missingFields.join(', ')}`, 'red');
      }
    } else {
      log('⚠️ Пользователи не найдены в базе данных', 'yellow');
    }

    await prisma.$disconnect();
    return !!testUser;
  } catch (error) {
    log(`❌ Ошибка при проверке схемы базы данных: ${error.message}`, 'red');
    log(`Стек ошибки: ${error.stack}`, 'red');
    return false;
  }
}

// Тест 6: Симуляция запроса с сессией
async function testWithMockSession() {
  log('\n=== ТЕСТ 6: Симуляция запроса с сессией ===', 'cyan');

  try {
    // Создаем тестовый файл для проверки API логики
    const fs = require('fs');
    const path = require('path');

    const testApiCode = `
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('./pages/api/auth/[...nextauth]');
const { prisma } = require('./lib/prisma');

async function testProfileAPI() {
  try {
    console.log('🔍 Тестируем логику API профиля...');
    
    // Находим первого пользователя для тестирования
    const testUser = await prisma.user.findFirst({
      include: {
        userPoints: true,
        pointsTransactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            interviewerSessions: true,
            intervieweeSessions: true,
            pointsTransactions: true,
          }
        }
      }
    });
    
    if (!testUser) {
      console.log('❌ Тестовый пользователь не найден');
      return false;
    }
    
    console.log('✅ Тестовый пользователь найден:', testUser.email);
    
    // Симулируем логику из handleGetProfile
    const profileData = {
      id: testUser.id,
      name: testUser.name || 'Не указано',
      email: testUser.email || 'Не указано',
      image: testUser.image,
      role: testUser.role,
      createdAt: testUser.createdAt,
      lastLoginAt: testUser.lastLoginAt,
      conductedInterviewsCount: testUser.conductedInterviewsCount,
      
      stats: {
        currentPoints: testUser.userPoints?.points || 0,
        totalInterviews: testUser._count.interviewerSessions + testUser._count.intervieweeSessions,
        conductedInterviews: testUser._count.interviewerSessions,
        participatedInterviews: testUser._count.intervieweeSessions,
        totalTransactions: testUser._count.pointsTransactions,
      },
      
      recentTransactions: testUser.pointsTransactions.map((transaction) => ({
        amount: transaction.amount,
        type: transaction.type,
        createdAt: transaction.createdAt,
      })),
    };
    
    console.log('✅ Профиль успешно сформирован');
    console.log('📊 Данные профиля:', JSON.stringify(profileData, null, 2));
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Ошибка при тестировании API логики:', error);
    console.error('Стек ошибки:', error.stack);
    await prisma.$disconnect();
    return false;
  }
}

testProfileAPI().then(result => {
  process.exit(result ? 0 : 1);
});
`;

    fs.writeFileSync('test-api-logic.js', testApiCode);
    log('Создан тестовый файл для проверки API логики', 'blue');

    // Выполняем тест
    const { exec } = require('child_process');

    return new Promise((resolve) => {
      exec('node test-api-logic.js', (error, stdout, stderr) => {
        log('Результат тестирования API логики:', 'blue');
        if (stdout) log(stdout, 'yellow');
        if (stderr) log(stderr, 'red');

        // Удаляем тестовый файл
        try {
          fs.unlinkSync('test-api-logic.js');
        } catch (e) {
          // Игнорируем ошибки удаления
        }

        resolve(!error);
      });
    });
  } catch (error) {
    log(`❌ Ошибка при симуляции запроса: ${error.message}`, 'red');
    return false;
  }
}

// Основная функция диагностики
async function runDiagnostics() {
  log('🔍 НАЧИНАЕМ ДИАГНОСТИКУ API ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ', 'magenta');
  log('=' * 60, 'magenta');

  const results = {
    withoutAuth: false,
    invalidMethods: false,
    databaseConnection: false,
    nextAuthConfig: false,
    databaseSchema: false,
    mockSession: false,
  };

  // Выполняем все тесты
  results.withoutAuth = await testWithoutAuth();
  results.invalidMethods = await testInvalidMethods();
  results.databaseConnection = await testDatabaseConnection();
  results.nextAuthConfig = await testNextAuthConfig();
  results.databaseSchema = await testDatabaseSchema();
  results.mockSession = await testWithMockSession();

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
    `\n📊 Результат: ${passedCount}/${totalCount} тестов пройдено`,
    passedCount === totalCount ? 'green' : 'yellow'
  );

  // Анализ результатов и рекомендации
  log('\n🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:', 'cyan');

  if (!results.databaseConnection) {
    log('1. Проверьте подключение к базе данных и конфигурацию Prisma', 'red');
  }

  if (!results.nextAuthConfig) {
    log('2. Проверьте конфигурацию NextAuth в файле [...nextauth].js', 'red');
  }

  if (!results.databaseSchema) {
    log(
      '3. Проверьте структуру базы данных и наличие необходимых таблиц',
      'red'
    );
  }

  if (!results.mockSession) {
    log('4. Проверьте логику обработки данных в API endpoint', 'red');
  }

  if (passedCount === totalCount) {
    log('\n🎉 Все тесты пройдены! API должен работать корректно.', 'green');
  } else {
    log('\n⚠️ Обнаружены проблемы, требующие исправления.', 'yellow');
  }
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
  testWithoutAuth,
  testInvalidMethods,
  testDatabaseConnection,
  testNextAuthConfig,
  testDatabaseSchema,
  testWithMockSession,
};
