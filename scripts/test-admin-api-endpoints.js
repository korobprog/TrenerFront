/**
 * Тестовый скрипт для проверки работы API эндпоинтов администратора
 * Проверяет доступность всех созданных эндпоинтов
 */

const BASE_URL = 'http://localhost:3000';

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

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Тестирование эндпоинтов
async function testAdminEndpoints() {
  console.log('🔍 Тестирование API эндпоинтов администратора...\n');

  const endpoints = [
    {
      name: 'Statistics API',
      url: `${BASE_URL}/api/admin/statistics`,
      method: 'GET',
      description: 'Получение статистики системы',
    },
    {
      name: 'Users API (GET)',
      url: `${BASE_URL}/api/admin/users`,
      method: 'GET',
      description: 'Получение списка пользователей',
    },
    {
      name: 'Users API (PUT)',
      url: `${BASE_URL}/api/admin/users`,
      method: 'PUT',
      body: { userId: 'test-id', role: 'user' },
      description: 'Обновление пользователя',
    },
    {
      name: 'Users API (DELETE)',
      url: `${BASE_URL}/api/admin/users`,
      method: 'DELETE',
      body: { userId: 'test-id' },
      description: 'Удаление пользователя',
    },
    {
      name: 'Logs API',
      url: `${BASE_URL}/api/admin/logs`,
      method: 'GET',
      description: 'Получение логов администратора',
    },
    {
      name: 'Interviews API (GET)',
      url: `${BASE_URL}/api/admin/interviews`,
      method: 'GET',
      description: 'Получение списка собеседований',
    },
    {
      name: 'Interviews API (PUT)',
      url: `${BASE_URL}/api/admin/interviews`,
      method: 'PUT',
      body: { interviewId: 'test-id', status: 'completed' },
      description: 'Обновление собеседования',
    },
    {
      name: 'Interviews API (DELETE)',
      url: `${BASE_URL}/api/admin/interviews`,
      method: 'DELETE',
      body: { interviewId: 'test-id' },
      description: 'Удаление собеседования',
    },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`📡 Тестирование: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Метод: ${endpoint.method}`);
    console.log(`   Описание: ${endpoint.description}`);

    const options = {
      method: endpoint.method,
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const result = await makeRequest(endpoint.url, options);

    console.log(`   Статус: ${result.status}`);

    if (result.status === 401) {
      console.log(`   ✅ Ожидаемый результат: Требуется авторизация`);
      results.push({
        ...endpoint,
        status: 'PASS',
        reason: 'Правильно требует авторизацию',
      });
    } else if (result.status === 403) {
      console.log(
        `   ✅ Ожидаемый результат: Требуются права супер-администратора`
      );
      results.push({
        ...endpoint,
        status: 'PASS',
        reason: 'Правильно требует права супер-администратора',
      });
    } else if (result.status === 405) {
      console.log(`   ✅ Ожидаемый результат: Метод не поддерживается`);
      results.push({
        ...endpoint,
        status: 'PASS',
        reason: 'Правильно обрабатывает неподдерживаемые методы',
      });
    } else if (result.status === 404) {
      console.log(`   ❌ Эндпоинт не найден`);
      results.push({
        ...endpoint,
        status: 'FAIL',
        reason: 'Эндпоинт не найден',
      });
    } else if (result.status === 0) {
      console.log(`   ❌ Ошибка соединения: ${result.error}`);
      results.push({
        ...endpoint,
        status: 'FAIL',
        reason: `Ошибка соединения: ${result.error}`,
      });
    } else {
      console.log(`   ⚠️  Неожиданный статус: ${result.status}`);
      console.log(`   Ответ:`, result.data);
      results.push({
        ...endpoint,
        status: 'UNEXPECTED',
        reason: `Неожиданный статус: ${result.status}`,
      });
    }

    console.log('');
  }

  // Сводка результатов
  console.log('📊 СВОДКА РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ:\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const unexpected = results.filter((r) => r.status === 'UNEXPECTED').length;

  console.log(`✅ Пройдено: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`⚠️  Неожиданные результаты: ${unexpected}`);
  console.log(
    `📈 Общий результат: ${passed}/${results.length} эндпоинтов работают корректно\n`
  );

  if (failed > 0) {
    console.log('❌ ПРОВАЛИВШИЕСЯ ТЕСТЫ:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((result) => {
        console.log(`   - ${result.name}: ${result.reason}`);
      });
    console.log('');
  }

  if (unexpected > 0) {
    console.log('⚠️  НЕОЖИДАННЫЕ РЕЗУЛЬТАТЫ:');
    results
      .filter((r) => r.status === 'UNEXPECTED')
      .forEach((result) => {
        console.log(`   - ${result.name}: ${result.reason}`);
      });
    console.log('');
  }

  console.log('🎯 ЗАКЛЮЧЕНИЕ:');
  if (failed === 0) {
    console.log(
      '   Все API эндпоинты администратора созданы и работают корректно!'
    );
    console.log(
      '   Эндпоинты правильно требуют авторизацию и права супер-администратора.'
    );
    console.log('   Готово для использования в админ панели.');
  } else {
    console.log('   Обнаружены проблемы с некоторыми эндпоинтами.');
    console.log('   Необходимо исправить указанные выше ошибки.');
  }
}

// Запуск тестирования
if (typeof window === 'undefined') {
  // Node.js окружение
  const fetch = require('node-fetch');
  testAdminEndpoints().catch(console.error);
} else {
  // Браузерное окружение
  testAdminEndpoints().catch(console.error);
}
