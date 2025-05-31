/**
 * Диагностический скрипт для анализа структуры данных статистики
 * Проверяет, какие данные должны возвращаться и в каком формате
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseStatisticsStructure() {
  console.log('🔍 ДИАГНОСТИКА СТРУКТУРЫ ДАННЫХ СТАТИСТИКИ');
  console.log('==========================================');

  const prisma = new PrismaClient();

  try {
    console.log('📊 Получаем данные из базы данных...');

    // Получаем те же данные, что и API
    const totalUsers = await prisma.user.count();
    const activeInterviews = await prisma.mockInterview.count({
      where: {
        status: {
          in: ['pending', 'confirmed', 'in_progress'],
        },
      },
    });

    const interviewStats = await prisma.mockInterview.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    console.log('✅ Данные получены успешно');
    console.log('\n📋 ФАКТИЧЕСКИЕ ДАННЫЕ ИЗ БД:');
    console.log('================================');
    console.log('🔸 Общее количество пользователей:', totalUsers);
    console.log('🔸 Активные собеседования:', activeInterviews);
    console.log('🔸 Статистика по статусам собеседований:');
    interviewStats.forEach((stat) => {
      console.log(`   - ${stat.status}: ${stat._count.status}`);
    });

    // Показываем, что возвращает API
    console.log('\n📤 ЧТО ВОЗВРАЩАЕТ API (pages/api/admin/statistics.js):');
    console.log('====================================================');
    console.log('Структура ответа:');
    console.log(`{
  success: true,
  data: {
    users: {
      total: ${totalUsers},
      newLast30Days: ...,
      blocked: ...,
      byRole: { ... }
    },
    interviews: {
      active: ${activeInterviews},
      byStatus: { ... }
    },
    points: { ... },
    adminActivity: { ... }
  }
}`);

    // Показываем, что ожидает фронтенд
    console.log('\n🎯 ЧТО ОЖИДАЕТ ФРОНТЕНД (pages/admin/index.js:34):');
    console.log('==================================================');
    console.log('Ожидаемая структура:');
    console.log(`{
  summary: {
    users: {
      total: число
    },
    interviews: {
      total: число,
      pending: число,
      booked: число,
      noShow: число
    }
  },
  recentLogs: [...]
}`);

    // Показываем проблему
    console.log('\n💥 ПРОБЛЕМА:');
    console.log('=============');
    console.log('❌ API возвращает: data.data.users.total');
    console.log('❌ Фронтенд ожидает: data.summary.users.total');
    console.log('❌ API возвращает: data.data.interviews.active');
    console.log('❌ Фронтенд ожидает: data.summary.interviews.total');
    console.log('❌ API НЕ возвращает: data.recentLogs');
    console.log('❌ Фронтенд ожидает: data.recentLogs');

    // Симулируем ошибку
    console.log('\n🧪 СИМУЛЯЦИЯ ОШИБКИ:');
    console.log('====================');

    // Создаем объект, как его возвращает API
    const apiResponse = {
      success: true,
      data: {
        users: {
          total: totalUsers,
          newLast30Days: 5,
          blocked: 0,
          byRole: {},
        },
        interviews: {
          active: activeInterviews,
          byStatus: {},
        },
        points: {},
        adminActivity: {},
      },
    };

    console.log('📡 API возвращает:', JSON.stringify(apiResponse, null, 2));

    try {
      // Это то, что пытается сделать фронтенд
      const usersCount = apiResponse.summary.users.total;
      console.log('✅ Успешно получили usersCount:', usersCount);
    } catch (error) {
      console.log(
        '❌ ОШИБКА! При попытке получить apiResponse.summary.users.total:'
      );
      console.log('   ', error.message);
      console.log('   Тип ошибки:', error.constructor.name);
      console.log(
        '   Строка кода: const usersCount = data.summary.users.total;'
      );
      console.log('   Файл: pages/admin/index.js:34');
    }

    console.log('\n🔧 РЕШЕНИЕ:');
    console.log('============');
    console.log('1. Изменить API, чтобы возвращал структуру с summary');
    console.log('2. ИЛИ изменить фронтенд, чтобы ожидал структуру с data');
    console.log('3. Добавить recentLogs в API ответ');
    console.log('4. Добавить обработку ошибок в фронтенде');
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
diagnoseStatisticsStructure();
