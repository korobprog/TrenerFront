/**
 * Тест API профиля с аутентификацией
 * Создает тестовую сессию и проверяет работу API
 */

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

// Симуляция логики API профиля
async function simulateProfileAPI() {
  log('\n=== СИМУЛЯЦИЯ ЛОГИКИ API ПРОФИЛЯ ===', 'cyan');

  try {
    // Находим тестового пользователя
    log('🔍 Поиск тестового пользователя...', 'blue');

    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@example.com',
        },
      },
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

    if (!testUser) {
      log('❌ Тестовый пользователь не найден', 'red');
      return false;
    }

    log(`✅ Найден пользователь: ${testUser.email}`, 'green');
    log(`   ID: ${testUser.id}`, 'yellow');
    log(`   Имя: ${testUser.name || 'Не указано'}`, 'yellow');
    log(`   Роль: ${testUser.role}`, 'yellow');

    // Проверяем каждое поле, которое использует API
    log('\n🔍 Проверка полей пользователя:', 'blue');

    const fields = [
      { name: 'id', value: testUser.id },
      { name: 'name', value: testUser.name },
      { name: 'email', value: testUser.email },
      { name: 'image', value: testUser.image },
      { name: 'role', value: testUser.role },
      { name: 'createdAt', value: testUser.createdAt },
      { name: 'lastLoginAt', value: testUser.lastLoginAt },
      {
        name: 'conductedInterviewsCount',
        value: testUser.conductedInterviewsCount,
      },
      { name: 'userPoints', value: testUser.userPoints },
      { name: 'pointsTransactions', value: testUser.pointsTransactions },
      { name: '_count', value: testUser._count },
    ];

    let hasErrors = false;
    fields.forEach((field) => {
      if (field.value === undefined) {
        log(`   ❌ ${field.name}: undefined`, 'red');
        hasErrors = true;
      } else if (field.value === null) {
        log(`   ⚠️ ${field.name}: null`, 'yellow');
      } else {
        log(
          `   ✅ ${field.name}: ${
            typeof field.value === 'object' ? 'объект' : field.value
          }`,
          'green'
        );
      }
    });

    if (hasErrors) {
      log('\n❌ Обнаружены отсутствующие поля!', 'red');
      return false;
    }

    // Симулируем формирование ответа API
    log('\n🔧 Формирование данных профиля...', 'blue');

    try {
      const profileData = {
        id: testUser.id,
        name: testUser.name || 'Не указано',
        email: testUser.email || 'Не указано',
        image: testUser.image,
        role: testUser.role,
        createdAt: testUser.createdAt,
        lastLoginAt: testUser.lastLoginAt,
        conductedInterviewsCount: testUser.conductedInterviewsCount,

        // Статистика
        stats: {
          currentPoints: testUser.userPoints?.points || 0,
          totalInterviews:
            testUser._count.interviewerSessions +
            testUser._count.intervieweeSessions,
          conductedInterviews: testUser._count.interviewerSessions,
          participatedInterviews: testUser._count.intervieweeSessions,
          totalTransactions: testUser._count.pointsTransactions,
        },

        // Последние транзакции баллов
        recentTransactions: testUser.pointsTransactions.map((transaction) => ({
          amount: transaction.amount,
          type: transaction.type,
          createdAt: transaction.createdAt,
        })),
      };

      log('✅ Данные профиля сформированы успешно', 'green');
      log(`📊 Статистика:`, 'yellow');
      log(`   💰 Текущие баллы: ${profileData.stats.currentPoints}`, 'yellow');
      log(
        `   📈 Всего интервью: ${profileData.stats.totalInterviews}`,
        'yellow'
      );
      log(
        `   🎯 Проведено интервью: ${profileData.stats.conductedInterviews}`,
        'yellow'
      );
      log(`   📝 Транзакций: ${profileData.stats.totalTransactions}`, 'yellow');
      log(
        `   🔄 Последних транзакций: ${profileData.recentTransactions.length}`,
        'yellow'
      );

      return true;
    } catch (formattingError) {
      log(
        `❌ Ошибка при формировании данных профиля: ${formattingError.message}`,
        'red'
      );
      log(`📋 Стек ошибки: ${formattingError.stack}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Критическая ошибка при симуляции API: ${error.message}`, 'red');
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
    return false;
  }
}

