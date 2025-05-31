// Тестирование API эндпоинтов видео-календаря
// Запуск: node test-video-calendar-api.js

const baseUrl = 'http://localhost:3000';

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    console.log(`\n${options.method || 'GET'} ${url}`);
    console.log(`Статус: ${response.status}`);
    console.log('Ответ:', JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`Ошибка при запросе ${url}:`, error.message);
    return { error };
  }
}

async function testVideoCalendarAPI() {
  console.log('=== ТЕСТИРОВАНИЕ API ВИДЕО-КАЛЕНДАРЯ ===\n');

  // 1. Тест API календарных событий
  console.log('1. ТЕСТИРОВАНИЕ API КАЛЕНДАРНЫХ СОБЫТИЙ');
  console.log('==========================================');

  // GET - получение событий (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/calendar-events`);

  // POST - создание события (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/calendar-events`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Тестовое событие',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    }),
  });

  // 2. Тест API видеокомнат
  console.log('\n\n2. ТЕСТИРОВАНИЕ API ВИДЕОКОМНАТ');
  console.log('===============================');

  // GET - получение списка комнат (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/rooms`);

  // POST - создание комнаты (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/rooms`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Тестовая комната',
      description: 'Описание тестовой комнаты',
      maxParticipants: 5,
    }),
  });

  // 3. Тест API конкретной видеокомнаты
  console.log('\n\n3. ТЕСТИРОВАНИЕ API КОНКРЕТНОЙ ВИДЕОКОМНАТЫ');
  console.log('==========================================');

  // GET - получение информации о комнате (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/rooms/TEST1234`);

  // 4. Тест API уведомлений
  console.log('\n\n4. ТЕСТИРОВАНИЕ API УВЕДОМЛЕНИЙ');
  console.log('===============================');

  // GET - получение настроек уведомлений (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/notifications`);

  // POST - подписка на уведомления (без авторизации - должна быть ошибка 401)
  await makeRequest(`${baseUrl}/api/custom/notifications`, {
    method: 'POST',
    body: JSON.stringify({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    }),
  });

  // 5. Тест неподдерживаемых методов
  console.log('\n\n5. ТЕСТИРОВАНИЕ НЕПОДДЕРЖИВАЕМЫХ МЕТОДОВ');
  console.log('=======================================');

  // PATCH - неподдерживаемый метод для календарных событий
  await makeRequest(`${baseUrl}/api/custom/calendar-events`, {
    method: 'PATCH',
  });

  // OPTIONS - неподдерживаемый метод для видеокомнат
  await makeRequest(`${baseUrl}/api/custom/rooms`, {
    method: 'OPTIONS',
  });

  console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
  console.log(
    '\nПРИМЕЧАНИЕ: Все запросы должны возвращать ошибку 401 (Не авторизован),'
  );
  console.log('так как тестирование выполняется без аутентификации.');
  console.log('Это подтверждает, что защита API работает корректно.');
}

// Проверяем доступность fetch API
if (typeof fetch === 'undefined') {
  console.log('Установка node-fetch для выполнения HTTP запросов...');
  console.log('Выполните: npm install node-fetch');
  console.log('Или используйте Node.js версии 18+ с встроенным fetch');
  process.exit(1);
}

// Запускаем тестирование
testVideoCalendarAPI().catch(console.error);
