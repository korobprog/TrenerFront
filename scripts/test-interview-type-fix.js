const fetch = require('node-fetch');

// Тестирование создания собеседования с встроенной видеосистемой
async function testBuiltInVideoType() {
  console.log(
    '🧪 Тестирование создания собеседования с встроенной видеосистемой...'
  );

  try {
    // Данные для создания собеседования
    const interviewData = {
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // завтра
      videoType: 'built_in',
    };

    console.log(
      '📤 Отправляем запрос на создание собеседования:',
      interviewData
    );

    const response = await fetch('http://localhost:3000/api/mock-interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем тестовые куки для авторизации
        Cookie: 'next-auth.session-token=test-session',
      },
      body: JSON.stringify(interviewData),
    });

    console.log('📥 Статус ответа:', response.status);

    const responseData = await response.json();
    console.log('📄 Данные ответа:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Собеседование создано успешно!');
      console.log('🎥 Тип видео:', responseData.videoType);
      console.log('🔗 Ссылка на встречу:', responseData.meetingLink);

      if (responseData.videoRoom) {
        console.log('🏠 Видеокомната создана:', responseData.videoRoom);
      }
    } else {
      console.log('❌ Ошибка при создании собеседования');

      // Проверяем, требуется ли ручной ввод ссылки
      if (responseData.needManualLink) {
        console.log('⚠️  Система требует ручной ввод ссылки');
        console.log('🔍 Причина:', responseData.message);

        if (responseData.isAuthError) {
          console.log('🔐 Проблема с авторизацией Google');
        }
      }
    }
  } catch (error) {
    console.error('💥 Ошибка при тестировании:', error.message);
  }
}

// Тестирование создания собеседования с Google Meet
async function testGoogleMeetType() {
  console.log('\n🧪 Тестирование создания собеседования с Google Meet...');

  try {
    const interviewData = {
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      videoType: 'google_meet',
    };

    console.log(
      '📤 Отправляем запрос на создание собеседования:',
      interviewData
    );

    const response = await fetch('http://localhost:3000/api/mock-interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=test-session',
      },
      body: JSON.stringify(interviewData),
    });

    console.log('📥 Статус ответа:', response.status);

    const responseData = await response.json();
    console.log('📄 Данные ответа:', JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error('💥 Ошибка при тестировании:', error.message);
  }
}

// Тестирование API видеоконференций
async function testVideoConferencesAPI() {
  console.log('\n🧪 Тестирование API видеоконференций...');

  try {
    const roomData = {
      name: 'Тестовая комната',
      description: 'Комната для тестирования',
      isPrivate: true,
      maxParticipants: 2,
      scheduledStartTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // через час
      recordingEnabled: false,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        autoRecord: false,
      },
    };

    console.log('📤 Отправляем запрос на создание видеокомнаты:', roomData);

    const response = await fetch(
      'http://localhost:3000/api/video-conferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'next-auth.session-token=test-session',
        },
        body: JSON.stringify(roomData),
      }
    );

    console.log('📥 Статус ответа:', response.status);

    const responseData = await response.json();
    console.log('📄 Данные ответа:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Видеокомната создана успешно!');
      console.log('🏠 ID комнаты:', responseData.id);
      console.log('🔑 Код комнаты:', responseData.code);
    } else {
      console.log('❌ Ошибка при создании видеокомнаты');
    }
  } catch (error) {
    console.error('💥 Ошибка при тестировании:', error.message);
  }
}

// Запускаем все тесты
async function runAllTests() {
  console.log('🚀 Запуск тестов исправления логики выбора типа видео...\n');

  await testVideoConferencesAPI();
  await testBuiltInVideoType();
  await testGoogleMeetType();

  console.log('\n✨ Тестирование завершено!');
}

runAllTests();
