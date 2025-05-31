/**
 * Тест для проверки исправления ошибки валидации userId
 * при создании интервью с встроенной видеосистемой
 */

const fetch = require('node-fetch');

// Конфигурация
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

/**
 * Функция для входа в систему и получения cookie сессии
 */
async function signIn() {
  console.log('🔐 Попытка входа в систему...');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const cookies = response.headers.get('set-cookie');
    console.log('✅ Вход выполнен успешно');
    return cookies;
  } catch (error) {
    console.error('❌ Ошибка входа:', error.message);
    throw error;
  }
}

/**
 * Функция для создания mock-интервью с встроенной видеосистемой
 */
async function createMockInterviewWithBuiltInVideo(cookies) {
  console.log('🎥 Создание интервью с встроенной видеосистемой...');

  // Время интервью через 2 часа от текущего времени
  const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const interviewData = {
    scheduledTime: scheduledTime,
    videoType: 'built_in',
  };

  console.log('📋 Данные для создания интервью:', {
    scheduledTime,
    videoType: interviewData.videoType,
  });

  try {
    const response = await fetch(`${BASE_URL}/api/mock-interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify(interviewData),
    });

    const responseData = await response.json();

    console.log('📊 Ответ сервера:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (response.ok) {
      console.log('✅ Интервью создано успешно!');
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

      return responseData;
    } else {
      console.error('❌ Ошибка создания интервью:', {
        status: response.status,
        error: responseData.error || responseData.message,
        details: responseData.details,
      });
      throw new Error(
        `Ошибка ${response.status}: ${
          responseData.error || responseData.message
        }`
      );
    }
  } catch (error) {
    console.error(
      '❌ Критическая ошибка при создании интервью:',
      error.message
    );
    throw error;
  }
}

/**
 * Функция для создания интервью с Google Meet для сравнения
 */
async function createMockInterviewWithGoogleMeet(cookies) {
  console.log('📞 Создание интервью с Google Meet для сравнения...');

  // Время интервью через 3 часа от текущего времени
  const scheduledTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  const interviewData = {
    scheduledTime: scheduledTime,
    videoType: 'google_meet',
    manualMeetingLink: 'https://meet.google.com/test-comparison-link',
  };

  try {
    const response = await fetch(`${BASE_URL}/api/mock-interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify(interviewData),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ Интервью с Google Meet создано успешно!');
      return responseData;
    } else {
      console.log(
        '⚠️ Ошибка создания интервью с Google Meet (ожидаемо):',
        responseData.error
      );
      return null;
    }
  } catch (error) {
    console.log(
      '⚠️ Ошибка при создании интервью с Google Meet:',
      error.message
    );
    return null;
  }
}

/**
 * Основная функция тестирования
 */
async function runTest() {
  console.log('🚀 Запуск теста исправления ошибки userId...');
  console.log('🌐 Базовый URL:', BASE_URL);
  console.log('📧 Тестовый email:', TEST_EMAIL);
  console.log('⏰ Время запуска:', new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(60));

  try {
    // Шаг 1: Вход в систему
    const cookies = await signIn();

    console.log('\n' + '='.repeat(60));

    // Шаг 2: Создание интервью с встроенной видеосистемой
    const builtInInterview = await createMockInterviewWithBuiltInVideo(cookies);

    console.log('\n' + '='.repeat(60));

    // Шаг 3: Создание интервью с Google Meet для сравнения
    const googleMeetInterview = await createMockInterviewWithGoogleMeet(
      cookies
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
    console.log(
      '✅ Встроенная видеосистема:',
      builtInInterview ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'
    );
    console.log(
      '📞 Google Meet:',
      googleMeetInterview ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'
    );

    if (builtInInterview) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕН! Ошибка userId исправлена.');
      console.log('📋 Созданное интервью:');
      console.log(`   - ID: ${builtInInterview.id}`);
      console.log(`   - Тип видео: ${builtInInterview.videoType}`);
      console.log(`   - ID видеокомнаты: ${builtInInterview.videoRoomId}`);
      console.log(`   - Ссылка: ${builtInInterview.meetingLink}`);
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН! Ошибка userId не исправлена.');
    }
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:', error.message);
    console.error('📋 Детали ошибки:', error.stack);
    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = {
  runTest,
  createMockInterviewWithBuiltInVideo,
  signIn,
};
