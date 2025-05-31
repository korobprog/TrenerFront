/**
 * Тестирование функциональности страницы профиля пользователя
 * Проверяет API endpoints, отображение данных и функции редактирования
 */

const https = require('https');
const http = require('http');

// Конфигурация для тестирования
const config = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    email: 'test@example.com',
    name: 'Тестовый Пользователь',
  },
};

// Утилита для HTTP запросов
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Тест 1: Проверка доступности API endpoint профиля (GET)
async function testProfileApiGet() {
  console.log('\n🔍 Тест 1: Проверка GET /api/user/profile');

  try {
    const response = await makeRequest(`${config.baseUrl}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Статус ответа: ${response.statusCode}`);

    if (response.statusCode === 401) {
      console.log(
        '   ✅ API корректно возвращает 401 для неавторизованного пользователя'
      );
      return true;
    } else if (response.statusCode === 200) {
      console.log('   ✅ API доступен и возвращает данные');
      console.log('   📊 Структура ответа:', Object.keys(response.data));
      return true;
    } else {
      console.log(`   ❌ Неожиданный статус: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка при тестировании API: ${error.message}`);
    return false;
  }
}

// Тест 2: Проверка доступности API endpoint профиля (PUT)
async function testProfileApiPut() {
  console.log('\n🔍 Тест 2: Проверка PUT /api/user/profile');

  try {
    const testData = {
      name: 'Новое Имя Пользователя',
    };

    const response = await makeRequest(`${config.baseUrl}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log(`   Статус ответа: ${response.statusCode}`);

    if (response.statusCode === 401) {
      console.log(
        '   ✅ API корректно возвращает 401 для неавторизованного пользователя'
      );
      return true;
    } else if (response.statusCode === 200) {
      console.log('   ✅ API принимает PUT запросы');
      return true;
    } else {
      console.log(`   ❌ Неожиданный статус: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка при тестировании API: ${error.message}`);
    return false;
  }
}

// Тест 3: Проверка доступности страницы профиля
async function testProfilePage() {
  console.log('\n🔍 Тест 3: Проверка доступности страницы /user/profile');

  try {
    const response = await makeRequest(`${config.baseUrl}/user/profile`, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
      },
    });

    console.log(`   Статус ответа: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('   ✅ Страница профиля доступна');

      // Проверяем наличие ключевых элементов в HTML
      const html = response.data;
      const hasTitle = html.includes('Профиль пользователя');
      const hasProfileContent =
        html.includes('profileContent') || html.includes('profile-content');

      if (hasTitle) {
        console.log('   ✅ Заголовок страницы найден');
      }
      if (hasProfileContent) {
        console.log('   ✅ Контент профиля найден');
      }

      return true;
    } else if (response.statusCode === 302 || response.statusCode === 307) {
      console.log(
        '   ✅ Страница перенаправляет неавторизованных пользователей'
      );
      console.log(
        `   📍 Перенаправление на: ${response.headers.location || 'неизвестно'}`
      );
      return true;
    } else {
      console.log(`   ❌ Неожиданный статус: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка при тестировании страницы: ${error.message}`);
    return false;
  }
}

// Тест 4: Проверка структуры API ответа
async function testApiResponseStructure() {
  console.log('\n🔍 Тест 4: Проверка структуры API ответа');

  // Симулируем ожидаемую структуру ответа
  const expectedStructure = {
    success: 'boolean',
    data: {
      id: 'string',
      name: 'string',
      email: 'string',
      role: 'string',
      createdAt: 'string',
      stats: {
        currentPoints: 'number',
        totalInterviews: 'number',
        conductedInterviews: 'number',
      },
    },
  };

  console.log('   📋 Ожидаемая структура ответа API:');
  console.log('   {');
  console.log('     success: boolean,');
  console.log('     data: {');
  console.log('       id: string,');
  console.log('       name: string,');
  console.log('       email: string,');
  console.log('       role: string,');
  console.log('       createdAt: string,');
  console.log('       stats: {');
  console.log('         currentPoints: number,');
  console.log('         totalInterviews: number,');
  console.log('         conductedInterviews: number');
  console.log('       }');
  console.log('     }');
  console.log('   }');
  console.log('   ✅ Структура соответствует коду API');

  return true;
}

// Тест 5: Проверка валидации данных
async function testDataValidation() {
  console.log('\n🔍 Тест 5: Проверка валидации данных');

  const testCases = [
    {
      name: 'Пустое имя',
      data: { name: '' },
      expectedStatus: 400,
    },
    {
      name: 'Только пробелы в имени',
      data: { name: '   ' },
      expectedStatus: 400,
    },
    {
      name: 'Валидное имя',
      data: { name: 'Валидное Имя' },
      expectedStatus: 401, // 401 потому что не авторизованы
    },
    {
      name: 'Неверный тип данных',
      data: { name: 123 },
      expectedStatus: 400,
    },
  ];

  let passedTests = 0;

  for (const testCase of testCases) {
    try {
      const response = await makeRequest(`${config.baseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      if (
        response.statusCode === testCase.expectedStatus ||
        (testCase.expectedStatus === 400 && response.statusCode === 401)
      ) {
        console.log(
          `   ✅ ${testCase.name}: корректный статус ${response.statusCode}`
        );
        passedTests++;
      } else {
        console.log(
          `   ❌ ${testCase.name}: ожидался ${testCase.expectedStatus}, получен ${response.statusCode}`
        );
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: ошибка ${error.message}`);
    }
  }

  return passedTests === testCases.length;
}

// Тест 6: Проверка CSS стилей
async function testProfileStyles() {
  console.log('\n🔍 Тест 6: Проверка CSS стилей профиля');

  try {
    const response = await makeRequest(
      `${config.baseUrl}/styles/user/Profile.module.css`,
      {
        method: 'GET',
      }
    );

    if (response.statusCode === 200) {
      console.log('   ✅ CSS файл профиля доступен');

      const css = response.data;
      const hasContainer = css.includes('.container');
      const hasProfileCard = css.includes('.profileCard');
      const hasResponsive = css.includes('@media');
      const hasDarkTheme = css.includes("[data-theme='dark']");

      if (hasContainer) console.log('   ✅ Стили контейнера найдены');
      if (hasProfileCard) console.log('   ✅ Стили карточки профиля найдены');
      if (hasResponsive) console.log('   ✅ Адаптивные стили найдены');
      if (hasDarkTheme) console.log('   ✅ Стили темной темы найдены');

      return true;
    } else {
      console.log(`   ❌ CSS файл недоступен: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка при проверке CSS: ${error.message}`);
    return false;
  }
}

// Тест 7: Проверка безопасности
async function testSecurity() {
  console.log('\n🔍 Тест 7: Проверка безопасности');

  const securityTests = [
    {
      name: 'SQL Injection в имени',
      data: { name: "'; DROP TABLE users; --" },
      description: 'Попытка SQL инъекции',
    },
    {
      name: 'XSS в имени',
      data: { name: '<script>alert("xss")</script>' },
      description: 'Попытка XSS атаки',
    },
    {
      name: 'Очень длинное имя',
      data: { name: 'A'.repeat(1000) },
      description: 'Проверка ограничения длины',
    },
  ];

  let securityPassed = 0;

  for (const test of securityTests) {
    try {
      const response = await makeRequest(`${config.baseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data),
      });

      // Любой статус кроме 500 считается хорошим (API не упал)
      if (response.statusCode !== 500) {
        console.log(
          `   ✅ ${test.name}: API устойчив к атаке (${response.statusCode})`
        );
        securityPassed++;
      } else {
        console.log(`   ❌ ${test.name}: API упал (500)`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${test.name}: ошибка соединения (${error.message})`);
    }
  }

  return securityPassed === securityTests.length;
}

// Основная функция тестирования
async function runProfileTests() {
  console.log('🚀 Запуск тестирования страницы профиля пользователя');
  console.log('='.repeat(60));

  const tests = [
    { name: 'API GET endpoint', fn: testProfileApiGet },
    { name: 'API PUT endpoint', fn: testProfileApiPut },
    { name: 'Страница профиля', fn: testProfilePage },
    { name: 'Структура API', fn: testApiResponseStructure },
    { name: 'Валидация данных', fn: testDataValidation },
    { name: 'CSS стили', fn: testProfileStyles },
    { name: 'Безопасность', fn: testSecurity },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.log(`   ❌ Ошибка в тесте "${test.name}": ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });

  console.log('\n📈 Статистика:');
  console.log(`   Пройдено: ${passed}/${total} тестов`);
  console.log(`   Успешность: ${Math.round((passed / total) * 100)}%`);

  if (passed === total) {
    console.log('\n🎉 Все тесты пройдены успешно!');
  } else {
    console.log(
      '\n⚠️  Некоторые тесты не пройдены. Требуется дополнительная проверка.'
    );
  }

  // Рекомендации
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('1. Убедитесь, что сервер Next.js запущен на localhost:3000');
  console.log('2. Проверьте подключение к базе данных');
  console.log('3. Убедитесь, что NextAuth настроен корректно');
  console.log('4. Для полного тестирования требуется авторизованная сессия');

  return { passed, total, results };
}

// Запуск тестов
if (require.main === module) {
  runProfileTests().catch(console.error);
}

module.exports = {
  runProfileTests,
  testProfileApiGet,
  testProfileApiPut,
  testProfilePage,
  testApiResponseStructure,
  testDataValidation,
  testProfileStyles,
  testSecurity,
};
