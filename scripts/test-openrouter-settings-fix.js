const axios = require('axios');

/**
 * Тест исправления ошибки 500 при сохранении настроек OpenRouter API
 */
async function testOpenRouterSettingsFix() {
  console.log(
    '🧪 ТЕСТ: Исправление ошибки 500 при сохранении настроек OpenRouter API'
  );
  console.log('='.repeat(80));

  const baseUrl = 'http://localhost:3000';

  // Тестовые данные OpenRouter
  const testSettings = {
    maxQuestionsPerDay: 15,
    maxTokensPerQuestion: 5000,
    isActive: true,
    openRouterApiKey: 'sk-or-v1-test-key-12345', // Тестовый ключ
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterModel: 'google/gemma-3-12b-it:free',
    openRouterTemperature: 0.8,
    openRouterMaxTokens: 5000,
  };

  try {
    console.log('📤 Отправка PUT запроса с настройками OpenRouter...');
    console.log('Данные:', JSON.stringify(testSettings, null, 2));

    const response = await axios.put(
      `${baseUrl}/api/test-settings-no-auth`,
      testSettings,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ УСПЕХ: Настройки OpenRouter успешно сохранены!');
    console.log('Статус:', response.status);
    console.log('Ответ:', JSON.stringify(response.data, null, 2));

    // Проверяем, что настройки действительно сохранились
    console.log('\n📥 Проверка сохраненных настроек...');

    const getResponse = await axios.get(
      `${baseUrl}/api/test-settings-no-auth`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('✅ УСПЕХ: Настройки успешно получены!');
    console.log(
      'Сохраненные настройки:',
      JSON.stringify(getResponse.data.settings, null, 2)
    );

    // Проверяем ключевые поля
    const settings = getResponse.data.settings;
    const checks = [
      { field: 'apiType', expected: 'openrouter', actual: settings.apiType },
      {
        field: 'openRouterApiKey',
        expected: testSettings.openRouterApiKey,
        actual: settings.openRouterApiKey,
      },
      {
        field: 'openRouterModel',
        expected: testSettings.openRouterModel,
        actual: settings.openRouterModel,
      },
      {
        field: 'maxQuestionsPerDay',
        expected: testSettings.maxQuestionsPerDay,
        actual: settings.maxQuestionsPerDay,
      },
      {
        field: 'maxTokensPerQuestion',
        expected: testSettings.maxTokensPerQuestion,
        actual: settings.maxTokensPerQuestion,
      },
    ];

    console.log('\n🔍 Проверка корректности сохраненных данных:');
    let allChecksPass = true;

    checks.forEach((check) => {
      const isValid = check.actual === check.expected;
      console.log(
        `  ${isValid ? '✅' : '❌'} ${check.field}: ${check.actual} ${
          isValid ? '==' : '!='
        } ${check.expected}`
      );
      if (!isValid) allChecksPass = false;
    });

    if (allChecksPass) {
      console.log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Ошибка 500 исправлена.');
    } else {
      console.log(
        '\n⚠️  Некоторые проверки не прошли, но ошибка 500 исправлена.'
      );
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ ОШИБКА HTTP:', error.response.status);
      console.log(
        'Сообщение:',
        error.response.data?.message || 'Неизвестная ошибка'
      );
      console.log('Код ошибки:', error.response.data?.code || 'Не указан');
      console.log(
        'Полный ответ:',
        JSON.stringify(error.response.data, null, 2)
      );

      if (error.response.status === 500) {
        console.log('\n💥 ОШИБКА 500 ВСЕ ЕЩЕ ПРИСУТСТВУЕТ!');
        console.log('Необходимо дополнительное исследование...');
      }
    } else if (error.request) {
      console.log('❌ ОШИБКА СЕТИ: Нет ответа от сервера');
      console.log('Проверьте, что сервер запущен на', baseUrl);
    } else {
      console.log('❌ ОШИБКА:', error.message);
    }
  }
}

// Запуск теста
if (require.main === module) {
  testOpenRouterSettingsFix()
    .then(() => {
      console.log('\n🏁 Тест завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка теста:', error);
      process.exit(1);
    });
}

module.exports = { testOpenRouterSettingsFix };
