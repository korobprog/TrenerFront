/**
 * Тестовый скрипт для проверки работы фронтенда страницы mock-interviews
 * Симулирует запросы, которые делает браузер при загрузке страницы
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMockInterviewsPage() {
  console.log('🧪 ТЕСТИРОВАНИЕ ФРОНТЕНДА СТРАНИЦЫ MOCK-INTERVIEWS');
  console.log('='.repeat(60));

  // Тест 1: Проверка загрузки самой страницы
  console.log('\n1️⃣ Тестирование загрузки страницы /mock-interviews');
  try {
    const response = await fetch(`${BASE_URL}/mock-interviews`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);

    if (response.status === 200) {
      const html = await response.text();
      const hasTitle =
        html.includes('Актуальные собеседования') ||
        html.includes('Доступные собеседования');
      console.log(`   ✅ Страница загружается: ${hasTitle ? 'Да' : 'Нет'}`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка загрузки страницы: ${error.message}`);
  }

  // Тест 2: API запрос к /api/mock-interviews (как делает фронтенд)
  console.log('\n2️⃣ Тестирование API /api/mock-interviews');
  try {
    const response = await fetch(
      `${BASE_URL}/api/mock-interviews?status=active`
    );
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);

    const data = await response.text();
    console.log(`   Тип ответа: ${data.startsWith('<') ? 'HTML' : 'JSON'}`);

    if (response.status === 401) {
      try {
        const jsonData = JSON.parse(data);
        console.log(
          `   ✅ 401 ошибка с корректным JSON: ${JSON.stringify(jsonData)}`
        );
      } catch (parseError) {
        console.log(
          `   ❌ 401 ошибка, но ответ не JSON: ${data.substring(0, 100)}...`
        );
      }
    } else if (response.status === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log(
          `   ✅ Успешный JSON ответ с ${jsonData.length || 0} собеседованиями`
        );
      } catch (parseError) {
        console.log(
          `   ❌ 200 статус, но ответ не JSON: ${data.substring(0, 100)}...`
        );
      }
    }
  } catch (error) {
    console.log(`   ❌ Ошибка запроса: ${error.message}`);
  }

  // Тест 3: API запрос к /api/user/points (как делает фронтенд)
  console.log('\n3️⃣ Тестирование API /api/user/points');
  try {
    const response = await fetch(`${BASE_URL}/api/user/points`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);

    const data = await response.text();
    console.log(`   Тип ответа: ${data.startsWith('<') ? 'HTML' : 'JSON'}`);

    if (response.status === 401) {
      try {
        const jsonData = JSON.parse(data);
        console.log(
          `   ✅ 401 ошибка с корректным JSON: ${JSON.stringify(jsonData)}`
        );
      } catch (parseError) {
        console.log(
          `   ❌ 401 ошибка, но ответ не JSON: ${data.substring(0, 100)}...`
        );
      }
    } else if (response.status === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log(`   ✅ Успешный JSON ответ: ${JSON.stringify(jsonData)}`);
      } catch (parseError) {
        console.log(
          `   ❌ 200 статус, но ответ не JSON: ${data.substring(0, 100)}...`
        );
      }
    }
  } catch (error) {
    console.log(`   ❌ Ошибка запроса: ${error.message}`);
  }

  // Тест 4: Проверка других эндпоинтов, которые могут вызываться
  console.log('\n4️⃣ Тестирование дополнительных API эндпоинтов');

  const additionalEndpoints = [
    '/api/auth/session',
    '/api/auth/csrf',
    '/api/auth/providers',
  ];

  for (const endpoint of additionalEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);

      const data = await response.text();
      const isJson = !data.startsWith('<');
      console.log(`     Тип ответа: ${isJson ? 'JSON' : 'HTML'}`);

      if (isJson && data) {
        try {
          const jsonData = JSON.parse(data);
          console.log(`     ✅ Корректный JSON`);
        } catch (parseError) {
          console.log(`     ❌ Некорректный JSON`);
        }
      }
    } catch (error) {
      console.log(`   ${endpoint}: ❌ Ошибка - ${error.message}`);
    }
  }

  console.log('\n📋 РЕЗЮМЕ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  console.log('Если все API возвращают JSON (а не HTML), то проблема решена.');
  console.log('Если API возвращают HTML, то проблема все еще существует.');
  console.log('\nДля полной проверки откройте браузер и проверьте:');
  console.log('1. Откройте http://localhost:3000/mock-interviews');
  console.log('2. Откройте DevTools (F12) → Network');
  console.log('3. Обновите страницу');
  console.log('4. Проверьте запросы к API эндпоинтам');
}

// Запуск тестирования
testMockInterviewsPage().catch(console.error);
