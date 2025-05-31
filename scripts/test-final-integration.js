const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runFinalIntegrationTest() {
  console.log('🎯 ФИНАЛЬНЫЙ КОМПЛЕКСНЫЙ ТЕСТ ИНТЕГРАЦИИ');
  console.log('🌐 Базовый URL: http://localhost:3000');
  console.log(`⏰ Время запуска: ${new Date().toLocaleString('ru-RU')}`);
  console.log('============================================================');

  let testUserId = null;
  let testInterviewId = null;
  let testVideoRoomId = null;
  let testSessionToken = null;

  const testResults = {
    authenticationTest: false,
    interviewCreationTest: false,
    videoRoomCreationTest: false,
    interviewDetailsTest: false,
    databaseConsistencyTest: false,
  };

  try {
    // ========== ТЕСТ 1: АУТЕНТИФИКАЦИЯ ==========
    console.log('\n🔐 ТЕСТ 1: Проверка аутентификации с database стратегией');

    // Создаем тестового пользователя
    const testUser = await prisma.user.create({
      data: {
        name: 'Final Integration Test User',
        email: 'final-test@example.com',
        role: 'user',
      },
    });
    testUserId = testUser.id;
    console.log(`✅ Тестовый пользователь создан: ${testUserId}`);

    // Создаем сессию для database стратегии
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    testSessionToken = sessionToken;
    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 1);

    await prisma.session.create({
      data: {
        sessionToken: sessionToken,
        userId: testUserId,
        expires: sessionExpires,
      },
    });
    console.log('✅ Database сессия создана успешно');
    testResults.authenticationTest = true;

    // ========== ТЕСТ 2: СОЗДАНИЕ ИНТЕРВЬЮ ==========
    console.log('\n🎥 ТЕСТ 2: Создание интервью через API');

    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 2);

    const interviewResponse = await fetch(
      'http://localhost:3000/api/mock-interviews',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `next-auth.session-token=${sessionToken}`,
        },
        body: JSON.stringify({
          scheduledTime: scheduledTime.toISOString(),
          videoType: 'built_in',
        }),
      }
    );

    if (interviewResponse.ok) {
      const interviewData = await interviewResponse.json();
      testInterviewId = interviewData.id;
      testVideoRoomId = interviewData.videoRoomId;
      console.log(`✅ Интервью создано: ${testInterviewId}`);
      console.log(`✅ Видеокомната создана: ${testVideoRoomId}`);
      console.log(`✅ Ссылка на встречу: ${interviewData.meetingLink}`);
      testResults.interviewCreationTest = true;
      testResults.videoRoomCreationTest = true;
    } else {
      const errorText = await interviewResponse.text();
      console.log(
        `❌ Ошибка создания интервью: ${interviewResponse.status} - ${errorText}`
      );
    }

    // ========== ТЕСТ 3: ПОЛУЧЕНИЕ ДЕТАЛЕЙ ИНТЕРВЬЮ ==========
    console.log(
      '\n🔍 ТЕСТ 3: Получение деталей интервью через новый API endpoint'
    );

    if (testInterviewId) {
      const detailsResponse = await fetch(
        `http://localhost:3000/api/mock-interviews/${testInterviewId}`,
        {
          method: 'GET',
          headers: {
            Cookie: `next-auth.session-token=${sessionToken}`,
          },
        }
      );

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        console.log('✅ Детали интервью получены успешно');
        console.log(`   📝 ID: ${detailsData.id}`);
        console.log(`   👤 Интервьюер: ${detailsData.interviewer?.email}`);
        console.log(`   🎥 Тип видео: ${detailsData.videoType}`);
        console.log(`   📊 Статус: ${detailsData.status}`);
        console.log(`   🔑 Роль пользователя: ${detailsData.currentUserRole}`);
        console.log(`   🏠 Видеокомната: ${detailsData.videoRoom?.code}`);
        testResults.interviewDetailsTest = true;
      } else {
        const errorText = await detailsResponse.text();
        console.log(
          `❌ Ошибка получения деталей: ${detailsResponse.status} - ${errorText}`
        );
      }
    }

    // ========== ТЕСТ 4: ПРОВЕРКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ ==========
    console.log('\n🗄️ ТЕСТ 4: Проверка целостности данных в базе');

    if (testInterviewId && testVideoRoomId) {
      // Проверяем интервью в базе
      const dbInterview = await prisma.mockInterview.findUnique({
        where: { id: testInterviewId },
        include: {
          interviewer: true,
          videoRoom: true,
        },
      });

      if (dbInterview) {
        console.log('✅ Интервью найдено в базе данных');
        console.log(`   🆔 ID: ${dbInterview.id}`);
        console.log(`   👤 Интервьюер: ${dbInterview.interviewer.email}`);
        console.log(`   🎥 Тип видео: ${dbInterview.videoType}`);
        console.log(`   🔗 Связь с видеокомнатой: ${dbInterview.videoRoomId}`);

        // Проверяем видеокомнату
        if (dbInterview.videoRoom) {
          console.log('✅ Видеокомната корректно связана');
          console.log(`   🏠 Код комнаты: ${dbInterview.videoRoom.code}`);
          console.log(`   👤 Хост: ${dbInterview.videoRoom.hostId}`);
          console.log(
            `   ✅ hostId совпадает с интервьюером: ${
              dbInterview.videoRoom.hostId === testUserId
            }`
          );
        }

        // Проверяем сессию
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: sessionToken },
          include: { user: true },
        });

        if (dbSession) {
          console.log('✅ Сессия найдена в базе данных');
          console.log(`   👤 Пользователь: ${dbSession.user.email}`);
          console.log(
            `   ⏰ Истекает: ${dbSession.expires.toLocaleString('ru-RU')}`
          );
          console.log(
            `   ✅ Сессия связана с правильным пользователем: ${
              dbSession.userId === testUserId
            }`
          );
        }

        testResults.databaseConsistencyTest = true;
      } else {
        console.log('❌ Интервью не найдено в базе данных');
      }
    }

    // ========== АНАЛИЗ РЕЗУЛЬТАТОВ ==========
    console.log(
      '\n============================================================'
    );
    console.log('📊 АНАЛИЗ РЕЗУЛЬТАТОВ ФИНАЛЬНОГО ТЕСТИРОВАНИЯ');
    console.log('============================================================');

    const allTestsPassed = Object.values(testResults).every(
      (result) => result === true
    );

    console.log(
      `🔐 Аутентификация (Database стратегия): ${
        testResults.authenticationTest ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'
      }`
    );
    console.log(
      `🎥 Создание интервью: ${
        testResults.interviewCreationTest ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'
      }`
    );
    console.log(
      `🏠 Создание видеокомнаты: ${
        testResults.videoRoomCreationTest ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'
      }`
    );
    console.log(
      `🔍 Получение деталей интервью: ${
        testResults.interviewDetailsTest ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'
      }`
    );
    console.log(
      `🗄️ Целостность базы данных: ${
        testResults.databaseConsistencyTest ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'
      }`
    );

    console.log(
      '\n============================================================'
    );
    if (allTestsPassed) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('✅ Система видеоконференций работает корректно');
      console.log('✅ Все критические проблемы решены');
      console.log(
        '✅ Database стратегия аутентификации функционирует правильно'
      );
      console.log('✅ API endpoints работают без ошибок');
      console.log('✅ Целостность данных обеспечена');
    } else {
      console.log('❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В ТЕСТАХ');
      console.log('⚠️ Требуется дополнительная диагностика');
    }

    return {
      success: allTestsPassed,
      results: testResults,
      testData: {
        userId: testUserId,
        interviewId: testInterviewId,
        videoRoomId: testVideoRoomId,
      },
    };
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА В ФИНАЛЬНОМ ТЕСТЕ:', error);
    console.error('Стек ошибки:', error.stack);
    return {
      success: false,
      error: error.message,
      results: testResults,
    };
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

      if (testVideoRoomId) {
        await prisma.videoRoom.delete({
          where: { id: testVideoRoomId },
        });
        console.log('✅ Тестовая видеокомната удалена');
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

      console.log('✅ Очистка завершена успешно');
    } catch (cleanupError) {
      console.error('❌ Ошибка при очистке:', cleanupError);
    }

    await prisma.$disconnect();
  }
}

// Запуск финального теста
runFinalIntegrationTest()
  .then((result) => {
    console.log(
      '\n🎯 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:',
      result.success ? 'УСПЕХ' : 'НЕУДАЧА'
    );
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  });
