/**
 * Диагностический скрипт для проверки API статистики с авторизацией
 * Использует существующего супер-администратора для тестирования
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testStatisticsAPIWithAuth() {
  console.log('🔍 ДИАГНОСТИКА API СТАТИСТИКИ С АВТОРИЗАЦИЕЙ');
  console.log('=============================================');

  const prisma = new PrismaClient();

  try {
    // Проверяем существующего супер-администратора
    console.log('👤 Ищем супер-администратора...');
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (!superAdmin) {
      console.log('❌ Супер-администратор не найден');
      return;
    }

    console.log('✅ Найден супер-администратор:', superAdmin.email);

    // Симулируем авторизованный запрос через внутренний API
    console.log('\n📡 Тестируем API статистики напрямую...');

    // Импортируем handler напрямую
    const statisticsHandler =
      require('./pages/api/admin/statistics.js').default;

    // Создаем mock объекты req и res
    const mockReq = {
      method: 'GET',
      admin: {
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    };

    const mockRes = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.responseData = data;
        return this;
      },
      statusCode: 200,
      responseData: null,
    };

    // Вызываем handler
    await statisticsHandler(mockReq, mockRes);

    console.log('📊 Статус ответа:', mockRes.statusCode);
    console.log('📋 Данные ответа:');
    console.log(JSON.stringify(mockRes.responseData, null, 2));

    if (mockRes.statusCode === 200 && mockRes.responseData) {
      const data = mockRes.responseData;

      console.log('\n🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
      console.log('================================');

      console.log('🔸 Есть ли data.success?', 'success' in data);
      console.log('🔸 Есть ли data.data?', 'data' in data);

      if (data.data) {
        console.log('🔸 Есть ли data.data.users?', 'users' in data.data);
        console.log(
          '🔸 Есть ли data.data.interviews?',
          'interviews' in data.data
        );
        console.log('🔸 Есть ли data.data.points?', 'points' in data.data);
        console.log(
          '🔸 Есть ли data.data.adminActivity?',
          'adminActivity' in data.data
        );

        if (data.data.users) {
          console.log('🔸 data.data.users.total:', data.data.users.total);
        }
        if (data.data.interviews) {
          console.log('🔸 data.data.interviews:', data.data.interviews);
        }
      }

      // Проверяем, что ожидает фронтенд
      console.log('\n🎯 ЧТО ОЖИДАЕТ ФРОНТЕНД:');
      console.log('================================');
      console.log('🔸 data.summary.users.total');
      console.log('🔸 data.summary.interviews.total');
      console.log('🔸 data.summary.interviews.pending');
      console.log('🔸 data.summary.interviews.booked');
      console.log('🔸 data.summary.interviews.noShow');
      console.log('🔸 data.recentLogs');

      // Симулируем ошибку фронтенда
      console.log('\n💥 СИМУЛЯЦИЯ ОШИБКИ ФРОНТЕНДА:');
      console.log('================================');
      try {
        // Это то, что пытается сделать фронтенд в pages/admin/index.js:34
        const usersCount = data.summary.users.total;
        console.log('✅ Успешно получили usersCount:', usersCount);
      } catch (error) {
        console.log(
          '❌ НАЙДЕНА ОШИБКА! При попытке получить data.summary.users.total:'
        );
        console.log('   ', error.message);
        console.log('   Тип ошибки:', error.constructor.name);

        console.log('\n🔧 ДИАГНОЗ:');
        console.log('================================');
        console.log('❌ API возвращает: data.data.users.total');
        console.log('❌ Фронтенд ожидает: data.summary.users.total');
        console.log('❌ Несоответствие структуры данных!');
      }

      // Проверяем другие ожидаемые поля
      console.log('\n🔍 ПРОВЕРКА ДРУГИХ ПОЛЕЙ:');
      console.log('================================');

      try {
        const interviewsTotal = data.summary.interviews.total;
        console.log('✅ data.summary.interviews.total:', interviewsTotal);
      } catch (error) {
        console.log('❌ Ошибка data.summary.interviews.total:', error.message);
      }

      try {
        const recentLogs = data.recentLogs;
        console.log('✅ data.recentLogs:', recentLogs);
      } catch (error) {
        console.log('❌ Ошибка data.recentLogs:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем тест
testStatisticsAPIWithAuth();
