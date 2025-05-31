/**
 * Тест крайних случаев для API профиля
 * Проверяет специфические сценарии, которые могут вызывать ошибку 500
 */

const { PrismaClient } = require('@prisma/client');
const http = require('http');

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

// Тест 1: Проверка пользователя без записи UserPoints
async function testUserWithoutPoints() {
  log('\n=== ТЕСТ 1: ПОЛЬЗОВАТЕЛЬ БЕЗ ЗАПИСИ USERPOINTS ===', 'cyan');

  try {
    // Создаем тестового пользователя без UserPoints
    log('🔧 Создание тестового пользователя без UserPoints...', 'blue');

    const testUser = await prisma.user.create({
      data: {
        email: 'test-no-points@example.com',
        name: 'Тест без баллов',
        role: 'user',
      },
    });

    log(
      `✅ Создан пользователь: ${testUser.email} (ID: ${testUser.id})`,
      'green'
    );

    // Проверяем, что у пользователя нет UserPoints
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: testUser.id },
    });

    if (userPoints) {
      log('⚠️ У пользователя уже есть UserPoints, удаляем...', 'yellow');
      await prisma.userPoints.delete({
        where: { userId: testUser.id },
      });
    }

    // Симулируем запрос API для этого пользователя
    log('🔍 Симуляция API запроса для пользователя без UserPoints...', 'blue');

    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
        userPoints: {
          select: {
            points: true,
          },
        },
        pointsTransactions: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
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

    log('📊 Данные пользователя:', 'yellow');
    log(`   userPoints: ${user.userPoints ? 'есть' : 'null'}`, 'yellow');
    log(
      `   pointsTransactions: ${user.pointsTransactions.length} записей`,
      'yellow'
    );

    // Проверяем формирование ответа
    const profileData = {
      id: user.id,
      name: user.name || 'Не указано',
      email: user.email || 'Не указано',
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      conductedInterviewsCount: user.conductedInterviewsCount,
      stats: {
        currentPoints: user.userPoints?.points || 0,
        totalInterviews:
          user._count.interviewerSessions + user._count.intervieweeSessions,
        conductedInterviews: user._count.interviewerSessions,
        participatedInterviews: user._count.intervieweeSessions,
        totalTransactions: user._count.pointsTransactions,
      },
      recentTransactions: user.pointsTransactions.map((transaction) => ({
        amount: transaction.amount,
        type: transaction.type,
        createdAt: transaction.createdAt,
      })),
    };

    log('✅ Данные профиля сформированы успешно', 'green');
    log(`   currentPoints: ${profileData.stats.currentPoints}`, 'green');

    // Очистка
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    return true;
  } catch (error) {
    log(
      `❌ Ошибка в тесте пользователя без UserPoints: ${error.message}`,
      'red'
    );
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
    return false;
  }
}

// Тест 2: Проверка пользователя с поврежденными данными
async function testUserWithCorruptedData() {
  log('\n=== ТЕСТ 2: ПОЛЬЗОВАТЕЛЬ С ПОВРЕЖДЕННЫМИ ДАННЫМИ ===', 'cyan');

  try {
    // Создаем пользователя с минимальными данными
    log('🔧 Создание пользователя с минимальными данными...', 'blue');

    const testUser = await prisma.user.create({
      data: {
        email: 'test-corrupted@example.com',
        // Намеренно не указываем name
        role: 'user',
      },
    });

    log(`✅ Создан пользователь: ${testUser.email}`, 'green');

    // Симулируем API запрос
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
        userPoints: {
          select: {
            points: true,
          },
        },
        pointsTransactions: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
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

    log('📊 Проверка null/undefined значений:', 'yellow');
    log(`   name: ${user.name === null ? 'null' : user.name}`, 'yellow');
    log(`   image: ${user.image === null ? 'null' : user.image}`, 'yellow');
    log(
      `   lastLoginAt: ${
        user.lastLoginAt === null ? 'null' : user.lastLoginAt
      }`,
      'yellow'
    );
    log(
      `   conductedInterviewsCount: ${user.conductedInterviewsCount}`,
      'yellow'
    );

    // Проверяем обработку null значений
    const profileData = {
      id: user.id,
      name: user.name || 'Не указано',
      email: user.email || 'Не указано',
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      conductedInterviewsCount: user.conductedInterviewsCount,
      stats: {
        currentPoints: user.userPoints?.points || 0,
        totalInterviews:
          user._count.interviewerSessions + user._count.intervieweeSessions,
        conductedInterviews: user._count.interviewerSessions,
        participatedInterviews: user._count.intervieweeSessions,
        totalTransactions: user._count.pointsTransactions,
      },
      recentTransactions: user.pointsTransactions.map((transaction) => ({
        amount: transaction.amount,
        type: transaction.type,
        createdAt: transaction.createdAt,
      })),
    };

    log('✅ Обработка null значений прошла успешно', 'green');

    // Очистка
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    return true;
  } catch (error) {
    log(`❌ Ошибка в тесте поврежденных данных: ${error.message}`, 'red');
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
    return false;
  }
}

