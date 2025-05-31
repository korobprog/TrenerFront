/**
 * Тестовый скрипт для проверки API создания интервью
 * Тестирует оба типа видеосвязи: built_in и google_meet
 */

const fetch = require('node-fetch');

// Конфигурация
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Тестовые данные
const TEST_USER_EMAIL = 'test@example.com'; // Замените на реальный email для тестирования
const TEST_SCHEDULED_TIME = new Date(
  Date.now() + 24 * 60 * 60 * 1000
).toISOString(); // Завтра

/**
 * Функция для выполнения HTTP запросов
 */
async function makeRequest(url, options = {}) {
  try {
    console.log(`\n🔄 Выполняем запрос: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    console.log(`📊 Статус ответа: ${response.status}`);
    console.log(`📋 Данные ответа:`, JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`❌ Ошибка запроса:`, error.message);
    return { error };
  }
}

/**
 * Тест создания интервью с встроенной видеосистемой
 */
async function testBuiltInVideoInterview() {
  console.log(
    '\n🧪 === ТЕСТ: Создание интервью с встроенной видеосистемой ==='
  );

  const requestData = {
    scheduledTime: TEST_SCHEDULED_TIME,
    videoType: 'built_in',
  };

  const { response, data, error } = await makeRequest(
    `${API_BASE}/mock-interviews`,
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    }
  );

  if (error) {
    console.log('❌ Тест не удался из-за ошибки сети');
    return null;
  }

  if (response.status === 201) {
    console.log('✅ Интервью с встроенной видеосистемой создано успешно');
    console.log(`📹 VideoRoom ID: ${data.videoRoomId}`);
    console.log(`🔗 Meeting Link: ${data.meetingLink}`);
    return data;
  } else if (response.status === 401) {
    console.log('🔐 Требуется авторизация для создания интервью');
    return null;
  } else {
    console.log(`❌ Ошибка создания интервью: ${data.message}`);
    return null;
  }
}

/**
 * Тест создания интервью с Google Meet
 */
async function testGoogleMeetInterview() {
  console.log('\n🧪 === ТЕСТ: Создание интервью с Google Meet ===');

  const requestData = {
    scheduledTime: TEST_SCHEDULED_TIME,
    videoType: 'google_meet',
    manualMeetingLink: 'https://meet.google.com/test-mock-link-12345',
  };

  const { response, data, error } = await makeRequest(
    `${API_BASE}/mock-interviews`,
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    }
  );

  if (error) {
    console.log('❌ Тест не удался из-за ошибки сети');
    return null;
  }

  if (response.status === 201) {
    console.log('✅ Интервью с Google Meet создано успешно');
    console.log(`📹 Video Type: ${data.videoType}`);
    console.log(`🔗 Meeting Link: ${data.meetingLink}`);
    return data;
  } else if (response.status === 401) {
    console.log('🔐 Требуется авторизация для создания интервью');
    return null;
  } else {
    console.log(`❌ Ошибка создания интервью: ${data.message}`);
    return null;
  }
}

/**
 * Тест получения списка интервью
 */
async function testGetInterviews() {
  console.log('\n🧪 === ТЕСТ: Получение списка интервью ===');

  const { response, data, error } = await makeRequest(
    `${API_BASE}/mock-interviews`
  );

  if (error) {
    console.log('❌ Тест не удался из-за ошибки сети');
    return null;
  }

  if (response.status === 200) {
    console.log(`✅ Список интервью получен успешно (${data.length} интервью)`);

    // Показываем первые 3 интервью для проверки
    const sampleInterviews = data.slice(0, 3);
    sampleInterviews.forEach((interview, index) => {
      console.log(`📋 Интервью ${index + 1}:`);
      console.log(`   ID: ${interview.id}`);
      console.log(`   Время: ${interview.scheduledTime}`);
      console.log(`   Статус: ${interview.status}`);
      console.log(`   Тип видео: ${interview.videoType || 'не указан'}`);
      console.log(`   VideoRoom ID: ${interview.videoRoomId || 'отсутствует'}`);
    });

    return data;
  } else if (response.status === 401) {
    console.log('🔐 Требуется авторизация для получения списка интервью');
    return null;
  } else {
    console.log(`❌ Ошибка получения списка интервью: ${data.message}`);
    return null;
  }
}

/**
 * Тест создания VideoRoom
 */
async function testCreateVideoRoom() {
  console.log('\n🧪 === ТЕСТ: Создание VideoRoom ===');

  const requestData = {
    name: 'Тестовая видеокомната',
    description: 'Комната для тестирования API',
    isPrivate: true,
    maxParticipants: 2,
    recordingEnabled: false,
    settings: {
      allowScreenShare: true,
      allowChat: true,
      autoRecord: false,
    },
  };

  const { response, data, error } = await makeRequest(
    `${API_BASE}/video-conferences`,
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    }
  );

  if (error) {
    console.log('❌ Тест не удался из-за ошибки сети');
    return null;
  }

  if (response.status === 201) {
    console.log('✅ VideoRoom создана успешно');
    console.log(`🏠 Room ID: ${data.id}`);
    console.log(`🔑 Room Code: ${data.code}`);
    console.log(`🔒 Is Private: ${data.isPrivate}`);
    console.log(`📹 Recording Enabled: ${data.recordingEnabled}`);
    console.log(`⚙️ Settings:`, JSON.stringify(data.settings, null, 2));
    return data;
  } else if (response.status === 401) {
    console.log('🔐 Требуется авторизация для создания VideoRoom');
    return null;
  } else {
    console.log(`❌ Ошибка создания VideoRoom: ${data.error}`);
    return null;
  }
}

/**
 * Тест получения списка VideoRoom
 */
async function testGetVideoRooms() {
  console.log('\n🧪 === ТЕСТ: Получение списка VideoRoom ===');

  const { response, data, error } = await makeRequest(
    `${API_BASE}/video-conferences`
  );

  if (error) {
    console.log('❌ Тест не удался из-за ошибки сети');
    return null;
  }

  if (response.status === 200) {
    console.log(`✅ Список VideoRoom получен успешно (${data.length} комнат)`);

    // Показываем первые 3 комнаты для проверки
    const sampleRooms = data.slice(0, 3);
    sampleRooms.forEach((room, index) => {
      console.log(`🏠 Комната ${index + 1}:`);
      console.log(`   ID: ${room.id}`);
      console.log(`   Код: ${room.code}`);
      console.log(`   Название: ${room.name}`);
      console.log(`   Приватная: ${room.isPrivate}`);
      console.log(`   Запись: ${room.recordingEnabled}`);
      console.log(`   Активная: ${room.isActive}`);
    });

    return data;
  } else if (response.status === 401) {
    console.log('🔐 Требуется авторизация для получения списка VideoRoom');
    return null;
  } else {
    console.log(`❌ Ошибка получения списка VideoRoom: ${data.error}`);
    return null;
  }
}

/**
 * Тест валидации данных
 */
async function testValidation() {
  console.log('\n🧪 === ТЕСТ: Валидация данных ===');

  // Тест с неправильным videoType
  console.log('\n📝 Тест неправильного videoType...');
  const { response: invalidTypeResponse, data: invalidTypeData } =
    await makeRequest(`${API_BASE}/mock-interviews`, {
      method: 'POST',
      body: JSON.stringify({
        scheduledTime: TEST_SCHEDULED_TIME,
        videoType: 'invalid_type',
      }),
    });

  if (invalidTypeResponse.status === 400) {
    console.log('✅ Валидация videoType работает корректно');
  } else {
    console.log('❌ Валидация videoType не работает');
  }

  // Тест без scheduledTime
  console.log('\n📝 Тест отсутствующего scheduledTime...');
  const { response: noTimeResponse, data: noTimeData } = await makeRequest(
    `${API_BASE}/mock-interviews`,
    {
      method: 'POST',
      body: JSON.stringify({
        videoType: 'built_in',
      }),
    }
  );

  if (noTimeResponse.status === 400) {
    console.log('✅ Валидация scheduledTime работает корректно');
  } else {
    console.log('❌ Валидация scheduledTime не работает');
  }
}

/**
 * Основная функция тестирования
 */
async function runTests() {
  console.log('🚀 === ЗАПУСК ТЕСТОВ API ИНТЕРВЬЮ ===');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📅 Test Scheduled Time: ${TEST_SCHEDULED_TIME}`);

  // Тестируем создание VideoRoom
  await testCreateVideoRoom();

  // Тестируем получение списка VideoRoom
  await testGetVideoRooms();

  // Тестируем создание интервью с встроенной видеосистемой
  await testBuiltInVideoInterview();

  // Тестируем создание интервью с Google Meet
  await testGoogleMeetInterview();

  // Тестируем получение списка интервью
  await testGetInterviews();

  // Тестируем валидацию
  await testValidation();

  console.log('\n🏁 === ТЕСТЫ ЗАВЕРШЕНЫ ===');
  console.log('\n📝 ПРИМЕЧАНИЯ:');
  console.log('- Для полного тестирования требуется авторизация пользователя');
  console.log('- Тесты с кодом 401 ожидаемы без авторизации');
  console.log(
    '- Для тестирования Google Calendar API нужны настроенные токены'
  );
  console.log('- Проверьте логи сервера для детальной диагностики');
}

// Запускаем тесты
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testBuiltInVideoInterview,
  testGoogleMeetInterview,
  testGetInterviews,
  testCreateVideoRoom,
  testGetVideoRooms,
  testValidation,
  runTests,
};