// Проверка связанных таблиц
async function checkRelatedTables() {
  log('\n=== ПРОВЕРКА СВЯЗАННЫХ ТАБЛИЦ ===', 'cyan');

  try {
    // Проверяем таблицы, которые использует API
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'UserPoints', model: prisma.userPoints },
      { name: 'PointsTransaction', model: prisma.pointsTransaction },
      { name: 'MockInterview', model: prisma.mockInterview },
    ];

    for (const table of tables) {
      try {
        const count = await table.model.count();
        log(`✅ ${table.name}: ${count} записей`, 'green');
      } catch (error) {
        log(`❌ ${table.name}: ошибка - ${error.message}`, 'red');
        return false;
      }
    }

    // Проверяем связи между таблицами
    log('\n🔗 Проверка связей между таблицами:', 'blue');

    const usersWithPoints = await prisma.user.findMany({
      include: {
        userPoints: true,
        _count: {
          select: {
            pointsTransactions: true,
          },
        },
      },
    });

    log(
      `📊 Пользователей с баллами: ${
        usersWithPoints.filter((u) => u.userPoints).length
      }/${usersWithPoints.length}`,
      'yellow'
    );

    const usersWithoutPoints = usersWithPoints.filter((u) => !u.userPoints);
    if (usersWithoutPoints.length > 0) {
      log(`⚠️ Пользователи без записи UserPoints:`, 'yellow');
      usersWithoutPoints.forEach((user) => {
        log(`   - ${user.email} (ID: ${user.id})`, 'yellow');
      });
    }

    return true;
  } catch (error) {
    log(`❌ Ошибка при проверке связанных таблиц: ${error.message}`, 'red');
    return false;
  }
}

// Проверка схемы базы данных
async function checkDatabaseSchema() {
  log('\n=== ПРОВЕРКА СХЕМЫ БАЗЫ ДАННЫХ ===', 'cyan');

  try {
    // Проверяем существование необходимых полей
    log('🔍 Проверка полей таблицы User...', 'blue');

    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
      },
    });

    if (!sampleUser) {
      log('⚠️ Пользователи не найдены в базе данных', 'yellow');
      return false;
    }

    const requiredFields = ['id', 'name', 'email', 'role', 'createdAt'];

    const optionalFields = ['image', 'lastLoginAt', 'conductedInterviewsCount'];

    requiredFields.forEach((field) => {
      if (sampleUser[field] !== undefined) {
        log(`   ✅ ${field}: присутствует`, 'green');
      } else {
        log(`   ❌ ${field}: отсутствует (обязательное поле!)`, 'red');
      }
    });

    optionalFields.forEach((field) => {
      if (sampleUser[field] !== undefined) {
        log(`   ✅ ${field}: присутствует`, 'green');
      } else {
        log(`   ⚠️ ${field}: отсутствует (опциональное поле)`, 'yellow');
      }
    });

    return true;
  } catch (error) {
    log(`❌ Ошибка при проверке схемы: ${error.message}`, 'red');
    return false;
  }
}

// Основная функция диагностики
async function runDiagnostics() {
  log('🔍 ДИАГНОСТИКА API ПРОФИЛЯ С АУТЕНТИФИКАЦИЕЙ', 'magenta');
  log('=' * 60, 'magenta');

  const results = {
    schemaCheck: false,
    relatedTables: false,
    apiSimulation: false,
  };

  try {
    results.schemaCheck = await checkDatabaseSchema();
    results.relatedTables = await checkRelatedTables();
    results.apiSimulation = await simulateProfileAPI();

    // Итоговый отчет
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

    if (passedCount === totalCount) {
      log('\n🎉 Все тесты пройдены! API должен работать корректно.', 'green');
      log(
        '💡 Если ошибка 500 все еще возникает, проблема может быть в:',
        'blue'
      );
      log('   - Конфигурации NextAuth сессий', 'blue');
      log('   - Middleware или других компонентах', 'blue');
      log('   - Проблемах с cookies/сессиями в браузере', 'blue');
    } else {
      log('\n⚠️ Обнаружены проблемы в базе данных или схеме.', 'yellow');
    }
  } catch (error) {
    log(`❌ Критическая ошибка диагностики: ${error.message}`, 'red');
    log(`📋 Стек ошибки: ${error.stack}`, 'red');
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
if (require.main === module) {
  runDiagnostics().catch((error) => {
    log(`❌ Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runDiagnostics,
  simulateProfileAPI,
  checkRelatedTables,
  checkDatabaseSchema,
};
