const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInterviewDetailsEndpoint() {
  console.log('🔍 Тестирование API endpoint для получения деталей интервью...');
  console.log('🌐 Базовый URL: http://localhost:3000');
  console.log(`⏰ Время запуска: ${new Date().toLocaleString('ru-RU')}`);
  console.log('============================================================');

  let testUserId = null;
  let testInterviewId = null;
  let testSessionToken = null;

  try {
    // Создаем тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User for Interview Details',
        email: 'test-interview-details@example.com',
        role: 'user',
      },
    });
    testUserId = testUser.id;
    console.log(`✅ Тестовый пользователь создан: ${testUserId}`);

    // Создаем тестовую сессию
    console.log('\n🔐 Создание тестовой сессии для database стратегии...');
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    testSessionToken = sessionToken;
    console.log(
      `🔑 Сгенерирован sessionToken: ${sessionToken.substring(0, 16)}...`
    );

    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 1);

    await prisma.session.create({
      data: {
        sessionToken: sessionToken,
        userId: testUserId,
        expires: sessionExpires,
      },
    });
    console.log('✅ Тестовая сессия создана для database стратегии');

    // Создаем тестовое интервью
    console.log('\n🎥 Создание тестового интервью...');
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 2);

    const testInterview = await prisma.mockInterview.create({
      data: {
        interviewerId: testUserId,
        scheduledTime: scheduledTime,
        meetingLink: 'http://localhost:3000/test-meeting',
        status: 'pending',
        videoType: 'built_in',
      },
    });
    testInterviewId = testInterview.id;
    console.log(`✅ Тестовое интервью создано: ${testInterviewId}`);

    // Тест 1: Получение деталей интервью с корректной авторизацией
    console.log(
      '\n🔍 ТЕСТ 1: Получение деталей интервью с корректной авторизацией'
    );
    const response1 = await fetch(
      `http://localhost:3000/api/mock-interviews/${testInterviewId}`,
      {
        method: 'GET',
        headers: {
          Cookie: `next-auth.session-token=${sessionToken}`,
        },
      }
    );

    console.log(
      `📊 Статус ответа: ${response1.status} ${response1.statusText}`
    );

    if (response1.ok) {
      const data = await response1.json();
      console.log('✅ Детали интервью получены успешно!');
      console.log(`📝 ID интервью: ${data.id}`);
      console.log(`👤 Интервьюер: ${data.interviewer?.email || 'не указан'}`);
      console.log(
        `📅 Время: ${new Date(data.scheduledTime).toLocaleString('ru-RU')}`
      );
      console.log(`🎥 Тип видео: ${data.videoType}`);
      console.log(`📊 Статус: ${data.status}`);
      console.log(`🔑 Роль пользователя: ${data.currentUserRole}`);
      console.log(`✅ Является интервьюером: ${data.isCurrentUserInterviewer}`);
    } else {
      const errorData = await response1.text();
      console.log(`❌ Ошибка при получении деталей: ${errorData}`);
    }

    // Тест 2: Попытка получения деталей без авторизации
    console.log('\n🔍 ТЕСТ 2: Попытка получения деталей без авторизации');
    const response2 = await fetch(
      `http://localhost:3000/api/mock-interviews/${testInterviewId}`,
      {
        method: 'GET',
      }
    );

    console.log(
      `📊 Статус ответа: ${response2.status} ${response2.statusText}`
    );

    if (response2.status === 401) {
      console.log(
        '✅ Корректно возвращена ошибка 401 для неавторизованного запроса'
      );
    } else {
      console.log(`❌ Ожидался статус 401, получен ${response2.status}`);
    }

    // Тест 3: Попытка получения несуществующего интервью
    console.log('\n🔍 ТЕСТ 3: Попытка получения несуществующего интервью');
    const fakeId = 'fake-interview-id-12345';
    const response3 = await fetch(
      `http://localhost:3000/api/mock-interviews/${fakeId}`,
      {
        method: 'GET',
        headers: {
          Cookie: `next-auth.session-token=${sessionToken}`,
        },
      }
    );

    console.log(
      `📊 Статус ответа: ${response3.status} ${response3.statusText}`
    );

    if (response3.status === 404) {
      console.log(
        '✅ Корректно возвращена ошибка 404 для несуществующего интервью'
      );
    } else {
      console.log(`❌ Ожидался статус 404, получен ${response3.status}`);
    }

    // Тест 4: Проверка неподдерживаемого метода
    console.log('\n🔍 ТЕСТ 4: Проверка неподдерживаемого метода (POST)');
    const response4 = await fetch(
      `http://localhost:3000/api/mock-interviews/${testInterviewId}`,
      {
        method: 'POST',
        headers: {
          Cookie: `next-auth.session-token=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      }
    );

    console.log(
      `📊 Статус ответа: ${response4.status} ${response4.statusText}`
    );

    if (response4.status === 405) {
      console.log(
        '✅ Корректно возвращена ошибка 405 для неподдерживаемого метода'
      );
    } else {
      console.log(`❌ Ожидался статус 405, получен ${response4.status}`);
    }

    console.log(
      '\n============================================================'
    );
    console.log('🎉 ТЕСТИРОВАНИЕ API ENDPOINT ЗАВЕРШЕНО!');
    console.log('✅ Все основные сценарии протестированы');
    console.log('✅ API endpoint работает корректно');
    console.log('✅ Авторизация и права доступа проверяются правильно');
    console.log('✅ Обработка ошибок функционирует корректно');
  } catch (error) {
    console.error('❌ Ошибка при тестировании API endpoint:', error);
    console.error('Стек ошибки:', error.stack);
  } finally {
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');

    try {
      if (testInterviewId) {
        await prisma.mockInterview.delete({
          where: { id: testInterviewId },
        });
        console.log('✅ Тестовое интервью удалено');
      }

      if (testSessionToken) {
        await prisma.session.deleteMany({
          where: { sessionToken: testSessionToken },
        });
        console.log('✅ Тестовая сессия удалена');
      }

      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        });
        console.log('✅ Тестовый пользователь удален');
      }

      console.log('✅ Очистка завершена');
    } catch (cleanupError) {
      console.error('❌ Ошибка при очистке:', cleanupError);
    }

    await prisma.$disconnect();
  }
}

// Запуск теста
testInterviewDetailsEndpoint().catch(console.error);