// Тест 3: Проверка импорта Prisma
async function testPrismaImport() {
  log('\n=== ТЕСТ 3: ПРОВЕРКА ИМПОРТА PRISMA ===', 'cyan');

  try {
    log('🔍 Проверка импорта в API файле...', 'blue');

    // Проверяем, что импорт работает корректно
    const fs = require('fs');
    const path = require('path');

    const apiFilePath = path.join(
      __dirname,
      'pages',
      'api',
      'user',
      'profile.js'
    );
    const apiContent = fs.readFileSync(apiFilePath, 'utf8');

    log('📋 Анализ импортов в profile.js:', 'yellow');

    // Проверяем импорт prisma
    if (apiContent.includes("import { prisma } from '../../../lib/prisma'")) {
      log('   ✅ Импорт prisma: named import', 'green');
    } else if (
      apiContent.includes("import prisma from '../../../lib/prisma'")
    ) {
      log('   ✅ Импорт prisma: default import', 'green');
    } else {
      log('   ❌ Импорт prisma: не найден или неправильный', 'red');
      return false;
    }

    // Проверяем импорт NextAuth
    if (
      apiContent.includes("import { getServerSession } from 'next-auth/next'")
    ) {
      log('   ✅ Импорт getServerSession: корректный', 'green');
    } else {
      log('   ❌ Импорт getServerSession: не найден или неправильный', 'red');
      return false;
    }

    // Проверяем импорт authOptions
    if (
      apiContent.includes("import { authOptions } from '../auth/[...nextauth]'")
    ) {
      log('   ✅ Импорт authOptions: корректный', 'green');
    } else {
      log('   ❌ Импорт authOptions: не найден или неправильный', 'red');
      return false;
    }

    return true;
  } catch (error) {
    log(`❌ Ошибка при проверке импортов: ${error.message}`, 'red');
    return false;
  }
}

// Тест 4: Проверка конфликта именованного/дефолтного импорта
async function testPrismaImportConflict() {
  log('\n=== ТЕСТ 4: ПРОВЕРКА КОНФЛИКТА ИМПОРТА PRISMA ===', 'cyan');

  try {
    log('🔍 Проверка возможного конфликта импортов...', 'blue');

    // Проверяем lib/prisma.js
    const fs = require('fs');
    const path = require('path');

    const prismaLibPath = path.join(__dirname, 'lib', 'prisma.js');
    const prismaLibContent = fs.readFileSync(prismaLibPath, 'utf8');

    log('📋 Анализ lib/prisma.js:', 'yellow');

    if (prismaLibContent.includes('export default prisma')) {
      log('   ✅ lib/prisma.js экспортирует default export', 'green');
    } else if (prismaLibContent.includes('export { prisma }')) {
      log('   ⚠️ lib/prisma.js экспортирует named export', 'yellow');
    } else {
      log('   ❌ lib/prisma.js: экспорт не найден', 'red');
      return false;
    }

    // Проверяем, есть ли также named export
    if (
      prismaLibContent.includes('export { prisma }') ||
      prismaLibContent.includes('export const prisma')
    ) {
      log('   ⚠️ Обнаружен также named export - возможен конфликт!', 'yellow');

      // Это может быть причиной ошибки 500
      log('   🚨 ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА: Конфликт импортов!', 'red');
      log(
        '   💡 API файл использует named import, но lib экспортирует default',
        'red'
      );
      return false;
    }

    return true;
  } catch (error) {
    log(`❌ Ошибка при проверке конфликта импортов: ${error.message}`, 'red');
    return false;
  }
}

