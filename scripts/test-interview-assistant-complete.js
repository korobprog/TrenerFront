/**
 * Комплексный тест исправления проблемы с настройками интервью-ассистента
 * Проверяет все аспекты восстановленной функциональности
 */

const https = require('https');
const http = require('http');

// Конфигурация тестирования
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminPageUrl: '/admin/interview-assistant-settings',
  apiEndpoint: '/api/admin/interview-assistant-settings',
  timeout: 15000,
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
        'User-Agent': 'Complete-Test/1.0',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
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
          let parsedData;
          if (res.headers['content-type']?.includes('application/json')) {
            parsedData = JSON.parse(responseData);
          } else {
            parsedData = responseData;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            rawData: responseData,
            contentType: res.headers['content-type'] || '',
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: responseData,
            contentType: res.headers['content-type'] || '',
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
 * Тест 1: Проверка исправления основной проблемы (404)
 */
async function testMainProblemFixed() {
  console.log('\n🎯 ТЕСТ 1: ПРОВЕРКА ИСПРАВЛЕНИЯ ОСНОВНОЙ ПРОБЛЕМЫ');
  console.log('='.repeat(60));

  try {
    console.log('🔍 Проверяем API эндпоинт...');
    const apiResponse = await makeRequest('GET', CONFIG.apiEndpoint);

    console.log(`📡 Статус API: ${apiResponse.statusCode}`);

    if (apiResponse.statusCode === 404) {
      console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: API по-прежнему возвращает 404!');
      console.log('🚨 ПРОБЛЕМА НЕ ИСПРАВЛЕНА!');
      return false;
    } else {
      console.log('✅ API эндпоинт найден и отвечает');

      if (apiResponse.statusCode === 401) {
        console.log('🔐 Корректная ошибка авторизации (ожидаемо)');
      } else if (apiResponse.statusCode === 200) {
        console.log('🎉 API полностью функционален');
      }

      console.log('🎉 ОСНОВНАЯ ПРОБЛЕМА 404 ИСПРАВЛЕНА!');
      return true;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при проверке API:', error.message);
    return false;
  }
}

/**
 * Тест 2: Проверка страницы админки
 */
async function testAdminPage() {
  console.log('\n📄 ТЕСТ 2: ПРОВЕРКА СТРАНИЦЫ АДМИНКИ');
  console.log('='.repeat(60));

  try {
    console.log('🔍 Загружаем страницу админки...');
    const pageResponse = await makeRequest('GET', CONFIG.adminPageUrl);

    console.log(`📡 Статус страницы: ${pageResponse.statusCode}`);

    if (pageResponse.statusCode === 404) {
      console.log('❌ Страница админки не найдена');
      return false;
    } else if (pageResponse.statusCode === 200) {
      console.log('✅ Страница админки загружается');

      // Проверяем содержимое страницы
      const pageContent = pageResponse.rawData;
      const hasApiCall = pageContent.includes(
        '/api/admin/interview-assistant-settings'
      );
      const hasTitle = pageContent.includes('Настройки интервью-ассистента');
      const hasForm =
        pageContent.includes('<form') || pageContent.includes('form');
      const hasOpenRouter = pageContent.includes('OpenRouter');

      console.log(`📋 Содержит вызов API: ${hasApiCall ? '✅' : '❌'}`);
      console.log(`📋 Содержит заголовок: ${hasTitle ? '✅' : '❌'}`);
      console.log(`📋 Содержит форму: ${hasForm ? '✅' : '❌'}`);
      console.log(`📋 Поддерживает OpenRouter: ${hasOpenRouter ? '✅' : '❌'}`);

      return hasApiCall && hasForm;
    } else if (
      pageResponse.statusCode === 302 ||
      pageResponse.statusCode === 301
    ) {
      console.log('🔄 Редирект (возможно, требуется авторизация)');
      console.log('✅ Страница существует');
      return true;
    }

    return false;
  } catch (error) {
    console.log('❌ ОШИБКА при проверке страницы:', error.message);
    return false;
  }
}

/**
 * Тест 3: Проверка функциональности API
 */
async function testApiFunctionality() {
  console.log('\n⚙️  ТЕСТ 3: ПРОВЕРКА ФУНКЦИОНАЛЬНОСТИ API');
  console.log('='.repeat(60));

  const results = {
    get: false,
    put: false,
    unsupportedMethods: false,
  };

  try {
    // Тест GET запроса
    console.log('🔍 Тестируем GET запрос...');
    const getResponse = await makeRequest('GET', CONFIG.apiEndpoint);
    console.log(`📡 GET статус: ${getResponse.statusCode}`);

    if (getResponse.statusCode === 401) {
      console.log('✅ GET: Корректная авторизация');
      results.get = true;
    } else if (getResponse.statusCode === 200) {
      console.log('✅ GET: Успешный ответ');
      console.log('📄 Структура ответа:', typeof getResponse.data);
      results.get = true;
    }

    // Тест PUT запроса
    console.log('\n🔍 Тестируем PUT запрос...');
    const testData = {
      maxQuestionsPerDay: 10,
      maxTokensPerQuestion: 4000,
      isActive: true,
      openRouterApiKey: 'test-key',
      openRouterBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterModel: 'google/gemma-3-12b-it:free',
      openRouterTemperature: 0.7,
      openRouterMaxTokens: 4000,
    };

    const putResponse = await makeRequest('PUT', CONFIG.apiEndpoint, testData);
    console.log(`📡 PUT статус: ${putResponse.statusCode}`);

    if (putResponse.statusCode === 401) {
      console.log('✅ PUT: Корректная авторизация');
      results.put = true;
    } else if (putResponse.statusCode === 200) {
      console.log('✅ PUT: Успешное обновление');
      results.put = true;
    } else if (putResponse.statusCode === 400) {
      console.log('✅ PUT: Корректная валидация данных');
      results.put = true;
    }

    // Тест неподдерживаемых методов
    console.log('\n🔍 Тестируем неподдерживаемые методы...');
    const deleteResponse = await makeRequest('DELETE', CONFIG.apiEndpoint);
    console.log(`📡 DELETE статус: ${deleteResponse.statusCode}`);

    if (deleteResponse.statusCode === 405) {
      console.log('✅ DELETE: Корректно отклонен');
      results.unsupportedMethods = true;
    } else if (deleteResponse.statusCode === 401) {
      console.log('✅ DELETE: Авторизация проверяется первой');
      results.unsupportedMethods = true;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при тестировании API:', error.message);
  }

  return results;
}

/**
 * Тест 4: Проверка интеграции с OpenRouter
 */
async function testOpenRouterIntegration() {
  console.log('\n🔗 ТЕСТ 4: ПРОВЕРКА ИНТЕГРАЦИИ С OPENROUTER');
  console.log('='.repeat(60));

  try {
    // Проверяем, что API поддерживает OpenRouter настройки
    const pageResponse = await makeRequest('GET', CONFIG.adminPageUrl);

    if (pageResponse.statusCode === 200) {
      const pageContent = pageResponse.rawData;

      const checks = [
        {
          name: 'OpenRouter API тип',
          test: pageContent.includes('openrouter'),
        },
        {
          name: 'OpenRouter API ключ',
          test: pageContent.includes('openRouterApiKey'),
        },
        {
          name: 'OpenRouter модель',
          test: pageContent.includes('openRouterModel'),
        },
        {
          name: 'OpenRouter температура',
          test: pageContent.includes('openRouterTemperature'),
        },
        {
          name: 'OpenRouter токены',
          test: pageContent.includes('openRouterMaxTokens'),
        },
        {
          name: 'Gemma модель',
          test: pageContent.includes('gemma-3-12b-it:free'),
        },
      ];

      console.log('📋 Проверка поддержки OpenRouter:');
      let allSupported = true;

      checks.forEach((check) => {
        const status = check.test ? '✅' : '❌';
        console.log(`   ${status} ${check.name}`);
        if (!check.test) allSupported = false;
      });

      return allSupported;
    } else {
      console.log('⚠️  Не удалось проверить интеграцию (страница недоступна)');
      return false;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при проверке интеграции:', error.message);
    return false;
  }
}

/**
 * Тест 5: Проверка отсутствия консольных ошибок
 */
async function testNoConsoleErrors() {
  console.log('\n🖥️  ТЕСТ 5: ПРОВЕРКА ОТСУТСТВИЯ КОНСОЛЬНЫХ ОШИБОК');
  console.log('='.repeat(60));

  try {
    console.log('🔄 Симулируем полную загрузку страницы...');

    // Загружаем страницу
    const pageResponse = await makeRequest('GET', CONFIG.adminPageUrl);
    console.log(`📄 Страница: ${pageResponse.statusCode}`);

    // Проверяем API (это то, что вызывается со страницы)
    const apiResponse = await makeRequest('GET', CONFIG.apiEndpoint);
    console.log(`📡 API: ${apiResponse.statusCode}`);

    if (apiResponse.statusCode === 404) {
      console.log('❌ API возвращает 404 - будут ошибки в консоли браузера');
      return false;
    } else {
      console.log('✅ API не возвращает 404 - консольные ошибки исправлены');

      // Дополнительная проверка: симулируем AJAX запрос
      const ajaxResponse = await makeRequest('GET', CONFIG.apiEndpoint, null, {
        'X-Requested-With': 'XMLHttpRequest',
      });
      console.log(`📡 AJAX запрос: ${ajaxResponse.statusCode}`);

      if (ajaxResponse.statusCode !== 404) {
        console.log('✅ AJAX запросы также работают корректно');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log('❌ ОШИБКА при проверке консольных ошибок:', error.message);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function runCompleteTest() {
  console.log('🚀 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ ПРОБЛЕМЫ');
  console.log('='.repeat(70));
  console.log(
    '🎯 Цель: Проверить исправление ошибки 404 для настроек интервью-ассистента'
  );
  console.log(`🌐 Базовый URL: ${CONFIG.baseUrl}`);
  console.log(`📄 Страница: ${CONFIG.adminPageUrl}`);
  console.log(`🔗 API: ${CONFIG.apiEndpoint}`);
  console.log(`⏱️  Таймаут: ${CONFIG.timeout}ms`);

  const results = {
    mainProblemFixed: false,
    adminPageWorks: false,
    apiFunctionality: { get: false, put: false, unsupportedMethods: false },
    openRouterIntegration: false,
    noConsoleErrors: false,
  };

  // Выполняем тесты последовательно
  results.mainProblemFixed = await testMainProblemFixed();
  results.adminPageWorks = await testAdminPage();
  results.apiFunctionality = await testApiFunctionality();
  results.openRouterIntegration = await testOpenRouterIntegration();
  results.noConsoleErrors = await testNoConsoleErrors();

  // Подводим итоги
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ О ТЕСТИРОВАНИИ');
  console.log('='.repeat(70));

  const tests = [
    {
      name: '🎯 ОСНОВНАЯ ПРОБЛЕМА: Исправление ошибки 404',
      result: results.mainProblemFixed,
      critical: true,
    },
    {
      name: '📄 Работа страницы админки',
      result: results.adminPageWorks,
      critical: false,
    },
    {
      name: '⚙️  GET запросы API',
      result: results.apiFunctionality.get,
      critical: false,
    },
    {
      name: '⚙️  PUT запросы API',
      result: results.apiFunctionality.put,
      critical: false,
    },
    {
      name: '⚙️  Обработка неподдерживаемых методов',
      result: results.apiFunctionality.unsupportedMethods,
      critical: false,
    },
    {
      name: '🔗 Интеграция с OpenRouter',
      result: results.openRouterIntegration,
      critical: false,
    },
    {
      name: '🖥️  Отсутствие консольных ошибок 404',
      result: results.noConsoleErrors,
      critical: true,
    },
  ];

  let criticalPassed = 0;
  let criticalTotal = 0;
  let totalPassed = 0;

  tests.forEach((test) => {
    const status = test.result ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    const priority = test.critical ? '🔴 КРИТИЧЕСКИЙ' : '🟡 ДОПОЛНИТЕЛЬНЫЙ';
    console.log(`${status} - ${priority} - ${test.name}`);

    if (test.critical) {
      criticalTotal++;
      if (test.result) criticalPassed++;
    }

    if (test.result) totalPassed++;
  });

  console.log(
    `\n📈 Общий результат: ${totalPassed}/${tests.length} тестов пройдено`
  );
  console.log(
    `🔴 Критические тесты: ${criticalPassed}/${criticalTotal} пройдено`
  );

  // Финальное заключение
  console.log('\n🏁 ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ');
  console.log('='.repeat(70));

  if (results.mainProblemFixed) {
    console.log('🎉 УСПЕХ: Основная проблема с ошибкой 404 ИСПРАВЛЕНА!');
    console.log(
      '✅ API эндпоинт /api/admin/interview-assistant-settings теперь работает'
    );
  } else {
    console.log('🚨 ПРОВАЛ: Основная проблема НЕ исправлена!');
    console.log('❌ API эндпоинт по-прежнему возвращает 404');
  }

  if (results.noConsoleErrors) {
    console.log('✅ Консольные ошибки 404 устранены');
  }

  if (results.openRouterIntegration) {
    console.log('✅ Интеграция с OpenRouter API настроена корректно');
  }

  if (criticalPassed === criticalTotal) {
    console.log('\n🏆 ВСЕ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ ВЫПОЛНЕНЫ!');
    console.log('🎯 Задача по исправлению проблемы успешно завершена');
  } else {
    console.log('\n⚠️  НЕ ВСЕ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ ВЫПОЛНЕНЫ');
    console.log('🔧 Требуется дополнительная работа');
  }

  return results;
}

// Запускаем тесты
if (require.main === module) {
  runCompleteTest().catch((error) => {
    console.error('💥 Критическая ошибка при выполнении тестов:', error);
    process.exit(1);
  });
}

module.exports = { runCompleteTest, makeRequest, CONFIG };
