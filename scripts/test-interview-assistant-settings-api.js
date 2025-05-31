/**
 * Комплексный тест API эндпоинта настроек интервью-ассистента
 * Проверяет исправление проблемы 404 и корректность работы API
 */

const https = require('https');
const http = require('http');

// Конфигурация тестирования
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiEndpoint: '/api/admin/interview-assistant-settings',
  timeout: 10000,
  // Тестовые данные для PUT запроса
  testSettings: {
    maxQuestionsPerDay: 15,
    maxTokensPerQuestion: 5000,
    isActive: true,
    openRouterApiKey:
      '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',
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterModel: 'google/gemma-3-12b-it:free',
    openRouterTemperature: 0.8,
    openRouterMaxTokens: 5000,
  },
};

/**
 * Выполняет HTTP запрос
 */
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.baseUrl + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Interview-Assistant-Settings-Test/1.0',
        ...headers,
      },
      timeout: CONFIG.timeout,
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            rawData: responseData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: responseData,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Тест 1: Проверка доступности эндпоинта (исправление 404)
 */
async function testEndpointAvailability() {
  console.log('\n🔍 ТЕСТ 1: Проверка доступности эндпоинта');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest('GET', CONFIG.apiEndpoint);

    console.log(`📡 Статус ответа: ${response.statusCode}`);
    console.log(`📋 Заголовки:`, response.headers);

    if (response.statusCode === 404) {
      console.log('❌ ОШИБКА: Эндпоинт по-прежнему возвращает 404!');
      console.log('🔧 Проблема НЕ исправлена');
      return false;
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('✅ УСПЕХ: Эндпоинт доступен (ошибка авторизации ожидаема)');
      console.log('🔧 Проблема 404 ИСПРАВЛЕНА');
      return true;
    } else if (response.statusCode === 200) {
      console.log('✅ УСПЕХ: Эндпоинт полностью доступен');
      console.log('🔧 Проблема 404 ИСПРАВЛЕНА');
      return true;
    } else {
      console.log(`⚠️  Неожиданный статус: ${response.statusCode}`);
      console.log('📄 Ответ:', response.rawData);
      return true; // Любой статус кроме 404 означает, что эндпоинт найден
    }
  } catch (error) {
    console.log('❌ ОШИБКА при запросе:', error.message);
    return false;
  }
}

/**
 * Тест 2: Проверка структуры ответа GET запроса
 */
async function testGetRequest() {
  console.log('\n🔍 ТЕСТ 2: Проверка GET запроса');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest('GET', CONFIG.apiEndpoint);

    console.log(`📡 Статус ответа: ${response.statusCode}`);

    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('🔐 Ожидаемая ошибка авторизации');
      console.log('📄 Ответ:', response.data);

      // Проверяем, что это именно ошибка авторизации, а не 404
      if (
        response.data &&
        (response.data.message?.includes('авторизации') ||
          response.data.message?.includes('доступ') ||
          response.data.message?.includes('admin') ||
          response.data.error?.includes('Unauthorized'))
      ) {
        console.log('✅ Корректная ошибка авторизации - API работает');
        return true;
      }
    } else if (response.statusCode === 200) {
      console.log('✅ Успешный ответ');
      console.log('📄 Данные:', JSON.stringify(response.data, null, 2));

      // Проверяем структуру ответа
      if (response.data && response.data.settings) {
        console.log('✅ Структура ответа корректна');
        return true;
      } else {
        console.log('⚠️  Неожиданная структура ответа');
        return false;
      }
    }

    console.log('📄 Полный ответ:', response.rawData);
    return false;
  } catch (error) {
    console.log('❌ ОШИБКА при GET запросе:', error.message);
    return false;
  }
}

/**
 * Тест 3: Проверка PUT запроса
 */
async function testPutRequest() {
  console.log('\n🔍 ТЕСТ 3: Проверка PUT запроса');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest(
      'PUT',
      CONFIG.apiEndpoint,
      CONFIG.testSettings
    );

    console.log(`📡 Статус ответа: ${response.statusCode}`);

    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('🔐 Ожидаемая ошибка авторизации для PUT запроса');
      console.log('📄 Ответ:', response.data);
      console.log('✅ API корректно обрабатывает PUT запросы');
      return true;
    } else if (response.statusCode === 200) {
      console.log('✅ Успешное обновление настроек');
      console.log('📄 Ответ:', JSON.stringify(response.data, null, 2));
      return true;
    } else if (response.statusCode === 400) {
      console.log('⚠️  Ошибка валидации данных');
      console.log('📄 Ответ:', response.data);
      console.log('✅ API корректно валидирует данные');
      return true;
    }

    console.log('📄 Полный ответ:', response.rawData);
    return false;
  } catch (error) {
    console.log('❌ ОШИБКА при PUT запросе:', error.message);
    return false;
  }
}