// Тест 5: Проверка сессии с несуществующим пользователем
async function testSessionWithNonExistentUser() {
  log('\n=== ТЕСТ 5: СЕССИЯ С НЕСУЩЕСТВУЮЩИМ ПОЛЬЗОВАТЕЛЕМ ===', 'cyan');

  try {
    log('🔍 Симуляция сессии с несуществующим email...', 'blue');

    // Симулируем ситуацию, когда сессия содержит email несуществующего пользователя
    const fakeEmail = 'nonexistent@example.com';

    const user = await prisma.user.findUnique({
      where: { email: fakeEmail },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
        userPoints: {
          select: {
            points: true,
          },
        },
        pointsTransactions: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
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

    if (!user) {
      log('✅ Пользователь не найден - это ожидаемо', 'green');
      log('💡 API должен возвращать 404 в этом случае', 'blue');
      return true;
    } else {
      log('⚠️ Пользователь найден, хотя не должен был', 'yellow');
      return false;
    }
  } catch (error) {
    log(
      `❌ Ошибка при проверке несуществующего пользователя: ${error.message}`,
      'red'
    );
    return false;
  }
}

// Основная функция диагностики крайних случаев
async function runEdgeCasesDiagnostics() {
  log('🔍 ДИАГНОСТИКА КРАЙНИХ СЛУЧАЕВ API ПРОФИЛЯ', 'magenta');
  log('=' * 60, 'magenta');

  const results = {
    userWithoutPoints: false,
    userWithCorruptedData: false,
    prismaImport: false,
    prismaImportConflict: false,
    sessionWithNonExistentUser: false,
  };

  try {
    results.userWithoutPoints = await testUserWithoutPoints();
    results.userWithCorruptedData = await testUserWithCorruptedData();
    results.prismaImport = await testPrismaImport();
    results.prismaImportConflict = await testPrismaImportConflict();
    results.sessionWithNonExistentUser = await testSessionWithNonExistentUser();

    // Итоговый отчет
    log('\n' + '=' * 60, 'magenta');
    log('📋 ИТОГОВЫЙ ОТЧЕТ ДИАГНОСТИКИ КРАЙНИХ СЛУЧАЕВ', 'magenta');
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

    // Анализ результатов
    if (!results.prismaImportConflict) {
      log('\n🚨 ОБНАРУЖЕНА ПОТЕНЦИАЛЬНАЯ ПРИЧИНА ОШИБКИ 500!', 'red');
      log('💡 Проблема: Конфликт импортов Prisma', 'red');
      log('🔧 Решение: Исправить импорт в pages/api/user/profile.js', 'yellow');
    } else if (passedCount === totalCount) {
      log('\n🎉 Все тесты крайних случаев пройдены!', 'green');
    } else {
      log('\n⚠️ Обнаружены проблемы в обработке крайних случаев.', 'yellow');
    }

    return results;
  } catch (error) {
    log(
      `❌ Критическая ошибка диагностики крайних случаев: ${error.message}`,
      'red'
    );
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
    return results;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
if (require.main === module) {
  runEdgeCasesDiagnostics().catch((error) => {
    log(`❌ Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runEdgeCasesDiagnostics,
  testUserWithoutPoints,
  testUserWithCorruptedData,
  testPrismaImport,
  testPrismaImportConflict,
  testSessionWithNonExistentUser,
};
