/**
 * Финальное тестирование исправленной функциональности настроек OpenRouter API
 *
 * Тестовые данные:
 * - API ключ: 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
 * - Базовый URL: https://openrouter.ai/api/v1
 * - Модель: google/gemma-3-12b-it:free
 * - Температура: 0.7
 * - Максимум токенов: 4000
 */

const https = require('https');
const http = require('http');

// Тестовые данные для OpenRouter
const testData = {
  maxQuestionsPerDay: 10,
  maxTokensPerQuestion: 4000,
  isActive: true,
  openRouterApiKey:
    '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',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModel: 'google/gemma-3-12b-it:free',
  openRouterTemperature: 0.7,
  openRouterMaxTokens: 4000,
};

// Конфигурация для тестирования
const config = {
  host: 'localhost',
  port: 3000,
  path: '/api/admin/interview-assistant-settings',
  headers: {
    'Content-Type': 'application/json',
    Cookie: 'next-auth.session-token=test-admin-token', // Тестовый токен
  },
};

/**
 * Выполняет HTTP запрос
 */
function makeRequest(method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      ...config,
      method: method,
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Основная функция тестирования
 */
async function runFinalTest() {
  console.log('🚀 НАЧАЛО ФИНАЛЬНОГО ТЕСТИРОВАНИЯ OPENROUTER API');
  console.log('='.repeat(60));

  const results = {
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };

  // Тест 1: GET запрос - получение текущих настроек
  console.log('\n📋 ТЕСТ 1: GET запрос - получение настроек');
  console.log('-'.repeat(50));

  try {
    const getResponse = await makeRequest('GET');

    console.log('Статус ответа:', getResponse.statusCode);
    console.log('Данные ответа:', JSON.stringify(getResponse.data, null, 2));

    const test1 = {
      name: 'GET запрос настроек',
      passed: getResponse.statusCode === 200,
      details: {
        statusCode: getResponse.statusCode,
        hasSettings: !!getResponse.data.settings,
        settingsStructure: getResponse.data.settings
          ? Object.keys(getResponse.data.settings)
          : [],
      },
    };

    results.tests.push(test1);
    results.summary.total++;

    if (test1.passed) {
      console.log('✅ ТЕСТ 1 ПРОЙДЕН: GET запрос успешен');
      results.summary.passed++;
    } else {
      console.log('❌ ТЕСТ 1 НЕ ПРОЙДЕН: GET запрос неуспешен');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ ТЕСТ 1 НЕ ПРОЙДЕН: Ошибка при выполнении GET запроса');
    console.error('Ошибка:', error.message);

    results.tests.push({
      name: 'GET запрос настроек',
      passed: false,
      error: error.message,
    });
    results.summary.total++;
    results.summary.failed++;
  }

  // Тест 2: PUT запрос - сохранение настроек OpenRouter
  console.log('\n💾 ТЕСТ 2: PUT запрос - сохранение настроек OpenRouter');
  console.log('-'.repeat(50));
  console.log('Отправляемые данные:', JSON.stringify(testData, null, 2));

  try {
    const putResponse = await makeRequest('PUT', testData);

    console.log('Статус ответа:', putResponse.statusCode);
    console.log('Данные ответа:', JSON.stringify(putResponse.data, null, 2));

    const test2 = {
      name: 'PUT запрос сохранения настроек',
      passed: putResponse.statusCode === 200,
      details: {
        statusCode: putResponse.statusCode,
        hasMessage: !!putResponse.data.message,
        hasSettings: !!putResponse.data.settings,
        errorCode: putResponse.data.code || null,
      },
    };

    results.tests.push(test2);
    results.summary.total++;

    if (test2.passed) {
      console.log(
        '✅ ТЕСТ 2 ПРОЙДЕН: PUT запрос успешен, ошибка 500 отсутствует'
      );
      results.summary.passed++;

      // Проверяем сохраненные данные
      if (putResponse.data.settings) {
        console.log('\n🔍 ПРОВЕРКА СОХРАНЕННЫХ ДАННЫХ:');
        const settings = putResponse.data.settings;

        console.log('- API ключ сохранен:', !!settings.openRouterApiKey);
        console.log('- Базовый URL:', settings.openRouterBaseUrl);
        console.log('- Модель:', settings.openRouterModel);
        console.log('- Температура:', settings.openRouterTemperature);
        console.log('- Максимум токенов:', settings.openRouterMaxTokens);
        console.log('- Тип API:', settings.apiType);
      }
    } else {
      console.log('❌ ТЕСТ 2 НЕ ПРОЙДЕН: PUT запрос неуспешен');
      results.summary.failed++;

      if (putResponse.statusCode === 500) {
        console.log('🚨 КРИТИЧЕСКАЯ ОШИБКА: Ошибка 500 все еще присутствует!');
      }
    }
  } catch (error) {
    console.log('❌ ТЕСТ 2 НЕ ПРОЙДЕН: Ошибка при выполнении PUT запроса');
    console.error('Ошибка:', error.message);

    results.tests.push({
      name: 'PUT запрос сохранения настроек',
      passed: false,
      error: error.message,
    });
    results.summary.total++;
    results.summary.failed++;
  }

  // Тест 3: GET запрос после сохранения - проверка сохранения
  console.log('\n🔄 ТЕСТ 3: GET запрос после сохранения - проверка данных');
  console.log('-'.repeat(50));

  try {
    // Небольшая задержка для обеспечения сохранения
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getAfterPutResponse = await makeRequest('GET');

    console.log('Статус ответа:', getAfterPutResponse.statusCode);

    const test3 = {
      name: 'GET запрос после сохранения',
      passed: getAfterPutResponse.statusCode === 200,
      details: {
        statusCode: getAfterPutResponse.statusCode,
        hasSettings: !!getAfterPutResponse.data.settings,
      },
    };

    if (getAfterPutResponse.data.settings) {
      const settings = getAfterPutResponse.data.settings;

      // Проверяем соответствие сохраненных данных
      const dataMatches = {
        apiKey: settings.openRouterApiKey === testData.openRouterApiKey,
        baseUrl: settings.openRouterBaseUrl === testData.openRouterBaseUrl,
        model: settings.openRouterModel === testData.openRouterModel,
        temperature:
          Math.abs(
            settings.openRouterTemperature - testData.openRouterTemperature
          ) < 0.01,
        maxTokens:
          settings.openRouterMaxTokens === testData.openRouterMaxTokens,
        apiType: settings.apiType === 'openrouter',
      };

      test3.details.dataMatches = dataMatches;
      test3.details.allDataMatches = Object.values(dataMatches).every(
        (match) => match
      );

      console.log('\n🔍 ПРОВЕРКА СООТВЕТСТВИЯ ДАННЫХ:');
      Object.entries(dataMatches).forEach(([key, matches]) => {
        console.log(`- ${key}: ${matches ? '✅' : '❌'}`);
      });

      if (test3.details.allDataMatches) {
        console.log('✅ Все данные сохранены корректно');
      } else {
        console.log('❌ Некоторые данные сохранены некорректно');
        test3.passed = false;
      }
    }

    results.tests.push(test3);
    results.summary.total++;

    if (test3.passed) {
      console.log('✅ ТЕСТ 3 ПРОЙДЕН: Данные сохранены и получены корректно');
      results.summary.passed++;
    } else {
      console.log(
        '❌ ТЕСТ 3 НЕ ПРОЙДЕН: Проблемы с сохранением или получением данных'
      );
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ ТЕСТ 3 НЕ ПРОЙДЕН: Ошибка при проверке сохраненных данных');
    console.error('Ошибка:', error.message);

    results.tests.push({
      name: 'GET запрос после сохранения',
      passed: false,
      error: error.message,
    });
    results.summary.total++;
    results.summary.failed++;
  }

  // Тест 4: Валидация полей - тест с некорректными данными
  console.log('\n🛡️ ТЕСТ 4: Валидация полей - некорректные данные');
  console.log('-'.repeat(50));

  const invalidData = {
    ...testData,
    openRouterApiKey: '', // Пустой API ключ
    openRouterTemperature: 'invalid', // Некорректная температура
    maxQuestionsPerDay: 'not_a_number', // Некорректное число
  };

  try {
    const validationResponse = await makeRequest('PUT', invalidData);

    console.log('Статус ответа:', validationResponse.statusCode);
    console.log(
      'Данные ответа:',
      JSON.stringify(validationResponse.data, null, 2)
    );

    const test4 = {
      name: 'Валидация полей',
      passed: validationResponse.statusCode === 400, // Ожидаем ошибку валидации
      details: {
        statusCode: validationResponse.statusCode,
        errorCode: validationResponse.data.code || null,
        message: validationResponse.data.message || null,
      },
    };

    results.tests.push(test4);
    results.summary.total++;

    if (test4.passed) {
      console.log('✅ ТЕСТ 4 ПРОЙДЕН: Валидация работает корректно');
      results.summary.passed++;
    } else {
      console.log('❌ ТЕСТ 4 НЕ ПРОЙДЕН: Валидация не работает');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ ТЕСТ 4 НЕ ПРОЙДЕН: Ошибка при тестировании валидации');
    console.error('Ошибка:', error.message);

    results.tests.push({
      name: 'Валидация полей',
      passed: false,
      error: error.message,
    });
    results.summary.total++;
    results.summary.failed++;
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ФИНАЛЬНОГО ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));

  console.log(`\n📈 СТАТИСТИКА:`);
  console.log(`- Всего тестов: ${results.summary.total}`);
  console.log(`- Пройдено: ${results.summary.passed} ✅`);
  console.log(`- Не пройдено: ${results.summary.failed} ❌`);
  console.log(
    `- Процент успеха: ${Math.round(
      (results.summary.passed / results.summary.total) * 100
    )}%`
  );

  console.log(`\n📋 ДЕТАЛИ ТЕСТОВ:`);
  results.tests.forEach((test, index) => {
    console.log(
      `${index + 1}. ${test.name}: ${
        test.passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'
      }`
    );
    if (test.error) {
      console.log(`   Ошибка: ${test.error}`);
    }
  });

  // Определение статуса исправления
  const isFixed = results.summary.passed >= 3; // Минимум 3 из 4 тестов должны пройти
  const has500Error = results.tests.some(
    (test) => test.details && test.details.statusCode === 500
  );

  console.log(`\n🎯 СТАТУС ИСПРАВЛЕНИЯ:`);
  if (isFixed && !has500Error) {
    console.log(
      '✅ ИСПРАВЛЕНИЕ УСПЕШНО: Ошибка 500 устранена, API работает корректно'
    );
  } else if (has500Error) {
    console.log('❌ ИСПРАВЛЕНИЕ НЕ ЗАВЕРШЕНО: Ошибка 500 все еще присутствует');
  } else {
    console.log(
      '⚠️ ИСПРАВЛЕНИЕ ЧАСТИЧНО: Некоторые функции работают некорректно'
    );
  }

  console.log(`\n🔑 ТЕСТИРОВАНИЕ С ПРЕДОСТАВЛЕННЫМ КЛЮЧОМ:`);
  console.log(
    `- API ключ: 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`
  );
  console.log(
    `- Статус: ${
      isFixed ? 'Работает корректно ✅' : 'Требует дополнительной проверки ❌'
    }`
  );

  return results;
}

// Запуск тестирования
if (require.main === module) {
  runFinalTest()
    .then((results) => {
      console.log('\n🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
      process.exit(results.summary.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ПРИ ТЕСТИРОВАНИИ:', error);
      process.exit(1);
    });
}

module.exports = { runFinalTest, testData };
