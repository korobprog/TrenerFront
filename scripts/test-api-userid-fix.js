/**
 * Тест API для проверки исправления ошибки userId
 * при создании интервью с встроенной видеосистемой
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function testApiUserIdFix() {
  console.log('🚀 Тестирование API исправления ошибки userId...');
  console.log('🌐 Базовый URL:', BASE_URL);
  console.log('⏰ Время запуска:', new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(60));

  let testUser = null;
  let createdInterview = null;

  try {
    // Создаем тестового пользователя напрямую в базе
    console.log('👤 Создание тестового пользователя...');
    testUser = await prisma.user.upsert({
      where: { email: 'test-api-userid@example.com' },
      update: {},
      create: {
        email: 'test-api-userid@example.com',
        name: 'Test API User for UserId Fix',
        role: 'user',
        password: '$2a$10$test.hash.for.testing', // Хеш для тестового пароля
      },
    });
    console.log('✅ Тестовый пользователь создан:', testUser.id);

    // Создаем сессию для пользователя с database стратегией
    console.log('\n🔐 Создание тестовой сессии для database стратегии...');

    // Генерируем криптографически стойкий sessionToken (32 байта hex)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    console.log(
      '🔑 Сгенерирован sessionToken:',
      sessionToken.substring(0, 16) + '...'
    );

    const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    const session = await prisma.session.create({
      data: {
        sessionToken: sessionToken,
        userId: testUser.id,
        expires: sessionExpires,
      },
    });

    // Проверяем успешность создания сессии
    if (!session || !session.sessionToken) {
      throw new Error('Не удалось создать сессию в базе данных');
    }

    console.log('✅ Тестовая сессия создана для database стратегии');
    console.log('📅 Время истечения сессии:', sessionExpires.toISOString());
    console.log(
      '🆔 ID сессии в базе:',
      session.sessionToken.substring(0, 16) + '...'
    );
    console.log('👤 Привязана к пользователю:', session.userId);

    // Дополнительная проверка: находим созданную сессию в базе
    const verifySession = await prisma.session.findUnique({
      where: { sessionToken: sessionToken },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (verifySession) {
      console.log('✅ Сессия подтверждена в базе данных');
      console.log('🔗 Связанный пользователь:', verifySession.user.email);
      console.log('⏰ Истекает:', verifySession.expires.toISOString());
    } else {
      throw new Error('Созданная сессия не найдена в базе данных');
    }

    // Подготавливаем cookie для авторизации (правильное имя для database стратегии)
    const authCookie = `next-auth.session-token=${sessionToken}`;
    console.log(
      '🍪 Cookie для авторизации подготовлен:',
      authCookie.substring(0, 50) + '...'
    );

    // Тестируем создание интервью с встроенной видеосистемой
    console.log(
      '\n🎥 Тестирование создания интервью с встроенной видеосистемой...'
    );

    const scheduledTime = new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toISOString();
    const interviewData = {
      scheduledTime: scheduledTime,
      videoType: 'built_in',
    };

    console.log('📋 Данные для создания интервью:', {
      scheduledTime,
      videoType: interviewData.videoType,
      userId: testUser.id,
    });

    console.log('🌐 Отправка запроса с database session cookie...');
    console.log('🍪 Отправляемый cookie:', authCookie.substring(0, 50) + '...');

    const response = await fetch(`${BASE_URL}/api/mock-interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify(interviewData),
    });

    console.log('📊 Ответ сервера:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        'set-cookie': response.headers.get('set-cookie'),
        'content-type': response.headers.get('content-type'),
      },
    });

    const responseData = await response.json();
    console.log('📋 Полученные данные ответа:', {
      success: response.ok,
      dataKeys: Object.keys(responseData),
      hasError: !!responseData.error,
      hasMessage: !!responseData.message,
    });

    if (response.ok) {
      createdInterview = responseData;
      console.log('✅ Интервью создано успешно через API!');
      console.log('📝 Детали интервью:', {
        id: responseData.id,
        videoType: responseData.videoType,
        videoRoomId: responseData.videoRoomId,
        meetingLink: responseData.meetingLink,
        scheduledTime: responseData.scheduledTime,
        status: responseData.status,
      });

      if (responseData.videoRoom) {
        console.log('🏠 Детали видеокомнаты:', {
          id: responseData.videoRoom.id,
          code: responseData.videoRoom.code,
          name: responseData.videoRoom.name,
          isActive: responseData.videoRoom.isActive,
        });
      }

      // Проверяем, что VideoRoom действительно создана в базе
      console.log('\n🔍 Проверка VideoRoom в базе данных...');
      const videoRoom = await prisma.videoRoom.findUnique({
        where: { id: responseData.videoRoomId },
        include: {
          host: {
            select: { id: true, name: true, email: true },
          },
          mockInterviews: {
            select: { id: true, status: true },
          },
        },
      });

      if (videoRoom) {
        console.log('✅ VideoRoom найдена в базе данных!');
        console.log('📊 Детали из базы:', {
          id: videoRoom.id,
          code: videoRoom.code,
          hostId: videoRoom.hostId,
          hostEmail: videoRoom.host.email,
          connectedInterviews: videoRoom.mockInterviews.length,
        });

        // Проверяем, что hostId соответствует нашему пользователю
        if (videoRoom.hostId === testUser.id) {
          console.log('✅ hostId корректно установлен!');
        } else {
          console.error('❌ hostId не соответствует ожидаемому!', {
            expected: testUser.id,
            actual: videoRoom.hostId,
          });
          throw new Error('hostId не соответствует ожидаемому');
        }
      } else {
        console.error('❌ VideoRoom не найдена в базе данных!');
        throw new Error('VideoRoom не найдена в базе данных');
      }

      console.log('\n' + '='.repeat(60));
      console.log('🎉 ТЕСТ API ПРОЙДЕН УСПЕШНО!');
      console.log('✅ Ошибка userId исправлена в API');
      console.log('✅ VideoRoom создается через API с правильным hostId');
      console.log('✅ MockInterview корректно связывается с VideoRoom');
      console.log('✅ Все данные сохраняются в базе правильно');
      console.log('🔐 Database стратегия аутентификации работает корректно');
      console.log(
        '🍪 Криптографически стойкий sessionToken успешно используется'
      );
      console.log('🔗 NextAuth database сессии совместимы с API');
    } else {
      console.error('❌ Ошибка создания интервью через API:', {
        status: response.status,
        error: responseData.error || responseData.message,
        details: responseData.details,
      });
      throw new Error(
        `API ошибка ${response.status}: ${
          responseData.error || responseData.message
        }`
      );
    }

    return true;
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА API:', error.message);
    console.error('📋 Детали ошибки:', error);
    return false;
  } finally {
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    try {
      if (createdInterview) {
        await prisma.mockInterview.deleteMany({
          where: { id: createdInterview.id },
        });
        console.log('✅ MockInterview удален');
      }

      if (createdInterview?.videoRoomId) {
        await prisma.videoRoom.deleteMany({
          where: { id: createdInterview.videoRoomId },
        });
        console.log('✅ VideoRoom удалена');
      }

      if (testUser) {
        // Удаляем все сессии пользователя (включая database сессии)
        const deletedSessions = await prisma.session.deleteMany({
          where: { userId: testUser.id },
        });
        console.log(`✅ Удалено сессий: ${deletedSessions.count}`);

        await prisma.user.delete({
          where: { id: testUser.id },
        });
        console.log('✅ Тестовый пользователь удален');
      }

      console.log('✅ Очистка завершена');
    } catch (cleanupError) {
      console.error('⚠️ Ошибка очистки:', cleanupError.message);
    }

    await prisma.$disconnect();
  }
}

// Запуск теста
if (require.main === module) {
  testApiUserIdFix()
    .then((success) => {
      if (success) {
        console.log('\n🎯 РЕЗУЛЬТАТ: API исправление работает корректно!');
        process.exit(0);
      } else {
        console.log(
          '\n💥 РЕЗУЛЬТАТ: Требуется дополнительное исправление API!'
        );
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА API:', error);
      process.exit(1);
    });
}

module.exports = { testApiUserIdFix };
