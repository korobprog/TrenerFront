const fetch = require('node-fetch');

// Тестовый скрипт для воспроизведения ошибки 400 при создании интервью
async function testInterviewCreation() {
  console.log('=== ТЕСТ СОЗДАНИЯ ИНТЕРВЬЮ С ВСТРОЕННОЙ ВИДЕОСИСТЕМОЙ ===\n');

  // Тестовые данные
  const testData = {
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 часа
    videoType: 'built_in',
  };

  console.log('1. Тестовые данные:');
  console.log(JSON.stringify(testData, null, 2));
  console.log();

  try {
    console.log('2. Отправка запроса на создание интервью...');

    const response = await fetch('http://localhost:3000/api/mock-interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Примечание: В реальном тесте нужны cookies для авторизации
      },
      body: JSON.stringify(testData),
    });

    console.log('3. Получен ответ:');
    console.log({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.log('\n4. ОШИБКА - Детали ответа:');
      console.log(JSON.stringify(responseData, null, 2));

      if (response.status === 400) {
        console.log('\n=== АНАЛИЗ ОШИБКИ 400 ===');
        console.log('Возможные причины:');
        console.log('- Проблемы с валидацией времени');
        console.log('- Отсутствующие обязательные поля');
        console.log('- Ошибки авторизации');
        console.log('- Проблемы с базой данных');
      }
    } else {
      console.log('\n4. УСПЕХ - Интервью создано:');
      console.log(JSON.stringify(responseData, null, 2));
    }
  } catch (error) {
    console.error('\n4. КРИТИЧЕСКАЯ ОШИБКА при выполнении запроса:');
    console.error({
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
  }
}

// Функция для тестирования только API video-conferences
async function testVideoConferencesAPI() {
  console.log('\n=== ПРЯМОЙ ТЕСТ API VIDEO-CONFERENCES ===\n');

  const videoRoomData = {
    name: `Тестовое собеседование ${new Date().toLocaleDateString('ru-RU')}`,
    description: `Тестовое собеседование запланировано на ${new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toLocaleString('ru-RU')}`,
    isPrivate: true,
    maxParticipants: 2,
    scheduledStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    recordingEnabled: false,
    settings: {
      allowScreenShare: true,
      allowChat: true,
      autoRecord: false,
    },
  };

  console.log('1. Данные для создания видеокомнаты:');
  console.log(JSON.stringify(videoRoomData, null, 2));
  console.log();

  try {
    console.log('2. Отправка запроса на создание видеокомнаты...');

    const response = await fetch(
      'http://localhost:3000/api/video-conferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Примечание: В реальном тесте нужны cookies для авторизации
        },
        body: JSON.stringify(videoRoomData),
      }
    );

    console.log('3. Получен ответ:');
    console.log({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.log('\n4. ОШИБКА - Детали ответа:');
      console.log(JSON.stringify(responseData, null, 2));

      if (response.status === 401) {
        console.log('\n=== АНАЛИЗ ОШИБКИ 401 ===');
        console.log('Проблема: Отсутствует авторизация');
        console.log('Решение: Нужны cookies сессии для тестирования');
      } else if (response.status === 400) {
        console.log('\n=== АНАЛИЗ ОШИБКИ 400 ===');
        console.log('Возможные причины:');
        console.log('- Проблемы с валидацией времени');
        console.log('- Неверные данные запроса');
        console.log('- Ошибки валидации полей');
      }
    } else {
      console.log('\n4. УСПЕХ - Видеокомната создана:');
      console.log(JSON.stringify(responseData, null, 2));
    }
  } catch (error) {
    console.error('\n4. КРИТИЧЕСКАЯ ОШИБКА при выполнении запроса:');
    console.error({
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
  }
}

// Запускаем тесты
async function runTests() {
  await testInterviewCreation();
  await testVideoConferencesAPI();

  console.log('\n=== РЕКОМЕНДАЦИИ ПО ДИАГНОСТИКЕ ===');
  console.log('1. Проверить логи сервера при создании интервью');
  console.log('2. Убедиться в корректности авторизации');
  console.log('3. Проверить валидацию времени в API video-conferences');
  console.log('4. Проверить структуру данных запроса');
  console.log('5. Проверить работу базы данных');
}

runTests().catch(console.error);