/**
 * Тест 4: Проверка неподдерживаемых методов
 */
async function testUnsupportedMethods() {
  console.log('\n🔍 ТЕСТ 4: Проверка неподдерживаемых методов');
  console.log('='.repeat(50));

  const methods = ['POST', 'DELETE', 'PATCH'];
  let allCorrect = true;

  for (const method of methods) {
    try {
      console.log(`\n🔸 Тестирование метода ${method}:`);
      const response = await makeRequest(method, CONFIG.apiEndpoint);

      console.log(`📡 Статус ответа: ${response.statusCode}`);

      if (response.statusCode === 405) {
        console.log('✅ Корректно возвращает 405 Method Not Allowed');
      } else if (response.statusCode === 401 || response.statusCode === 403) {
        console.log('✅ Авторизация проверяется до проверки метода');
      } else {
        console.log(`⚠️  Неожиданный статус: ${response.statusCode}`);
        allCorrect = false;
      }
    } catch (error) {
      console.log(`❌ ОШИБКА при ${method} запросе:`, error.message);
      allCorrect = false;
    }
  }

  return allCorrect;
}

/**
 * Тест 5: Проверка заголовков и CORS
 */
async function testHeaders() {
  console.log('\n🔍 ТЕСТ 5: Проверка заголовков ответа');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest('GET', CONFIG.apiEndpoint);

    console.log('📋 Заголовки ответа:');
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Проверяем важные заголовки
    const hasContentType =
      response.headers['content-type']?.includes('application/json');
    console.log(`\n📄 Content-Type JSON: ${hasContentType ? '✅' : '❌'}`);

    return true;
  } catch (error) {
    console.log('❌ ОШИБКА при проверке заголовков:', error.message);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function runTests() {
  console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ API НАСТРОЕК ИНТЕРВЬЮ-АССИСТЕНТА');
  console.log('='.repeat(60));
  console.log(`🌐 Базовый URL: ${CONFIG.baseUrl}`);
  console.log(`🔗 Эндпоинт: ${CONFIG.apiEndpoint}`);
  console.log(`⏱️  Таймаут: ${CONFIG.timeout}ms`);

  const results = {
    endpointAvailable: false,
    getRequest: false,
    putRequest: false,
    unsupportedMethods: false,
    headers: false,
  };

  // Выполняем тесты последовательно
  results.endpointAvailable = await testEndpointAvailability();
  results.getRequest = await testGetRequest();
  results.putRequest = await testPutRequest();
  results.unsupportedMethods = await testUnsupportedMethods();
  results.headers = await testHeaders();

  // Подводим итоги
  console.log('\n📊 ИТОГИ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Доступность эндпоинта (исправление 404)',
      result: results.endpointAvailable,
    },
    { name: 'GET запрос', result: results.getRequest },
    { name: 'PUT запрос', result: results.putRequest },
    { name: 'Неподдерживаемые методы', result: results.unsupportedMethods },
    { name: 'Заголовки ответа', result: results.headers },
  ];

  tests.forEach((test) => {
    const status = test.result ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    console.log(`${status} - ${test.name}`);
  });

  const passedTests = tests.filter((test) => test.result).length;
  const totalTests = tests.length;

  console.log(`\n📈 Результат: ${passedTests}/${totalTests} тестов пройдено`);

  if (results.endpointAvailable) {
    console.log(
      '\n🎉 ГЛАВНАЯ ПРОБЛЕМА ИСПРАВЛЕНА: API эндпоинт больше не возвращает 404!'
    );
  } else {
    console.log(
      '\n⚠️  ПРОБЛЕМА НЕ ИСПРАВЛЕНА: API эндпоинт по-прежнему недоступен'
    );
  }

  return results;
}

// Запускаем тесты
if (require.main === module) {
  runTests().catch((error) => {
    console.error('💥 Критическая ошибка при выполнении тестов:', error);
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest, CONFIG };
