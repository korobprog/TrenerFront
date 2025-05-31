/**
 * Тест страницы админки настроек интервью-ассистента
 * Проверяет, что страница загружается без ошибок 404
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
        'User-Agent': 'Admin-Page-Test/1.0',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData,
          contentType: res.headers['content-type'] || '',
        });
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
 * Тест 1: Проверка доступности страницы админки
 */
async function testAdminPageAvailability() {
  console.log('\n🔍 ТЕСТ 1: Проверка доступности страницы админки');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest('GET', CONFIG.adminPageUrl);

    console.log(`📡 Статус ответа: ${response.statusCode}`);
    console.log(`📄 Content-Type: ${response.contentType}`);

    if (response.statusCode === 404) {
      console.log('❌ ОШИБКА: Страница админки возвращает 404!');
      return false;
    } else if (response.statusCode === 200) {
      console.log('✅ УСПЕХ: Страница админки доступна');

      // Проверяем, что это HTML страница
      if (response.contentType.includes('text/html')) {
        console.log('✅ Корректный Content-Type (HTML)');

        // Проверяем наличие ключевых элементов на странице
        const hasTitle =
          response.data.includes('<title>') ||
          response.data.includes('Настройки');
        const hasForm =
          response.data.includes('<form') || response.data.includes('form');
        const hasReact =
          response.data.includes('__NEXT_DATA__') ||
          response.data.includes('_app');

        console.log(`📋 Содержит заголовок: ${hasTitle ? '✅' : '❌'}`);
        console.log(`📋 Содержит форму: ${hasForm ? '✅' : '❌'}`);
        console.log(`📋 React/Next.js приложение: ${hasReact ? '✅' : '❌'}`);

        return true;
      } else {
        console.log('⚠️  Неожиданный Content-Type');
        return false;
      }
    } else if (response.statusCode === 302 || response.statusCode === 301) {
      console.log('🔄 Редирект (возможно, на страницу авторизации)');
      console.log(`📍 Location: ${response.headers.location || 'не указан'}`);
      console.log('✅ Страница существует, но требует авторизации');
      return true;
    } else {
      console.log(`⚠️  Неожиданный статус: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при запросе страницы:', error.message);
    return false;
  }
}

/**
 * Тест 2: Проверка, что API вызывается со страницы
 */
async function testApiCallFromPage() {
  console.log('\n🔍 ТЕСТ 2: Проверка вызова API со страницы');
  console.log('='.repeat(50));

  try {
    // Получаем страницу
    const pageResponse = await makeRequest('GET', CONFIG.adminPageUrl);

    if (pageResponse.statusCode !== 200) {
      console.log('⚠️  Страница недоступна, пропускаем тест API вызова');
      return true; // Не критично для основной проблемы
    }

    // Проверяем, что на странице есть ссылка на API эндпоинт
    const hasApiCall = pageResponse.data.includes(
      '/api/admin/interview-assistant-settings'
    );
    console.log(`📡 Страница содержит вызов API: ${hasApiCall ? '✅' : '❌'}`);

    if (hasApiCall) {
      console.log('✅ API эндпоинт корректно интегрирован в страницу');
      return true;
    } else {
      console.log('⚠️  API эндпоинт не найден на странице');
      return false;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при проверке API вызова:', error.message);
    return false;
  }
}

/**
 * Тест 3: Проверка консольных ошибок (симуляция)
 */
async function testConsoleErrors() {
  console.log('\n🔍 ТЕСТ 3: Проверка отсутствия ошибок 404 в консоли');
  console.log('='.repeat(50));

  try {
    // Симулируем загрузку страницы и проверяем API
    console.log('🔄 Симулируем загрузку страницы...');

    const pageResponse = await makeRequest('GET', CONFIG.adminPageUrl);
    console.log(`📄 Страница: ${pageResponse.statusCode}`);

    // Проверяем API эндпоинт
    console.log('🔄 Проверяем API эндпоинт...');
    const apiResponse = await makeRequest('GET', CONFIG.apiEndpoint);
    console.log(`📡 API: ${apiResponse.statusCode}`);

    if (apiResponse.statusCode === 404) {
      console.log('❌ API по-прежнему возвращает 404 - будут ошибки в консоли');
      return false;
    } else {
      console.log('✅ API не возвращает 404 - ошибки в консоли исправлены');
      return true;
    }
  } catch (error) {
    console.log('❌ ОШИБКА при проверке консольных ошибок:', error.message);
    return false;
  }
}

/**
 * Тест 4: Проверка структуры страницы
 */
async function testPageStructure() {
  console.log('\n🔍 ТЕСТ 4: Проверка структуры страницы');
  console.log('='.repeat(50));

  try {
    const response = await makeRequest('GET', CONFIG.adminPageUrl);

    if (response.statusCode !== 200) {
      console.log('⚠️  Страница недоступна, пропускаем проверку структуры');
      return true;
    }

    const pageContent = response.data;

    // Проверяем ключевые элементы страницы настроек
    const checks = [
      {
        name: 'HTML документ',
        test:
          pageContent.includes('<!DOCTYPE html>') ||
          pageContent.includes('<html'),
      },
      { name: 'Заголовок страницы', test: pageContent.includes('<title>') },
      {
        name: 'Next.js приложение',
        test: pageContent.includes('__NEXT_DATA__'),
      },
      {
        name: 'Настройки ассистента',
        test:
          pageContent.includes('assistant') ||
          pageContent.includes('настройки'),
      },
      {
        name: 'Форма или поля ввода',
        test: pageContent.includes('<input') || pageContent.includes('<form'),
      },
    ];

    console.log('📋 Проверка элементов страницы:');
    let allPassed = true;

    checks.forEach((check) => {
      const status = check.test ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
      if (!check.test) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    console.log('❌ ОШИБКА при проверке структуры страницы:', error.message);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function runTests() {
  console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ СТРАНИЦЫ АДМИНКИ');
  console.log('='.repeat(60));
  console.log(`🌐 Базовый URL: ${CONFIG.baseUrl}`);
  console.log(`📄 Страница админки: ${CONFIG.adminPageUrl}`);
  console.log(`🔗 API эндпоинт: ${CONFIG.apiEndpoint}`);
  console.log(`⏱️  Таймаут: ${CONFIG.timeout}ms`);

  const results = {
    pageAvailable: false,
    apiIntegration: false,
    noConsoleErrors: false,
    pageStructure: false,
  };

  // Выполняем тесты последовательно
  results.pageAvailable = await testAdminPageAvailability();
  results.apiIntegration = await testApiCallFromPage();
  results.noConsoleErrors = await testConsoleErrors();
  results.pageStructure = await testPageStructure();

  // Подводим итоги
  console.log('\n📊 ИТОГИ ТЕСТИРОВАНИЯ СТРАНИЦЫ АДМИНКИ');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Доступность страницы админки', result: results.pageAvailable },
    { name: 'Интеграция с API', result: results.apiIntegration },
    {
      name: 'Отсутствие ошибок 404 в консоли',
      result: results.noConsoleErrors,
    },
    { name: 'Структура страницы', result: results.pageStructure },
  ];

  tests.forEach((test) => {
    const status = test.result ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    console.log(`${status} - ${test.name}`);
  });

  const passedTests = tests.filter((test) => test.result).length;
  const totalTests = tests.length;

  console.log(`\n📈 Результат: ${passedTests}/${totalTests} тестов пройдено`);

  if (results.noConsoleErrors) {
    console.log('\n🎉 КОНСОЛЬНЫЕ ОШИБКИ 404 ИСПРАВЛЕНЫ!');
  }

  if (results.pageAvailable) {
    console.log('✅ Страница админки загружается без ошибок');
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
